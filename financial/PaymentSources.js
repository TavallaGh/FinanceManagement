/* Filename: financial/PaymentSources.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useMemo } = React;

  const Fallback = () => null;
  const DS = window.DesignSystem || {};
  const DSCore = window.DSCore || DS;
  const DSGrid = window.DSGrid || DS;
  const DSFeedback = window.DSFeedback || DS;

  const Button = DSCore.Button || DS.Button || Fallback;
  const PageHeader = DSCore.PageHeader || DS.PageHeader || Fallback;
  const Modal = DSFeedback.Modal || DS.Modal || Fallback;
  const Toast = DSFeedback.Toast || DS.Toast || Fallback;
  const DataGrid = DSGrid.DataGrid || DS.DataGrid || Fallback;
  const LogTimeline = DSFeedback.LogTimeline || DS.LogTimeline || Fallback;
  const EmptyState = DSCore.EmptyState || DS.EmptyState || Fallback;
  const Badge = DSCore.Badge || DS.Badge || Fallback;

  const LucideIcons = window.LucideIcons || {};
  const FallbackIcon = () => null;
  const Edit    = LucideIcons.Edit    || FallbackIcon;
  const Trash2  = LucideIcons.Trash2  || FallbackIcon;
  const History = LucideIcons.History || FallbackIcon;
  const AlertTriangle = LucideIcons.AlertTriangle || FallbackIcon;
  const Banknote = LucideIcons.Banknote || LucideIcons.DollarSign || FallbackIcon;

  const supabase = window.supabase;

  // ─── Lookup constants ──────────────────────────────────────────────────────
  const SOURCE_TYPES = [
    { value: 'CASH',   label_fa: 'صندوق نقدی',  label_en: 'Cash Box',     badgeVariant: 'yellow'  },
    { value: 'BANK',   label_fa: 'حساب بانکی',  label_en: 'Bank Account', badgeVariant: 'blue'    },
    { value: 'WALLET', label_fa: 'کیف پول',      label_en: 'Wallet',       badgeVariant: 'emerald' },
    { value: 'OTHER',  label_fa: 'سایر',         label_en: 'Other',        badgeVariant: 'slate'   }
  ];

  const BANK_ACCOUNT_TYPES = [
    { value: 'CURRENT',    label_fa: 'جاری',       label_en: 'Current'    },
    { value: 'SHORT_TERM', label_fa: 'کوتاه‌مدت', label_en: 'Short-Term' },
    { value: 'LONG_TERM',  label_fa: 'بلندمدت',    label_en: 'Long-Term'  },
    { value: 'SAVINGS',    label_fa: 'پس‌انداز',   label_en: 'Savings'    }
  ];

  const WALLET_TYPES = [
    { value: 'EWALLET', label_fa: 'کیف پول الکترونیکی', label_en: 'E-Wallet'       },
    { value: 'CRYPTO',  label_fa: 'ارز دیجیتال',        label_en: 'Cryptocurrency' },
    { value: 'DIGITAL', label_fa: 'پول دیجیتال',         label_en: 'Digital Money'  },
    { value: 'PREPAID', label_fa: 'کارت پیش‌پرداخت',    label_en: 'Prepaid Card'   },
    { value: 'OTHER',   label_fa: 'سایر',               label_en: 'Other'          }
  ];

  const CASH_BOX_TYPES = [
    { value: 'GENERAL',   label_fa: 'صندوق عمومی',       label_en: 'General Cash'   },
    { value: 'PETTY',     label_fa: 'تنخواه',            label_en: 'Petty Cash'     },
    { value: 'FOREIGN',   label_fa: 'صندوق ارزی',        label_en: 'Foreign Cash'   },
    { value: 'SAFE',      label_fa: 'گاوصندوق',          label_en: 'Safe'           },
    { value: 'OTHER',     label_fa: 'سایر',              label_en: 'Other'          }
  ];

  // ─── Component ─────────────────────────────────────────────────────────────
  const PaymentSources = ({ language = 'fa' }) => {
    const isRtl = language === 'fa';
    const t = (fa, en) => isRtl ? fa : en;
    const currentUser = window.NavigationSystem?.currentUser?.name || 'مدیر سیستم';

    // ── State ──────────────────────────────────────────────────────────────
    const [data, setData]             = useState([]);
    const [currencies, setCurrencies] = useState([]);
    const [allParties, setAllParties] = useState([]);
    const [accounts, setAccounts]     = useState([]);
    const [allCoaAccounts, setAllCoaAccounts] = useState([]);

    const [isLoading, setIsLoading]   = useState(false);
    const [toast, setToast]           = useState({ isVisible: false, message: '', type: 'success' });
    const showToast = (message, type = 'success') => {
      setToast({ isVisible: true, message, type });
      setTimeout(() => setToast(prev => ({ ...prev, isVisible: false })), 3500);
    };

    const [isModalOpen, setIsModalOpen]       = useState(false);
    const [currentRecord, setCurrentRecord]   = useState(null);
    const [selectedIds, setSelectedIds]       = useState([]);

    const [deleteConfirm, setDeleteConfirm]   = useState({ isOpen: false, type: null, data: null });

    const [logModal, setLogModal]       = useState({ isOpen: false, recordId: null });
    const [recordLogs, setRecordLogs]   = useState([]);
    const [isLogsLoading, setIsLogsLoading] = useState(false);

    const [gridState, setGridState] = useState(null);

    const viewConfig = {
      pageId: 'payment_sources_main',
      currentState: () => ({ gridState }),
      onApplyState: (state) => {
        if (state) { if (state.gridState) setGridState(state.gridState); }
        else setGridState(null);
      }
    };

    // ── Derived: responsible parties (real persons) for cash box ───────────
    const responsiblePartiesDropdown = useMemo(() =>
      allParties
        .filter(p => p.party_type === 'real')
        .map(p => ({
          id: p.id,
          label: `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.company_name || '',
          code: p.code || '---',
          mobile: p.mobile || '---'
        })),
    [allParties]);

    // ── Init ───────────────────────────────────────────────────────────────
    useEffect(() => {
      fetchDropdownData();
      fetchData();
    }, []);

    // ── Fetch helpers ──────────────────────────────────────────────────────
    const fetchDropdownData = async () => {
      try {
        const [
          { data: coaData },
          { data: chartsData },
          { data: currenciesData },
          { data: partiesData }
        ] = await Promise.all([
          supabase.from('fm_coa_accounts').select('id, parent_id, title_fa, title_en, code, currency_id, is_active, chart_id'),
          supabase.from('fm_coa_charts').select('id, title').eq('is_active', true),
          supabase.from('fm_currencies').select('id, code, title'),
          supabase.from('parties').select('id, first_name, last_name, company_name, party_type, code, mobile')
        ]);

        if (currenciesData) setCurrencies(currenciesData);
        if (partiesData)    setAllParties(partiesData);

        if (coaData && chartsData) {
          const activeChartIds  = new Set(chartsData.map(c => c.id));
          const chartsMap       = new Map(chartsData.map(c => [c.id, c.title]));
          const currenciesMap   = new Map((currenciesData || []).map(c => [c.id, c.code]));
          const accMap          = new Map(coaData.map(a => [a.id, a]));

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
              currency_code: currenciesMap.get(acc.currency_id) || ''
            };
          });
          setAllCoaAccounts(allWithPaths);

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
              chartName: chartsMap.get(leaf.chart_id) || '',
              currency_code: currenciesMap.get(leaf.currency_id) || ''
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
        const { data: resData, error } = await supabase
          .from('fm_payment_sources')
          .select(`
            *,
            account:fm_coa_accounts(id, title_fa, title_en, code),
            currency:fm_currencies(id, code, title),
            responsible_party:parties(id, first_name, last_name, company_name)
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setData(resData || []);
      } catch (err) {
        console.error('Fetch Error:', err);
        showToast(t('خطا در دریافت اطلاعات', 'Error fetching data'), 'error');
      } finally {
        setIsLoading(false);
      }
    };

    // ── Logging ────────────────────────────────────────────────────────────
    const logAction = async (entityType, recordId, action, details = '', oldData = null, newData = null) => {
      try {
        if (!supabase) return;
        await supabase.from('fm_record_logs').insert([{
          entity_type: entityType,
          record_id: String(recordId),
          action,
          user_name: currentUser,
          details,
          old_data: oldData,
          new_data: newData
        }]);
      } catch (err) {
        console.error('Failed to log action:', err);
      }
    };

    const openLogModal = async (entityType, recordId) => {
      setLogModal({ isOpen: true, recordId });
      setIsLogsLoading(true);
      try {
        const { data: logs, error } = await supabase
          .from('fm_record_logs')
          .select('*')
          .eq('entity_type', entityType)
          .eq('record_id', String(recordId))
          .order('timestamp', { ascending: false });
        if (error) throw error;
        setRecordLogs(logs || []);
      } catch (err) {
        console.error(err);
        alert(t('خطا در دریافت تاریخچه', 'Error fetching logs'));
      } finally {
        setIsLogsLoading(false);
      }
    };

    // ── Modal open ─────────────────────────────────────────────────────────
    const handleOpenModal = (record = null) => {
      setCurrentRecord(record);
      setIsModalOpen(true);
    };

    // ── Toggle active ──────────────────────────────────────────────────────
    const handleToggleActive = async (row, newValue) => {
      try {
        const { error } = await supabase.from('fm_payment_sources').update({ is_active: newValue }).eq('id', row.id);
        if (error) throw error;
        await logAction('fm_payment_sources', row.id, 'update',
          newValue ? 'فعال‌سازی منبع پرداخت' : 'غیرفعال‌سازی منبع پرداخت',
          row, { ...row, is_active: newValue });
        setData(prev => prev.map(item => item.id === row.id ? { ...item, is_active: newValue } : item));
      } catch (err) {
        console.error('Toggle Error:', err);
        showToast(t('خطا در تغییر وضعیت', 'Error toggling status'), 'error');
      }
    };

    // ── Delete ─────────────────────────────────────────────────────────────
    const executeDelete = async () => {
      setIsLoading(true);
      try {
        if (deleteConfirm.type === 'single') {
          const oldRec = data.find(c => c.id === deleteConfirm.data.id);
          const { error } = await supabase.from('fm_payment_sources').delete().eq('id', deleteConfirm.data.id);
          if (error) throw error;
          await logAction('fm_payment_sources', deleteConfirm.data.id, 'delete', 'حذف منبع پرداخت', oldRec, null);
        } else if (deleteConfirm.type === 'bulk') {
          const oldRecords = deleteConfirm.data.map(id => data.find(c => c.id === id)).filter(Boolean);
          const { error } = await supabase.from('fm_payment_sources').delete().in('id', deleteConfirm.data);
          if (error) throw error;
          for (const oldRec of oldRecords) {
            await logAction('fm_payment_sources', oldRec.id, 'delete', 'حذف گروهی منبع پرداخت', oldRec, null);
          }
        }
        setSelectedIds([]);
        fetchData();
        setDeleteConfirm({ isOpen: false, type: null, data: null });
        showToast(t('حذف با موفقیت انجام شد', 'Deleted successfully'));
      } catch (err) {
        console.error('Delete error:', err);
        alert(t('خطا در حذف. ممکن است رکوردهای وابسته وجود داشته باشد.', 'Deletion error. There might be dependent records.'));
      } finally {
        setIsLoading(false);
      }
    };

    // ── Computed display values ────────────────────────────────────────────
    const getsourcesTypeInfo = (type) => SOURCE_TYPES.find(r => r.value === type) || SOURCE_TYPES[3];

    const formatSourceDetail = (row) => {
      if (row.source_type === 'BANK') return row.bank_name || '---';
      if (row.source_type === 'WALLET') return row.wallet_platform || (WALLET_TYPES.find(wt => wt.value === row.wallet_type)?.[isRtl ? 'label_fa' : 'label_en'] || '---');
      if (row.source_type === 'CASH') {
        const p = row.responsible_party;
        if (!p) return '---';
        return `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.company_name || '---';
      }
      return '---';
    };

    // ── Grid columns ───────────────────────────────────────────────────────
    const columns = [
      {
        field: 'code', header_fa: 'کد', header_en: 'Code', width: '120px',
        render: (val) => <span className="font-mono font-bold text-indigo-700 dark:text-indigo-400">{val || '---'}</span>
      },
      {
        field: 'title_fa', header_fa: 'عنوان منبع پرداخت', header_en: 'Payment Source', width: '200px',
        render: (val, row) => (
          <div className="flex flex-col">
            <span className="font-bold text-slate-700 dark:text-slate-200">{val}</span>
            {row.title_en && row.title_en !== val && <span className="text-[10px] text-slate-400">{row.title_en}</span>}
          </div>
        )
      },
      {
        field: 'source_type', header_fa: 'نوع', header_en: 'Type', width: '120px',
        render: (val) => {
          const info = getsourcesTypeInfo(val);
          return <Badge variant={info.badgeVariant} size="sm">{isRtl ? info.label_fa : info.label_en}</Badge>;
        }
      },
      {
        field: 'account', header_fa: 'حساب مرتبط', header_en: 'Linked Account', width: '200px',
        render: (val) => val
          ? <span className="text-slate-700 dark:text-slate-300">[{val.code}] {isRtl ? val.title_fa : (val.title_en || val.title_fa)}</span>
          : <span className="text-slate-400">---</span>
      },
      {
        field: 'currency', header_fa: 'ارز', header_en: 'Currency', width: '80px',
        render: (val) => val ? <Badge variant="slate" size="sm">{val.code}</Badge> : <span className="text-slate-400">---</span>
      },
      {
        field: 'detail', header_fa: 'جزئیات', header_en: 'Detail', width: '160px',
        render: (_, row) => <span className="text-slate-500 dark:text-slate-400 text-[11px]">{formatSourceDetail(row)}</span>
      },
      { field: 'is_active', header_fa: 'وضعیت', header_en: 'Status', width: '100px', type: 'toggle', onToggle: (row, val) => handleToggleActive(row, val) },
      // ── Extra columns (hidden by default, available via column visibility) ──
      { field: 'bank_name',    header_fa: 'نام بانک',        header_en: 'Bank Name',    width: '140px' },
      { field: 'account_number', header_fa: 'شماره حساب',   header_en: 'Account No.', width: '140px' },
      { field: 'iban',         header_fa: 'شبا / IBAN',      header_en: 'IBAN',         width: '200px' },
      { field: 'branch_name',  header_fa: 'نام شعبه',        header_en: 'Branch',       width: '130px' },
      {
        field: 'account_type', header_fa: 'نوع حساب بانکی', header_en: 'Acct. Type', width: '130px',
        render: (val) => { const bt = BANK_ACCOUNT_TYPES.find(b => b.value === val); return bt ? (isRtl ? bt.label_fa : bt.label_en) : (val || '---'); }
      },
      {
        field: 'has_checkbook', header_fa: 'دسته چک', header_en: 'Checkbook', width: '90px',
        render: (val) => val ? <Badge variant="emerald" size="sm">{t('دارد', 'Yes')}</Badge> : <span className="text-slate-400">---</span>
      },
      {
        field: 'wallet_type', header_fa: 'نوع کیف پول', header_en: 'Wallet Type', width: '130px',
        render: (val) => { const wt = WALLET_TYPES.find(w => w.value === val); return wt ? (isRtl ? wt.label_fa : wt.label_en) : (val || '---'); }
      },
      { field: 'wallet_code',     header_fa: 'کد کیف پول',  header_en: 'Wallet Code', width: '140px' },
      { field: 'wallet_platform', header_fa: 'پلتفرم',       header_en: 'Platform',    width: '120px' },
      {
        field: 'cash_type', header_fa: 'نوع صندوق', header_en: 'Cash Type', width: '120px',
        render: (val) => { const ct = CASH_BOX_TYPES.find(c => c.value === val); return ct ? (isRtl ? ct.label_fa : ct.label_en) : (val || '---'); }
      },
      { field: 'location', header_fa: 'محل', header_en: 'Location', width: '130px' },
      {
        field: 'responsible_party', header_fa: 'مسئول صندوق', header_en: 'Responsible', width: '150px',
        render: (val) => val
          ? <span>{`${val.first_name || ''} ${val.last_name || ''}`.trim() || val.company_name || '---'}</span>
          : <span className="text-slate-400">---</span>
      },
      { field: 'notes',          header_fa: 'توضیحات',       header_en: 'Notes',          width: '200px' },
      { field: 'min_deposit',    header_fa: 'حداقل واریز',   header_en: 'Min Deposit',    width: '120px' },
      { field: 'max_deposit',    header_fa: 'حداکثر واریز',  header_en: 'Max Deposit',    width: '120px' },
      { field: 'min_withdrawal', header_fa: 'حداقل برداشت',  header_en: 'Min Withdrawal', width: '120px' },
      { field: 'max_withdrawal', header_fa: 'حداکثر برداشت', header_en: 'Max Withdrawal', width: '120px' }
    ];

    const extraHiddenCols = [
      'bank_name', 'account_number', 'iban', 'branch_name', 'account_type', 'has_checkbook',
      'wallet_type', 'wallet_code', 'wallet_platform',
      'cash_type', 'location', 'responsible_party',
      'notes', 'min_deposit', 'max_deposit', 'min_withdrawal', 'max_withdrawal'
    ];

    // ── Render ─────────────────────────────────────────────────────────────
    return (
      <div className="flex flex-col h-full p-4 bg-[#f8fafc] dark:bg-slate-900" dir={isRtl ? 'rtl' : 'ltr'}>
        <PageHeader
          title={t('منابع پرداخت', 'Payment sources')}
          icon={Banknote}
          description={t('تعریف و مدیریت منابع پرداخت: صندوق‌های نقدی، حساب‌های بانکی و کیف پول‌ها', 'Manage payment sources: cash boxes, bank accounts, and wallets')}
          language={language}
          breadcrumbs={[{ label: t('مالی', 'Financial') }, { label: t('منابع پرداخت', 'Payment sources') }]}
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
              defaultHiddenCols={extraHiddenCols}
              onToggle={(row, field, val) => { if (field === 'is_active') handleToggleActive(row, val); }}
              actions={[
                { icon: Edit,    tooltip: t('ویرایش', 'Edit'),    onClick: (row) => handleOpenModal(row),                                      className: 'text-slate-400 hover:text-indigo-600' },
                { icon: History, tooltip: t('تاریخچه', 'History'), onClick: (row) => openLogModal('fm_payment_sources', row.id),              className: 'text-slate-400 hover:text-blue-600'   },
                { icon: Trash2,  tooltip: t('حذف', 'Delete'),      onClick: (row) => setDeleteConfirm({ isOpen: true, type: 'single', data: row }), className: 'text-slate-400 hover:text-red-600'    }
              ]}
              bulkActions={[
                { label: t('حذف گروهی', 'Delete Selected'), icon: Trash2, variant: 'danger-outline', onClick: (ids) => setDeleteConfirm({ isOpen: true, type: 'bulk', data: ids }) }
              ]}
            />
          </div>
        </div>

        {/* ─── Add/Edit Modal (details component) ─────────────────────── */}
        {(() => {
          const DetailsModal = window.PaymentSourcesDetailsModal || (() => null);
          return (
            <DetailsModal
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              onSaved={() => { fetchData(); showToast(t('اطلاعات با موفقیت ذخیره شد', 'Saved successfully')); }}
              record={currentRecord}
              currencies={currencies}
              accounts={accounts}
              allCoaAccounts={allCoaAccounts}
              responsiblePartiesDropdown={responsiblePartiesDropdown}
              language={language}
            />
          );
        })()}

        {/* ─── Log Modal ───────────────────────────────────────────────────── */}
        <Modal
          isOpen={logModal.isOpen}
          onClose={() => setLogModal({ isOpen: false, recordId: null })}
          title={t('تاریخچه تغییرات رکورد', 'Record Change History')}
          width="max-w-xl"
          language={language}
        >
          <LogTimeline logs={recordLogs} isLoading={isLogsLoading} language={language} />
        </Modal>

        {/* ─── Delete Confirm Modal ─────────────────────────────────────────── */}
        <Modal
          isOpen={deleteConfirm.isOpen}
          onClose={() => setDeleteConfirm({ isOpen: false, type: null, data: null })}
          title={t('تایید عملیات حذف', 'Confirm Deletion')}
          language={language}
          width="max-w-sm"
        >
          <EmptyState
            icon={AlertTriangle}
            title={t('هشدار: غیرقابل بازگشت', 'WARNING: IRREVERSIBLE')}
            description={deleteConfirm.type === 'bulk'
              ? t(`آیا از حذف ${deleteConfirm.data?.length} مورد انتخاب شده اطمینان دارید؟`, `Delete ${deleteConfirm.data?.length} selected items?`)
              : t('آیا از حذف این رکورد اطمینان دارید؟', 'Are you sure you want to delete this record?')
            }
            action={
              <div className="flex gap-2 w-full mt-2 px-4">
                <Button variant="outline" size="sm" className="flex-1"
                  onClick={() => setDeleteConfirm({ isOpen: false, type: null, data: null })}>
                  {t('انصراف', 'Cancel')}
                </Button>
                <Button variant="danger" size="sm" onClick={executeDelete} isLoading={isLoading} className="flex-1">
                  {t('تایید حذف', 'Delete')}
                </Button>
              </div>
            }
          />
        </Modal>

        <Toast
          isVisible={toast.isVisible} message={toast.message} type={toast.type}
          onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
          language={language}
        />
      </div>
    );
  };

  window.PaymentSources = PaymentSources;
})();
