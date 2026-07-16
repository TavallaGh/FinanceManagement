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

    const [selectedIds, setSelectedIds] = useState([]);

    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, type: null, data: null });

    const [logModal, setLogModal] = useState({ isOpen: false, recordId: null });
    const [recordLogs, setRecordLogs] = useState([]);
    const [isLogsLoading, setIsLogsLoading] = useState(false);

    const [allCoaAccounts, setAllCoaAccounts] = useState([]);

    const [isContractsModalOpen, setIsContractsModalOpen] = useState(false);
    const [selectedBroker, setSelectedBroker] = useState(null);
    const [gridState, setGridState] = useState(null);

    const viewConfig = useMemo(() => ({
      pageId: 'broker_management_main',
      currentState: () => ({ gridState }),
      onApplyState: (state) => {
        if (state) {
          if (state.gridState) setGridState(state.gridState);
        } else {
          setGridState(null);
        }
      }
    }), [gridState]);
    useEffect(() => {
      fetchDropdownData();
      fetchData();
      const onChanged = () => fetchData();
      window.addEventListener('broker:changed', onChanged);
      return () => window.removeEventListener('broker:changed', onChanged);
    }, []);

    const fetchDropdownData = async () => {
      try {
        const [
          { data: coaData },
          { data: chartsData },
          { data: partiesData }
        ] = await Promise.all([
          supabase.from('fm_coa_accounts').select('id, parent_id, title_fa, title_en, code, currency_id, is_active, chart_id'),
          supabase.from('fm_coa_charts').select('id, title').eq('is_active', true),
          supabase.from('parties').select('id, first_name, last_name, company_name, party_type, code, mobile')
        ]);

        if (partiesData) setAllParties(partiesData || []);

        if (coaData && chartsData) {
          const activeChartIds  = new Set(chartsData.map(c => c.id));
          const chartsMap       = new Map(chartsData.map(c => [c.id, c.title]));
          const accMap          = new Map((coaData || []).map(a => [a.id, a]));

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
            while (current.parent_id) {
              const parent = coaData.find(c => c.id === current.parent_id);
              if (parent) {
                pathFa = (parent.title_fa || '') + ' / ' + pathFa;
                pathEn = (parent.title_en || parent.title_fa || '') + ' / ' + pathEn;
                current = parent;
              } else break;
            }
            return { pathFa, pathEn };
          };

          const allWithPaths = coaData.map(acc => {
            const paths = buildPath(acc);
            return {
              ...acc,
              pathFa: paths.pathFa,
              pathEn: paths.pathEn,
              chartName: chartsMap.get(acc.chart_id) || '',
              isActiveChart: activeChartIds.has(acc.chart_id),
            };
          });
          setAllCoaAccounts(allWithPaths || []);

          const parentIds = new Set(coaData.map(c => c.parent_id).filter(Boolean));
          const leaves = coaData.filter(c =>
            !parentIds.has(c.id) &&
            activeChartIds.has(c.chart_id) &&
            isEffectivelyActive(c)
          );

          setAccounts(leaves.map(leaf => {
            const paths = buildPath(leaf);
            return {
              id: leaf.id,
              code: leaf.code,
              titleFa: leaf.title_fa,
              titleEn: leaf.title_en,
              pathFa: paths.pathFa,
              pathEn: paths.pathEn,
              chartName: chartsMap.get(leaf.chart_id) || ''
            };
          }));
        }
      } catch (err) {
        console.error('Fetch Dropdown Error:', err);
      }
    };

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const { data: res, error } = await supabase
          .from('fm_brokers')
          .select(`*, party:parties(id, first_name, last_name, company_name, party_type, code), account:fm_coa_accounts(id, title_fa, title_en, code)`)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const mapped = (res || []).map(r => {
          const brokerName = r.party
            ? (r.party.party_type === 'legal' ? r.party.company_name : `${r.party.first_name || ''} ${r.party.last_name || ''}`.trim())
            : '-';
          const accountName = r.account ? (r.account.title_fa || r.account.title_en || r.account.code) : '-';
          return { ...r, brokerName, accountName };
        });

        setData(mapped);
      } catch (err) {
        console.error('Fetch Error:', err);
        showToast(t('خطا در دریافت اطلاعات', 'Error fetching data'), 'error');
      } finally {
        setIsLoading(false);
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
      if (window.openBrokerDetails) {
        try { window.openBrokerDetails(record, language); }
        catch (e) { console.error('openBrokerDetails error', e); }
      } else {
        console.warn('BrokerDetails component not loaded.');
      }
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

        

        <Modal            isOpen={isContractsModalOpen}
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