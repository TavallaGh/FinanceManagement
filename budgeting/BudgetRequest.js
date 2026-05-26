/* Filename: budgeting/BudgetRequest.js */
(() => {
  const { Card, Button, TextField, SelectField, TextAreaField, PageHeader, Badge } = window.DesignSystem || {};
  const supabase = window.supabase;

  const BudgetRequest = () => {
    const [loading, setLoading] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    const [requestId, setRequestId] = React.useState(null);
    const [status, setStatus] = React.useState('DRAFT');

    const [headerData, setHeaderData] = React.useState({
      requester_name: 'تولا قربانیان',
      department: 'بازاریابی',
      budget_type: 'فصلی',
      request_date: new Date().toISOString().split('T')[0],
      effective_from: '',
      effective_to: '',
      description: ''
    });

    const [items, setItems] = React.useState([]);
    const [newItem, setNewItem] = React.useState({
      project_name: '',
      currency: 'IRR',
      requested_amount: '',
      approved_amount: 0,
      item_status: 'PENDING'
    });

    const departmentOptions = [
      { value: 'بازاریابی', label: 'بازاریابی (Marketing)' },
      { value: 'فناوری اطلاعات', label: 'فناوری اطلاعات (IT)' },
      { value: 'فروش', label: 'فروش (Sales)' },
      { value: 'منابع انسانی', label: 'منابع انسانی (HR)' }
    ];

    const budgetTypeOptions = [
      { value: 'فصلی', label: 'فصلی' },
      { value: 'سالیانه', label: 'سالیانه' },
      { value: 'پروژه‌ای', label: 'پروژه‌ای' }
    ];

    const currencyOptions = [
      { value: 'IRR', label: 'ریال' },
      { value: 'USD', label: 'دلار' },
      { value: 'GBP', label: 'پوند' },
      { value: 'EUR', label: 'یورو' }
    ];

    const extractValue = (e) => {
      if (e && typeof e === 'object' && e.target !== undefined) {
        return e.target.value;
      }
      return e !== undefined && e !== null ? e : '';
    };

    const handleHeaderChange = (field, value) => {
      setHeaderData(prev => ({ ...prev, [field]: extractValue(value) }));
    };

    const handleAddItem = () => {
      if (!newItem.project_name || !newItem.requested_amount) {
        alert('لطفا نام پروژه و مبلغ درخواستی را وارد کنید.');
        return;
      }
      setItems(prev => [...prev, { ...newItem, id: Date.now().toString() }]);
      setNewItem({ project_name: '', currency: 'IRR', requested_amount: '', approved_amount: 0, item_status: 'PENDING' });
    };

    const handleRemoveItem = (id) => {
      setItems(prev => prev.filter(item => item.id !== id));
    };

    const handleSave = async () => {
      if (!supabase) {
        alert('خطا: ارتباط با دیتابیس (Supabase) برقرار نیست.');
        return;
      }
      
      setSaving(true);
      try {
        const totalRequested = items.reduce((sum, item) => sum + Number(item.requested_amount || 0), 0);

        const payload = {
          requester_name: headerData.requester_name || null,
          department: headerData.department || null,
          budget_type: headerData.budget_type || null,
          request_date: headerData.request_date || new Date().toISOString().split('T')[0],
          effective_from: headerData.effective_from || null,
          effective_to: headerData.effective_to || null,
          description: headerData.description || null,
          total_requested_amount: totalRequested,
          status: status
        };

        let currentReqId = requestId;

        if (currentReqId) {
          const { error } = await supabase.from('budget_requests').update(payload).eq('id', currentReqId);
          if (error) throw error;
        } else {
          const { data, error } = await supabase.from('budget_requests').insert([payload]).select().single();
          if (error) throw error;
          if (data) {
             currentReqId = data.id;
             setRequestId(data.id);
          }
        }

        if (currentReqId) {
            await supabase.from('budget_request_items').delete().eq('request_id', currentReqId);

            const itemsPayload = items.map(item => ({
              request_id: currentReqId,
              project_name: item.project_name,
              currency: item.currency || 'IRR',
              requested_amount: Number(item.requested_amount || 0),
              approved_amount: Number(item.approved_amount || 0),
              item_status: item.item_status || 'PENDING'
            }));

            if (itemsPayload.length > 0) {
              const { error: itemsError } = await supabase.from('budget_request_items').insert(itemsPayload);
              if (itemsError) throw itemsError;
            }
        }

        alert('درخواست بودجه با موفقیت ذخیره شد.');
      } catch (error) {
        console.error('Save Error:', error);
        alert(`خطا در ذخیره اطلاعات:\n${error.message || JSON.stringify(error)}`);
      } finally {
        setSaving(false);
      }
    };

    const handleSendToWorkflow = async () => {
      if (!requestId) {
        alert('ابتدا باید درخواست را ذخیره (پیش‌نویس) کنید.');
        return;
      }
      if (status !== 'DRAFT') {
        alert('این درخواست در حال حاضر در جریان است یا تایید شده است.');
        return;
      }
      if (!window.WorkflowEngine) {
        alert('موتور گردش کار (WorkflowEngine) در سیستم یافت نشد.');
        return;
      }

      try {
        setSaving(true);
        const wfResult = await window.WorkflowEngine.startProcess(
          'BUDGET_REQUEST',
          requestId,
          { ...headerData, total_amount: items.reduce((sum, item) => sum + Number(item.requested_amount || 0), 0) },
          headerData.requester_name
        );

        if (wfResult.success) {
          const { error } = await supabase.from('budget_requests').update({ status: 'IN_REVIEW' }).eq('id', requestId);
          if (error) throw error;
          
          setStatus('IN_REVIEW');
          alert('درخواست بودجه با موفقیت به گردش کار ارسال شد و در کارتابل قرار گرفت.');
        } else {
          alert('خطا در راه‌اندازی گردش کار: ' + (wfResult.message || wfResult.error));
        }
      } catch (err) {
        console.error('WF Start Error:', err);
        alert(`خطای سیستمی هنگام اتصال به موتور گردش کار:\n${err.message || 'نامشخص'}`);
      } finally {
        setSaving(false);
      }
    };

    const isReadOnly = status !== 'DRAFT';

    return React.createElement(
      'div',
      { className: 'p-6 w-full max-w-7xl mx-auto flex flex-col gap-6 font-sans' },
      
      React.createElement(PageHeader, {
        title: 'ثبت درخواست بودجه',
        description: 'ایجاد درخواست جدید برای تخصیص بودجه پروژه‌ها و کمپین‌ها',
        actions: React.createElement(
          'div',
          { className: 'flex gap-3' },
          React.createElement(Button, {
            variant: 'outline',
            onClick: handleSave,
            disabled: saving || isReadOnly,
            className: 'border-slate-300'
          }, saving ? 'در حال ذخیره...' : 'ذخیره پیش‌نویس'),
          React.createElement(Button, {
            variant: 'primary',
            onClick: handleSendToWorkflow,
            disabled: saving || isReadOnly || !requestId,
            className: 'bg-blue-600 hover:bg-blue-700 text-white'
          }, 'ارسال به گردش کار')
        )
      }),

      React.createElement(
        'div',
        { className: 'grid grid-cols-1 lg:grid-cols-3 gap-6' },
        
        React.createElement(
          'div',
          { className: 'lg:col-span-3' },
          React.createElement(
            Card,
            { className: 'p-6 bg-white/80 backdrop-blur-md border border-slate-200 shadow-sm rounded-2xl' },
            React.createElement(
              'div',
              { className: 'flex justify-between items-center mb-6 border-b border-slate-100 pb-4' },
              React.createElement('h3', { className: 'text-lg font-semibold text-slate-800' }, 'اطلاعات پایه درخواست'),
              React.createElement(Badge, {
                variant: status === 'DRAFT' ? 'neutral' : status === 'IN_REVIEW' ? 'warning' : 'success',
                className: 'px-3 py-1 text-sm'
              }, status === 'DRAFT' ? 'پیش‌نویس' : status === 'IN_REVIEW' ? 'در حال بررسی' : 'تایید شده')
            ),
            React.createElement(
              'div',
              { className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5' },
              React.createElement(TextField, {
                label: 'درخواست دهنده',
                value: headerData.requester_name,
                onChange: (e) => handleHeaderChange('requester_name', e),
                disabled: isReadOnly,
                className: 'w-full'
              }),
              React.createElement(SelectField, {
                label: 'دپارتمان',
                options: departmentOptions,
                value: headerData.department,
                onChange: (e) => handleHeaderChange('department', e),
                disabled: isReadOnly,
                className: 'w-full'
              }),
              React.createElement(SelectField, {
                label: 'نوع بودجه',
                options: budgetTypeOptions,
                value: headerData.budget_type,
                onChange: (e) => handleHeaderChange('budget_type', e),
                disabled: isReadOnly,
                className: 'w-full'
              }),
              React.createElement(TextField, {
                label: 'تاریخ درخواست',
                type: 'date',
                value: headerData.request_date,
                onChange: (e) => handleHeaderChange('request_date', e),
                disabled: isReadOnly,
                className: 'w-full'
              }),
              React.createElement(TextField, {
                label: 'موثر از تاریخ',
                type: 'date',
                value: headerData.effective_from,
                onChange: (e) => handleHeaderChange('effective_from', e),
                disabled: isReadOnly,
                className: 'w-full'
              }),
              React.createElement(TextField, {
                label: 'موثر تا تاریخ',
                type: 'date',
                value: headerData.effective_to,
                onChange: (e) => handleHeaderChange('effective_to', e),
                disabled: isReadOnly,
                className: 'w-full'
              }),
              React.createElement(
                'div',
                { className: 'md:col-span-2 lg:col-span-2' },
                React.createElement(TextField, {
                  label: 'توضیحات کلی',
                  value: headerData.description,
                  onChange: (e) => handleHeaderChange('description', e),
                  disabled: isReadOnly,
                  className: 'w-full'
                })
              )
            )
          )
        ),

        React.createElement(
          'div',
          { className: 'lg:col-span-3' },
          React.createElement(
            Card,
            { className: 'p-6 bg-white/80 backdrop-blur-md border border-slate-200 shadow-sm rounded-2xl flex flex-col gap-4' },
            React.createElement('h3', { className: 'text-lg font-semibold text-slate-800 border-b border-slate-100 pb-4' }, 'جزئیات و پروژه‌ها'),
            
            !isReadOnly && React.createElement(
              'div',
              { className: 'flex flex-wrap items-end gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100' },
              React.createElement(
                'div',
                { className: 'flex-1 min-w-[250px]' },
                React.createElement(TextField, {
                  label: 'نام پروژه / کمپین',
                  value: newItem.project_name,
                  onChange: (e) => setNewItem({ ...newItem, project_name: extractValue(e) }),
                  placeholder: 'مثلا: کمپین شب یلدا'
                })
              ),
              React.createElement(
                'div',
                { className: 'w-[150px]' },
                React.createElement(SelectField, {
                  label: 'ارز',
                  options: currencyOptions,
                  value: newItem.currency,
                  onChange: (e) => setNewItem({ ...newItem, currency: extractValue(e) })
                })
              ),
              React.createElement(
                'div',
                { className: 'w-[200px]' },
                React.createElement(TextField, {
                  label: 'مبلغ درخواستی',
                  type: 'number',
                  value: newItem.requested_amount,
                  onChange: (e) => setNewItem({ ...newItem, requested_amount: extractValue(e) })
                })
              ),
              React.createElement(
                Button,
                { variant: 'secondary', onClick: handleAddItem, className: 'h-10 mb-1 bg-slate-200 hover:bg-slate-300 text-slate-700' },
                'افزودن خط'
              )
            ),

            React.createElement(
              'div',
              { className: 'overflow-x-auto w-full mt-2' },
              React.createElement(
                'table',
                { className: 'w-full text-right border-collapse' },
                React.createElement(
                  'thead',
                  null,
                  React.createElement(
                    'tr',
                    { className: 'bg-slate-100/50 text-slate-500 text-sm font-medium border-y border-slate-200' },
                    React.createElement('th', { className: 'p-3' }, 'ردیف'),
                    React.createElement('th', { className: 'p-3' }, 'نام پروژه'),
                    React.createElement('th', { className: 'p-3' }, 'ارز'),
                    React.createElement('th', { className: 'p-3' }, 'مبلغ درخواستی'),
                    React.createElement('th', { className: 'p-3' }, 'مبلغ تایید شده'),
                    React.createElement('th', { className: 'p-3' }, 'وضعیت'),
                    !isReadOnly && React.createElement('th', { className: 'p-3 text-center' }, 'عملیات')
                  )
                ),
                React.createElement(
                  'tbody',
                  null,
                  items.length === 0 ? React.createElement(
                    'tr',
                    null,
                    React.createElement('td', { colSpan: !isReadOnly ? 7 : 6, className: 'p-8 text-center text-slate-400' }, 'هیچ رکوردی ثبت نشده است.')
                  ) : items.map((item, index) => React.createElement(
                    'tr',
                    { key: item.id, className: 'border-b border-slate-100 hover:bg-slate-50/50 transition-colors text-slate-700 text-sm' },
                    React.createElement('td', { className: 'p-3' }, index + 1),
                    React.createElement('td', { className: 'p-3 font-medium' }, item.project_name),
                    React.createElement('td', { className: 'p-3' }, item.currency),
                    React.createElement('td', { className: 'p-3' }, Number(item.requested_amount).toLocaleString()),
                    React.createElement('td', { className: 'p-3 text-emerald-600 font-semibold' }, Number(item.approved_amount).toLocaleString()),
                    React.createElement('td', { className: 'p-3' }, React.createElement(Badge, { variant: 'neutral', className: 'text-xs' }, item.item_status)),
                    !isReadOnly && React.createElement(
                      'td',
                      { className: 'p-3 text-center' },
                      React.createElement(
                        'button',
                        { onClick: () => handleRemoveItem(item.id), className: 'text-red-500 hover:text-red-700 transition-colors p-1' },
                        React.createElement('svg', { xmlns: 'http://www.w3.org/2000/svg', width: '16', height: '16', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round' }, React.createElement('path', { d: 'M3 6h18' }), React.createElement('path', { d: 'M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6' }), React.createElement('path', { d: 'M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2' }))
                      )
                    )
                  ))
                )
              )
            )
          )
        )
      )
    );
  };

  window.BudgetRequest = BudgetRequest;
})();
