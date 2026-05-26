/* Filename: workflow/WorkflowEngine.js */
(() => {
  const supabase = window.supabase;

  class WorkflowEngine {
    
    /**
     * ثبت تاریخچه عملیات در لاگ گردش کار
     */
    static async logHistory(instanceId, nodeId, action, performedBy, details) {
      if (!supabase) {
        console.warn("Supabase not initialized for WorkflowEngine");
        return;
      }
      try {
        await supabase.schema('wf').from('wf_history').insert([{
          instance_id: instanceId,
          node_id: nodeId,
          action: action,
          performed_by: performedBy || 'SYSTEM',
          details: typeof details === 'object' ? JSON.stringify(details) : (details || '')
        }]);
      } catch (err) {
        console.error("WorkflowEngine logHistory error:", err);
      }
    }

    /**
     * استارت موتور گردش کار برای یک رکورد جدید
     */
    static async startProcess(entityType, recordId, recordData = {}, currentUser = 'SYSTEM') {
      try {
        if (!supabase) throw new Error("Supabase is required.");

        // 1. جستجوی آخرین نسخه گردش کار فعال برای این موجودیت
        const { data: defs, error: defError } = await supabase.schema('wf').from('wf_definitions')
          .select('*')
          .eq('entity_type', entityType)
          .eq('is_active', true)
          .order('version', { ascending: false });

        if (defError) throw defError;
        if (!defs || defs.length === 0) return { success: false, message: 'هیچ گردش کار فعالی برای این موجودیت یافت نشد.' };

        // 2. ارزیابی شروط اولیه (Factor Conditions) برای انتخاب دقیق‌ترین گردش کار
        let selectedDef = null;
        for (const def of defs) {
          if (!def.factor_field) {
            selectedDef = def;
            break;
          }
          const val = recordData[def.factor_field];
          const target = def.factor_value;
          const op = def.factor_operator;
          let match = false;
          
          if (op === '=') match = val == target;
          else if (op === '!=') match = val != target;
          else if (op === '>') match = Number(val) > Number(target);
          else if (op === '<') match = Number(val) < Number(target);
          else if (op === '>=') match = Number(val) >= Number(target);
          else if (op === '<=') match = Number(val) <= Number(target);
          else if (op === 'IN') match = target.split(',').map(s=>s.trim()).includes(String(val));
          
          if (match) {
            selectedDef = def;
            break;
          }
        }

        if (!selectedDef) return { success: false, message: 'شروط گردش کارهای موجود با داده‌های این رکورد همخوانی ندارد.' };

        // 3. ایجاد یک نمونه (Instance) از این گردش کار
        const { data: instance, error: instError } = await supabase.schema('wf').from('wf_instances').insert([{
          workflow_id: selectedDef.id,
          entity_type: entityType,
          record_id: String(recordId),
          status: 'RUNNING',
          created_by: currentUser
        }]).select().single();

        if (instError) throw instError;

        // 4. یافتن گره شروع (START_EVENT)
        const nodes = selectedDef.bpmn_data.nodes || [];
        const startNode = nodes.find(n => n.type === 'START_EVENT');
        
        if (!startNode) throw new Error('نقطه شروع (Start Event) در نقشه فرآیند یافت نشد.');

        await this.logHistory(instance.id, startNode.id, 'START_WORKFLOW', currentUser, `Started workflow: ${selectedDef.title} v${selectedDef.version}`);

        // 5. حرکت به گره‌های بعدی
        await this.processNextNodes(instance.id, selectedDef.bpmn_data, startNode.id, recordData, currentUser);

        return { success: true, instanceId: instance.id, message: 'گردش کار با موفقیت آغاز شد.' };

      } catch (error) {
        console.error("WorkflowEngine Start Error:", error);
        return { success: false, error: error.message };
      }
    }

    /**
     * ارزیابی پویا برای شروط دروازه‌ها
     */
    static evaluateCondition(condition, data) {
      if (!condition || condition.trim() === '') return true;
      try {
        const keys = Object.keys(data);
        const values = Object.values(data);
        const func = new Function(...keys, `return ${condition};`);
        return func(...values);
      } catch (e) {
        console.error('Condition Evaluation Error on expression:', condition, e);
        return false;
      }
    }

    /**
     * پیدا کردن گره بعدی و ارجاع کار
     */
    static async processNextNodes(instanceId, bpmnData, currentNodeId, data, currentUser) {
      const { nodes, flows } = bpmnData;
      
      // بروزرسانی موقعیت فعلی در جدول اینستنس
      await supabase.schema('wf').from('wf_instances').update({ current_node_id: currentNodeId, updated_at: new Date().toISOString() }).eq('id', instanceId);

      const outgoingFlows = flows.filter(f => f.sourceRef === currentNodeId);
      if (outgoingFlows.length === 0) return; // بن‌بست یا پایان واقعی فرآیند

      const currentNode = nodes.find(n => n.id === currentNodeId);
      let flowsToExecute = [];

      // منطق مسیریابی بر اساس نوع گره
      if (currentNode.type === 'EXCLUSIVE_GATEWAY' || currentNode.type === 'APPROVAL_GATEWAY') {
        // در صورت وجود شرط، اولین شرط صحیح انتخاب می‌شود
        let matchedFlow = outgoingFlows.find(f => f.condition && this.evaluateCondition(f.condition, data));
        
        // اگر هیچ شرطی برقرار نبود، مسیر پیش‌فرض را انتخاب کن
        if (!matchedFlow) {
           matchedFlow = outgoingFlows.find(f => f.is_default) || outgoingFlows[0];
        }
        
        if (matchedFlow) flowsToExecute.push(matchedFlow);
      } else if (currentNode.type === 'PARALLEL_GATEWAY') {
        // اجرای همزمان تمامی مسیرهای خروجی
        flowsToExecute = outgoingFlows;
      } else {
        // در گره‌های معمولی (Task ها)، فقط یک خروجی معتبر است
        if (outgoingFlows.length > 0) flowsToExecute.push(outgoingFlows[0]);
      }

      // اجرای مسیرهای استخراج شده
      for (const flow of flowsToExecute) {
         await this.executeNode(instanceId, bpmnData, flow.targetRef, data, currentUser, flow);
      }
    }

    /**
     * اجرای عملیات گره هدف (ایجاد کارتابل، پایان، سیستم و ...)
     */
    static async executeNode(instanceId, bpmnData, nodeId, data, currentUser, incomingFlow) {
      const node = bpmnData.nodes.find(n => n.id === nodeId);
      if (!node) return;

      // آپدیت مکان اینستنس
      await supabase.schema('wf').from('wf_instances').update({ current_node_id: nodeId, updated_at: new Date().toISOString() }).eq('id', instanceId);

      if (node.type === 'USER_TASK') {
         // محاسبه مهلت انجام کار (در صورت وجود SLA در نقشه فرآیند)
         const dueDate = node.sla_hours ? new Date(Date.now() + (node.sla_hours * 3600000)).toISOString() : null;

         // ایجاد وظیفه جدید در کارتابل
         await supabase.schema('wf').from('wf_tasks').insert([{
            instance_id: instanceId,
            node_id: node.id,
            task_type: node.task_type || 'USER_TASK',
            status: 'PENDING',
            assignee_roles: node.assignee_roles || null,
            due_date: dueDate,
            delegated_to: null
         }]);
         await this.logHistory(instanceId, node.id, 'TASK_CREATED', 'SYSTEM', `Task "${node.name}" generated for roles: ${node.assignee_roles || 'ALL'}. Due: ${dueDate || 'None'}`);
         // فرآیند در اینجا متوقف می‌شود تا کاربر اقدام کند
      } 
      else if (node.type === 'SERVICE_TASK') {
         // شبیه‌سازی فراخوانی سرویس (در محیط واقعی اینجا axios یا fetch فراخوانی می‌شود)
         await this.logHistory(instanceId, node.id, 'SERVICE_EXECUTED', 'SYSTEM', `Executed system logic: ${node.service_type}`);
         // بلافاصله به گره بعدی برو
         await this.processNextNodes(instanceId, bpmnData, node.id, data, currentUser);
      }
      else if (node.type === 'SEND_TASK') {
         // شبیه‌سازی ارسال پیام
         await this.logHistory(instanceId, node.id, 'MESSAGE_SENT', 'SYSTEM', `Sent message to ${node.recipient} via ${node.channel}`);
         await this.processNextNodes(instanceId, bpmnData, node.id, data, currentUser);
      }
      else if (node.type === 'TIMER_EVENT') {
         // در محیط کلاینت‌ساید، تایمر پیچیده است و معمولا با کران‌جاب در بک‌اند هندل می‌شود.
         // فعلا به صورت Mock با رد شدن آنی هندل می‌کنیم.
         await this.logHistory(instanceId, node.id, 'TIMER_TRIGGERED', 'SYSTEM', `Timer encountered (Delayed logic omitted for mock)`);
         await this.processNextNodes(instanceId, bpmnData, node.id, data, currentUser);
      }
      else if (node.type === 'END_EVENT') {
         await supabase.schema('wf').from('wf_instances').update({ status: 'COMPLETED', updated_at: new Date().toISOString() }).eq('id', instanceId);
         await this.logHistory(instanceId, node.id, 'PROCESS_COMPLETED', 'SYSTEM', 'Workflow reached end event.');
      }
      else if (node.type.includes('GATEWAY')) {
         // دروازه‌ها به خودی خود عملیاتی ندارند، فقط تصمیم‌گیرنده مسیرهای بعدی هستند
         await this.processNextNodes(instanceId, bpmnData, node.id, data, currentUser);
      }
    }

    /**
     * ارجاع (تفویض) یک وظیفه به شخص دیگر
     */
    static async delegateTask(taskId, delegatedTo, currentUser) {
      try {
        const { error } = await supabase.schema('wf').from('wf_tasks').update({
          delegated_to: delegatedTo
        }).eq('id', taskId);

        if (error) throw error;

        // ثبت در تاریخچه
        const { data: task } = await supabase.schema('wf').from('wf_tasks').select('*').eq('id', taskId).single();
        if (task) {
          await this.logHistory(task.instance_id, task.node_id, 'TASK_DELEGATED', currentUser, `Task delegated to user/role: ${delegatedTo}`);
        }

        return { success: true };
      } catch (err) {
        console.error("Task Delegation Error:", err);
        return { success: false, error: err.message };
      }
    }

    /**
     * تکمیل یک وظیفه توسط کاربر (از داخل کارتابل)
     */
    static async completeTask(taskId, actionTaken, comments, variables = {}, currentUser) {
        try {
            // 1. واکشی اطلاعات وظیفه و اینستنس متصل
            const { data: task, error: taskErr } = await supabase.schema('wf').from('wf_tasks').select('*, wf_instances(*)').eq('id', taskId).single();
            if (taskErr || !task) throw new Error('وظیفه مورد نظر یافت نشد.');
            
            // 2. تغییر وضعیت وظیفه به تکمیل شده
            await supabase.schema('wf').from('wf_tasks').update({
                status: 'COMPLETED',
                action_taken: actionTaken,
                comments: comments || null,
                assigned_to: currentUser,
                completed_at: new Date().toISOString()
            }).eq('id', taskId);

            await this.logHistory(task.instance_id, task.node_id, 'TASK_COMPLETED', currentUser, `Action: ${actionTaken} | Comments: ${comments || 'None'}`);

            // 3. دریافت نقشه فرآیند برای یافتن قدم بعدی
            const { data: def } = await supabase.schema('wf').from('wf_definitions').select('bpmn_data').eq('id', task.wf_instances.workflow_id).single();
            
            // ما متغیر اکشن (Action) را مستقیما به داده‌ها تزریق می‌کنیم تا دروازه‌های شرطی بعدی بتوانند روی آن تصمیم‌گیری کنند
            const enrichedData = { ...variables, action_taken: actionTaken };

            // 4. ادامه فرآیند از این نقطه به بعد
            await this.processNextNodes(task.instance_id, def.bpmn_data, task.node_id, enrichedData, currentUser);

            return { success: true };
        } catch (err) {
            console.error("Task Completion Error:", err);
            return { success: false, error: err.message };
        }
    }

    /**
     * دریافت لیست وظایف منتظر در کارتابل شخص
     */
    static async getPendingTasks(userRoles = [], currentUser = '') {
       try {
         const { data, error } = await supabase.schema('wf').from('wf_tasks')
            .select(`
                *,
                wf_instances (
                    entity_type,
                    record_id,
                    status,
                    created_by,
                    wf_definitions (title, bpmn_data)
                )
            `)
            .eq('status', 'PENDING');
         
         if (error) throw error;
         
         // فیلتر سمت کلاینت بر اساس نقش کاربر و شخص جایگزین (Delegation)
         return data.filter(task => {
             // اگر وظیفه به شخص فعلی تفویض شده باشد
             if (task.delegated_to === currentUser) return true;
             
             if (!task.assignee_roles) return true; // اگر نقشی تعیین نشده همه می‌بینند
             
             const taskRoles = task.assignee_roles.split(',').map(s=>s.trim());
             // آیا حداقل یکی از نقش‌های کاربر در لیست نقش‌های مجاز این تسک هست؟
             return taskRoles.some(r => userRoles.includes(r)) || taskRoles.includes(currentUser);
         });
       } catch (e) {
           console.error("Fetch Pending Tasks Error:", e);
           return [];
       }
    }
  }

  // اکسپورت کلاس موتور گردش کار به محیط عمومی جاوااسکریپت
  window.WorkflowEngine = WorkflowEngine;
})();