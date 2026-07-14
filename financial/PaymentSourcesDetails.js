/* Filename: financial/PaymentSourcesDetails.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useMemo } = React;

  const Fallback = () => null;
  const DS = window.DesignSystem || {};
  const DSCore = window.DSCore || DS;
  const DSForms = window.DSForms || DS;
  const DSGrid = window.DSGrid || DS;
  const DSFeedback = window.DSFeedback || DS;

  const Button   = DSCore.Button   || DS.Button   || Fallback;
  const Modal    = DSFeedback.Modal || DS.Modal    || Fallback;
  const LOVField = DSGrid.LOVField  || DS.LOVField || Fallback;
  const TextField   = DSForms.TextField   || DS.TextField   || Fallback;
  const SelectField = DSForms.SelectField || DS.SelectField || Fallback;
  const ToggleField = DSForms.ToggleField || DS.ToggleField || Fallback;

  const LucideIcons = window.LucideIcons || {};
  const FallbackIcon = () => null;
  const Save = LucideIcons.Save || FallbackIcon;
  const Plus = LucideIcons.Plus || FallbackIcon;

  const supabase = window.supabase;

  // ─── Lookup constants ──────────────────────────────────────────────────────
  const SOURCE_TYPES = [
    { value: 'CASH',   label_fa: 'صندوق نقدی', label_en: 'Cash Box',     badgeVariant: 'yellow'  },
    { value: 'BANK',   label_fa: 'حساب بانکی', label_en: 'Bank Account', badgeVariant: 'blue'    },
    { value: 'WALLET', label_fa: 'کیف پول',     label_en: 'Wallet',       badgeVariant: 'emerald' },
    { value: 'OTHER',  label_fa: 'سایر',        label_en: 'Other',        badgeVariant: 'slate'   }
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
    { value: 'DIGITAL', label_fa: 'پول دیجیتال',        label_en: 'Digital Money'  },
    { value: 'PREPAID', label_fa: 'کارت پیش‌پرداخت',   label_en: 'Prepaid Card'   },
    { value: 'OTHER',   label_fa: 'سایر',               label_en: 'Other'          }
  ];

  const CASH_BOX_TYPES = [
    { value: 'GENERAL', label_fa: 'صندوق عمومی', label_en: 'General Cash' },
    { value: 'PETTY',   label_fa: 'تنخواه',       label_en: 'Petty Cash'   },
    { value: 'FOREIGN', label_fa: 'صندوق ارزی',   label_en: 'Foreign Cash' },
    { value: 'SAFE',    label_fa: 'گاوصندوق',     label_en: 'Safe'         },
    { value: 'OTHER',   label_fa: 'سایر',          label_en: 'Other'        }
  ];

  const EMPTY_FORM = {
    code: '',
    titleFa: '',
    titleEn: '',
    sourcesType: 'CASH',
    accountId: '',
    currencyId: '',
    minDeposit: '',
    maxDeposit: '',
    minWithdrawal: '',
    maxWithdrawal: '',
    bankName: '',
    accountNumber: '',
    accountType: 'CURRENT',
    branchName: '',
    branchAddress: '',
    iban: '',
    hasCheckbook: false,
    walletType: 'EWALLET',
    walletCode: '',
    walletPlatform: '',
    cashType: '',
    responsiblePartyId: '',
    location: '',
    notes: '',
    isActive: true
  };

  // ─── Component ─────────────────────────────────────────────────────────────
  const PaymentSourcesDetailsModal = ({
    isOpen,
    onClose,
    onSaved,
    record,
    currencies = [],
    accounts = [],
    allCoaAccounts = [],
    responsiblePartiesDropdown = [],
    language = 'fa'
  }) => {
    const isRtl = language === 'fa';
    const t = (fa, en) => isRtl ? fa : en;
    const currentUser = window.NavigationSystem?.currentUser?.name || 'مدیر سیستم';

    const [formData, setFormData]           = useState({ ...EMPTY_FORM });
    const [isLoading, setIsLoading]         = useState(false);
    const [isCodeLoading, setIsCodeLoading] = useState(false);

    const [isQuickAccountModalOpen, setIsQuickAccountModalOpen] = useState(false);
    const [isSavingAccount, setIsSavingAccount]                 = useState(false);
    const [quickAccountData, setQuickAccountData]               = useState({ parentId: '', code: '', titleFa: '', titleEn: '', isActive: true });

    // Local copies so quick-add can extend them without touching parent state
    const [localAccounts, setLocalAccounts]           = useState(accounts);
    const [localAllCoa, setLocalAllCoa]               = useState(allCoaAccounts);

    useEffect(() => { setLocalAccounts(accounts); },       [accounts]);
    useEffect(() => { setLocalAllCoa(allCoaAccounts); },   [allCoaAccounts]);

    // Populate form when modal opens
    useEffect(() => {
      if (!isOpen) return;
      if (!record) {
        setFormData({ ...EMPTY_FORM });
        setIsCodeLoading(true);
        (async () => {
          try {
            if (window.AutoNumberingService) {
              const preview = await window.AutoNumberingService.previewNext('PAYMENT_SOURCE');
              const autoCode = typeof preview === 'string' ? preview : (preview?.formattedCode || '');
              setFormData(prev => ({ ...prev, code: autoCode }));
            }
          } catch (err) {
            console.error('AutoNumbering preview error:', err);
          } finally {
            setIsCodeLoading(false);
          }
        })();
      } else {
        setFormData({
          code:               record.code             || '',
          titleFa:            record.title_fa          || '',
          titleEn:            record.title_en          || '',
          sourcesType:        record.source_type       || 'CASH',
          accountId:          record.account_id        || '',
          currencyId:         record.currency_id       || '',
          minDeposit:         record.min_deposit    != null ? String(record.min_deposit)    : '',
          maxDeposit:         record.max_deposit    != null ? String(record.max_deposit)    : '',
          minWithdrawal:      record.min_withdrawal != null ? String(record.min_withdrawal) : '',
          maxWithdrawal:      record.max_withdrawal != null ? String(record.max_withdrawal) : '',
          bankName:           record.bank_name         || '',
          accountNumber:      record.account_number    || '',
          accountType:        record.account_type      || 'CURRENT',
          branchName:         record.branch_name       || '',
          branchAddress:      record.branch_address    || '',
          iban:               record.iban              || '',
          hasCheckbook:       record.has_checkbook  ?? false,
          walletType:         record.wallet_type       || 'EWALLET',
          walletCode:         record.wallet_code       || '',
          walletPlatform:     record.wallet_platform   || '',
          cashType:           record.cash_type         || '',
          responsiblePartyId: record.responsible_party_id || '',
          location:           record.location          || '',
          notes:              record.notes             || '',
          isActive:           record.is_active      ?? true
        });
        setIsCodeLoading(false);
      }
    }, [isOpen, record]);

    // ── Log helper ─────────────────────────────────────────────────────────
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

    // ── Save ───────────────────────────────────────────────────────────────
    const handleSave = async () => {
      if (!formData.titleFa) {
        alert(t('عنوان فارسی الزامی است.', 'Persian title is required.'));
        return;
      }
      setIsLoading(true);
      try {
        const isNew = !record?.id;
        const payload = {
          code:           formData.code          || null,
          title_fa:       formData.titleFa,
          title_en:       formData.titleEn        || formData.titleFa,
          source_type:    formData.sourcesType,
          account_id:     formData.accountId      || null,
          currency_id:    formData.currencyId     || null,
          min_deposit:    formData.minDeposit    !== '' ? parseFloat(formData.minDeposit)    : null,
          max_deposit:    formData.maxDeposit    !== '' ? parseFloat(formData.maxDeposit)    : null,
          min_withdrawal: formData.minWithdrawal !== '' ? parseFloat(formData.minWithdrawal) : null,
          max_withdrawal: formData.maxWithdrawal !== '' ? parseFloat(formData.maxWithdrawal) : null,
          // Bank
          bank_name:      formData.sourcesType === 'BANK' ? (formData.bankName      || null) : null,
          account_number: formData.sourcesType === 'BANK' ? (formData.accountNumber || null) : null,
          account_type:   formData.sourcesType === 'BANK' ? (formData.accountType   || null) : null,
          branch_name:    formData.sourcesType === 'BANK' ? (formData.branchName    || null) : null,
          branch_address: formData.sourcesType === 'BANK' ? (formData.branchAddress || null) : null,
          iban:           formData.sourcesType === 'BANK' ? (formData.iban          || null) : null,
          has_checkbook:  formData.sourcesType === 'BANK' ? formData.hasCheckbook : false,
          // Wallet
          wallet_type:     formData.sourcesType === 'WALLET' ? (formData.walletType     || null) : null,
          wallet_code:     formData.sourcesType === 'WALLET' ? (formData.walletCode     || null) : null,
          wallet_platform: formData.sourcesType === 'WALLET' ? (formData.walletPlatform || null) : null,
          // Cash / Other
          cash_type:            formData.sourcesType === 'CASH' ? (formData.cashType || null) : null,
          responsible_party_id: formData.sourcesType === 'CASH' ? (formData.responsiblePartyId || null) : null,
          location: ['CASH', 'OTHER'].includes(formData.sourcesType) ? (formData.location || null) : null,
          notes:      formData.notes    || null,
          is_active:  formData.isActive,
          updated_at: new Date().toISOString()
        };

        if (!isNew) {
          const { error } = await supabase.from('fm_payment_sources').update(payload).eq('id', record.id);
          if (error) {
            if (error.code === '23505') alert(t('این کد قبلاً ثبت شده است.', 'This code already exists.'));
            else throw error;
            return;
          }
          await logAction('fm_payment_sources', record.id, 'update', 'ویرایش منبع پرداخت', record, { ...record, ...payload });
        } else {
          const { data: newRec, error } = await supabase
            .from('fm_payment_sources')
            .insert([{ ...payload, created_at: new Date().toISOString() }])
            .select();
          if (error) {
            if (error.code === '23505') alert(t('این کد قبلاً ثبت شده است.', 'This code already exists.'));
            else throw error;
            return;
          }
          if (newRec?.length > 0) {
            await logAction('fm_payment_sources', newRec[0].id, 'create', 'تعریف منبع پرداخت جدید', null, newRec[0]);
          }
          if (window.AutoNumberingService) {
            try { await window.AutoNumberingService.consumeNext('PAYMENT_SOURCE'); }
            catch (err) { console.error('AutoNumbering consume error:', err); }
          }
        }

        onClose();
        if (onSaved) onSaved();
      } catch (err) {
        console.error('Save Error:', err);
        alert(t('خطا در ذخیره اطلاعات', 'Error saving data'));
      } finally {
        setIsLoading(false);
      }
    };

    // ── Quick Add Account helpers ──────────────────────────────────────────
    const suggestNextCode = (parentId) => {
      const parent = localAllCoa.find(a => a.id === parentId);
      if (!parent?.code) return '';
      const parentCode = parent.code;
      const children = localAllCoa.filter(a => a.parent_id === parentId);
      if (children.length === 0) return parentCode + '01';
      const nums = children
        .map(c => { const s = c.code?.startsWith(parentCode) ? c.code.slice(parentCode.length) : c.code; return parseInt(s, 10); })
        .filter(n => !isNaN(n));
      const nextNum = (nums.length > 0 ? Math.max(...nums) : 0) + 1;
      return parentCode + String(nextNum).padStart(2, '0');
    };

    const handleSaveQuickAccount = async () => {
      if (!quickAccountData.parentId || !quickAccountData.code || !quickAccountData.titleFa) {
        alert(t('حساب پدر، کد و عنوان فارسی الزامی هستند', 'Parent account, code and Persian title are required'));
        return;
      }
      setIsSavingAccount(true);
      try {
        const parentAcc = localAllCoa.find(a => a.id === quickAccountData.parentId);
        const payload = {
          parent_id:  quickAccountData.parentId,
          chart_id:   parentAcc?.chart_id || null,
          code:       quickAccountData.code,
          title_fa:   quickAccountData.titleFa,
          title_en:   quickAccountData.titleEn || quickAccountData.titleFa,
          is_active:  quickAccountData.isActive ?? true,
          created_at: new Date().toISOString()
        };
        const { data: newAcc, error } = await supabase.from('fm_coa_accounts').insert([payload]).select().single();
        if (error) {
          if (error.code === '23505') alert(t('کد حساب تکراری است', 'Account code already exists'));
          else throw error;
          return;
        }
        const buildPath = (node, allAccs) => {
          let parts = [node.title_fa || ''];
          let cur = allAccs.find(a => a.id === node.parent_id);
          while (cur) { parts.unshift(cur.title_fa || ''); cur = allAccs.find(a => a.id === cur.parent_id); }
          return parts.join(' > ');
        };
        const updatedAll = [...localAllCoa, newAcc];
        setLocalAllCoa(updatedAll);
        setLocalAccounts(prev => [...prev, {
          id: newAcc.id,
          code: newAcc.code,
          titleFa: newAcc.title_fa,
          titleEn: newAcc.title_en,
          pathFa: buildPath(newAcc, updatedAll),
          pathEn: buildPath(newAcc, updatedAll),
          chartName: parentAcc?.chartName || '',
          currency_code: ''
        }]);
        setFormData(prev => ({ ...prev, accountId: newAcc.id }));
        setIsQuickAccountModalOpen(false);
        setQuickAccountData({ parentId: '', code: '', titleFa: '', titleEn: '', isActive: true });
      } catch (err) {
        console.error('Save Quick Account Error:', err);
        alert(t('خطا در ایجاد حساب', 'Error creating account'));
      } finally {
        setIsSavingAccount(false);
      }
    };

    // ── Computed display values ────────────────────────────────────────────
    const selectedAccountDisplay = useMemo(() => {
      const acc = localAccounts.find(a => String(a.id) === String(formData.accountId));
      return acc ? `${acc.code} - ${acc.titleFa}` : '';
    }, [localAccounts, formData.accountId]);

    const selectedResponsibleDisplay = useMemo(() => {
      const p = responsiblePartiesDropdown.find(x => x.id === formData.responsiblePartyId);
      return p ? p.label : '';
    }, [responsiblePartiesDropdown, formData.responsiblePartyId]);

    // ── LOV columns ────────────────────────────────────────────────────────
    const accountLovColumns = [
      { field: 'chartName', header_fa: 'ساختار', header_en: 'Chart', width: '80px' },
      { field: 'code', header_fa: 'کد', header_en: 'Code', width: '80px' },
      {
        field: 'titleFa', header_fa: 'عنوان حساب', header_en: 'Title', width: '240px',
        render: (val, row) => (
          <div className="flex flex-col">
            <span className="font-bold text-slate-800 dark:text-slate-200">{val}</span>
            {row.pathFa && <span className="text-[10px] text-slate-500 truncate" title={row.pathFa}>{row.pathFa}</span>}
          </div>
        )
      },
      { field: 'currency_code', header_fa: 'ارز', header_en: 'Currency', width: '60px' }
    ];

    const partyLovColumns = [
      { field: 'code',   header_fa: 'کد',     header_en: 'Code',   width: '100px' },
      { field: 'label',  header_fa: 'نام',     header_en: 'Name',   width: '220px' },
      { field: 'mobile', header_fa: 'موبایل', header_en: 'Mobile', width: '130px' }
    ];

    // ── Type-specific form section ─────────────────────────────────────────
    const renderTypeSpecificFields = () => {
      const { sourcesType } = formData;

      if (sourcesType === 'BANK') {
        return (
          <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/50 rounded-xl p-3 flex flex-col gap-3">
            <div className="text-[11px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wide border-b border-blue-100 dark:border-blue-800/50 pb-1.5">
              {t('اطلاعات بانکی', 'Bank Information')}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <TextField size="sm" label={t('نام بانک', 'Bank Name')} value={formData.bankName}
                onChange={e => setFormData(p => ({...p, bankName: e.target.value}))} isRtl={isRtl} />
              <SelectField size="sm" label={t('نوع حساب', 'Account Type')} value={formData.accountType}
                onChange={e => setFormData(p => ({...p, accountType: e.target.value}))} isRtl={isRtl}
                options={BANK_ACCOUNT_TYPES.map(bt => ({ value: bt.value, label: isRtl ? bt.label_fa : bt.label_en }))} />
              <TextField size="sm" label={t('شماره حساب', 'Account Number')} value={formData.accountNumber}
                onChange={e => setFormData(p => ({...p, accountNumber: e.target.value}))} isRtl={isRtl} dir="ltr" />
              <TextField size="sm" label={t('شماره شبا / IBAN', 'IBAN')} value={formData.iban}
                onChange={e => setFormData(p => ({...p, iban: e.target.value}))} isRtl={isRtl} dir="ltr" placeholder="IR..." />
              <TextField size="sm" label={t('نام شعبه', 'Branch Name')} value={formData.branchName}
                onChange={e => setFormData(p => ({...p, branchName: e.target.value}))} isRtl={isRtl} />
              <TextField size="sm" label={t('آدرس شعبه', 'Branch Address')} value={formData.branchAddress}
                onChange={e => setFormData(p => ({...p, branchAddress: e.target.value}))} isRtl={isRtl} />
              <div className="md:col-span-3 flex items-center mt-1">
                <ToggleField size="sm" label={t('دارای دسته چک', 'Has Checkbook')}
                  checked={formData.hasCheckbook}
                  onChange={v => setFormData(p => ({...p, hasCheckbook: v}))} isRtl={isRtl} />
              </div>
            </div>
          </div>
        );
      }

      if (sourcesType === 'WALLET') {
        return (
          <div className="bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/50 rounded-xl p-3 flex flex-col gap-3">
            <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide border-b border-emerald-100 dark:border-emerald-800/50 pb-1.5">
              {t('اطلاعات کیف پول', 'Wallet Information')}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <SelectField size="sm" label={t('نوع کیف پول', 'Wallet Type')} value={formData.walletType}
                onChange={e => setFormData(p => ({...p, walletType: e.target.value}))} isRtl={isRtl}
                options={WALLET_TYPES.map(wt => ({ value: wt.value, label: isRtl ? wt.label_fa : wt.label_en }))} />
              <TextField size="sm" label={t('پلتفرم / ارائه‌دهنده', 'Platform / Provider')} value={formData.walletPlatform}
                onChange={e => setFormData(p => ({...p, walletPlatform: e.target.value}))} isRtl={isRtl} dir="ltr" />
              <TextField size="sm" label={t('کد / آدرس کیف پول', 'Wallet Code / Address')} value={formData.walletCode}
                onChange={e => setFormData(p => ({...p, walletCode: e.target.value}))} isRtl={isRtl} dir="ltr" />
            </div>
          </div>
        );
      }

      if (sourcesType === 'CASH') {
        return (
          <div className="bg-yellow-50/50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-800/50 rounded-xl p-3 flex flex-col gap-3">
            <div className="text-[11px] font-bold text-yellow-700 dark:text-yellow-600 uppercase tracking-wide border-b border-yellow-100 dark:border-yellow-800/50 pb-1.5">
              {t('اطلاعات صندوق', 'Cash Box Information')}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <SelectField size="sm" label={t('نوع صندوق', 'Cash Box Type')} value={formData.cashType}
                onChange={e => setFormData(p => ({...p, cashType: e.target.value}))} isRtl={isRtl}
                options={[{ value: '', label: t('--- انتخاب کنید ---', '--- Select ---') }, ...CASH_BOX_TYPES.map(ct => ({ value: ct.value, label: isRtl ? ct.label_fa : ct.label_en }))]} />
              <LOVField
                size="sm"
                label={t('مسئول صندوق', 'Responsible Person')}
                data={responsiblePartiesDropdown}
                columns={partyLovColumns}
                displayValue={selectedResponsibleDisplay}
                onChange={row => setFormData(p => ({...p, responsiblePartyId: row ? row.id : ''}))}
                isRtl={isRtl}
              />
              <TextField size="sm" label={t('محل استقرار صندوق', 'Location')} value={formData.location}
                onChange={e => setFormData(p => ({...p, location: e.target.value}))} isRtl={isRtl} />
            </div>
          </div>
        );
      }

      // OTHER
      return (
        <div className="bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-700/50 rounded-xl p-3">
          <TextField size="sm" label={t('محل / توضیحات تکمیلی', 'Location / Extra Details')} value={formData.location}
            onChange={e => setFormData(p => ({...p, location: e.target.value}))} isRtl={isRtl} />
        </div>
      );
    };

    // ── Render ─────────────────────────────────────────────────────────────
    return (
      <>
        {/* ─── Main Add/Edit Modal ──────────────────────────────────────── */}
        <Modal
          isOpen={isOpen}
          onClose={onClose}
          title={record ? t('ویرایش منبع پرداخت', 'Edit Payment Source') : t('تعریف منبع پرداخت جدید', 'New Payment Source')}
          width="max-w-3xl"
          language={language}
        >
          <div className="p-4 flex flex-col gap-4">

            {/* General info row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <TextField
                size="sm"
                label={t('کد منبع پرداخت', 'Source Code')}
                value={isCodeLoading ? t('در حال تولید...', 'Generating...') : (formData.code || '')}
                onChange={e => setFormData(p => ({...p, code: e.target.value}))}
                isRtl={isRtl}
                dir="ltr"
                disabled={!record && isCodeLoading}
              />
              <TextField size="sm" label={t('عنوان فارسی', 'Persian Title')} value={formData.titleFa}
                onChange={e => setFormData(p => ({...p, titleFa: e.target.value}))} isRtl={isRtl} required />
              <TextField size="sm" label={t('عنوان انگلیسی', 'English Title')} value={formData.titleEn}
                onChange={e => setFormData(p => ({...p, titleEn: e.target.value}))} isRtl={isRtl} dir="ltr" />
            </div>

            {/* Type + Currency + Account row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <SelectField
                size="sm"
                label={t('نوع منبع پرداخت', 'Source Type')}
                value={formData.sourcesType}
                onChange={e => setFormData(p => ({...p, sourcesType: e.target.value}))}
                isRtl={isRtl}
                required
                options={SOURCE_TYPES.map(rt => ({ value: rt.value, label: isRtl ? rt.label_fa : rt.label_en }))}
              />
              <SelectField
                size="sm"
                label={t('ارز پیش‌فرض', 'Default Currency')}
                value={formData.currencyId}
                onChange={e => setFormData(p => ({...p, currencyId: e.target.value}))}
                isRtl={isRtl}
                options={[
                  { value: '', label: t('--- انتخاب کنید ---', '--- Select ---') },
                  ...currencies.map(c => ({ value: c.id, label: `${c.code} - ${c.title}` }))
                ]}
              />
              <div className="flex items-end gap-2">
                <div className="flex-1 min-w-0">
                  <LOVField
                    size="sm"
                    label={t('حساب مرتبط (آخرین سطح)', 'Linked Account')}
                    data={localAccounts}
                    columns={accountLovColumns}
                    dropdownWidth="min-w-[470px] max-w-[470px]"
                    displayValue={selectedAccountDisplay}
                    onChange={row => setFormData(p => ({...p, accountId: row ? row.id : ''}))}
                    isRtl={isRtl}
                  />
                </div>
                <Button
                  variant="outline" size="sm" icon={Plus}
                  onClick={() => {
                    setQuickAccountData({ parentId: '', code: '', titleFa: formData.titleFa, titleEn: formData.titleEn, isActive: true });
                    setIsQuickAccountModalOpen(true);
                  }}
                  className="h-8 w-8 px-0 shrink-0 border-indigo-200 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-900/40 mb-[1px]"
                  title={t('تعریف حساب جدید', 'Add New Account')}
                />
              </div>
            </div>

            {/* Type-specific section */}
            {renderTypeSpecificFields()}

            {/* Limits + Notes + Active — two 3-column rows */}
            <div className="bg-slate-50/80 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-700/50 rounded-xl p-3 flex flex-col gap-3">
              <div className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide border-b border-slate-200 dark:border-slate-700/50 pb-1.5">
                {t('محدودیت مبالغ (اختیاری)', 'Amount Limits (Optional)')}
              </div>
              {/* Row 1: min deposit | max deposit | notes */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <TextField size="sm" label={t('حداقل واریز', 'Min Deposit')}
                  value={formData.minDeposit} onChange={e => setFormData(p => ({...p, minDeposit: e.target.value}))}
                  isRtl={isRtl} dir="ltr" type="number" />
                <TextField size="sm" label={t('حداکثر واریز', 'Max Deposit')}
                  value={formData.maxDeposit} onChange={e => setFormData(p => ({...p, maxDeposit: e.target.value}))}
                  isRtl={isRtl} dir="ltr" type="number" />
                <TextField size="sm" label={t('توضیحات', 'Notes')}
                  value={formData.notes} onChange={e => setFormData(p => ({...p, notes: e.target.value}))}
                  isRtl={isRtl} />
              </div>
              {/* Row 2: min withdrawal | max withdrawal | active */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                <TextField size="sm" label={t('حداقل برداشت', 'Min Withdrawal')}
                  value={formData.minWithdrawal} onChange={e => setFormData(p => ({...p, minWithdrawal: e.target.value}))}
                  isRtl={isRtl} dir="ltr" type="number" />
                <TextField size="sm" label={t('حداکثر برداشت', 'Max Withdrawal')}
                  value={formData.maxWithdrawal} onChange={e => setFormData(p => ({...p, maxWithdrawal: e.target.value}))}
                  isRtl={isRtl} dir="ltr" type="number" />
                <div className="flex items-center mt-5">
                  <ToggleField size="sm" label={t('فعال', 'Is Active')}
                    checked={formData.isActive} onChange={v => setFormData(p => ({...p, isActive: v}))} isRtl={isRtl} />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-slate-100 dark:border-slate-700/50">
              <Button variant="outline" size="sm" onClick={onClose}>{t('انصراف', 'Cancel')}</Button>
              <Button variant="primary" size="sm" icon={Save} onClick={handleSave} isLoading={isLoading}>{t('ذخیره اطلاعات', 'Save')}</Button>
            </div>
          </div>
        </Modal>

        {/* ─── Quick Add Account Modal ──────────────────────────────────── */}
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
                {t('ابتدا حساب پدر را از طریق LOV انتخاب کنید. عنوان از نام منبع پرداخت پیش‌پر شده است.', 'First select the parent account via LOV. Title is pre-filled from the source name.')}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <LOVField
                  size="sm"
                  label={t('حساب پدر', 'Parent Account')}
                  data={(() => {
                    const parentIdSet = new Set(localAllCoa.map(a => a.parent_id).filter(Boolean));
                    const allCoaMap   = new Map(localAllCoa.map(a => [a.id, a]));
                    const checkActive = (acc) => {
                      if (!acc) return true;
                      if (!acc.is_active) return false;
                      if (!acc.parent_id) return true;
                      return checkActive(allCoaMap.get(acc.parent_id));
                    };
                    return localAllCoa.filter(a =>
                      a.isActiveChart &&
                      checkActive(a) &&
                      localAllCoa.some(c => c.parent_id === a.id && !parentIdSet.has(c.id))
                    );
                  })()}
                  columns={[
                    { field: 'chartName', header_fa: 'ساختار', header_en: 'Chart', width: '80px' },
                    { field: 'code',      header_fa: 'کد',      header_en: 'Code',  width: '80px' },
                    { field: 'title_fa',  header_fa: 'عنوان',   header_en: 'Title', width: '200px',
                      render: (val, row) => (
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 dark:text-slate-200">{val}</span>
                          {row.pathFa && <span className="text-[10px] text-slate-500 truncate" title={row.pathFa}>{row.pathFa}</span>}
                        </div>
                      )
                    },
                    { field: 'currency_code', header_fa: 'ارز', header_en: 'Currency', width: '60px' }
                  ]}
                  dropdownWidth="min-w-[430px] max-w-[430px]"
                  displayValue={(() => { const a = localAllCoa.find(x => x.id === quickAccountData.parentId); return a ? `${a.code} - ${a.title_fa}` : ''; })()}
                  onChange={row => {
                    const suggested = row ? suggestNextCode(row.id) : '';
                    setQuickAccountData(prev => ({ ...prev, parentId: row ? row.id : '', code: suggested }));
                  }}
                  isRtl={isRtl}
                  required
                />
              </div>
              <TextField size="sm" label={t('کد حساب', 'Account Code')} value={quickAccountData.code}
                onChange={e => setQuickAccountData(prev => ({ ...prev, code: e.target.value }))} isRtl={isRtl} dir="ltr" required />
              <div className="flex items-end pb-1">
                <ToggleField size="sm" label={t('حساب فعال است', 'Is Active')} checked={quickAccountData.isActive ?? true}
                  onChange={v => setQuickAccountData(prev => ({ ...prev, isActive: v }))} isRtl={isRtl} />
              </div>
              <TextField size="sm" label={t('عنوان فارسی', 'Persian Title')} value={quickAccountData.titleFa}
                onChange={e => setQuickAccountData(prev => ({ ...prev, titleFa: e.target.value }))} isRtl={isRtl} required />
              <TextField size="sm" label={t('عنوان انگلیسی', 'English Title')} value={quickAccountData.titleEn}
                onChange={e => setQuickAccountData(prev => ({ ...prev, titleEn: e.target.value }))} isRtl={isRtl} dir="ltr" />
            </div>
            <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-slate-100 dark:border-slate-700/50">
              <Button variant="outline" size="sm" onClick={() => setIsQuickAccountModalOpen(false)}>{t('انصراف', 'Cancel')}</Button>
              <Button variant="primary" size="sm" icon={Save} onClick={handleSaveQuickAccount} isLoading={isSavingAccount}>{t('ذخیره و انتخاب', 'Save & Select')}</Button>
            </div>
          </div>
        </Modal>
      </>
    );
  };

  window.PaymentSourcesDetailsModal = PaymentSourcesDetailsModal;
})();
