/* Filename: financial/GatewayTypes.js */
(() => {
  const React = window.React;
  const { useState, useEffect } = React;
  
  const DS = window.DesignSystem || {};
  const DSCore = window.DSCore || DS;
  const DSForms = window.DSForms || DS;
  const DSGrid = window.DSGrid || DS;
  const DSFeedback = window.DSFeedback || DS;

  const Button = DSCore.Button || DS.Button || (() => null);
  const PageHeader = DSCore.PageHeader || DS.PageHeader || (() => null);
  const Modal = DSFeedback.Modal || DSCore.Modal || DS.Modal || (() => null);
  const EmptyState = DSCore.EmptyState || DS.EmptyState || (() => null);
  const Toast = DSFeedback.Toast || DS.Toast || (() => null);
  
  const TextField = DSForms.TextField || DS.TextField || (() => null);
  const ToggleField = DSForms.ToggleField || DS.ToggleField || (() => null);
  const SelectField = DSForms.SelectField || DS.SelectField || (() => null);
  const CurrencyField = DSForms.CurrencyField || DS.CurrencyField || (() => null);
  const DatePicker = DSForms.DatePicker || DS.DatePicker || (() => null);
  const CheckboxField = DSForms.CheckboxField || DS.CheckboxField || (() => null);
  
  const DataGrid = DSGrid.DataGrid || DS.DataGrid || (() => null);
  const LOVField = DSGrid.LOVField || DS.LOVField || (() => null);

  const { 
    CreditCard, Plus, Edit, Trash2, Save, 
    AlertTriangle, Lock
  } = window.LucideIcons || {};
  
  const supabase = window.supabase;

  const GatewayTypes = ({ isAdmin, language = 'fa' }) => {
    const isRtl = language === 'fa';
    const t = (fa, en) => isRtl ? fa : en;
    
    const [data, setData] = useState([]);
    const [providers, setProviders] = useState([]);
    const [currencies, setCurrencies] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [allCoaAccounts, setAllCoaAccounts] = useState([]);
    const [isQuickAccountModalOpen, setIsQuickAccountModalOpen] = useState(false);
    const [isSavingAccount, setIsSavingAccount] = useState(false);
    const [quickAccountData, setQuickAccountData] = useState({ parentId: '', code: '', titleFa: '', titleEn: '', isActive: true });
    const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' });
    const showToast = (message, type = 'success') => {
      setToast({ isVisible: true, message, type });
      setTimeout(() => setToast(prev => ({ ...prev, isVisible: false })), 3500);
    };

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
    const [quickPartyData, setQuickPartyData] = useState({
      partyType: 'legal',
      companyName: '',
      code: '',
      firstName: '',
      lastName: '',
      latinTitle: '',
      nationalId: '',
      mobile: '',
      email: '',
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

        const [{ data: coaData }, { data: chartsData }] = await Promise.all([
          supabase.from('fm_coa_accounts').select('id, parent_id, title_fa, title_en, code, currency_id, is_active, chart_id'),
          supabase.from('fm_coa_charts').select('id, title, is_active').eq('is_active', true)
        ]);
        if (coaData && chartsData) {
          const activeChartIds = new Set(chartsData.map(c => c.id));
          const chartsMap = new Map(chartsData.map(c => [c.id, c.title]));
          const currenciesMap = new Map((currData || []).map(c => [c.id, c.code]));

          const accMap = new Map(coaData.map(a => [a.id, a]));
          const isEffectivelyActive = (acc) => {
            if (!acc.is_active) return false;
            if (!acc.parent_id) return true;
            const parent = accMap.get(acc.parent_id);
            return parent ? isEffectivelyActive(parent) : true;
          };

          const buildPath = (node) => {
            let pathFa = node.title_fa || '';
            let pathEn = node.title_en || node.title_fa || '';
            let current = node;
            while(current.parent_id) {
              const parent = accMap.get(current.parent_id);
              if(parent) {
                pathFa = (parent.title_fa || '') + ' / ' + pathFa;
                pathEn = (parent.title_en || parent.title_fa || '') + ' / ' + pathEn;
                current = parent;
              } else { break; }
            }
            return { pathFa, pathEn };
          };

          const parentIds = new Set(coaData.map(c => c.parent_id).filter(Boolean));
          const leaves = coaData.filter(c =>
            !parentIds.has(c.id) &&
            activeChartIds.has(c.chart_id) &&
            isEffectivelyActive(c)
          );

          const accOptions = leaves.map(leaf => {
            const paths = buildPath(leaf);
            return {
              id: leaf.id,
              code: leaf.code,
              titleFa: leaf.title_fa,
              titleEn: leaf.title_en,
              pathFa: paths.pathFa,
              pathEn: paths.pathEn,
              chartName: chartsMap.get(leaf.chart_id) || '',
              currency_code: currenciesMap.get(leaf.currency_id) || ''
            };
          });
          setAccounts(accOptions);

          const allWithPaths = coaData.map(acc => {
            const paths = buildPath(acc);
            return { ...acc, pathFa: paths.pathFa, pathEn: paths.pathEn, chartName: chartsMap.get(acc.chart_id) || '', isActiveChart: activeChartIds.has(acc.chart_id), currency_code: currenciesMap.get(acc.currency_id) || '' };
          });
          setAllCoaAccounts(allWithPaths);
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
           try {
               await window.AutoNumberingService.consumeNext('GATEWAYS');
           } catch(err) {
               console.error('AutoNumbering consume error:', err);
           }
        }

        setIsModalOpen(false);
        fetchData();
      } catch (err) {
        console.error('Save Error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    const handleSaveQuickParty = async () => {
      const isLegal = quickPartyData.partyType === 'legal';
      if (!quickPartyData.code || !quickPartyData.latinTitle || (isLegal && !quickPartyData.companyName) || (!isLegal && (!quickPartyData.firstName || !quickPartyData.lastName))) {
         alert(t('لطفاً فیلدهای ستاره‌دار را تکمیل کنید.', 'Please fill required fields.'));
         return;
      }
      
      setIsPartyLoading(true);
      try {
        const payload = {
          party_type: quickPartyData.partyType,
          code: quickPartyData.code,
          first_name: isLegal ? null : quickPartyData.firstName,
          last_name: isLegal ? null : quickPartyData.lastName,
          company_name: isLegal ? quickPartyData.companyName : null,
          latin_title: quickPartyData.latinTitle,
          national_id: quickPartyData.nationalId,
          mobile: quickPartyData.mobile,
          email: quickPartyData.email,
          roles: Array.from(new Set([...quickPartyData.roles, 'vendor'])), 
          is_active: true,
          created_at: new Date().toISOString()
        };

        const { data: newPartyData, error } = await supabase.from('parties').insert([payload]).select();
        
        if (error) {
           if (error.code === '23505') {
             alert(t('کد شخص یا شناسه ملی تکراری است.', 'Duplicate party code or national ID.'));
           } else {
             throw error;
           }
           return;
        }
        
        if (newPartyData && newPartyData.length > 0) {
           const newParty = newPartyData[0];
           const partyLabel = isLegal 
                ? `${newParty.company_name} (${newParty.code})`
                : `${newParty.first_name} ${newParty.last_name} (${newParty.code})`;

           setProviders(prev => [...prev, { 
             id: newParty.id, 
             label: partyLabel,
             code: newParty.code || '---',
             mobile: newParty.mobile || '---' 
           }].sort((a,b) => a.label.localeCompare(b.label)));
           
           setFormData(prev => ({ ...prev, providerId: newParty.id }));
           setIsPartyModalOpen(false);
           setQuickPartyData({ partyType: 'legal', companyName: '', code: '', firstName: '', lastName: '', latinTitle: '', nationalId: '', mobile: '', email: '', roles: ['vendor'] });
        }
      } catch (err) {
        console.error('Save Party Error:', err);
        alert(t('خطا در ذخیره اطلاعات شخص.', 'Error saving party.'));
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

    const suggestNextCode = (parentId) => {
      const parent = allCoaAccounts.find(a => a.id === parentId);
      if (!parent || !parent.code) return '';
      const parentCode = parent.code;
      const children = allCoaAccounts.filter(a => a.parent_id === parentId);
      if (children.length === 0) return parentCode + '01';
      const nums = children
        .map(c => { const s = c.code?.startsWith(parentCode) ? c.code.slice(parentCode.length) : c.code; return parseInt(s, 10); })
        .filter(n => !isNaN(n));
      const nextNum = (nums.length > 0 ? Math.max(...nums) : 0) + 1;
      return parentCode + String(nextNum).padStart(2, '0');
    };

    const openQuickAccountModal = () => {
      setQuickAccountData({ parentId: '', code: '', titleFa: formData.title || '', titleEn: formData.title || '', isActive: true });
      setIsQuickAccountModalOpen(true);
    };

    const handleSaveQuickAccount = async () => {
      if (!quickAccountData.parentId || !quickAccountData.code || !quickAccountData.titleFa) {
        showToast(t('حساب پدر، کد و عنوان فارسی الزامی هستند', 'Parent account, code and Persian title are required'), 'error');
        return;
      }
      setIsSavingAccount(true);
      try {
        const parentAcc = allCoaAccounts.find(a => a.id === quickAccountData.parentId);
        const payload = {
          parent_id: quickAccountData.parentId,
          chart_id: parentAcc?.chart_id || null,
          code: quickAccountData.code,
          title_fa: quickAccountData.titleFa,
          title_en: quickAccountData.titleEn || quickAccountData.titleFa,
          is_active: quickAccountData.isActive ?? true,
          created_at: new Date().toISOString()
        };
        const { data: newAcc, error } = await supabase.from('fm_coa_accounts').insert([payload]).select().single();
        if (error) {
          if (error.code === '23505') showToast(t('کد حساب تکراری است', 'Account code already exists'), 'error');
          else throw error;
          return;
        }
        const buildPathLocal = (node, allAccs) => {
          let parts = [node.title_fa || ''];
          let cur = allAccs.find(a => a.id === node.parent_id);
          while (cur) { parts.unshift(cur.title_fa || ''); cur = allAccs.find(a => a.id === cur.parent_id); }
          return parts.join(' / ');
        };
        const updatedAll = [...allCoaAccounts, newAcc];
        setAllCoaAccounts(updatedAll);
        const newAccOption = {
          id: newAcc.id,
          code: newAcc.code,
          titleFa: newAcc.title_fa,
          titleEn: newAcc.title_en,
          pathFa: buildPathLocal(newAcc, updatedAll),
          pathEn: buildPathLocal(newAcc, updatedAll),
          chartName: parentAcc?.chartName || '',
          currency_code: ''
        };
        setAccounts(prev => [...prev, newAccOption]);
        setFormData(prev => ({ ...prev, accountId: newAcc.id }));
        setIsQuickAccountModalOpen(false);
        showToast(t('حساب با موفقیت ایجاد شد', 'Account created successfully'));
      } catch (err) {
        console.error('Save Quick Account Error:', err);
        showToast(t('خطا در ایجاد حساب', 'Error creating account'), 'error');
      } finally {
        setIsSavingAccount(false);
      }
    };

    const handleOpenModal = async (record = null) => {
      let nextCode = '';
      if (!record && window.AutoNumberingService) {
        try {
            const preview = await window.AutoNumberingService.previewNext('GATEWAYS');
            if (preview && preview.formattedCode) {
                nextCode = preview.formattedCode;
            } else if (typeof preview === 'string') {
                nextCode = preview;
            }
        } catch (err) {
            console.error('AutoNumbering Error:', err);
        }
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

    const accountLovColumns = [
      { field: 'chartName', header_fa: 'ساختار حساب', header_en: 'Chart Structure', width: '80px' },
      { field: 'code', header_fa: 'کد حساب', header_en: 'Code', width: '80px' },
      { field: 'titleFa', header_fa: 'عنوان حساب', header_en: 'Title', width: '240px', render: (val, row) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-800 dark:text-slate-200">{val}</span>
          {row.pathFa && <span className="text-[10px] text-slate-500 truncate" title={row.pathFa}>{row.pathFa}</span>}
        </div>
      )},
      { field: 'currency_code', header_fa: 'ارز', header_en: 'Currency', width: '60px' }
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
                    setQuickPartyData({ partyType: 'legal', companyName: '', code: '', firstName: '', lastName: '', nationalId: '', mobile: '', email: '', roles: ['vendor'] });
                    setIsPartyModalOpen(true);
                  }}
                  title={t('تعریف شخص جدید', 'New Party')}
                  className="mb-[1px] h-8 w-8 px-0 shrink-0"
                />
              </div>

              <div className="flex items-end gap-2">
                <div className="flex-1 min-w-0">
                  <LOVField 
                    size="sm" 
                    label={isRtl ? 'حساب مرتبط (آخرین سطح)' : 'Linked Account'}
                    data={accounts}
                    columns={accountLovColumns}
                    dropdownWidth="min-w-[470px] max-w-[470px]"
                    displayValue={accounts.find(a => String(a.id) === String(formData.accountId))?.titleFa ? `${accounts.find(a => String(a.id) === String(formData.accountId))?.code} - ${accounts.find(a => String(a.id) === String(formData.accountId))?.titleFa}` : ''}
                    onChange={row => setFormData({...formData, accountId: row ? row.id : ''})}
                    isRtl={isRtl} 
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  icon={Plus}
                  onClick={openQuickAccountModal}
                  className="h-8 w-8 px-0 shrink-0 border-indigo-200 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-900/40 mb-[1px]"
                  title={t('تعریف حساب جدید', 'Add New Account')}
                />
              </div>

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

              <DatePicker 
                size="sm" 
                label={t('از تاریخ (اعتبار)', 'Valid From')} 
                value={formData.validFrom} 
                onChange={val => setFormData({...formData, validFrom: val})} 
                isRtl={isRtl} 
                dir="ltr"
              />
              <DatePicker 
                size="sm" 
                label={t('تا تاریخ (اعتبار)', 'Valid To')} 
                value={formData.validTo} 
                onChange={val => setFormData({...formData, validTo: val})} 
                isRtl={isRtl} 
                dir="ltr"
              />

              <SelectField 
                size="sm" 
                label={t('نوع ارز', 'Currency')} 
                value={formData.currencyId} 
                onChange={e => setFormData({...formData, currencyId: e.target.value})} 
                options={currencies}
                isRtl={isRtl} 
                required
              />
              <div className="flex items-center mt-6">
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
          isOpen={isPartyModalOpen}
          onClose={() => setIsPartyModalOpen(false)}
          title={t('تعریف سریع شخص / شرکت', 'Quick Add Party')}
          width="max-w-3xl"
          language={language}
        >
          <div className="p-4 flex flex-col gap-4">
            <div className="mb-2">
               <SelectField 
                  size="sm" 
                  label={t('نوع شخص', 'Party Type')} 
                  value={quickPartyData.partyType} 
                  onChange={e => setQuickPartyData({...quickPartyData, partyType: e.target.value, companyName: '', firstName: '', lastName: '', latinTitle: '', roles: ['vendor']})} 
                  isRtl={isRtl}
                  options={[
                    { value: 'real', label: t('حقیقی (فرد)', 'Real Person') },
                    { value: 'legal', label: t('حقوقی (شرکت)', 'Legal Entity') }
                  ]}
               />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <TextField size="sm" label={t('کد شخص/شرکت', 'Party Code')} value={quickPartyData.code} onChange={e => setQuickPartyData({...quickPartyData, code: e.target.value})} isRtl={isRtl} required dir="ltr" />
              
              {quickPartyData.partyType === 'real' ? (
                  <>
                    <TextField size="sm" label={t('نام', 'First Name')} value={quickPartyData.firstName} onChange={e => setQuickPartyData({...quickPartyData, firstName: e.target.value})} isRtl={isRtl} required />
                    <TextField size="sm" label={t('نام خانوادگی', 'Last Name')} value={quickPartyData.lastName} onChange={e => setQuickPartyData({...quickPartyData, lastName: e.target.value})} isRtl={isRtl} required />
                  </>
              ) : (
                  <div className="md:col-span-2">
                    <TextField size="sm" label={t('نام شرکت', 'Company Name')} value={quickPartyData.companyName} onChange={e => setQuickPartyData({...quickPartyData, companyName: e.target.value})} isRtl={isRtl} required />
                  </div>
              )}

              <TextField size="sm" label={t('عنوان لاتین', 'Latin Title')} value={quickPartyData.latinTitle} onChange={e => setQuickPartyData({...quickPartyData, latinTitle: e.target.value})} isRtl={isRtl} required dir="ltr" />
              <TextField size="sm" label={quickPartyData.partyType === 'real' ? t('کد ملی', 'National ID') : t('شناسه ملی / ثبت', 'Registration ID')} value={quickPartyData.nationalId} onChange={e => setQuickPartyData({...quickPartyData, nationalId: e.target.value})} isRtl={isRtl} dir="ltr" />
              <TextField size="sm" label={t('موبایل / تلفن', 'Mobile / Phone')} value={quickPartyData.mobile} onChange={e => setQuickPartyData({...quickPartyData, mobile: e.target.value})} isRtl={isRtl} dir="ltr" />
              <TextField size="sm" label={t('ایمیل', 'Email')} value={quickPartyData.email} onChange={e => setQuickPartyData({...quickPartyData, email: e.target.value})} isRtl={isRtl} dir="ltr" />
              <div className="md:col-span-2 flex flex-col justify-end">
                <label className="text-[12px] font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">{t('نقش‌های مرتبط', 'Associated Roles')}</label>
                <div className="flex flex-wrap gap-x-4 gap-y-2 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 rounded-lg border border-slate-100 dark:border-slate-700/50">
                  {AVAILABLE_ROLES.map(role => (
                    <CheckboxField 
                      key={role.value} 
                      size="sm" 
                      label={isRtl ? role.label_fa : role.label_en} 
                      checked={quickPartyData.roles.includes(role.value)} 
                      disabled={role.value === 'vendor'} 
                      onChange={(checked) => {
                        if (role.value === 'vendor') return;
                        setQuickPartyData(prev => ({
                          ...prev,
                          roles: checked ? [...prev.roles, role.value] : prev.roles.filter(r => r !== role.value)
                        }));
                      }} 
                      isRtl={isRtl} 
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/50">
              <Button variant="outline" size="sm" onClick={() => setIsPartyModalOpen(false)}>{t('انصراف', 'Cancel')}</Button>
              <Button variant="primary" size="sm" icon={Save} onClick={handleSaveQuickParty} isLoading={isPartyLoading}>{t('ذخیره و انتخاب', 'Save & Select')}</Button>
            </div>
          </div>
        </Modal>

        <Modal
          isOpen={isQuickAccountModalOpen}
          onClose={() => setIsQuickAccountModalOpen(false)}
          title={t('تعریف سریع حساب مرتبط', 'Quick Add Account')}
          width="max-w-2xl"
          language={language}
        >
          <div className="p-4 flex flex-col gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-3">
              <p className="text-[12px] text-blue-700 dark:text-blue-300 font-medium leading-relaxed">
                {t('ابتدا حساب پدر را از طریق LOV انتخاب کنید، سپس کد و عنوان حساب جدید را وارد کنید.', 'First select the parent account via LOV, then enter the code and title for the new account.')}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <LOVField
                  wrapperClassName="w-full"
                  size="sm"
                  label={t('حساب پدر', 'Parent Account')}
                  data={(() => {
                    const allCoaMap = new Map(allCoaAccounts.map(a => [a.id, a]));
                    const checkActive = (acc) => {
                      if (!acc) return true;
                      if (!acc.is_active) return false;
                      if (!acc.parent_id) return true;
                      return checkActive(allCoaMap.get(acc.parent_id));
                    };
                    const parentIdSet = new Set(allCoaAccounts.map(a => a.parent_id).filter(Boolean));
                    return allCoaAccounts.filter(a =>
                      a.isActiveChart &&
                      checkActive(a) &&
                      allCoaAccounts.some(c => c.parent_id === a.id && !parentIdSet.has(c.id))
                    );
                  })()}
                  columns={[
                    { field: 'chartName', header_fa: 'ساختار', header_en: 'Chart', width: '80px' },
                    { field: 'code', header_fa: 'کد', header_en: 'Code', width: '80px' },
                    { field: 'title_fa', header_fa: 'عنوان', header_en: 'Title', width: '240px', render: (val, row) => (
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800 dark:text-slate-200">{val}</span>
                        {row.pathFa && <span className="text-[10px] text-slate-500 truncate" title={row.pathFa}>{row.pathFa}</span>}
                      </div>
                    )},
                    { field: 'currency_code', header_fa: 'ارز', header_en: 'Currency', width: '60px' }
                  ]}
                  dropdownWidth="min-w-[430px] max-w-[430px]"
                  displayValue={(() => { const a = allCoaAccounts.find(x => x.id === quickAccountData.parentId); return a ? `${a.code} - ${a.title_fa}` : ''; })()}
                  onChange={row => {
                    const suggested = row ? suggestNextCode(row.id) : '';
                    setQuickAccountData(prev => ({ ...prev, parentId: row ? row.id : '', code: suggested }));
                  }}
                  isRtl={isRtl}
                  required
                />
              </div>
              <TextField
                size="sm"
                label={t('کد حساب', 'Account Code')}
                value={quickAccountData.code}
                onChange={e => setQuickAccountData(prev => ({ ...prev, code: e.target.value }))}
                isRtl={isRtl}
                dir="ltr"
                required
              />
              <div className="flex items-end pb-1">
                <ToggleField size="sm" label={t('حساب فعال است', 'Is Active')} checked={quickAccountData.isActive ?? true} onChange={v => setQuickAccountData(prev => ({ ...prev, isActive: v }))} isRtl={isRtl} />
              </div>
              <TextField
                size="sm"
                label={t('عنوان فارسی', 'Persian Title')}
                value={quickAccountData.titleFa}
                onChange={e => setQuickAccountData(prev => ({ ...prev, titleFa: e.target.value }))}
                isRtl={isRtl}
                required
              />
              <TextField
                size="sm"
                label={t('عنوان انگلیسی', 'English Title')}
                value={quickAccountData.titleEn}
                onChange={e => setQuickAccountData(prev => ({ ...prev, titleEn: e.target.value }))}
                isRtl={isRtl}
                dir="ltr"
              />
            </div>
            <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-slate-100 dark:border-slate-700/50">
              <Button variant="outline" size="sm" onClick={() => setIsQuickAccountModalOpen(false)}>{t('انصراف', 'Cancel')}</Button>
              <Button variant="primary" size="sm" icon={Save} onClick={handleSaveQuickAccount} isLoading={isSavingAccount}>{t('ذخیره و انتخاب', 'Save & Select')}</Button>
            </div>
          </div>
        </Modal>

        <Modal isOpen={deleteConfirm.isOpen} onClose={() => setDeleteConfirm({ isOpen: false, type: null, data: null })} title={t('تایید عملیات حذف', 'Confirm Deletion')} language={language} width="max-w-sm">
          <EmptyState
            icon={AlertTriangle}
            title={t('هشدار: غیرقابل بازگشت', 'WARNING: IRREVERSIBLE')}
            description={deleteConfirm.type === 'bulk' 
              ? t(`آیا از حذف ${deleteConfirm.data?.length} مورد انتخاب شده اطمینان دارید؟`, `Delete ${deleteConfirm.data?.length} selected items?`)
              : t(`آیا از حذف درگاه "${deleteConfirm.data?.title}" اطمینان دارید؟`, `Delete gateway "${deleteConfirm.data?.title}"?`)
            }
            action={
              <div className="flex gap-2 w-full mt-2 px-4">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setDeleteConfirm({ isOpen: false, type: null, data: null })}>{t('انصراف', 'Cancel')}</Button>
                <Button variant="danger" size="sm" onClick={executeDelete} isLoading={isLoading} className="flex-1">{t('تایید حذف', 'Delete')}</Button>
              </div>
            }
          />
        </Modal>
        <Toast isVisible={toast.isVisible} message={toast.message} type={toast.type} onClose={() => setToast(prev => ({ ...prev, isVisible: false }))} language={language} />
      </div>
    );
  };

  window.GatewayTypes = GatewayTypes;
})();