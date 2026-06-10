/* Filename: general/OrganizationInfo.js */
(() => {
  const React = window.React;
  const { useState, useEffect } = React;
  
  const { 
    Button, PageHeader, Modal, DataGrid, 
    TextField, ToggleField, Badge, EmptyState, Avatar
  } = window.DesignSystem || window.DSCore || {};
  
  const { 
    Building2, Plus, Edit, Trash2, MapPin, Upload, X, Save, 
    AlertTriangle, Lock, MessageSquare
  } = window.LucideIcons || {};
  
  const { CommentModal } = window.DSComments || {};
  const supabase = window.supabase;

  const OrganizationInfo = ({ isAdmin, language = 'fa' }) => {
    const isRtl = language === 'fa';
    const t = (fa, en) => isRtl ? fa : en;
    const FORM_CODE = 'organization_info_main';
    
    const [data, setData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentRecord, setCurrentRecord] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);
    
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, type: null, data: null });
    
    const [commentModalOpen, setCommentModalOpen] = useState(false);
    const [selectedEntityForComment, setSelectedEntityForComment] = useState({ id: '', title: '' });

    const [formData, setFormData] = useState({
      code: '', 
      name: '', 
      regNo: '', 
      phone: '', 
      fax: '', 
      logo: null, 
      addresses: [], 
      isActive: true
    });
    const [newAddress, setNewAddress] = useState('');

    const [gridState, setGridState] = useState(null);

    const viewConfig = {
      pageId: FORM_CODE,
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

    useEffect(() => {
      const handleOpenCommentNotification = (e) => {
          if (e.detail && e.detail.entity_type === 'ORGANIZATION_INFO') {
              const targetRecord = data.find(item => String(item.id) === String(e.detail.entity_id));
              const recordTitle = targetRecord ? targetRecord.name : String(e.detail.entity_id);
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
    }, [data, t]);

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const { data: orgs, error } = await supabase
          .from('organization_info')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        const mappedData = (orgs || []).map(item => ({
          id: item.id,
          code: item.code,
          name: item.name,
          regNo: item.reg_no,
          phone: item.phone,
          fax: item.fax,
          logo: item.logo,
          addresses: item.addresses || [],
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
      if (!formData.code || !formData.name) return;

      setIsLoading(true);
      try {
        const payload = {
          code: formData.code,
          name: formData.name,
          reg_no: formData.regNo,
          phone: formData.phone,
          fax: formData.fax,
          logo: formData.logo,
          addresses: formData.addresses || [],
          is_active: formData.isActive
        };

        const { error } = currentRecord?.id 
          ? await supabase.from('organization_info').update(payload).eq('id', currentRecord.id)
          : await supabase.from('organization_info').insert([payload]);

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
          .from('organization_info')
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
          const { error } = await supabase.from('organization_info').delete().eq('id', deleteConfirm.data.id);
          if (error) throw error;
        } else if (deleteConfirm.type === 'bulk') {
          const { error } = await supabase.from('organization_info').delete().in('id', deleteConfirm.data);
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
        code: '', name: '', regNo: '', phone: '', fax: '', 
        logo: null, addresses: [], isActive: true 
      });
      setCurrentRecord(record);
      setNewAddress('');
      setIsModalOpen(true);
    };

    const handleOpenComment = (row) => {
      setSelectedEntityForComment({
        id: String(row.id),
        title: `${t('سازمان', 'Organization')}: ${row.name}`
      });
      setCommentModalOpen(true);
    };

    const handleSetDefaultAddress = (addrId) => {
      setFormData(prev => ({
        ...prev,
        addresses: prev.addresses.map(a => ({ ...a, isDefault: a.id === addrId }))
      }));
    };

    const columns = [
      { field: 'code', header_fa: 'کد', header_en: 'Code', width: '100px' },
      { field: 'name', header_fa: 'نام سازمان', header_en: 'Name', width: '250px' },
      { field: 'regNo', header_fa: 'شماره ثبت', header_en: 'Reg No', width: '120px' },
      { field: 'phone', header_fa: 'تلفن', header_en: 'Phone', width: '120px' },
      { 
        field: 'isActive', 
        header_fa: 'وضعیت', 
        header_en: 'Status', 
        width: '100px', 
        type: 'toggle',
        onToggle: (row, val) => handleToggleActive(row, val)
      }
    ];

    return (
      <div className="flex flex-col h-full p-4 bg-[#f8fafc] dark:bg-slate-900" dir={isRtl ? 'rtl' : 'ltr'}>
        <PageHeader 
          title={t('اطلاعات سازمان', 'Organization Info')} 
          icon={Building2}
          description={t('تنظیمات پایه و مدیریت ساختار شرکت', 'Base settings and company structure')}
          language={language}
          breadcrumbs={[{ label: t('تنظیمات پایه', 'Base Setup') }, { label: t('سازمان', 'Organization') }]}
          viewConfig={viewConfig}
        />

        <div className="flex-1 flex flex-col min-h-0 mt-4 animate-in fade-in duration-300">
          <div className="flex-1 min-h-0">
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
              hideImport={true}
              actions={[
                { icon: MessageSquare, tooltip: t('هامش / کامنت', 'Comments'), onClick: (row) => handleOpenComment(row), className: 'text-slate-400 hover:text-blue-600' },
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
          title={currentRecord ? t('ویرایش سازمان', 'Edit Org') : t('تعریف سازمان جدید', 'New Org')}
          width="max-w-xl"
          language={language}
        >
          <div className="p-4 flex flex-col gap-4">
            <div className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
               <Avatar src={formData.logo} name={formData.name || 'Org'} size="lg" />
               <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                     <Button variant="outline" size="sm" icon={Upload} onClick={() => document.getElementById('logo-upload-input').click()}>
                        {t('انتخاب لوگو', 'Select Logo')}
                     </Button>
                     {formData.logo && (
                        <Button variant="danger-outline" size="sm" icon={Trash2} onClick={() => setFormData({...formData, logo: null})}>
                           {t('حذف لوگو', 'Remove Logo')}
                        </Button>
                     )}
                  </div>
                  <input id="logo-upload-input" type="file" className="hidden" accept="image/*" onChange={(e) => {
                     const reader = new FileReader();
                     reader.onload = () => setFormData({...formData, logo: reader.result});
                     if(e.target.files[0]) reader.readAsDataURL(e.target.files[0]);
                  }} />
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <TextField size="sm" label={t('کد سازمان', 'Code')} value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} isRtl={isRtl} required dir="ltr" formCode={FORM_CODE} />
              <TextField size="sm" label={t('نام سازمان', 'Name')} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} isRtl={isRtl} required formCode={FORM_CODE} />
              <TextField size="sm" label={t('شماره ثبت', 'Reg No')} value={formData.regNo} onChange={e => setFormData({...formData, regNo: e.target.value})} isRtl={isRtl} dir="ltr" formCode={FORM_CODE} />
              <div className="flex items-center mt-6">
                <ToggleField size="sm" label={t('فعال', 'Active')} checked={formData.isActive} onChange={v => setFormData({...formData, isActive: v})} isRtl={isRtl} formCode={FORM_CODE} />
              </div>
              <TextField size="sm" label={t('تلفن', 'Phone')} value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} isRtl={isRtl} dir="ltr" formCode={FORM_CODE} />
              <TextField size="sm" label={t('فکس', 'Fax')} value={formData.fax} onChange={e => setFormData({...formData, fax: e.target.value})} isRtl={isRtl} dir="ltr" formCode={FORM_CODE} />
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700 mt-2">
               <label className="text-[12px] font-bold text-slate-600 dark:text-slate-300 mb-2 flex items-center gap-1.5"><MapPin size={14} className="text-indigo-500"/> {t('مدیریت آدرس‌ها', 'Manage Addresses')}</label>
               <div className="flex gap-2 mb-3">
                 <div className="flex-1">
                   <TextField size="sm" placeholder={t('آدرس جدید را وارد کنید...', 'New address...')} value={newAddress} onChange={e => setNewAddress(e.target.value)} isRtl={isRtl} wrapperClassName="m-0" formCode={FORM_CODE} />
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
                     <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                       {a.isDefault ? (
                         <Badge variant="indigo" className="!py-0.5">{t('پیش‌فرض', 'Default')}</Badge>
                       ) : (
                         <Button variant="ghost" size="sm" className="!h-6 !text-[10px] !px-2 text-slate-400 hover:text-indigo-600" onClick={() => handleSetDefaultAddress(a.id)}>
                           {t('انتخاب پیش‌فرض', 'Set Default')}
                         </Button>
                       )}
                       <Button variant="ghost" size="sm" className="!h-6 !w-6 !p-0 text-slate-300 hover:text-red-500" icon={Trash2} onClick={() => setFormData({...formData, addresses: formData.addresses.filter(x => x.id !== a.id)})} title={t('حذف', 'Delete')} />
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

            <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-slate-100 dark:border-slate-700/50">
              <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>{t('انصراف', 'Cancel')}</Button>
              <Button variant="primary" size="sm" icon={Save} onClick={handleSave} isLoading={isLoading}>{t('ذخیره تغییرات', 'Save Changes')}</Button>
            </div>
          </div>
        </Modal>

        <Modal isOpen={deleteConfirm.isOpen} onClose={() => setDeleteConfirm({ isOpen: false, type: null, data: null })} title={t('تایید عملیات حذف', 'Confirm Deletion')} language={language} width="max-w-sm">
          <EmptyState
            icon={AlertTriangle}
            title={t('هشدار: غیرقابل بازگشت', 'WARNING: IRREVERSIBLE')}
            description={deleteConfirm.type === 'bulk' 
              ? t(`آیا از حذف ${deleteConfirm.data?.length} مورد انتخاب شده اطمینان دارید؟`, `Delete ${deleteConfirm.data?.length} selected items?`)
              : t(`آیا از حذف سازمان ${deleteConfirm.data?.name} اطمینان دارید؟`, `Delete ${deleteConfirm.data?.name}?`)
            }
            action={
              <div className="flex gap-2 w-full mt-2 px-4">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setDeleteConfirm({ isOpen: false, type: null, data: null })}>{t('انصراف', 'Cancel')}</Button>
                <Button variant="danger" size="sm" onClick={executeDelete} isLoading={isLoading} className="flex-1">{t('تایید حذف', 'Delete')}</Button>
              </div>
            }
          />
        </Modal>

        {CommentModal && (
          <CommentModal 
            isOpen={commentModalOpen}
            onClose={() => setCommentModalOpen(false)}
            entityType="ORGANIZATION_INFO"
            entityId={selectedEntityForComment.id}
            entityTitle={selectedEntityForComment.title}
            language={language}
          />
        )}
      </div>
    );
  };

  window.OrganizationInfo = OrganizationInfo;
})();