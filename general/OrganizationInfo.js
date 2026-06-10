/* Filename: general/OrganizationInfo.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useCallback, useMemo } = React;

  const FallbackComponent = () => null;
  const FallbackIcon = ({ size = 16 }) => React.createElement('span', { style: { display: 'inline-block', width: size, height: size } });

  const safeComp = (moduleObj, compName) => {
      const comp = moduleObj && moduleObj[compName];
      if (typeof comp === 'function' || (comp && typeof comp === 'object' && comp.$$typeof)) return comp;
      if (comp && comp.default && (typeof comp.default === 'function' || comp.default.$$typeof)) return comp.default;
      return FallbackComponent;
  };

  const safeIcon = (moduleObj, iconName) => {
      const icon = moduleObj && moduleObj[iconName];
      if (typeof icon === 'function' || (icon && typeof icon === 'object' && icon.$$typeof)) return icon;
      if (icon && icon.default && (typeof icon.default === 'function' || icon.default.$$typeof)) return icon.default;
      return FallbackIcon;
  };

  const DS = window.DesignSystem || {};
  const Core = window.DSCore || DS || {};
  const Button = safeComp(Core, 'Button');
  const Badge = safeComp(Core, 'Badge');
  const Card = safeComp(Core, 'Card');

  const Forms = window.DSForms || DS || {};
  const TextField = safeComp(Forms, 'TextField');
  const SelectField = safeComp(Forms, 'SelectField');

  const Grid = window.DSGrid || DS || {};
  const DataGrid = safeComp(Grid, 'DataGrid');

  const Feedback = window.DSFeedback || window.DSOverlays || DS || {};
  const Modal = safeComp(Feedback, 'Modal');
  const Toast = safeComp(Feedback, 'Toast');
  const ConfirmDialog = safeComp(Feedback, 'ConfirmDialog');

  const CommentsModule = window.DSComments || {};
  const CommentModal = safeComp(CommentsModule, 'CommentModal');

  const LucideIcons = window.LucideIcons || {};
  const Plus = safeIcon(LucideIcons, 'Plus');
  const Edit = safeIcon(LucideIcons, 'Edit');
  const Trash2 = safeIcon(LucideIcons, 'Trash2');
  const Globe = safeIcon(LucideIcons, 'Globe');
  const Building = safeIcon(LucideIcons, 'Building');
  const MessageSquare = safeIcon(LucideIcons, 'MessageSquare');

  const formCode = "OrganizationInfo";

  const OrganizationInfo = ({ language = 'fa' }) => {
    const isRtl = language === 'fa';
    const t = useCallback((fa, en) => isRtl ? fa : en, [isRtl]);
    const supabase = window.supabase;

    const [data, setData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitLoading, setIsSubmitLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    
    const [commentModalOpen, setCommentModalOpen] = useState(false);
    const [selectedEntityForComment, setSelectedEntityForComment] = useState({ id: '', title: '' });

    const [selectedRecordId, setSelectedRecordId] = useState(null);
    const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' });

    const initialFormState = useMemo(() => ({
      name_fa: '',
      name_en: '',
      national_code: '',
      registration_number: '',
      economic_code: '',
      postal_code: '',
      address: '',
      phone: '',
      email: '',
      website: '',
      currency_code: 'IRR',
      legal_type: 'PUBLIC_JOINT_STOCK'
    }), []);

    const [formData, setFormData] = useState(initialFormState);

    const showToast = useCallback((message, type = 'success') => {
      setToast({ isVisible: true, message, type });
      setTimeout(() => setToast(prev => ({ ...prev, isVisible: false })), 3000);
    }, []);

    const fetchData = useCallback(async () => {
      if (!supabase) return;
      setIsLoading(true);
      try {
        const { data: resData, error } = await supabase
          .from('gen_organizations')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setData(resData || []);
      } catch (error) {
        showToast(t('خطا در بارگذاری اطلاعات', 'Error loading data'), 'error');
      } finally {
        setIsLoading(false);
      }
    }, [supabase, t, showToast]);

    useEffect(() => {
      fetchData();
    }, [fetchData]);

    useEffect(() => {
        const handleOpenCommentNotification = (e) => {
            if (e.detail && e.detail.entity_type === 'ORGANIZATION_INFO') {
                const targetRecord = data.find(item => String(item.id) === String(e.detail.entity_id));
                const recordTitle = targetRecord ? (isRtl ? targetRecord.name_fa : targetRecord.name_en) : String(e.detail.entity_id);
                setSelectedEntityForComment({
                    id: String(e.detail.entity_id),
                    title: `${t('سازمان', 'Organization')}: ${recordTitle}`
                });
                setCommentModalOpen(true);
            }
        };

        window.addEventListener('openCommentModal', handleOpenCommentNotification);
        return () => {
            window.removeEventListener('openCommentModal', handleOpenCommentNotification);
        };
    }, [data, isRtl, t]);

    const handleOpenAddModal = () => {
      setSelectedRecordId(null);
      setFormData(initialFormState);
      setIsModalOpen(true);
    };

    const handleOpenEdit = (record) => {
      setSelectedRecordId(record.id);
      setFormData({
        name_fa: record.name_fa || '',
        name_en: record.name_en || '',
        national_code: record.national_code || '',
        registration_number: record.registration_number || '',
        economic_code: record.economic_code || '',
        postal_code: record.postal_code || '',
        address: record.address || '',
        phone: record.phone || '',
        email: record.email || '',
        website: record.website || '',
        currency_code: record.currency_code || 'IRR',
        legal_type: record.legal_type || 'PUBLIC_JOINT_STOCK'
      });
      setIsModalOpen(true);
    };

    const handleOpenComment = (record) => {
        const recordTitle = isRtl ? record.name_fa : record.name_en;
        setSelectedEntityForComment({
            id: String(record.id),
            title: `${t('سازمان', 'Organization')}: ${recordTitle}`
        });
        setCommentModalOpen(true);
    };

    const handleOpenDelete = (id) => {
      setSelectedRecordId(id);
      setIsConfirmOpen(true);
    };

    const handleFormChange = (field, value) => {
      setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
      if (!formData.name_fa || !formData.name_en) {
        showToast(t('لطفاً نام فارسی و انگلیسی را وارد کنید', 'Please enter both Persian and English names'), 'error');
        return;
      }

      setIsSubmitLoading(true);
      try {
        if (selectedRecordId) {
          const { error } = await supabase
            .from('gen_organizations')
            .update(formData)
            .eq('id', selectedRecordId);

          if (error) throw error;
          showToast(t('اطلاعات سازمان با موفقیت ویرایش شد', 'Organization updated successfully'));
        } else {
          const { error } = await supabase
            .from('gen_organizations')
            .insert([formData]);

          if (error) throw error;
          showToast(t('سازمان جدید با موفقیت ثبت شد', 'Organization created successfully'));
        }
        setIsModalOpen(false);
        fetchData();
      } catch (error) {
        showToast(t('خطا در ذخیره‌سازی اطلاعات', 'Error saving data'), 'error');
      } finally {
        setIsSubmitLoading(false);
      }
    };

    const handleDelete = async () => {
      try {
        const { error } = await supabase
          .from('gen_organizations')
          .delete()
          .eq('id', selectedRecordId);

        if (error) throw error;
        showToast(t('سازمان با موفقیت حذف شد', 'Organization deleted successfully'));
        setIsConfirmOpen(false);
        fetchData();
      } catch (error) {
        showToast(t('خطا در حذف سازمان', 'Error deleting organization'), 'error');
      }
    };

    const legalTypeOptions = [
      { value: 'PUBLIC_JOINT_STOCK', label: t('سهامی عام', 'Public Joint Stock') },
      { value: 'PRIVATE_JOINT_STOCK', label: t('سهامی خاص', 'Private Joint Stock') },
      { value: 'LIMITED_LIABILITY', label: t('با مسئولیت محدود', 'Limited Liability') },
      { value: 'COOPERATIVE', label: t('تعاونی', 'Cooperative') },
      { value: 'GOVERNMENTAL', label: t('دولتی', 'Governmental') }
    ];

    const currencyOptions = [
      { value: 'IRR', label: t('ریال ایران', 'Iranian Rial') },
      { value: 'USD', label: t('دلار آمریکا', 'US Dollar') },
      { value: 'EUR', label: t('یورو', 'Euro') },
      { value: 'AED', label: t('درهم امارات', 'UAE Dirham') }
    ];

    const columns = [
      {
        key: 'name_fa',
        title: t('نام فارسی', 'Persian Name'),
        render: (val, row) => React.createElement('div', { className: 'flex items-center gap-2' },
          React.createElement(Building, { size: 16, className: 'text-slate-400' }),
          React.createElement('span', { className: 'font-bold text-slate-700 dark:text-slate-200' }, val)
        )
      },
      { key: 'name_en', title: t('نام انگلیسی', 'English Name') },
      { key: 'national_code', title: t('شناسه ملی', 'National Code') },
      { key: 'registration_number', title: t('شماره ثبت', 'Registration No') },
      {
        key: 'legal_type',
        title: t('نوع حقوقی', 'Legal Type'),
        render: (val) => {
          const opt = legalTypeOptions.find(o => o.value === val);
          return React.createElement(Badge, { variant: 'info' }, opt ? opt.label : val);
        }
      },
      {
        key: 'currency_code',
        title: t('ارز پایه', 'Base Currency'),
        render: (val) => React.createElement(Badge, { variant: 'warning' }, val)
      },
      {
        key: 'actions',
        title: t('عملیات', 'Actions'),
        align: 'center',
        render: (_, row) => React.createElement('div', { className: 'flex items-center justify-center gap-1' },
          React.createElement(Button, {
            variant: 'ghost',
            className: '!p-1 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30',
            icon: MessageSquare,
            onClick: () => handleOpenComment(row),
            title: t('هامش / کامنت', 'Comments / Annotations')
          }),
          React.createElement(Button, {
            variant: 'ghost',
            className: '!p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30',
            icon: Edit,
            onClick: () => handleOpenEdit(row)
          }),
          React.createElement(Button, {
            variant: 'ghost',
            className: '!p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30',
            icon: Trash2,
            onClick: () => handleOpenDelete(row)
          })
        )
      }
    ];

    return React.createElement('div', { className: 'flex flex-col gap-4 p-4 font-sans text-[12px] h-full overflow-y-auto custom-scrollbar' },
      React.createElement('div', { className: 'flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm' },
        React.createElement('div', { className: 'flex items-center gap-3' },
          React.createElement('div', { className: 'p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg' },
            React.createElement(Building, { size: 24 })
          ),
          React.createElement('div', { className: 'flex flex-col gap-0.5' },
            React.createElement('h1', { className: 'text-base font-black text-slate-800 dark:text-slate-100' }, t('اطلاعات سازمان', 'Organization Profile')),
            React.createElement('p', { className: 'text-slate-400 text-[11px]' }, t('مدیریت مشخصات حقوقی، کدهای شناسایی و تنظیمات ساختاری سازمان', 'Manage corporate details, identification codes and configuration'))
          )
        ),
        React.createElement(Button, {
          variant: 'primary',
          icon: Plus,
          onClick: handleOpenAddModal
        }, t('سازمان جدید', 'New Organization'))
      ),

      React.createElement(Card, { className: 'flex-1 min-h-[400px] overflow-hidden flex flex-col' },
        React.createElement(DataGrid, {
          data: data,
          columns: columns,
          isLoading: isLoading,
          language: language,
          formCode: formCode,
          hideToolbar: false,
          exportable: true,
          importable: false
        })
      ),

      React.createElement(Modal, {
        isOpen: isModalOpen,
        onClose: () => setIsModalOpen(false),
        title: selectedRecordId ? t('ویرایش سازمان', 'Edit Organization') : t('ثبت سازمان جدید', 'New Organization'),
        language: language,
        width: 'max-w-3xl'
      },
        React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-4 p-2' },
          React.createElement(TextField, {
            label: t('نام فارسی', 'Persian Name'),
            value: formData.name_fa,
            onChange: (val) => handleFormChange('name_fa', val),
            required: true,
            dir: 'rtl'
          }),
          React.createElement(TextField, {
            label: t('نام انگلیسی', 'English Name'),
            value: formData.name_en,
            onChange: (val) => handleFormChange('name_en', val),
            required: true,
            dir: 'ltr'
          }),
          React.createElement(TextField, {
            label: t('شناسه ملی', 'National Code'),
            value: formData.national_code,
            onChange: (val) => handleFormChange('national_code', val)
          }),
          React.createElement(TextField, {
            label: t('شماره ثبت', 'Registration Number'),
            value: formData.registration_number,
            onChange: (val) => handleFormChange('registration_number', val)
          }),
          React.createElement(TextField, {
            label: t('کد اقتصادی', 'Economic Code'),
            value: formData.economic_code,
            onChange: (val) => handleFormChange('economic_code', val)
          }),
          React.createElement(TextField, {
            label: t('کد پستی', 'Postal Code'),
            value: formData.postal_code,
            onChange: (val) => handleFormChange('postal_code', val)
          }),
          React.createElement(SelectField, {
            label: t('نوع شخصیت حقوقی', 'Legal Type'),
            value: formData.legal_type,
            onChange: (val) => handleFormChange('legal_type', val),
            options: legalTypeOptions
          }),
          React.createElement(SelectField, {
            label: t('ارز اصلی سیستم', 'Base Currency'),
            value: formData.currency_code,
            onChange: (val) => handleFormChange('currency_code', val),
            options: currencyOptions
          }),
          React.createElement(TextField, {
            label: t('تلفن تماس', 'Phone Number'),
            value: formData.phone,
            onChange: (val) => handleFormChange('phone', val)
          }),
          React.createElement(TextField, {
            label: t('پست الکترونیک', 'Email Address'),
            value: formData.email,
            onChange: (val) => handleFormChange('email', val),
            dir: 'ltr'
          }),
          React.createElement('div', { className: 'md:col-span-2' },
            React.createElement(TextField, {
              label: t('وب‌سایت', 'Website URL'),
              value: formData.website,
              onChange: (val) => handleFormChange('website', val),
              dir: 'ltr',
              icon: Globe
            })
          ),
          React.createElement('div', { className: 'md:col-span-2' },
            React.createElement(TextField, {
              label: t('آدرس دفتر مرکزی', 'Headquarters Address'),
              value: formData.address,
              onChange: (val) => handleFormChange('address', val),
              multiline: true,
              rows: 2
            })
          )
        ),
        React.createElement('div', { className: 'flex justify-end gap-2 mt-6 border-t border-slate-100 dark:border-slate-700/50 pt-4' },
          React.createElement(Button, { variant: 'outline', onClick: () => setIsModalOpen(false) }, t('انصراف', 'Cancel')),
          React.createElement(Button, { variant: 'primary', onClick: handleSave, isLoading: isSubmitLoading }, t('ذخیره تغییرات', 'Save Changes'))
        )
      ),

      React.createElement(ConfirmDialog, {
        isOpen: isConfirmOpen,
        onClose: () => setIsConfirmOpen(false),
        onConfirm: handleDelete,
        title: t('حذف سازمان', 'Delete Organization'),
        message: t('آیا از حذف این سازمان اطمینان دارید؟ این عملیات غیرقابل بازگشت است.', 'Are you sure you want to delete this organization? This action cannot be undone.'),
        type: 'danger'
      }),

      React.createElement(CommentModal, {
        isOpen: commentModalOpen,
        onClose: () => setCommentModalOpen(false),
        entityType: "ORGANIZATION_INFO",
        entityId: selectedEntityForComment.id,
        entityTitle: selectedEntityForComment.title,
        language: language
      }),

      React.createElement(Toast, {
        isVisible: toast.isVisible,
        message: toast.message,
        type: toast.type,
        onClose: () => setToast(prev => ({ ...prev, isVisible: false }))
      })
    );
  };

  window.OrganizationInfo = OrganizationInfo;
})();