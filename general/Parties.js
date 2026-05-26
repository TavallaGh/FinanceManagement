/* Filename: general/Parties.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useMemo } = React;
  
  const { 
    Button, PageHeader, Modal, DataGrid, 
    TextField, ToggleField, Badge, CheckboxField
  } = window.DesignSystem || {};
  
  const { 
    Users, User, Building, Edit, Trash2, Save, 
    AlertTriangle, Lock, MapPin, Plus 
  } = window.LucideIcons || {};
  const supabase = window.supabase;

  const Parties = ({ isAdmin, language = 'fa' }) => {
    const isRtl = language === 'fa';
    const t = (fa, en) => isRtl ? fa : en;
    
    const [data, setData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentRecord, setCurrentRecord] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);
    
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, type: null, data: null });
    
    const [formData, setFormData] = useState({
      code: '', 
      partyType: 'real',
      firstName: '',
      lastName: '',
      companyName: '',
      nationalId: '',
      economicCode: '',
      mobile: '',
      phone: '',
      email: '',
      addresses: [],
      roles: [],
      isActive: true
    });
    const [newAddress, setNewAddress] = useState('');

    const [gridState, setGridState] = useState(null);

    const viewConfig = {
      pageId: 'parties_main',
      currentState: () => ({ 
        gridState
      }),
      onApplyState: (state) => {
        if (state) {
          if (state.gridState) setGridState(state.gridState);
        } else {
          setGridState(null);
        }
      }
    };

    useEffect(() => {
      fetchData();
    }, []);

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const { data: partiesData, error } = await supabase
          .from('parties')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        const mappedData = (partiesData || []).map(item => ({
          id: item.id,
          code: item.code,
          partyType: item.party_type,
          firstName: item.first_name,
          lastName: item.last_name,
          companyName: item.company_name,
          nationalId: item.national_id,
          economicCode: item.economic_code,
          mobile: item.mobile,
          phone: item.phone,
          email: item.email,
          addresses: item.addresses || [],
          roles: item.roles || [],
          isActive: item.is_active ?? true
        }));
        
        setData(mappedData);
      } catch (err) {
        console.error('Fetch Error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    const handleSave = async () => {
      if (!formData.code || (formData.partyType === 'real' && !formData.lastName) || (formData.partyType === 'legal' && !formData.companyName)) {
         return;
      }

      setIsLoading(true);
      try {
        const payload = {
          code: formData.code,
          party_type: formData.partyType,
          first_name: formData.partyType === 'real' ? formData.firstName : null,
          last_name: formData.partyType === 'real' ? formData.lastName : null,
          company_name: formData.partyType === 'legal' ? formData.companyName : null,
          national_id: formData.nationalId,
          economic_code: formData.partyType === 'legal' ? formData.economicCode : null,
          mobile: formData.mobile,
          phone: formData.phone,
          email: formData.email,
          addresses: formData.addresses || [],
          roles: formData.roles || [],
          is_active: formData.isActive,
          updated_at: new Date().toISOString()
        };

        const { error } = currentRecord?.id 
          ? await supabase.from('parties').update(payload).eq('id', currentRecord.id)
          : await supabase.from('parties').insert([payload]);

        if (error) throw error;
        setIsModalOpen(false);
        fetchData();
      } catch (err) {
        console.error('Save Error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    const handleToggleActive = async (row, newValue) => {
      try {
        const { error } = await supabase
          .from('parties')
          .update({ is_active: newValue })
          .eq('id', row.id);
        
        if (error) throw error;
        setData(prev => prev.map(item => item.id === row.id ? { ...item, isActive: newValue } : item));
      } catch (err) {
        console.error("Toggle Error:", err);
      }
    };

    const executeDelete = async () => {
      setIsLoading(true);
      try {
        if (deleteConfirm.type === 'single') {
          const { error } = await supabase.from('parties').delete().eq('id', deleteConfirm.data.id);
          if (error) throw error;
        } else if (deleteConfirm.type === 'bulk') {
          const { error } = await supabase.from('parties').delete().in('id', deleteConfirm.data);
          if (error) throw error;
        }
        
        setSelectedIds([]);
        setDeleteConfirm({ isOpen: false, type: null, data: null });
        fetchData();
      } catch (err) {
        console.error("Delete error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    const handleOpenModal = (record = null) => {
      setFormData(record ? { ...record } : { 
        code: '', 
        partyType: 'real',
        firstName: '',
        lastName: '',
        companyName: '',
        nationalId: '',
        economicCode: '',
        mobile: '',
        phone: '',
        email: '',
        addresses: [],
        roles: [],
        isActive: true 
      });
      setCurrentRecord(record);
      setNewAddress('');
      setIsModalOpen(true);
    };

    const toggleRole = (roleKey) => {
      const currentRoles = formData.roles || [];
      if (currentRoles.includes(roleKey)) {
        setFormData({ ...formData, roles: currentRoles.filter(r => r !== roleKey) });
      } else {
        setFormData({ ...formData, roles: [...currentRoles, roleKey] });
      }
    };

    const handleSetDefaultAddress = (addrId) => {
      setFormData(prev => ({
        ...prev,
        addresses: prev.addresses.map(a => ({ ...a, isDefault: a.id === addrId }))
      }));
    };

    const handleDownloadSample = () => {
      const headers = isRtl
        ? 'کد شخص,نوع شخص (real/legal),نام,نام خانوادگی,نام شرکت,کد/شناسه ملی,کد اقتصادی,موبایل,تلفن ثابت,ایمیل'
        : 'Code,Party Type (real/legal),First Name,Last Name,Company Name,National ID,Economic Code,Mobile,Phone,Email';
        
      const sampleRow = isRtl
        ? '1001,real,علی,احمدی,,1234567890,,09120000000,0210000000,test@test.com'
        : '1001,real,Ali,Ahmadi,,1234567890,,09120000000,0210000000,test@test.com';
        
      const csv = '\uFEFF' + headers + '\n' + sampleRow;
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', 'Parties_Import_Sample.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    const handleImportFile = (file) => {
      if (!file) return;
      console.log('Import file selected:', file.name);
    };

    const columns = [
      { field: 'code', header_fa: 'کد', header_en: 'Code', width: '100px' },
      { 
        field: 'fullName', 
        header_fa: 'نام طرف حساب', 
        header_en: 'Name', 
        width: '250px',
        render: (val, row) => row.partyType === 'legal' ? row.companyName : `${row.firstName || ''} ${row.lastName || ''}`.trim()
      },
      { 
        field: 'partyType', 
        header_fa: 'نوع', 
        header_en: 'Type', 
        width: '100px',
        render: (val) => (
          <Badge variant={val === 'legal' ? 'indigo' : 'emerald'} size="sm">
            {val === 'legal' ? t('حقوقی', 'Legal') : t('حقیقی', 'Real')}
          </Badge>
        )
      },
      { field: 'nationalId', header_fa: 'کد/شناسه ملی', header_en: 'National ID', width: '120px' },
      { field: 'mobile', header_fa: 'موبایل', header_en: 'Mobile', width: '120px' },
      { 
        field: 'roles', 
        header_fa: 'نقش‌ها', 
        header_en: 'Roles', 
        width: '250px',
        render: (roles) => (
          <div className="flex gap-1 flex-wrap">
             {(roles || []).map(r => {
                const roleLabels = {
                  customer: t('مشتری', 'Customer'),
                  vendor: t('تامین‌کننده', 'Vendor'),
                  employee: t('کارمند', 'Employee'),
                  shareholder: t('سهامدار', 'Shareholder'),
                  system_user: t('کاربر سیستم', 'System User'),
                  exchange: t('صرافی', 'Exchange')
                };
                return <Badge key={r} variant="slate" size="sm" className="text-[10px] px-1.5 py-0.5">{roleLabels[r] || r}</Badge>
             })}
          </div>
        )
      },
      { 
        field: 'isActive', 
        header_fa: 'وضعیت', 
        header_en: 'Status', 
        width: '90px', 
        type: 'toggle',
        onToggle: (row, val) => handleToggleActive(row, val)
      }
    ];

    return (
      <div className="flex flex-col h-full p-4 bg-[#f8fafc] dark:bg-slate-900" dir={isRtl ? 'rtl' : 'ltr'}>
        <PageHeader 
          title={t('اشخاص و شرکت‌ها', 'Parties & Companies')} 
          icon={Users}
          description={t('مدیریت اطلاعات پایه اشخاص حقیقی و حقوقی', 'Manage data of real and legal entities')}
          language={language}
          breadcrumbs={[{ label: t('تنظیمات پایه', 'Base Setup') }, { label: t('اشخاص', 'Parties') }]}
          viewConfig={viewConfig}
        />

        <div className="flex-1 flex flex-col min-h-0 mt-2 animate-in fade-in duration-300">
          <div className="flex-1 min-h-0 mt-1">
            <DataGrid 
              data={data}
              columns={columns} 
              language={language}
              selectable={true}
              selectedIds={selectedIds}
              onSelectChange={setSelectedIds}
              isLoading={isLoading}
              onAdd={() => handleOpenModal()}
              onRowDoubleClick={(row) => handleOpenModal(row)}
              gridState={gridState}
              onGridStateChange={setGridState}
              onDownloadSample={handleDownloadSample}
              onImport={handleImportFile}
              actions={[
                { icon: Edit, tooltip: t('ویرایش', 'Edit'), onClick: (row) => handleOpenModal(row), className: 'text-slate-400 hover:text-indigo-600' },
                { icon: Trash2, tooltip: t('حذف', 'Delete'), onClick: (row) => setDeleteConfirm({ isOpen: true, type: 'single', data: row }), className: 'text-slate-400 hover:text-red-600' }
              ]}
              bulkActions={[
                { label: t('حذف گروهی', 'Delete Selected'), icon: Trash2, variant: 'danger-outline', onClick: (ids) => setDeleteConfirm({ isOpen: true, type: 'bulk', data: ids }) }
              ]}
            />
          </div>
        </div>

        <Modal 
          isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} 
          title={currentRecord ? t('ویرایش مشخصات', 'Edit Party') : t('تعریف شخص/شرکت جدید', 'New Party')}
          width="max-w-3xl"
          language={language}
        >
          <div className="p-4 flex flex-col gap-4">
            <div className="flex items-center justify-center gap-6 p-2 bg-indigo-50/50 dark:bg-indigo-900/20 rounded-lg border border-indigo-100 dark:border-indigo-800/50 mb-1">
               <label className="flex items-center gap-2 cursor-pointer">
                 <input type="radio" name="partyType" value="real" checked={formData.partyType === 'real'} onChange={() => setFormData({...formData, partyType: 'real'})} className="text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer" />
                 <span className="text-[12px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1"><User size={14}/> {t('شخص حقیقی', 'Real Person')}</span>
               </label>
               <label className="flex items-center gap-2 cursor-pointer">
                 <input type="radio" name="partyType" value="legal" checked={formData.partyType === 'legal'} 
                        onChange={() => setFormData({...formData, partyType: 'legal', roles: formData.roles.filter(r => r !== 'system_user' && r !== 'employee')})} 
                        className="text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer" />
                 <span className="text-[12px] font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1"><Building size={14}/> {t('شخص حقوقی', 'Legal Entity')}</span>
               </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <TextField size="sm" label={t('کد شخص/شرکت', 'Code')} value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} isRtl={isRtl} required dir="ltr" wrapperClassName="md:col-span-1" />
              
              {formData.partyType === 'real' ? (
                <>
                  <TextField size="sm" label={t('نام', 'First Name')} value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} isRtl={isRtl} wrapperClassName="md:col-span-1" />
                  <TextField size="sm" label={t('نام خانوادگی', 'Last Name')} value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} isRtl={isRtl} required wrapperClassName="md:col-span-1" />
                </>
              ) : (
                <TextField size="sm" label={t('نام کامل شرکت', 'Company Name')} value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} isRtl={isRtl} required wrapperClassName="md:col-span-2" />
              )}

              <TextField size="sm" label={formData.partyType === 'real' ? t('کد ملی', 'National ID') : t('شناسه ملی', 'National ID')} value={formData.nationalId} onChange={e => setFormData({...formData, nationalId: e.target.value})} isRtl={isRtl} dir="ltr" />
              
              {formData.partyType === 'legal' && (
                <TextField size="sm" label={t('کد اقتصادی', 'Economic Code')} value={formData.economicCode} onChange={e => setFormData({...formData, economicCode: e.target.value})} isRtl={isRtl} dir="ltr" />
              )}
              
              <TextField size="sm" label={t('موبایل', 'Mobile')} value={formData.mobile} onChange={e => setFormData({...formData, mobile: e.target.value})} isRtl={isRtl} dir="ltr" />
              <TextField size="sm" label={t('تلفن ثابت', 'Phone')} value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} isRtl={isRtl} dir="ltr" />
              <TextField size="sm" label={t('ایمیل', 'Email')} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} isRtl={isRtl} dir="ltr" wrapperClassName={formData.partyType === 'legal' ? "md:col-span-1" : "md:col-span-1"} />
              
              <div className="flex items-center mt-6">
                 <ToggleField size="sm" label={t('وضعیت فعال', 'Active Status')} checked={formData.isActive} onChange={v => setFormData({...formData, isActive: v})} isRtl={isRtl} />
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 mt-1">
               <label className="text-[12px] font-bold text-slate-600 dark:text-slate-300 mb-2 flex items-center gap-1.5"><MapPin size={14} className="text-indigo-500"/> {t('مدیریت آدرس‌ها', 'Manage Addresses')}</label>
               <div className="flex gap-2 mb-3">
                 <div className="flex-1">
                   <TextField size="sm" placeholder={t('آدرس جدید را وارد کنید...', 'New address...')} value={newAddress} onChange={e => setNewAddress(e.target.value)} isRtl={isRtl} wrapperClassName="m-0" />
                 </div>
                 <Button variant="secondary" size="sm" icon={Plus} onClick={() => {
                   if(!newAddress.trim()) return;
                   setFormData({...formData, addresses: [...formData.addresses, { id: Date.now(), text: newAddress.trim(), isDefault: formData.addresses.length === 0 }]});
                   setNewAddress('');
                 }}>{t('افزودن', 'Add')}</Button>
               </div>
               
               <div className="space-y-1.5 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                 {formData.addresses.map(a => (
                   <div key={a.id} className={`flex justify-between items-center p-2 rounded-md border text-[12px] group shadow-sm transition-all ${a.isDefault ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'}`}>
                     <div className="flex items-center gap-2 flex-1 min-w-0">
                       <span className="text-slate-700 dark:text-slate-300 leading-relaxed truncate">{a.text}</span>
                     </div>
                     <div className="flex items-center gap-2 shrink-0">
                       {a.isDefault ? (
                         <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 px-1">{t('پیش‌فرض', 'Default')}</span>
                       ) : (
                         <button 
                           onClick={() => handleSetDefaultAddress(a.id)} 
                           className="text-[10px] font-bold text-slate-400 hover:text-indigo-600 transition-colors px-1"
                         >
                           {t('پیش‌فرض', 'Default')}
                         </button>
                       )}
                       <button 
                         onClick={() => setFormData({...formData, addresses: formData.addresses.filter(x => x.id !== a.id)})} 
                         className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                         title={t('حذف', 'Delete')}
                       >
                         <Trash2 size={12}/>
                       </button>
                     </div>
                   </div>
                 ))}
                 {formData.addresses.length === 0 && (
                   <div className="text-center py-4 border border-dashed border-slate-200 dark:border-slate-700 rounded-md">
                      <span className="text-[10px] text-slate-400">{t('هیچ آدرسی ثبت نشده است.', 'No addresses found.')}</span>
                   </div>
                 )}
               </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 mt-1">
                <label className="text-[12px] font-bold text-slate-600 dark:text-slate-300 mb-3 block">{t('نقش‌های این شخص در سیستم', 'System Roles')}</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    <CheckboxField size="sm" label={t('مشتری', 'Customer')} checked={formData.roles.includes('customer')} onChange={() => toggleRole('customer')} isRtl={isRtl} />
                    <CheckboxField size="sm" label={t('تامین‌کننده', 'Vendor')} checked={formData.roles.includes('vendor')} onChange={() => toggleRole('vendor')} isRtl={isRtl} />
                    <CheckboxField size="sm" label={t('سهامدار', 'Shareholder')} checked={formData.roles.includes('shareholder')} onChange={() => toggleRole('shareholder')} isRtl={isRtl} />
                    <CheckboxField size="sm" label={t('صرافی', 'Exchange')} checked={formData.roles.includes('exchange')} onChange={() => toggleRole('exchange')} isRtl={isRtl} />
                    {formData.partyType === 'real' && (
                      <>
                        <CheckboxField size="sm" label={t('کارمند', 'Employee')} checked={formData.roles.includes('employee')} onChange={() => toggleRole('employee')} isRtl={isRtl} />
                        <CheckboxField size="sm" label={t('کاربر سیستم', 'System User')} checked={formData.roles.includes('system_user')} onChange={() => toggleRole('system_user')} isRtl={isRtl} />
                      </>
                    )}
                </div>
            </div>

            <div className="flex justify-end gap-2 mt-1 pt-3 border-t border-slate-100 dark:border-slate-700/50">
              <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>{t('انصراف', 'Cancel')}</Button>
              <Button variant="primary" size="sm" icon={Save} onClick={handleSave} isLoading={isLoading}>{t('ذخیره اطلاعات', 'Save Changes')}</Button>
            </div>
          </div>
        </Modal>

        <Modal isOpen={deleteConfirm.isOpen} onClose={() => setDeleteConfirm({ isOpen: false, type: null, data: null })} title={t('تایید عملیات حذف', 'Confirm Deletion')} language={language} width="max-w-sm">
          <div className="p-4 flex flex-col gap-3 items-center text-center">
            <div className="w-11 h-11 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center text-red-500 dark:text-red-400 mb-1">
               <AlertTriangle size={22} />
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-3 py-1.5 rounded-full text-[10px] font-black flex items-center gap-1">
               <Lock size={12}/> {t('هشدار: غیرقابل بازگشت', 'WARNING: IRREVERSIBLE')}
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
              {deleteConfirm.type === 'bulk' 
                ? t(`آیا از حذف ${deleteConfirm.data?.length} مورد انتخاب شده اطمینان دارید؟`, `Delete ${deleteConfirm.data?.length} selected items?`)
                : t(`آیا از حذف شخص/شرکت "${deleteConfirm.data?.partyType === 'legal' ? deleteConfirm.data?.companyName : (deleteConfirm.data?.firstName + ' ' + deleteConfirm.data?.lastName).trim()}" اطمینان دارید؟`, `Delete this party?`)
              }
            </p>
            <div className="flex gap-2 mt-4 w-full">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setDeleteConfirm({ isOpen: false, type: null, data: null })}>{t('انصراف', 'Cancel')}</Button>
              <Button variant="primary" size="sm" onClick={executeDelete} isLoading={isLoading} className="flex-1 bg-red-600 dark:bg-red-500 hover:bg-red-700 dark:hover:bg-red-600 border-red-600 dark:border-red-500">{t('تایید حذف', 'Delete')}</Button>
            </div>
          </div>
        </Modal>
      </div>
    );
  };

  window.Parties = Parties;
})();
