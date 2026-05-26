/* Filename: financial/GatewayTypes.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useMemo, useRef } = React;
  
  const { 
    Button, PageHeader, Modal, 
    TextField, ToggleField, SelectField, CurrencyField, DatePicker, CheckboxField
  } = window.DesignSystem || window.DSCore || window.DSForms || {};
  
  const { DataGrid, LOVField } = window.DSGrid || window.DesignSystem || {};

  const { 
    CreditCard, Plus, Edit, Trash2, Save, 
    AlertTriangle, Lock, Users
  } = window.LucideIcons || {};
  
  const supabase = window.supabase;

  const SearchableAccountSelect = ({ accounts, value, onChange, disabled, placeholder, isRtl }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const wrapperRef = useRef(null);
    
    const selectedAcc = accounts.find(a => String(a.id) === String(value));
    const displaySelected = selectedAcc ? `${selectedAcc.code} - ${isRtl ? selectedAcc.titleFa : selectedAcc.titleEn}` : '';

    useEffect(() => {
      const handleClickOutside = (event) => { 
        if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setIsOpen(false); 
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filtered = accounts.filter(a => {
        const searchLower = search.toLowerCase();
        const codeStr = a.code || '';
        const titleStr = (isRtl ? a.titleFa : a.titleEn) || '';
        const pathStr = (isRtl ? a.pathFa : a.pathEn) || '';
        return codeStr.includes(searchLower) || titleStr.includes(searchLower) || pathStr.includes(searchLower);
    });

    return (
      <div className="relative w-full flex flex-col gap-1.5" ref={wrapperRef}>
        <label className="text-[12px] font-bold text-slate-700 dark:text-slate-300">
          {isRtl ? 'حساب مرتبط (آخرین سطح)' : 'Linked Account'}
        </label>
        <div className="relative w-full">
          <input 
            type="text" 
            className={`w-full h-8 px-2.5 bg-white dark:bg-slate-700/40 border border-slate-300 dark:border-slate-500 rounded-lg text-[12px] text-slate-800 dark:text-slate-100 outline-none transition-all focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-400/20 focus:border-indigo-400 disabled:bg-slate-100 dark:disabled:bg-slate-800/50 disabled:text-slate-500 cursor-pointer`}
            value={isOpen ? search : displaySelected} 
            onChange={e => { setSearch(e.target.value); setIsOpen(true); }} 
            onFocus={() => { setIsOpen(true); setSearch(''); }} 
            disabled={disabled} 
            placeholder={placeholder} 
            dir={isRtl ? 'rtl' : 'ltr'}
          />
          {isOpen && !disabled && (
            <div className={`absolute z-[9999] w-[350px] mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-xl max-h-60 overflow-y-auto custom-scrollbar ${isRtl ? 'right-0' : 'left-0'}`}>
              {filtered.length > 0 ? filtered.map(acc => (
                <div key={acc.id} className="px-3 py-2 text-[12px] hover:bg-indigo-50 dark:hover:bg-indigo-500/20 cursor-pointer border-b border-slate-100 dark:border-slate-700 last:border-0" onMouseDown={(e) => { e.preventDefault(); onChange(acc.id); setIsOpen(false); }}>
                  <div className="font-bold text-slate-800 dark:text-slate-200 text-right dir-ltr">{acc.code} - {isRtl ? acc.titleFa : acc.titleEn}</div>
                  <div className="text-slate-500 dark:text-slate-400 truncate mt-0.5 text-[10px] text-right" title={isRtl ? acc.pathFa : acc.pathEn}>{isRtl ? acc.pathFa : acc.pathEn}</div>
                </div>
              )) : (
                <div className="p-3 text-center text-slate-500 text-[12px]">{isRtl ? 'موردی یافت نشد' : 'No results'}</div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const GatewayTypes = ({ isAdmin, language = 'fa' }) => {
    const isRtl = language === 'fa';
    const t = (fa, en) => isRtl ? fa : en;
    
    const [data, setData] = useState([]);
    const [providers, setProviders] = useState([]);
    const [currencies, setCurrencies] = useState([]);
    const [accounts, setAccounts] = useState([]);
    
    const [isLoading, setIsLoading] = useState(false);
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentRecord, setCurrentRecord] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);
    
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, type: null, data: null });
    
    const [formData, setFormData] = useState({
      code: '', 
      title: '', 
      providerId: '', 
      currencyId: '',
      accountId: '',
      minAmount: '', 
      maxAmount: '', 
      validFrom: '',
      validTo: '',
      isActive: true
    });

    const [isPartyModalOpen, setIsPartyModalOpen] = useState(false);
    const [isPartyLoading, setIsPartyLoading] = useState(false);
    const [partyFormData, setPartyFormData] = useState({
      code: '',
      companyName: '',
      nationalId: '',
      mobile: '',
      roles: ['vendor']
    });

    const AVAILABLE_ROLES = [
      { value: 'vendor', label_fa: 'تامین کننده', label_en: 'Provider' },
      { value: 'customer', label_fa: 'مشتری', label_en: 'Customer' },
      { value: 'exchange', label_fa: 'صرافی', label_en: 'Exchange' },
      { value: 'shareholder', label_fa: 'سهامدار', label_en: 'Shareholder' }
    ];

    const [gridState, setGridState] = useState(null);

    const formatPartyName = (p) => {
       if (!p) return '---';
       return p.party_type === 'legal' ? p.company_name : `${p.first_name || ''} ${p.last_name || ''}`.trim();
    };

    const viewConfig = {
      pageId: 'gateway_types_main',
      currentState: () => ({ gridState }),
      onApplyState: (state) => {
        if (state) {
          if (state.gridState) setGridState(state.gridState);
        } else {
          setGridState(null);
        }
      }
    };

    useEffect(() => {
      fetchDropdownData();
      fetchData();
    }, []);

    const fetchDropdownData = async () => {
      try {
        const { data: partiesData } = await supabase
          .from('parties')
          .select('id, first_name, last_name, company_name, party_type, code, mobile')
          .order('created_at', { ascending: false });
        if (partiesData) {
          setProviders(partiesData.map(p => ({ 
            id: p.id, 
            label: formatPartyName(p),
            code: p.code || '---',
            mobile: p.mobile || '---'
          })));
        }

        const { data: currData } = await supabase
          .from('fm_currencies')
          .select('id, title, code')
          .order('code', { ascending: true });
        if (currData) {
          setCurrencies(currData.map(c => ({ value: c.id, label: `${c.title} (${c.code})` })));
        }

        const { data: coaData } = await supabase
          .from('fm_coa_accounts')
          .select('id, parent_id, title_fa, title_en, code');
        if (coaData) {
          const parentIds = new Set(coaData.map(c => c.parent_id).filter(Boolean));
          const leaves = coaData.filter(c => !parentIds.has(c.id));
          
          const buildPath = (node) => {
            let pathFa = node.title_fa || '';
            let pathEn = node.title_en || node.title_fa || '';
            let current = node;
            while(current.parent_id) {
              const parent = coaData.find(c => c.id === current.parent_id);
              if(parent) {
                pathFa = (parent.title_fa || '') + ' > ' + pathFa;
                pathEn = (parent.title_en || parent.title_fa || '') + ' > ' + pathEn;
                current = parent;
              } else { break; }
            }
            return { pathFa, pathEn };
          };

          const accOptions = leaves.map(leaf => {
            const paths = buildPath(leaf);
            return {
              id: leaf.id,
              code: leaf.code,
              titleFa: leaf.title_fa,
              titleEn: leaf.title_en,
              pathFa: paths.pathFa,
              pathEn: paths.pathEn
            };
          });
          setAccounts(accOptions);
        }
      } catch (err) {
        console.error('Fetch Dropdowns Error:', err);
      }
    };

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const { data: gateways, error } = await supabase
          .from('fm_gateways')
          .select(`
            *,
            provider:parties(id, first_name, last_name, company_name, party_type),
            currency:fm_currencies(id, title, code),
            account:fm_coa_accounts(id, title_fa, title_en, code)
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const mappedData = (gateways || []).map(item => ({
          id: item.id,
          code: item.code,
          title: item.title,
          providerId: item.provider_id,
          providerName: formatPartyName(item.provider),
          currencyId: item.currency_id,
          currencyName: item.currency ? `${item.currency.title} (${item.currency.code})` : '---',
          accountId: item.account_id,
          accountName: item.account ? `[${item.account.code}] ${isRtl ? item.account.title_fa : item.account.title_en}` : '---',
          minAmount: item.min_amount,
          maxAmount: item.max_amount,
          validFrom: item.valid_from,
          validTo: item.valid_to,
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
      if (!formData.code || !formData.title || !formData.providerId || !formData.currencyId) return;

      setIsLoading(true);
      try {
        const payload = {
          code: formData.code,
          title: formData.title,
          provider_id: formData.providerId,
          currency_id: formData.currencyId ? parseInt(formData.currencyId) : null,
          account_id: formData.accountId || null,
          min_amount: formData.minAmount || 0,
          max_amount: formData.maxAmount || 0,
          valid_from: formData.validFrom || null,
          valid_to: formData.validTo || null,
          is_active: formData.isActive
        };

        const isNew = !currentRecord?.id;

        const { error } = isNew 
          ? await supabase.from('fm_gateways').insert([payload])
          : await supabase.from('fm_gateways').update(payload).eq('id', currentRecord.id);

        if (error) throw error;
        
        if (isNew && window.AutoNumberingService) {
           await window.AutoNumberingService.consumeNext('GATEWAY_TYPE');
        }

        setIsModalOpen(false);
        fetchData();
      } catch (err) {
        console.error('Save Error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    const handleSaveParty = async () => {
      if (!partyFormData.code || !partyFormData.companyName) return;
      setIsPartyLoading(true);
      try {
        const payload = {
          code: partyFormData.code,
          party_type: 'legal',
          company_name: partyFormData.companyName,
          national_id: partyFormData.nationalId,
          mobile: partyFormData.mobile,
          roles: partyFormData.roles,
          is_active: true
        };
        
        const { data: newPartyData, error } = await supabase.from('parties').insert([payload]).select();
        if (error) throw error;
        
        if (newPartyData && newPartyData.length > 0) {
           const newParty = newPartyData[0];
           setProviders(prev => [...prev, { 
             id: newParty.id, 
             label: formatPartyName(newParty),
             code: newParty.code || '---',
             mobile: newParty.mobile || '---' 
           }].sort((a,b) => a.label.localeCompare(b.label)));
           setFormData(prev => ({ ...prev, providerId: newParty.id }));
           setIsPartyModalOpen(false);
        }
      } catch (err) {
        console.error('Save Party Error:', err);
      } finally {
        setIsPartyLoading(false);
      }
    };

    const handleToggleActive = async (row, newValue) => {
      try {
        const { error } = await supabase
          .from('fm_gateways')
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
          const { error } = await supabase.from('fm_gateways').delete().eq('id', deleteConfirm.data.id);
          if (error) throw error;
        } else if (deleteConfirm.type === 'bulk') {
          const { error } = await supabase.from('fm_gateways').delete().in('id', deleteConfirm.data);
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

    const handleOpenModal = async (record = null) => {
      let nextCode = '';
      if (!record && window.AutoNumberingService) {
        const preview = await window.AutoNumberingService.previewNext('GATEWAY_TYPE');
        if (preview) nextCode = preview.formattedCode;
      }

      setFormData(record ? { ...record } : { 
        code: nextCode, title: '', providerId: '', currencyId: '', accountId: '', minAmount: '', maxAmount: '', 
        validFrom: '', validTo: '', isActive: true 
      });
      setCurrentRecord(record);
      setIsModalOpen(true);
    };

    const columns = [
      { field: 'code', header_fa: 'کد', header_en: 'Code', width: '100px' },
      { field: 'title', header_fa: 'عنوان درگاه', header_en: 'Title', width: '180px' },
      { field: 'providerName', header_fa: 'تامین‌کننده', header_en: 'Provider', width: '150px' },
      { field: 'currencyName', header_fa: 'ارز', header_en: 'Currency', width: '120px' },
      { field: 'accountName', header_fa: 'حساب مرتبط', header_en: 'Linked Account', width: '220px' },
      { 
        field: 'minAmount', 
        header_fa: 'کف تراکنش', 
        header_en: 'Min Amount', 
        width: '130px',
        render: (row) => row.minAmount ? Number(row.minAmount).toLocaleString() : '0'
      },
      { 
        field: 'maxAmount', 
        header_fa: 'سقف تراکنش', 
        header_en: 'Max Amount', 
        width: '130px',
        render: (row) => row.maxAmount ? Number(row.maxAmount).toLocaleString() : '0'
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

    const providerLovColumns = [
      { field: 'code', header_fa: 'کد تامین‌کننده', header_en: 'Code', width: '120px' },
      { field: 'label', header_fa: 'نام شخص/شرکت', header_en: 'Name', width: '250px' },
      { field: 'mobile', header_fa: 'شماره موبایل', header_en: 'Mobile', width: '150px' }
    ];

    return (
      <div className="flex flex-col h-full p-4 bg-[#f8fafc] dark:bg-slate-900" dir={isRtl ? 'rtl' : 'ltr'}>
        <PageHeader 
          title={t('مدیریت درگاه‌های پرداخت', 'Payment Gateways Management')} 
          icon={CreditCard}
          description={t('مدیریت و تعریف درگاه‌های بانکی، ارزها و حساب‌های مرتبط', 'Manage gateways, currencies, and linked accounts')}
          language={language}
          breadcrumbs={[{ label: t('مدیریت مالی', 'Financial') }, { label: t('درگاه‌های پرداخت', 'Gateways') }]}
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
          title={currentRecord ? t('ویرایش درگاه پرداخت', 'Edit Gateway') : t('تعریف درگاه جدید', 'New Gateway')}
          width="max-w-3xl"
          language={language}
        >
          <div className="p-4 flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextField 
                size="sm" 
                label={t('کد درگاه', 'Code')} 
                value={formData.code} 
                onChange={e => setFormData({...formData, code: e.target.value})} 
                isRtl={isRtl} 
                required 
                dir="ltr" 
              />
              <TextField 
                size="sm" 
                label={t('عنوان درگاه', 'Title')} 
                value={formData.title} 
                onChange={e => setFormData({...formData, title: e.target.value})} 
                isRtl={isRtl} 
                required 
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div className="flex items-end gap-2">
                <LOVField 
                  wrapperClassName="flex-1"
                  size="sm" 
                  label={t('تامین‌کننده (شخص/شرکت)', 'Provider')} 
                  data={providers}
                  columns={providerLovColumns}
                  displayValue={providers.find(p => p.id === formData.providerId)?.label || ''}
                  onChange={row => setFormData({...formData, providerId: row ? row.id : ''})}
                  isRtl={isRtl} 
                  required
                />
                <Button 
                  variant="outline" 
                  size="sm" 
                  icon={Plus} 
                  onClick={() => {
                    setPartyFormData({ code: '', companyName: '', nationalId: '', mobile: '', roles: ['vendor'] });
                    setIsPartyModalOpen(true);
                  }}
                  title={t('تعریف شرکت جدید', 'New Party')}
                  className="mb-[1px] h-8 w-8 px-0 shrink-0"
                />
              </div>
              <SearchableAccountSelect 
                accounts={accounts}
                value={formData.accountId} 
                onChange={val => setFormData({...formData, accountId: val})} 
                isRtl={isRtl} 
                placeholder={t('جستجوی حساب...', 'Search Account...')}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CurrencyField 
                size="sm" 
                label={t('کف مبلغ تراکنش', 'Min Amount')} 
                value={formData.minAmount} 
                onChange={val => setFormData({...formData, minAmount: val})} 
                isRtl={isRtl} 
              />
              <CurrencyField 
                size="sm" 
                label={t('سقف مبلغ تراکنش', 'Max Amount')} 
                value={formData.maxAmount} 
                onChange={val => setFormData({...formData, maxAmount: val})} 
                isRtl={isRtl} 
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DatePicker 
                size="sm" 
                label={t('از تاریخ (اعتبار)', 'Valid From')} 
                value={formData.validFrom} 
                onChange={val => setFormData({...formData, validFrom: val})} 
                isRtl={isRtl} 
              />
              <DatePicker 
                size="sm" 
                label={t('تا تاریخ (اعتبار)', 'Valid To')} 
                value={formData.validTo} 
                onChange={val => setFormData({...formData, validTo: val})} 
                isRtl={isRtl} 
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <SelectField 
                size="sm" 
                label={t('نوع ارز', 'Currency')} 
                value={formData.currencyId} 
                onChange={e => setFormData({...formData, currencyId: e.target.value})} 
                options={currencies}
                isRtl={isRtl} 
                required
              />
              <div className="flex items-center pb-1">
                <ToggleField 
                  size="sm" 
                  label={t('وضعیت فعال', 'Active Status')} 
                  checked={formData.isActive} 
                  onChange={v => setFormData({...formData, isActive: v})} 
                  isRtl={isRtl} 
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/50">
              <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>{t('انصراف', 'Cancel')}</Button>
              <Button variant="primary" size="sm" icon={Save} onClick={handleSave} isLoading={isLoading}>{t('ذخیره اطلاعات', 'Save')}</Button>
            </div>
          </div>
        </Modal>

        <Modal 
          isOpen={isPartyModalOpen} onClose={() => setIsPartyModalOpen(false)} 
          title={t('تعریف سریع تامین‌کننده (شرکت)', 'Quick Add Provider (Legal)')}
          width="max-w-md"
          language={language}
        >
          <div className="p-4 flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <TextField 
                size="sm" 
                label={t('کد شخص/شرکت', 'Code')} 
                value={partyFormData.code} 
                onChange={e => setPartyFormData({...partyFormData, code: e.target.value})} 
                isRtl={isRtl} 
                dir="ltr"
                required 
              />
              <TextField 
                size="sm" 
                label={t('شناسه ملی', 'National ID')} 
                value={partyFormData.nationalId} 
                onChange={e => setPartyFormData({...partyFormData, nationalId: e.target.value})} 
                isRtl={isRtl} 
                dir="ltr" 
              />
            </div>
            
            <TextField 
              size="sm" 
              label={t('نام کامل شرکت', 'Company Name')} 
              value={partyFormData.companyName} 
              onChange={e => setPartyFormData({...partyFormData, companyName: e.target.value})} 
              isRtl={isRtl} 
              required 
            />

            <TextField 
              size="sm" 
              label={t('موبایل / تلفن همراه', 'Mobile')} 
              value={partyFormData.mobile} 
              onChange={e => setPartyFormData({...partyFormData, mobile: e.target.value})} 
              isRtl={isRtl} 
              dir="ltr" 
            />

            <div className="mt-2">
              <label className="text-[12px] font-bold text-slate-700 dark:text-slate-300 mb-2 block">{t('نقش‌های مرتبط', 'Associated Roles')}</label>
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                {AVAILABLE_ROLES.map(role => (
                  <CheckboxField 
                    key={role.value}
                    label={isRtl ? role.label_fa : role.label_en}
                    checked={partyFormData.roles.includes(role.value)}
                    onChange={(checked) => {
                        let newRoles = [...partyFormData.roles];
                        if (checked) newRoles.push(role.value);
                        else newRoles = newRoles.filter(r => r !== role.value);
                        setPartyFormData({...partyFormData, roles: newRoles});
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
              <Button variant="outline" size="sm" onClick={() => setIsPartyModalOpen(false)}>{t('انصراف', 'Cancel')}</Button>
              <Button variant="primary" size="sm" icon={Users} onClick={handleSaveParty} isLoading={isPartyLoading}>{t('ثبت شخص/شرکت', 'Save Party')}</Button>
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
                : t(`آیا از حذف درگاه "${deleteConfirm.data?.title}" اطمینان دارید؟`, `Delete gateway "${deleteConfirm.data?.title}"?`)
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

  window.GatewayTypes = GatewayTypes;
})();