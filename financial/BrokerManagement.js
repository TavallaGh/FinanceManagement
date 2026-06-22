/* Filename: financial/BrokerManagement.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useMemo, useRef } = React;
  
  const Fallback = () => null;
  const DS = window.DesignSystem || {};
  const DSCore = window.DSCore || DS;
  const DSForms = window.DSForms || DS;
  const DSGrid = window.DSGrid || DS;
  const DSFeedback = window.DSFeedback || DS;

  const Button = DSCore.Button || DS.Button || Fallback;
  const PageHeader = DSCore.PageHeader || DS.PageHeader || Fallback;
  const Modal = DSFeedback.Modal || DS.Modal || Fallback;
  const Toast = DSFeedback.Toast || DS.Toast || Fallback;
  const DataGrid = DSGrid.DataGrid || DS.DataGrid || Fallback;
  const LOVField = DSGrid.LOVField || DS.LOVField || Fallback;
  const TextField = DSForms.TextField || DS.TextField || Fallback;
  const SelectField = DSForms.SelectField || DS.SelectField || Fallback;
  const ToggleField = DSForms.ToggleField || DS.ToggleField || Fallback;
  const CheckboxField = DSForms.CheckboxField || DS.CheckboxField || Fallback;
  const DatePicker = DSForms.DatePicker || DS.DatePicker || Fallback;
  const LogTimeline = DSFeedback.LogTimeline || DS.LogTimeline || Fallback;
  const EmptyState = DSCore.EmptyState || DS.EmptyState || Fallback;
  const Badge = DSCore.Badge || DS.Badge || Fallback;

  // برمی‌گرداند اعتبار زمانی بروکر — بر اساس valid_from / valid_to
  const getBrokerValidityStatus = (validFrom, validTo) => {
    const today = new Date().toISOString().split('T')[0];
    if (validTo   && validTo   < today) return 'expired';
    if (validFrom && validFrom > today) return 'notyet';
    return 'valid';
  };
  
  const LucideIcons = window.LucideIcons || {};
  const FallbackIcon = () => null;
  const Edit = LucideIcons.Edit || FallbackIcon;
  const Trash2 = LucideIcons.Trash2 || FallbackIcon;
  const Save = LucideIcons.Save || FallbackIcon;
  const AlertTriangle = LucideIcons.AlertTriangle || FallbackIcon;
  const Lock = LucideIcons.Lock || FallbackIcon;
  const Plus = LucideIcons.Plus || FallbackIcon;
  const Briefcase = LucideIcons.Briefcase || FallbackIcon;
  const Percent = LucideIcons.Percent || FallbackIcon;
  const History = LucideIcons.History || FallbackIcon;
  
  const supabase = window.supabase;

  const BrokerManagement = ({ language = 'fa' }) => {
    const isRtl = language === 'fa';
    const t = (fa, en) => isRtl ? fa : en;
    const currentUser = window.NavigationSystem?.currentUser?.name || 'مدیر سیستم';
    
    const [data, setData] = useState([]);
    const [allParties, setAllParties] = useState([]);
    const [partiesDropdown, setPartiesDropdown] = useState([]);
    const [accounts, setAccounts] = useState([]);

    const [isLoading, setIsLoading] = useState(false);
    const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' });
    const showToast = (message, type = 'success') => {
      setToast({ isVisible: true, message, type });
      setTimeout(() => setToast(prev => ({ ...prev, isVisible: false })), 3500);
    };

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentRecord, setCurrentRecord] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);
    
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, type: null, data: null });
    
    const [logModal, setLogModal] = useState({ isOpen: false, recordId: null });
    const [recordLogs, setRecordLogs] = useState([]);
    const [isLogsLoading, setIsLogsLoading] = useState(false);

    const [formData, setFormData] = useState({
      partyId: '',
      accountId: '',
      validFrom: '',
      validTo: '',
      isActive: true
    });

    const [isQuickPartyModalOpen, setIsQuickPartyModalOpen] = useState(false);
    const [isSavingParty, setIsSavingParty] = useState(false);
    const [quickPartyData, setQuickPartyData] = useState({
      partyType: 'real',
      companyName: '',
      code: '',
      firstName: '',
      lastName: '',
      nationalId: '',
      mobile: '',
      email: '',
      roles: ['broker']
    });

    const [isContractsModalOpen, setIsContractsModalOpen] = useState(false);
    const [selectedBroker, setSelectedBroker] = useState(null);

    const EXTERNAL_PARTY_ROLES = [
      { id: 'customer', label: t('مشتری', 'Customer') },
      { id: 'supplier', label: t('تامین‌کننده', 'Supplier') },
      { id: 'shareholder', label: t('سهامدار', 'Shareholder') },
      { id: 'broker', label: t('بروکر', 'Broker') }
    ];

    const [gridState, setGridState] = useState(null);

    const viewConfig = {
      pageId: 'brokers_main',
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
          console.error('Fetch Accounts Error:', err);
        }
    };

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [
          { data: pData, error: pError },
          { data: brokersData, error: bError }
        ] = await Promise.all([
          supabase.from('parties').select('id, first_name, last_name, company_name, party_type, code, roles, mobile, email'),
          supabase.from('fm_brokers').select('*, account:fm_coa_accounts(id, title_fa, title_en, code, currency_id)').order('created_at', { ascending: false })
        ]);
          
        if (pData && !pError) {
          setAllParties(pData);
          setPartiesDropdown(pData.map(p => ({
            id: p.id,
            label: `${p.party_type === 'legal' ? (p.company_name || '') : ((p.first_name || '') + ' ' + (p.last_name || '')).trim()} (${p.code})`,
            code: p.code || '---',
            mobile: p.mobile || '---',
            email: p.email
          })));
        }

        if (bError) throw bError;
        
        const mappedData = (brokersData || []).map(item => {
          const party = (pData || []).find(p => p.id === item.party_id);
          const brokerName = party
            ? (party.party_type === 'legal'
                ? (party.company_name || '-')
                : `${party.first_name || ''} ${party.last_name || ''}`.trim() || '-')
            : '-';
          return {
            ...item,
            brokerName,
            accountName: item.account ? `[${item.account.code}] ${isRtl ? item.account.title_fa : item.account.title_en}` : '---'
          };
        });

        setData(mappedData);

      } catch (err) {
        console.error('Fetch Error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    const logAction = async (entityType, recordId, action, details = '', oldData = null, newData = null) => {
      try {
        if (!supabase) return;
        await supabase.from('fm_record_logs').insert([{
          entity_type: entityType, record_id: String(recordId), action: action, user_name: currentUser,
          details: details, old_data: oldData, new_data: newData
        }]);
      } catch (err) {
        console.error('Failed to log action:', err);
      }
    };

    const openLogModal = async (entityType, recordId) => {
      setLogModal({ isOpen: true, recordId });
      setIsLogsLoading(true);
      try {
        if (!supabase) throw new Error("Supabase is not initialized");
        const { data, error } = await supabase
          .from('fm_record_logs')
          .select('*')
          .eq('entity_type', entityType)
          .eq('record_id', String(recordId))
          .order('timestamp', { ascending: false });
        if (error) throw error;
        setRecordLogs(data || []);
      } catch (err) {
        console.error(err);
        alert(t('خطا در دریافت تاریخچه تغییرات', 'Error fetching logs'));
      } finally {
        setIsLogsLoading(false);
      }
    };

    const handleSaveBroker = async () => {
      if (!formData.partyId) {
        alert(t('انتخاب شخص/شرکت الزامی است.', 'Party selection is required.'));
        return;
      }

      if (formData.validFrom && formData.validTo) {
          const fromDate = new Date(formData.validFrom);
          const toDate = new Date(formData.validTo);
          if (toDate < fromDate) {
              alert(t('تاریخ پایان اعتبار نمی‌تواند قبل از تاریخ شروع باشد.', 'Valid To date cannot be earlier than Valid From date.'));
              return;
          }
      }

      setIsLoading(true);
      try {
        const payload = {
          party_id: formData.partyId,
          account_id: formData.accountId || null,
          valid_from: formData.validFrom || null,
          valid_to: formData.validTo || null,
          is_active: formData.isActive,
          updated_at: new Date().toISOString()
        };

        if (currentRecord?.id) {
          const { error } = await supabase.from('fm_brokers').update(payload).eq('id', currentRecord.id);
          if (error) {
             if (error.code === '23505') alert(t('این بروکر قبلاً ثبت شده است.', 'This broker is already registered.'));
             else throw error;
             return;
          }
          await logAction('fm_brokers', currentRecord.id, 'update', `ویرایش اطلاعات بروکر`, currentRecord, { ...currentRecord, ...payload });
        } else {
          const { data: newRec, error } = await supabase.from('fm_brokers').insert([payload]).select();
          if (error) {
             if (error.code === '23505') alert(t('این بروکر قبلاً ثبت شده است.', 'This broker is already registered.'));
             else throw error;
             return;
          }
          if (newRec && newRec.length > 0) {
             await logAction('fm_brokers', newRec[0].id, 'create', `تعریف بروکر جدید`, null, newRec[0]);
          }
        }
        
        setIsModalOpen(false);
        fetchData();
      } catch (err) {
        console.error('Save Broker Error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    const handleSaveQuickParty = async () => {
      const isLegal = quickPartyData.partyType === 'legal';
      if (!quickPartyData.code || (isLegal && !quickPartyData.companyName) || (!isLegal && (!quickPartyData.firstName || !quickPartyData.lastName))) {
         alert(t('لطفاً فیلدهای ستاره‌دار را تکمیل کنید.', 'Please fill required fields.'));
         return;
      }
      
      setIsSavingParty(true);
      try {
        const payload = {
          party_type: quickPartyData.partyType,
          code: quickPartyData.code,
          first_name: isLegal ? null : quickPartyData.firstName,
          last_name: isLegal ? null : quickPartyData.lastName,
          company_name: isLegal ? quickPartyData.companyName : null,
          national_id: quickPartyData.nationalId,
          mobile: quickPartyData.mobile,
          email: quickPartyData.email,
          roles: Array.from(new Set([...quickPartyData.roles, 'broker'])), 
          is_active: true,
          created_at: new Date().toISOString()
        };

        const { data: newPartyData, error } = await supabase.from('parties').insert([payload]).select().single();
        
        if (error) {
           if (error.code === '23505') {
             alert(t('کد شخص یا شناسه ملی تکراری است.', 'Duplicate party code or national ID.'));
           } else {
             throw error;
           }
           return;
        }

        const partyLabel = isLegal 
            ? `${newPartyData.company_name} (${newPartyData.code})`
            : `${newPartyData.first_name} ${newPartyData.last_name} (${newPartyData.code})`;

        const newDropdownItem = {
          id: newPartyData.id,
          label: partyLabel,
          code: newPartyData.code || '---',
          mobile: newPartyData.mobile || '---',
          email: newPartyData.email
        };

        setAllParties(prev => [...prev, newPartyData]);
        setPartiesDropdown(prev => [...prev, newDropdownItem]);

        setFormData(prev => ({
          ...prev,
          partyId: newPartyData.id
        }));

        setIsQuickPartyModalOpen(false);
        setQuickPartyData({ partyType: 'real', companyName: '', code: '', firstName: '', lastName: '', nationalId: '', mobile: '', email: '', roles: ['broker'] });
      } catch (err) {
        console.error('Save Quick Party Error:', err);
        alert(t('خطا در ذخیره اطلاعات شخص.', 'Error saving party.'));
      } finally {
        setIsSavingParty(false);
      }
    };

    const handleToggleActive = async (row, newValue) => {
      try {
        const oldRec = data.find(item => item.id === row.id);
        const { error } = await supabase
          .from('fm_brokers')
          .update({ is_active: newValue })
          .eq('id', row.id);
        
        if (error) throw error;
        await logAction('fm_brokers', row.id, 'update', newValue ? 'فعال‌سازی بروکر' : 'غیرفعال‌سازی بروکر', oldRec, { ...oldRec, is_active: newValue });
        setData(prev => prev.map(item => item.id === row.id ? { ...item, is_active: newValue } : item));
      } catch (err) {
        console.error("Toggle Error:", err);
      }
    };

    const executeDelete = async () => {
      setIsLoading(true);
      try {
        if (deleteConfirm.type === 'single') {
          const oldRec = data.find(c => c.id === deleteConfirm.data.id);
          const { error } = await supabase.from('fm_brokers').delete().eq('id', deleteConfirm.data.id);
          if (error) throw error;
          await logAction('fm_brokers', deleteConfirm.data.id, 'delete', `حذف بروکر`, oldRec, null);
        } else if (deleteConfirm.type === 'bulk') {
          const oldRecords = deleteConfirm.data.map(id => data.find(c => c.id === id)).filter(Boolean);
          const { error } = await supabase.from('fm_brokers').delete().in('id', deleteConfirm.data);
          if (error) throw error;
          for (const oldRec of oldRecords) {
              await logAction('fm_brokers', oldRec.id, 'delete', `حذف گروهی بروکر`, oldRec, null);
          }
        }
        
        setSelectedIds([]);
        fetchData();
        setDeleteConfirm({ isOpen: false, type: null, data: null });
      } catch (err) {
        console.error("Delete error:", err);
        alert(t('خطا در حذف اطلاعات. ممکن است رکوردهای وابسته وجود داشته باشد.', 'Deletion error. There might be dependent records.'));
      } finally {
        setIsLoading(false);
      }
    };

    const handleOpenModal = (record = null) => {
      setFormData(record ? {
        partyId: record.party_id || '',
        accountId: record.account_id || '',
        validFrom: record.valid_from ? record.valid_from.substring(0, 10) : '',
        validTo: record.valid_to ? record.valid_to.substring(0, 10) : '',
        isActive: record.is_active ?? true
      } : { 
        partyId: '',
        accountId: '',
        validFrom: '',
        validTo: '',
        isActive: true
      });
      setCurrentRecord(record);
      setIsModalOpen(true);
    };

    const getPartyName = (partyId) => {
      if (!partyId) return '-';
      const p = allParties.find(x => x.id === partyId);
      if (!p) return '-';
      return p.party_type === 'legal' ? p.company_name : `${p.first_name || ''} ${p.last_name || ''}`.trim();
    };

    const handleDownloadSample = () => {
      const headers = isRtl
        ? 'کد Party,نام Party (برای اطمینان),کد حساب مرتبط,تاریخ اعتبار از (YYYY-MM-DD),تاریخ اعتبار تا (YYYY-MM-DD),وضعیت (1/0)'
        : 'Party Code,Party Name (for reference),Linked Account Code,Valid From (YYYY-MM-DD),Valid To (YYYY-MM-DD),Status (1/0)';

      const sampleRows = [
        'BRK001,شرکت آلفا تجارت,11101,2024-01-01,2024-12-31,1',
        'BRK002,محمد احمدی,,2024-03-01,,1',
      ];

      const csv = '\uFEFF' + headers + '\n' + sampleRows.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', 'Brokers_Import_Sample.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    const handleImportBrokers = (file) => {
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const cleanText = (e.target.result || '').replace(/^\uFEFF/, '');
          const lines = cleanText.split(/\r?\n/).filter(l => l.trim());

          if (lines.length < 2) {
            return showToast(t('فایل خالی یا نامعتبر است', 'File is empty or invalid'), 'error');
          }

          const rows = lines.slice(1).map(line => {
            const parts = line.split(',');
            return {
              partyCode:   (parts[0] || '').trim(),
              partyName:   (parts[1] || '').trim().replace(/^"|"$/g, ''),
              accountCode: (parts[2] || '').trim(),
              validFrom:   (parts[3] || '').trim(),
              validTo:     (parts[4] || '').trim(),
              isActive:    (parts[5] || '1').trim() !== '0',
            };
          }).filter(r => r.partyCode);

          if (rows.length === 0) {
            return showToast(t('هیچ داده‌ای برای ورود وجود ندارد', 'No data to import'), 'warning');
          }

          let insertedCount = 0;
          let updatedCount  = 0;
          let errorCount    = 0;
          const notFoundCodes = [];

          for (const row of rows) {
            try {
              const party = allParties.find(p => (p.code || '').trim() === row.partyCode);
              if (!party) {
                notFoundCodes.push(row.partyCode);
                errorCount++;
                continue;
              }

              const account = row.accountCode
                ? accounts.find(a => (a.code || '').trim() === row.accountCode)
                : null;

              const payload = {
                party_id:   party.id,
                account_id: account ? account.id : null,
                valid_from: row.validFrom || null,
                valid_to:   row.validTo   || null,
                is_active:  row.isActive,
                updated_at: new Date().toISOString(),
              };

              const existing = data.find(b => String(b.party_id) === String(party.id));
              if (existing) {
                const { error } = await supabase.from('fm_brokers').update(payload).eq('id', existing.id);
                if (error) throw error;
                updatedCount++;
              } else {
                const { error } = await supabase.from('fm_brokers').insert([{ ...payload, created_at: new Date().toISOString() }]);
                if (error) throw error;
                insertedCount++;
              }
            } catch (err) {
              console.error('Import row error:', row, err);
              errorCount++;
            }
          }

          await fetchData();

          let msg = isRtl
            ? `ورود اطلاعات کامل شد: ${insertedCount} جدید، ${updatedCount} به‌روزرسانی`
            : `Import complete: ${insertedCount} inserted, ${updatedCount} updated`;
          if (notFoundCodes.length > 0) {
            msg += isRtl
              ? `\nکدهای Party یافت نشد: ${notFoundCodes.join(', ')}`
              : `\nParty codes not found: ${notFoundCodes.join(', ')}`;
          }
          showToast(msg, errorCount > 0 ? 'warning' : 'success');
        } catch (err) {
          showToast(t('خطا در پردازش فایل', 'Error processing file'), 'error');
        }
      };
      reader.readAsText(file, 'UTF-8');
    };

    const columns = [
      { 
        field: 'brokerName', 
        header_fa: 'نام بروکر (شخص/شرکت)', 
        header_en: 'Broker Name', 
        width: '250px',
        render: (val, row) => {
          const status = getBrokerValidityStatus(row.valid_from, row.valid_to);
          return (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-slate-700 dark:text-slate-200">{val}</span>
              {status === 'expired' && (
                <Badge variant="red" size="sm">{t('منقضی شده', 'Expired')}</Badge>
              )}
              {status === 'notyet' && (
                <Badge variant="yellow" size="sm">{t('نامعتبر', 'Not Yet Valid')}</Badge>
              )}
            </div>
          );
        }
      },
      {
        field: 'accountName',
        header_fa: 'حساب مرتبط',
        header_en: 'Linked Account',
        width: '220px'
      },
      { 
        field: 'valid_from', 
        header_fa: 'تاریخ اعتبار از', 
        header_en: 'Valid From', 
        width: '140px',
        type: 'date'
      },
      { 
        field: 'valid_to', 
        header_fa: 'تاریخ اعتبار تا', 
        header_en: 'Valid To', 
        width: '140px',
        type: 'date'
      },
      { 
        field: 'is_active', 
        header_fa: 'وضعیت', 
        header_en: 'Status', 
        width: '100px', 
        type: 'toggle',
        onToggle: (row, val) => handleToggleActive(row, val)
      }
    ];

    const providerLovColumns = [
      { field: 'code', header_fa: 'کد بروکر', header_en: 'Code', width: '120px' },
      { field: 'label', header_fa: 'نام شخص/شرکت', header_en: 'Name', width: '250px' },
      { field: 'mobile', header_fa: 'شماره موبایل', header_en: 'Mobile', width: '150px' }
    ];

    const accountLovColumns = [
      { field: 'code', header_fa: 'کد حساب', header_en: 'Account Code', width: '100px' },
      { field: 'titleFa', header_fa: 'عنوان حساب', header_en: 'Title', width: '150px' },
      { field: 'pathFa', header_fa: 'مسیر', header_en: 'Path', width: '250px' }
    ];

    return (
      <div className="flex flex-col h-full p-4 bg-[#f8fafc] dark:bg-slate-900" dir={isRtl ? 'rtl' : 'ltr'}>
        <PageHeader 
          title={t('مدیریت بروکرها', 'Broker Management')} 
          icon={Briefcase}
          description={t('تعریف بروکرها، حساب‌های مرتبط و سوابق قرارداد', 'Manage brokers, linked accounts, and contract histories')}
          language={language}
          breadcrumbs={[{ label: t('مالی', 'Financial') }, { label: t('بروکرها', 'Brokers') }]}
          viewConfig={viewConfig}
        />

        <div className="flex-1 flex flex-col min-h-0 mt-2 animate-in fade-in duration-300">
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
              onToggle={(row, field, val) => {
                 if (field === 'is_active') handleToggleActive(row, val);
              }}
              onDownloadSample={handleDownloadSample}
              onImport={handleImportBrokers}
              actions={[
                { icon: Edit, tooltip: t('ویرایش مشخصات', 'Edit Details'), onClick: (row) => handleOpenModal(row), className: 'text-slate-400 hover:text-indigo-600' },
                { icon: Percent, tooltip: t('قراردادها و کارمزدها', 'Contracts & Commissions'), onClick: (row) => { setSelectedBroker(row); setIsContractsModalOpen(true); }, className: 'text-slate-400 hover:text-emerald-600' },
                { icon: History, tooltip: t('تاریخچه تغییرات رکورد', 'System Log'), onClick: (row) => openLogModal('fm_brokers', row.id), className: 'text-slate-400 hover:text-blue-600' },
                { icon: Trash2, tooltip: t('حذف بروکر', 'Delete Broker'), onClick: (row) => setDeleteConfirm({ isOpen: true, type: 'single', data: row }), className: 'text-slate-400 hover:text-red-600' }
              ]}
              bulkActions={[
                { label: t('حذف گروهی', 'Delete Selected'), icon: Trash2, variant: 'danger-outline', onClick: (ids) => setDeleteConfirm({ isOpen: true, type: 'bulk', data: ids }) }
              ]}
            />
          </div>
        </div>

        <Modal 
          isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} 
          title={currentRecord ? t('ویرایش بروکر', 'Edit Broker') : t('تعریف بروکر جدید', 'New Broker')}
          width="max-w-2xl"
          language={language}
        >
          <div className="p-4 flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-end gap-2">
                <LOVField 
                  wrapperClassName="flex-1"
                  size="sm" 
                  label={t('انتخاب شخص / شرکت (بروکر)', 'Select Party (Broker)')} 
                  data={partiesDropdown}
                  columns={providerLovColumns}
                  displayValue={partiesDropdown.find(p => p.id === formData.partyId)?.label || ''}
                  onChange={row => setFormData({...formData, partyId: row ? row.id : ''})}
                  isRtl={isRtl} 
                  required
                />
                <Button 
                  variant="outline" 
                  size="sm" 
                  icon={Plus} 
                  onClick={() => setIsQuickPartyModalOpen(true)} 
                  className="h-8 w-8 px-0 shrink-0 border-indigo-200 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-900/40 mb-[1px]" 
                  title={t('تعریف شخص جدید', 'Add New Party')}
                />
              </div>

              <div>
                <LOVField 
                  wrapperClassName="w-full"
                  size="sm" 
                  label={isRtl ? 'حساب مرتبط (آخرین سطح)' : 'Linked Account'}
                  data={accounts}
                  columns={accountLovColumns}
                  dropdownWidth="min-w-[500px]"
                  displayValue={accounts.find(a => String(a.id) === String(formData.accountId))?.titleFa ? `${accounts.find(a => String(a.id) === String(formData.accountId))?.code} - ${accounts.find(a => String(a.id) === String(formData.accountId))?.titleFa}` : ''}
                  onChange={row => setFormData({...formData, accountId: row ? row.id : ''})}
                  isRtl={isRtl} 
                />
              </div>

              <DatePicker 
                size="sm" 
                label={t('تاریخ اعتبار از', 'Valid From')} 
                value={formData.validFrom} 
                onChange={val => setFormData({...formData, validFrom: val?.target ? val.target.value : val})} 
                isRtl={isRtl} 
                dir="ltr" 
              />
              
              <DatePicker 
                size="sm" 
                label={t('تاریخ اعتبار تا', 'Valid To')} 
                value={formData.validTo} 
                onChange={val => setFormData({...formData, validTo: val?.target ? val.target.value : val})} 
                isRtl={isRtl} 
                dir="ltr" 
              />

              <div className="md:col-span-2 flex items-center mt-2 border-t border-slate-100 dark:border-slate-700/50 pt-3">
                 <ToggleField size="sm" label={t('بروکر فعال است', 'Is Active')} checked={formData.isActive} onChange={v => setFormData({...formData, isActive: v})} isRtl={isRtl} />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/50">
              <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>{t('انصراف', 'Cancel')}</Button>
              <Button variant="primary" size="sm" icon={Save} onClick={handleSaveBroker} isLoading={isLoading}>{t('ذخیره اطلاعات', 'Save Changes')}</Button>
            </div>
          </div>
        </Modal>

        <Modal
          isOpen={isQuickPartyModalOpen}
          onClose={() => setIsQuickPartyModalOpen(false)}
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
                  onChange={e => setQuickPartyData({...quickPartyData, partyType: e.target.value, companyName: '', firstName: '', lastName: '', roles: ['broker']})} 
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

              <TextField size="sm" label={quickPartyData.partyType === 'real' ? t('کد ملی', 'National ID') : t('شناسه ملی / ثبت', 'Registration ID')} value={quickPartyData.nationalId} onChange={e => setQuickPartyData({...quickPartyData, nationalId: e.target.value})} isRtl={isRtl} dir="ltr" />
              <TextField size="sm" label={t('موبایل / تلفن', 'Mobile / Phone')} value={quickPartyData.mobile} onChange={e => setQuickPartyData({...quickPartyData, mobile: e.target.value})} isRtl={isRtl} dir="ltr" />
              <TextField size="sm" label={t('ایمیل', 'Email')} value={quickPartyData.email} onChange={e => setQuickPartyData({...quickPartyData, email: e.target.value})} isRtl={isRtl} dir="ltr" />
            </div>
            
            <div className="mt-2 pt-3 border-t border-slate-100 dark:border-slate-800">
               <label className="text-[12px] font-bold text-slate-700 dark:text-slate-300 mb-3 block">{t('نقش‌های مرتبط', 'Associated Roles')}</label>
               <div className="flex flex-wrap gap-4 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700/50">
                 {EXTERNAL_PARTY_ROLES.map(role => (
                   <CheckboxField 
                     key={role.id} 
                     size="sm" 
                     label={role.label} 
                     checked={quickPartyData.roles.includes(role.id)} 
                     disabled={role.id === 'broker'} 
                     onChange={(checked) => {
                       if (role.id === 'broker') return;
                       setQuickPartyData(prev => ({
                         ...prev,
                         roles: checked ? [...prev.roles, role.id] : prev.roles.filter(r => r !== role.id)
                       }));
                     }} 
                     isRtl={isRtl} 
                   />
                 ))}
               </div>
            </div>

            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/50">
              <Button variant="outline" size="sm" onClick={() => setIsQuickPartyModalOpen(false)}>{t('انصراف', 'Cancel')}</Button>
              <Button variant="primary" size="sm" icon={Save} onClick={handleSaveQuickParty} isLoading={isSavingParty}>{t('ذخیره و انتخاب', 'Save & Select')}</Button>
            </div>
          </div>
        </Modal>

        <Modal
            isOpen={isContractsModalOpen}
            onClose={() => setIsContractsModalOpen(false)}
            title={t('قراردادها و کارمزدهای بروکر', 'Broker Contracts & Commissions')}
            width="max-w-5xl"
            language={language}
        >
            {selectedBroker && window.BrokerContract ? (
                <window.BrokerContract 
                    broker={selectedBroker} 
                    brokerName={getPartyName(selectedBroker.party_id)} 
                    language={language} 
                />
            ) : (
                <div className="p-8 text-center text-slate-500 font-bold">
                    {t('در حال بارگذاری فرم قراردادها...', 'Loading contracts form...')}
                </div>
            )}
        </Modal>

        <Modal 
          isOpen={logModal.isOpen} 
          onClose={() => setLogModal({ isOpen: false, recordId: null })} 
          title={t('لاگ‌های سیستمی رکورد', 'System Logs')} 
          width="max-w-xl" 
          language={language}
        >
          <LogTimeline logs={recordLogs} isLoading={isLogsLoading} language={language} />
        </Modal>

        <Toast isVisible={toast.isVisible} message={toast.message} type={toast.type} onClose={() => setToast(prev => ({ ...prev, isVisible: false }))} language={language} />

        <Modal isOpen={deleteConfirm.isOpen} onClose={() => setDeleteConfirm({ isOpen: false, type: null, data: null })} title={t('تایید عملیات حذف', 'Confirm Deletion')} language={language} width="max-w-sm">
          <EmptyState
            icon={AlertTriangle}
            title={t('هشدار: غیرقابل بازگشت', 'WARNING: IRREVERSIBLE')}
            description={deleteConfirm.type === 'bulk' 
              ? t(`آیا از حذف ${deleteConfirm.data?.length} مورد انتخاب شده اطمینان دارید؟`, `Delete ${deleteConfirm.data?.length} selected items?`)
              : t(`آیا از حذف این رکورد اطمینان دارید؟`, `Are you sure you want to delete this record?`)
            }
            action={
              <div className="flex gap-2 w-full mt-2 px-4">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setDeleteConfirm({ isOpen: false, type: null, data: null })}>{t('انصراف', 'Cancel')}</Button>
                <Button variant="danger" size="sm" onClick={executeDelete} isLoading={isLoading} className="flex-1">{t('تایید حذف', 'Delete')}</Button>
              </div>
            }
          />
        </Modal>
        
      </div>
    );
  };

  window.BrokerManagement = BrokerManagement;
})();