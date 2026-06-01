/* Filename: workflow/WorkflowCartable.js */
(() => {
  const React = window.React;
  const { useState, useEffect } = React;
  const { 
    PageHeader, Card, Button, Badge, SelectField, TextAreaField, Modal, Dialog, Toast, Spinner 
  } = window.DesignSystem || {};
  const supabase = window.supabase;

  const WorkflowCartable = () => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRole, setSelectedRole] = useState('MANAGER');
    const [activeTask, setActiveTask] = useState(null);
    const [taskDetails, setTaskDetails] = useState(null);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [comments, setComments] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' });

    const roleOptions = [
      { value: 'MANAGER', label: 'کارتابل معاونت (MANAGER)' },
      { value: 'CEO', label: 'کارتابل مدیرعامل (CEO)' },
      { value: 'FINANCE', label: 'کارتابل مدیر مالی (FINANCE)' },
      { value: 'EMPLOYEE', label: 'کارتابل کارشناس عادی' }
    ];

    const showToast = (message, type = 'success') => {
      setToast({ isVisible: true, message, type });
      setTimeout(() => setToast({ isVisible: false, message: '', type: 'success' }), 4000);
    };

    const extractValue = (e) => {
      if (e && typeof e === 'object' && e.target !== undefined) {
        return e.target.value;
      }
      return e !== undefined && e !== null ? e : '';
    };

    const fetchTasks = async () => {
      setLoading(true);
      try {
        if (!window.WorkflowEngine) {
          throw new Error('موتور گردش کار (WorkflowEngine) بارگذاری نشده است.');
        }
        const currentUser = `User_${selectedRole}`;
        const pendingTasks = await window.WorkflowEngine.getPendingTasks([selectedRole], currentUser);
        setTasks(pendingTasks || []);
      } catch (err) {
        console.error("Error fetching tasks:", err);
        showToast('خطا در دریافت لیست کارها', 'error');
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      fetchTasks();
    }, [selectedRole]);

    const handleOpenTask = async (task) => {
      setActiveTask(task);
      setComments('');
      setTaskDetails(null);
      
      const instance = task.wf_instances;
      if (instance && instance.entity_type === 'BUDGET_REQUEST' && supabase) {
        setDetailsLoading(true);
        try {
          const { data, error } = await supabase
            .from('budget_requests')
            .select('*, budget_request_items(*)')
            .eq('id', instance.record_id)
            .single();
            
          if (error) throw error;
          setTaskDetails(data);
        } catch (err) {
          console.error("Error fetching budget details:", err);
        } finally {
          setDetailsLoading(false);
        }
      }
    };

    const handleCloseTask = () => {
      setActiveTask(null);
      setTaskDetails(null);
      setComments('');
    };

    const handleAction = async (actionType) => {
      if (!activeTask) return;
      setActionLoading(true);
      try {
        const currentUser = `User_${selectedRole}`;
        const result = await window.WorkflowEngine.completeTask(
          activeTask.id,
          actionType,
          comments,
          { current_role: selectedRole },
          currentUser
        );

        if (result.success) {
          showToast(`عملیات ${actionType === 'APPROVED' ? 'تایید' : 'رد'} با موفقیت انجام شد.`);
          handleCloseTask();
          fetchTasks();
        } else {
          showToast('خطا در انجام عملیات: ' + result.error, 'error');
        }
      } catch (err) {
        console.error("Action error:", err);
        showToast('خطای سیستمی در ثبت عملیات.', 'error');
      } finally {
        setActionLoading(false);
      }
    };

    return React.createElement(
      'div',
      { className: 'p-6 w-full max-w-7xl mx-auto flex flex-col gap-6 font-sans' },
      
      React.createElement(PageHeader, {
        title: 'کارتابل من',
        description: 'مشاهده و مدیریت کارهای ارجاع شده در جریان فرآیندهای سیستم',
        actions: React.createElement(
          'div',
          { className: 'w-64' },
          React.createElement(SelectField, {
            options: roleOptions,
            value: selectedRole,
            onChange: (e) => setSelectedRole(extractValue(e)),
            className: 'w-full bg-white'
          })
        )
      }),

      React.createElement(
        Card,
        { className: 'p-0 bg-white/80 backdrop-blur-md border border-slate-200 shadow-sm rounded-2xl overflow-hidden' },
        loading ? 
          React.createElement('div', { className: 'p-12 text-center text-slate-500' }, 'در حال بارگذاری کارتابل...') 
          :
          React.createElement(
            'div',
            { className: 'overflow-x-auto w-full' },
            React.createElement(
              'table',
              { className: 'w-full text-right border-collapse' },
              React.createElement(
                'thead',
                null,
                React.createElement(
                  'tr',
                  { className: 'bg-slate-50 text-slate-600 text-sm font-semibold border-b border-slate-200' },
                  React.createElement('th', { className: 'p-4 w-16 text-center' }, 'ردیف'),
                  React.createElement('th', { className: 'p-4' }, 'عنوان فرآیند'),
                  React.createElement('th', { className: 'p-4' }, 'مرحله فعلی'),
                  React.createElement('th', { className: 'p-4 text-center' }, 'نوع سند'),
                  React.createElement('th', { className: 'p-4' }, 'ایجاد کننده'),
                  React.createElement('th', { className: 'p-4' }, 'تاریخ ارجاع'),
                  React.createElement('th', { className: 'p-4 text-center' }, 'عملیات')
                )
              ),
              React.createElement(
                'tbody',
                null,
                tasks.length === 0 ? React.createElement(
                  'tr',
                  null,
                  React.createElement('td', { colSpan: 7, className: 'p-12 text-center text-slate-400' }, 'هیچ کاری در کارتابل شما وجود ندارد.')
                ) : tasks.map((task, index) => {
                  const wfInstance = task.wf_instances || {};
                  const wfDef = wfInstance.wf_definitions || {};
                  
                  return React.createElement(
                    'tr',
                    { key: task.id, className: 'border-b border-slate-100 hover:bg-slate-50/50 transition-colors text-slate-700 text-sm' },
                    React.createElement('td', { className: 'p-4 text-center text-slate-400' }, index + 1),
                    React.createElement('td', { className: 'p-4 font-medium text-slate-900' }, wfDef.title || 'فرآیند ناشناس'),
                    React.createElement('td', { className: 'p-4' }, React.createElement(Badge, { variant: 'warning', className: 'text-xs' }, task.node_id)),
                    React.createElement('td', { className: 'p-4 text-center' }, React.createElement(Badge, { variant: 'neutral', className: 'font-sans text-xs' }, wfInstance.entity_type)),
                    React.createElement('td', { className: 'p-4 text-slate-600' }, wfInstance.created_by),
                    React.createElement('td', { className: 'p-4 text-slate-500 text-xs text-left' }, new Date(task.created_at).toLocaleString('fa-IR')),
                    React.createElement(
                      'td',
                      { className: 'p-4 text-center' },
                      React.createElement(
                        Button,
                        { variant: 'primary', onClick: () => handleOpenTask(task), className: 'text-xs py-1.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm' },
                        'مشاهده و اقدام'
                      )
                    )
                  );
                })
              )
            )
          )
      ),

      activeTask && React.createElement(
        'div',
        { className: 'fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4' },
        React.createElement(
          'div',
          { className: 'bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200' },
          
          React.createElement(
            'div',
            { className: 'flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50/50' },
            React.createElement(
              'div',
              null,
              React.createElement('h3', { className: 'text-lg font-bold text-slate-800' }, 'اقدام روی کار: ', activeTask.node_id),
              React.createElement('p', { className: 'text-sm text-slate-500 mt-1' }, 'شناسه سند: ', activeTask.wf_instances?.record_id)
            ),
            React.createElement(
              'button',
              { onClick: handleCloseTask, className: 'text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition-colors' },
              React.createElement('svg', { xmlns: 'http://www.w3.org/2000/svg', width: '20', height: '20', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round' }, React.createElement('line', { x1: '18', y1: '6', x2: '6', y2: '18' }), React.createElement('line', { x1: '6', y1: '6', x2: '18', y2: '18' }))
            )
          ),

          React.createElement(
            'div',
            { className: 'p-6 overflow-y-auto custom-scrollbar flex-1 flex flex-col gap-6' },
            
            detailsLoading ? 
              React.createElement('div', { className: 'p-8 text-center text-slate-400' }, 'در حال دریافت جزئیات سند...') 
              : 
              taskDetails && activeTask.wf_instances?.entity_type === 'BUDGET_REQUEST' ? 
                React.createElement(
                  'div',
                  { className: 'bg-slate-50 rounded-xl p-5 border border-slate-100 flex flex-col gap-4' },
                  React.createElement('h4', { className: 'font-semibold text-slate-700 border-b border-slate-200 pb-2' }, 'خلاصه درخواست بودجه'),
                  React.createElement(
                    'div',
                    { className: 'grid grid-cols-2 md:grid-cols-4 gap-4 text-sm' },
                    React.createElement('div', null, React.createElement('span', { className: 'block text-slate-500 mb-1' }, 'درخواست دهنده:'), React.createElement('strong', { className: 'text-slate-800' }, taskDetails.requester_name)),
                    React.createElement('div', null, React.createElement('span', { className: 'block text-slate-500 mb-1' }, 'دپارتمان:'), React.createElement('strong', { className: 'text-slate-800' }, taskDetails.department)),
                    React.createElement('div', null, React.createElement('span', { className: 'block text-slate-500 mb-1' }, 'نوع بودجه:'), React.createElement('strong', { className: 'text-slate-800' }, taskDetails.budget_type)),
                    React.createElement('div', null, React.createElement('span', { className: 'block text-slate-500 mb-1' }, 'مبلغ کل درخواستی:'), React.createElement('strong', { className: 'text-emerald-600' }, Number(taskDetails.total_requested_amount).toLocaleString()))
                  ),
                  taskDetails.description && React.createElement(
                    'div',
                    { className: 'mt-2 text-sm' },
                    React.createElement('span', { className: 'block text-slate-500 mb-1' }, 'توضیحات:'),
                    React.createElement('p', { className: 'text-slate-700 bg-white p-3 rounded border border-slate-100' }, taskDetails.description)
                  )
                ) 
                :
                React.createElement(
                  'div',
                  { className: 'bg-orange-50 text-orange-700 p-4 rounded-xl border border-orange-100 text-sm' },
                  'نمایش جزئیات برای این نوع موجودیت (Entity Type) هنوز پیاده‌سازی نشده است. لطفاً مستقیماً اقدام نمایید.'
                ),

            React.createElement(
              'div',
              { className: 'flex flex-col gap-2' },
              React.createElement(TextAreaField, {
                label: 'هامش / یادداشت شما',
                value: comments,
                onChange: (e) => setComments(extractValue(e)),
                placeholder: 'نظرات خود را برای ثبت در سوابق این مرحله وارد کنید...',
                rows: 4,
                className: 'w-full'
              })
            )
          ),

          React.createElement(
            'div',
            { className: 'p-5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3' },
            React.createElement(
              Button,
              { variant: 'outline', onClick: handleCloseTask, disabled: actionLoading, className: 'border-slate-300 text-slate-600 hover:bg-slate-100' },
              'انصراف'
            ),
            React.createElement(
              Button,
              { onClick: () => handleAction('REJECTED'), disabled: actionLoading, className: 'bg-red-500 hover:bg-red-600 text-white shadow-sm' },
              actionLoading ? 'در حال ثبت...' : 'رد درخواست'
            ),
            React.createElement(
              Button,
              { onClick: () => handleAction('APPROVED'), disabled: actionLoading, className: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm' },
              actionLoading ? 'در حال ثبت...' : 'تایید و ارجاع'
            )
          )
        )
      ),

      Toast && React.createElement(Toast, { isVisible: toast.isVisible, message: toast.message, type: toast.type, onClose: () => setToast(prev => ({ ...prev, isVisible: false })) })
    );
  };

  window.WorkflowCartable = WorkflowCartable;
})();
