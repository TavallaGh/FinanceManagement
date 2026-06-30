/* Filename: general/CurrencyHistory.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useMemo, useCallback } = React;
  
  const FallbackIcon = ({ size = 16 }) => React.createElement('span', { style: { display: 'inline-block', width: size, height: size } });
  const LucideIcons = window.LucideIcons || {};
  const { 
    Edit = FallbackIcon, Trash2 = FallbackIcon, History = FallbackIcon, Calculator = FallbackIcon, Save = FallbackIcon, Globe = FallbackIcon, 
    ArrowRightLeft = FallbackIcon, AlertTriangle = FallbackIcon, Clock = FallbackIcon, Calendar = FallbackIcon, Zap = FallbackIcon, ArrowLeft = FallbackIcon, ArrowRight = FallbackIcon, Lock = FallbackIcon, Copy = FallbackIcon, Download = FallbackIcon
  } = LucideIcons;

  const CurrencyHistory = ({ currencies = [], language = 'fa', formCode, access, rateFilters, setRateFilters, ratesGridState, setRatesGridState }) => {
    const FallbackComponent = () => null;
    const Core = window.DSCore || window.DesignSystem || {};
    const { Button = FallbackComponent, SelectField = FallbackComponent, Badge = FallbackComponent, CurrencyField = FallbackComponent, DatePicker = FallbackComponent } = Core;
    const Grid = window.DSGrid || window.DesignSystem || {};
    const { DataGrid = FallbackComponent } = Grid;
    const Feedback = window.DSFeedback || window.DesignSystem || {};
    const { Modal = FallbackComponent, Toast = FallbackComponent, LogTimeline = FallbackComponent } = Feedback;

    const formatGlobalDate = Core.formatGlobalDate || ((v) => v);
    const globalCalendarMode = Core.useCalendarMode ? Core.useCalendarMode() : 'jalali';

    const isRtl = language === 'fa';
    const t = (fa, en) => isRtl ? fa : en;
    const isReadOnly = !access.canEdit && !access.canCreate;

    const getTodayGregorian = () => { const d = new Date(); return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`; };

    const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' });
    const [rates, setRates] = useState([]);
    
    const [isManualModalOpen, setIsManualModalOpen] = useState(false);
    const [manualDate, setManualDate] = useState('');
    const [manualTime, setManualTime] = useState('12:00');
    const [manualRatesList, setManualRatesList] = useState([]);

    const [isEditRateModalOpen, setIsEditRateModalOpen] = useState(false);
    const [editingRate, setEditingRate] = useState(null);

    const [isConverterOpen, setIsConverterOpen] = useState(false);
    const [convDate, setConvDate] = useState('');
    const [convAmount, setConvAmount] = useState('1');
    const [convFrom, setConvFrom] = useState('');
    const [convTo, setConvTo] = useState('');

    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, type: null, data: null });
    const [isLogModalOpen, setIsLogModalOpen] = useState(false);
    const [recordLogs, setRecordLogs] = useState([]);
    const [isLogsLoading, setIsLogsLoading] = useState(false);

    const supabase = window.supabase;
    const currentUser = window.NavigationSystem?.currentUser?.name || 'مدیر سیستم';

    const showToast = useCallback((message, type = 'success') => { setToast({ isVisible: true, message, type }); setTimeout(() => setToast(prev => ({ ...prev, isVisible: false })), 3000); }, []);

    const logAction = async (entityType, recordId, action, details = '', oldData = null, newData = null) => {
      try {
        if (!supabase) return;
        await supabase.from('fm_record_logs').insert([{ entity_type: entityType, record_id: String(recordId), action: action, user_name: currentUser, details: details, old_data: oldData, new_data: newData }]);
      } catch (err) { console.error('Failed to log action:', err); }
    };

    const openLogModal = async (entityType, recordId) => {
      setIsLogModalOpen(true); setIsLogsLoading(true);
      try {
        if (!supabase) throw new Error("Supabase is not initialized");
        const { data, error } = await supabase.from('fm_record_logs').select('*').eq('entity_type', entityType).eq('record_id', String(recordId)).order('timestamp', { ascending: false });
        if (error) throw error;
        setRecordLogs(data || []);
      } catch (err) { showToast(t('خطا در دریافت تاریخچه تغییرات', 'Error fetching logs'), 'error'); } finally { setIsLogsLoading(false); }
    };

    const isWithinOneWeek = useCallback((dateString) => {
      if (!dateString) return false;
      const date = new Date(dateString); const now = new Date();
      return (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24) <= 7;
    }, []);

    const fetchRates = useCallback(async () => {
      try {
        if (!supabase) return;
        const { data, error } = await supabase.from('fm_currency_rates').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        setRates(data || []);
      } catch (err) { console.error("Fetch rates error:", err); }
    }, [supabase]);

    useEffect(() => { fetchRates(); }, [fetchRates]);

    const handleXeFetch = async () => {
      try {
        const autoCurrencies = currencies.filter(c => c.fetch_type === 'auto');
        if (autoCurrencies.length === 0) return showToast(t('ارز اتوماتیکی در سیستم یافت نشد.', 'No automatic currencies found.'), 'warning');
        const newRates = []; const now = new Date(); const dateStr = now.toISOString().split('T')[0]; const isoString = now.toISOString();

        autoCurrencies.forEach(c => {
           (c.targets || []).forEach(tCode => {
              newRates.push({ base_currency: c.code, target_currency: tCode, rate: parseFloat((Math.random() * 50000 + 10000).toFixed(2)), rate_date: dateStr, created_at: isoString, source: 'XE', created_by: 'System XE API', updated_by: 'System XE API', updated_at: isoString });
           });
        });
        if (newRates.length > 0) {
           const { data, error } = await supabase.from('fm_currency_rates').insert(newRates).select();
           if (error) throw error;
           if (data) for (const rate of data) await logAction('fm_currency_rates', rate.id, 'ایجاد', `دریافت اتوماتیک نرخ: ${rate.base_currency} به ${rate.target_currency} = ${rate.rate}`, null, rate);
           showToast(t('نرخ‌های روزانه با موفقیت از سرور XE دریافت شد.', 'Rates fetched successfully from XE.'));
           fetchRates();
        }
      } catch (err) { showToast(t('خطا در ارتباط با سرور XE', 'Error connecting to XE'), 'error'); }
    };

    const openManualUpdateModal = () => {
      const list = [];
      currencies.filter(c => c.fetch_type === 'manual').forEach(c => {
         (c.targets || []).forEach(tCode => list.push({ base: c.code, target: tCode, rate: '' }));
      });
      setManualRatesList(list); setManualDate(getTodayGregorian());
      const now = new Date(); setManualTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
      setIsManualModalOpen(true);
    };

    const handleCopyLastRates = useCallback(() => {
      const filled = manualRatesList.map(item => {
        const lastRate = rates
          .filter(r => r.base_currency === item.base && r.target_currency === item.target)
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
        return { ...item, rate: lastRate ? String(lastRate.rate) : item.rate };
      });
      setManualRatesList(filled);
      showToast(t('آخرین نرخ‌های موجود کپی شدند.', 'Last available rates copied.'));
    }, [manualRatesList, rates, showToast, t]);

    const handleSaveManualRates = async () => {
      try {
        const validRates = manualRatesList.filter(r => r.rate && r.rate !== '0');
        if (validRates.length === 0) return showToast(t('لطفاً حداقل یک نرخ معتبر وارد کنید.', 'Please enter at least one valid rate.'), 'error');
        if (!manualDate || !manualTime) return showToast(t('تاریخ و زمان الزامی است.', 'Date and time are required.'), 'error');

        const formattedDate = (() => {
          const j2g = Core.j2g;
          const raw = manualDate.replace(/-/g, '/');
          const parts = raw.split('/');
          if (parts.length !== 3) return manualDate.replace(/\//g, '-');
          const y = parseInt(parts[0], 10), m = parseInt(parts[1], 10), d = parseInt(parts[2], 10);
          // اگر سال در بازه شمسی (1300-1599) باشد، به میلادی تبدیل کن
          if (j2g && y >= 1300 && y < 1600) {
            const [gy, gm, gd] = j2g(y, m, d);
            return `${gy}-${String(gm).padStart(2, '0')}-${String(gd).padStart(2, '0')}`;
          }
          return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        })();
        const dateTimeStr = `${formattedDate}T${manualTime}:00.000Z`;

        const payloads = validRates.map(r => ({
           base_currency: r.base, target_currency: r.target, rate: parseFloat(String(r.rate).replace(/,/g, '')),
           rate_date: formattedDate, created_at: dateTimeStr, source: 'Manual', created_by: currentUser, updated_by: currentUser, updated_at: dateTimeStr
        }));

        const { data, error } = await supabase.from('fm_currency_rates').insert(payloads).select();
        if (error) throw error;
        if (data) for (const rate of data) await logAction('fm_currency_rates', rate.id, 'ایجاد', `ثبت دستی نرخ: ${rate.base_currency} به ${rate.target_currency}`, null, rate);

        showToast(t('نرخ‌های دستی با موفقیت ثبت شدند.', 'Manual rates saved successfully.'));
        setIsManualModalOpen(false);
        await fetchRates();
      } catch (err) { showToast(t('خطا در ثبت نرخ‌های دستی', 'Error saving manual rates'), 'error'); }
    };

    const handleSaveEditedRate = async () => {
      try {
        if (!editingRate || !editingRate.rate || editingRate.rate === '0') return showToast(t('لطفاً مبلغ نرخ معتبر وارد کنید.', 'Please enter a valid rate amount.'), 'error');
        
        const rateVal = parseFloat(String(editingRate.rate).replace(/,/g, ''));
        const nowStr = new Date().toISOString();
        const oldRecord = rates.find(r => r.id === editingRate.id);
        const newRecord = { ...oldRecord, rate: rateVal, updated_by: currentUser, updated_at: nowStr };

        const { error } = await supabase.from('fm_currency_rates').update({ rate: rateVal, updated_by: currentUser, updated_at: nowStr }).eq('id', editingRate.id);
        if (error) throw error;
        
        await logAction('fm_currency_rates', editingRate.id, 'ویرایش', `ویرایش نرخ به مبلغ جدید: ${rateVal}`, oldRecord, newRecord);
        showToast(t('نرخ با موفقیت ویرایش شد.', 'Rate edited successfully.'));
        setIsEditRateModalOpen(false); fetchRates();
      } catch (err) { showToast(t('خطا در ویرایش نرخ', 'Error editing rate'), 'error'); }
    };

    const executeDelete = async () => {
      try {
        if (deleteConfirm.type === 'single') {
          const oldRec = rates.find(r => r.id === deleteConfirm.data.id);
          const { error } = await supabase.from('fm_currency_rates').delete().eq('id', deleteConfirm.data.id);
          if (error) throw error;
          await logAction('fm_currency_rates', deleteConfirm.data.id, 'حذف', `حذف تاریخچه نرخ: ${deleteConfirm.data.base_currency} -> ${deleteConfirm.data.target_currency}`, oldRec, null);
        } else if (deleteConfirm.type === 'bulk') {
          const oldRecords = deleteConfirm.data.map(id => rates.find(r => r.id === id)).filter(Boolean);
          const { error } = await supabase.from('fm_currency_rates').delete().in('id', deleteConfirm.data);
          if (error) throw error;
          for (const oldRec of oldRecords) await logAction('fm_currency_rates', oldRec.id, 'حذف', `حذف گروهی تاریخچه نرخ‌ها`, oldRec, null);
        }
        fetchRates(); showToast(t('عملیات حذف با موفقیت انجام شد', 'Deletion successful')); setDeleteConfirm({ isOpen: false, type: null, data: null });
      } catch (err) { showToast(t('خطا در حذف', 'Delete error'), 'error'); setDeleteConfirm({ isOpen: false, type: null, data: null }); }
    };

    const currentConvRate = useMemo(() => {
      if (!convFrom || !convTo || !convDate) return null;
      if (convFrom === convTo) return 1;
      const fd = convDate.replace(/\//g, '-');

      // پیدا کردن آخرین نرخ به ازای هر جفت ارز که rate_date <= تاریخ انتخابی باشد
      const eligible = rates.filter(r => r.rate_date && String(r.rate_date).substring(0, 10) <= fd);
      if (!eligible.length) return null;

      // مرتب‌سازی: اول rate_date نزولی، بعد created_at نزولی (تعیین تکلیف در تاریخ‌های مساوی)
      const sorted = eligible.slice().sort((a, b) => {
        const da = String(a.rate_date).substring(0, 10);
        const db = String(b.rate_date).substring(0, 10);
        if (db > da) return 1;
        if (db < da) return -1;
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      });

      // جدیدترین نرخ هر جفت ارز (اولین رکورد بعد از sort)
      const seen = new Set();
      const vr = [];
      for (const r of sorted) {
        const key = `${r.base_currency}|${r.target_currency}`;
        if (!seen.has(key)) { seen.add(key); vr.push(r); }
      }
      if (!vr.length) return null;

      const find = (b, tgt) => vr.find(r => r.base_currency === b && r.target_currency === tgt);
      let dir = find(convFrom, convTo); if (dir) return dir.rate;
      let inv = find(convTo, convFrom); if (inv) return 1 / inv.rate;
      for (const c of currencies) {
        if (c.code === convFrom || c.code === convTo) continue;
        const r1 = find(convFrom, c.code)?.rate ?? (find(c.code, convFrom) ? 1 / find(c.code, convFrom).rate : null);
        const r2 = find(c.code, convTo)?.rate ?? (find(convTo, c.code) ? 1 / find(convTo, c.code).rate : null);
        if (r1 && r2) return r1 * r2;
      }
      return null;
    }, [convFrom, convTo, convDate, rates, currencies]);
    const convResult = useMemo(() => {
      if (!convAmount || currentConvRate === null) return null;
      const amount = parseFloat(String(convAmount).replace(/,/g, ''));
      return isNaN(amount) ? null : (amount * currentConvRate).toLocaleString(undefined, { maximumFractionDigits: 10 });
    }, [convAmount, currentConvRate]);

    const openConverter = () => { fetchRates(); setConvDate(getTodayGregorian()); setConvFrom(currencies[0]?.code || ''); setConvTo(currencies[1]?.code || ''); setIsConverterOpen(true); };

    const historyColumns = [
      { 
        field: 'created_at', header_fa: 'تاریخ و زمان', header_en: 'Date & Time', width: '160px', 
        render: (v) => {
          if (!v) return ''; const d = new Date(v);
          const formattedDate = formatGlobalDate ? formatGlobalDate(v, globalCalendarMode) : d.toISOString().split('T')[0].replace(/-/g, '/');
          return (
             <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
               <Calendar size={12} className="text-slate-400 dark:text-slate-500" />
               <span className="font-sans text-[12px] font-medium" dir="ltr">{formattedDate}</span>
               <Clock size={12} className="text-slate-400 dark:text-slate-500 ml-1" />
               <span className="font-sans text-[10px] bg-slate-100 dark:bg-slate-700 px-1 rounded" dir="ltr">{String(d.getHours()).padStart(2, '0')}:{String(d.getMinutes()).padStart(2, '0')}</span>
             </div>
          );
        }
      },
      { field: 'base_currency', header_fa: 'ارز پایه', header_en: 'Base', width: '100px', render: (v) => <span className="font-bold text-slate-800 dark:text-slate-200">{v}</span> },
      { field: 'target_currency', header_fa: 'ارز هدف', header_en: 'Target', width: '100px' },
      { field: 'rate', header_fa: 'نرخ تبدیل', header_en: 'Rate', width: '150px', render: (v) => <span className="font-sans font-bold text-indigo-700 dark:text-indigo-400">{v.toLocaleString()}</span> },
      { field: 'source', header_fa: 'منبع', header_en: 'Source', width: '100px', render: (v) => <Badge variant={v === 'XE' ? 'emerald' : 'blue'} size="sm">{v}</Badge> }
    ];

    const historyBulkActions = [
      { 
        id: 'delete', label: t('حذف سوابق انتخاب شده', 'Delete Selected Records'), icon: Trash2, 
        onClick: (ids) => {
            const validIds = ids.filter(id => { const rate = rates.find(r => r.id === id); return rate && isWithinOneWeek(rate.created_at); });
            if (validIds.length === 0) return showToast(t('هیچ یک از رکوردهای انتخاب شده قابل حذف نیستند (گذشت بیش از یک هفته).', 'None of the selected records can be deleted (older than 1 week).'), 'error');
            if (validIds.length < ids.length) showToast(t('تنها رکوردهایی که کمتر از یک هفته از ثبت آنها گذشته برای حذف انتخاب شدند.', 'Only records newer than 1 week were selected for deletion.'), 'warning');
            setDeleteConfirm({ isOpen: true, type: 'bulk', data: validIds });
        }, 
        variant: 'danger-outline', className: '!text-red-500 dark:!text-red-400 !border-red-500 dark:!border-red-800 hover:!bg-red-50 dark:hover:!bg-red-900/30' 
      }
    ];

    const filteredRates = useMemo(() => {
      let result = [...rates];
      if (rateFilters.base) result = result.filter(r => r.base_currency === rateFilters.base);
      if (rateFilters.target) result = result.filter(r => r.target_currency === rateFilters.target);
      if (rateFilters.source) result = result.filter(r => r.source === rateFilters.source);
      if (rateFilters.fromDate) result = result.filter(r => r.rate_date >= rateFilters.fromDate.replace(/\//g, '-'));
      if (rateFilters.toDate) result = result.filter(r => r.rate_date <= rateFilters.toDate.replace(/\//g, '-'));
      return result;
    }, [rates, rateFilters]);

    const handleDownloadSample = useCallback(() => {
      const headers = ['base_currency', 'target_currency', 'rate', 'rate_date'];
      const today = getTodayGregorian().replace(/\//g, '-');
      const csvRows = [headers.join(',')];
      const manualCurrencies = currencies.filter(c => c.fetch_type === 'manual');
      if (manualCurrencies.length > 0) {
        manualCurrencies.forEach(c => {
          (c.targets || []).forEach(tCode => csvRows.push([c.code, tCode, '', today].join(',')));
        });
      } else {
        csvRows.push(['USD', 'IRR', '42000', today]);
        csvRows.push(['EUR', 'IRR', '46000', today]);
      }
      const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'currency_rates_sample.csv'; a.click();
      URL.revokeObjectURL(url);
    }, [currencies]);

    const handleImport = useCallback((file) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const XLSX = window.XLSX;
          if (!XLSX) { showToast(t('کتابخانه پردازش فایل در دسترس نیست.', 'File processing library not available.'), 'error'); return; }
          const wb = XLSX.read(e.target.result, { type: 'array', cellDates: true });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const allRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
          if (allRows.length < 2) { showToast(t('فایل خالی است یا فرمت صحیح ندارد.', 'File is empty or has invalid format.'), 'error'); return; }

          const knownCodes = new Set(currencies.map(c => c.code.toUpperCase()));
          const nowStr = new Date().toISOString();
          const toInsert = [];
          const errors = [];

          for (let i = 1; i < allRows.length; i++) {
            const cols = allRows[i].map(c => String(c ?? '').trim());
            const base = cols[0]?.toUpperCase();
            const target = cols[1]?.toUpperCase();
            const rateRaw = cols[2]?.replace(/,/g, '');
            const rateDate = cols[3]?.replace(/\//g, '-');
            const rowLabel = t(`ردیف ${i + 1}`, `Row ${i + 1}`);

            if (!base || !target) { errors.push(t(`${rowLabel}: ارز پایه و هدف الزامی است.`, `${rowLabel}: base and target currency are required.`)); continue; }
            if (!knownCodes.has(base)) { errors.push(t(`${rowLabel}: ارز «${base}» در سیستم تعریف نشده.`, `${rowLabel}: Currency "${base}" not found.`)); continue; }
            if (!knownCodes.has(target)) { errors.push(t(`${rowLabel}: ارز «${target}» در سیستم تعریف نشده.`, `${rowLabel}: Currency "${target}" not found.`)); continue; }
            const rateNum = parseFloat(rateRaw);
            if (!rateRaw || isNaN(rateNum) || rateNum <= 0) { errors.push(t(`${rowLabel}: نرخ معتبر نیست.`, `${rowLabel}: Invalid rate value.`)); continue; }
            if (!rateDate || isNaN(Date.parse(rateDate))) { errors.push(t(`${rowLabel}: تاریخ معتبر نیست. فرمت مورد انتظار: YYYY-MM-DD`, `${rowLabel}: Invalid date. Expected format: YYYY-MM-DD`)); continue; }

            toInsert.push({ base_currency: base, target_currency: target, rate: rateNum, rate_date: rateDate, created_at: nowStr, source: 'Manual', created_by: currentUser, updated_by: currentUser, updated_at: nowStr });
          }

          if (errors.length > 0 && toInsert.length === 0) { showToast(errors[0], 'error'); return; }
          if (toInsert.length === 0) { showToast(t('رکورد معتبری یافت نشد.', 'No valid records found.'), 'error'); return; }

          const { data, error } = await supabase.from('fm_currency_rates').insert(toInsert).select();
          if (error) throw error;
          if (data) for (const rate of data) await logAction('fm_currency_rates', rate.id, 'ایجاد', `ایمپورت نرخ: ${rate.base_currency} به ${rate.target_currency} = ${rate.rate}`, null, rate);

          showToast(t(`${toInsert.length} نرخ با موفقیت ایمپورت شد.${errors.length > 0 ? ` (${errors.length} ردیف نادیده گرفته شد)` : ''}`, `${toInsert.length} rates imported successfully.${errors.length > 0 ? ` (${errors.length} rows skipped)` : ''}`));
          fetchRates();
        } catch (err) {
          showToast(t('خطا در پردازش فایل ایمپورت.', 'Error processing import file.'), 'error');
        }
      };
      reader.readAsArrayBuffer(file);
    }, [currencies, supabase, currentUser, showToast, fetchRates, t]);

    const rateOps = [
      { label: t('گرفتن نرخ ارزها از XE', 'Fetch Rates from XE'), icon: Globe, onClick: handleXeFetch, className: 'text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300', requiredAccess: 'xe_fetch' },
      { label: t('بروزرسانی دستی نرخ‌ها', 'Manual Rate Update'), icon: Edit, onClick: openManualUpdateModal, className: 'text-blue-700 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300', requiredAccess: 'manual_rate' },
      { divider: true },
      { label: t('تبدیل‌گر (ماشین حساب)', 'Currency Converter'), icon: Calculator, onClick: openConverter, className: 'text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400', requiredAccess: 'converter' }
    ];

    const headerMenus = [{ label: t('عملیات نرخ‌گذاری', 'Rate Operations'), icon: Zap, className: 'text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border-indigo-200 dark:border-indigo-800', items: rateOps }];

    return (
      <>
        
        <div className="flex-1 min-h-0">
            <DataGrid 
              data={filteredRates} columns={historyColumns} language={language} formCode={formCode} selectable={true}
              gridState={ratesGridState} onGridStateChange={setRatesGridState} bulkActions={historyBulkActions}
              onDownloadSample={handleDownloadSample}
              onImport={access.canCreate ? handleImport : undefined}
              actions={[
                { id: 'view_log', icon: History, tooltip: t('مشاهده لاگ سیستم', 'View System Log'), onClick: (row) => openLogModal('fm_currency_rates', row.id), className: 'text-indigo-400 dark:text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-300' },
                { id: 'edit', icon: Edit, tooltip: t('ویرایش سابقه', 'Edit Record'), onClick: (row) => { setEditingRate({...row}); setIsEditRateModalOpen(true); }, hidden: (row) => !(row.source === 'Manual' && isWithinOneWeek(row.created_at)), className: 'text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400' },
                { id: 'delete', icon: Trash2, tooltip: t('حذف سابقه', 'Delete Record'), onClick: (row) => setDeleteConfirm({ isOpen: true, type: 'single', data: row }), hidden: (row) => !isWithinOneWeek(row.created_at), className: 'text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400' }
              ]}
              headerMenus={headerMenus}
            />
        </div>

        <Modal isOpen={isManualModalOpen} onClose={() => setIsManualModalOpen(false)} title={t('بروزرسانی دستی نرخ‌ها', 'Manual Rates Update')} language={language} width="max-w-2xl">
           <div className="p-4 flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg">
                 <DatePicker formCode={formCode} size="sm" label={t('تاریخ ثبت نرخ', 'Rate Date')} value={manualDate} onChange={setManualDate} isRtl={isRtl} language={language} required />
                 <div className="flex flex-col gap-1 w-full">
                    <label className="text-[12px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">{t('ساعت ثبت', 'Rate Time')} <span className="text-red-500 dark:text-red-400">*</span></label>
                    <input type="time" disabled={isReadOnly} value={manualTime} onChange={(e) => setManualTime(e.target.value)} className={`h-8 text-[12px] rounded-lg outline-none px-2.5 transition-all ${isReadOnly ? 'bg-slate-100/50 dark:bg-slate-800/50 text-slate-500 border border-slate-200 dark:border-slate-700 cursor-not-allowed' : 'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100 focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 px-2.5'}`} required />
                 </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 dark:text-slate-500">{t('نرخ‌های دستی را وارد کنید یا از آخرین نرخ‌های ثبت‌شده کپی بگیرید.', 'Enter rates or copy from last saved values.')}</span>
                {!isReadOnly && <Button variant="outline" size="sm" icon={Copy} onClick={handleCopyLastRates} disabled={manualRatesList.length === 0}>{t('کپی از آخرین نرخ‌ها', 'Copy Last Rates')}</Button>}
              </div>
              <div className="flex flex-col max-h-[350px] overflow-y-auto custom-scrollbar pr-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                 {manualRatesList.map((item, idx) => (
                    <div key={`${item.base}-${item.target}`} className="flex items-center gap-3 py-2 border-b border-slate-100 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/50 px-3 transition-colors">
                       <div className="w-16 font-black text-slate-800 dark:text-slate-200 text-[14px] text-center">{item.base}</div>
                       <div className="text-indigo-400 dark:text-indigo-500 shrink-0 flex items-center justify-center">{isRtl ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}</div>
                       <div className="w-16 font-black text-slate-800 dark:text-slate-200 text-[14px] text-center">{item.target}</div>
                       <div className="flex-1 ml-2">
                          <CurrencyField formCode={formCode} size="sm" value={item.rate} onChange={(v) => { const newList = [...manualRatesList]; newList[idx].rate = v; setManualRatesList(newList); }} placeholder={t('مبلغ نرخ را وارد کنید...', 'Enter rate amount...')} wrapperClassName="m-0" />
                       </div>
                    </div>
                 ))}
                 {manualRatesList.length === 0 && <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-[12px] font-bold bg-slate-50 dark:bg-slate-900/50">{t('هیچ ارزی با تنظیم دریافت دستی در سیستم یافت نشد.', 'No manual currencies with targets found.')}</div>}
              </div>
              <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-slate-100 dark:border-slate-700/50">
                <Button variant="outline" size="sm" onClick={() => setIsManualModalOpen(false)}>{t('بستن', 'Close')}</Button>
                {!isReadOnly && <Button variant="primary" size="sm" icon={Save} onClick={handleSaveManualRates} disabled={manualRatesList.length === 0}>{t('ذخیره در تاریخچه', 'Save to History')}</Button>}
              </div>
           </div>
        </Modal>

        <Modal isOpen={isEditRateModalOpen} onClose={() => setIsEditRateModalOpen(false)} title={t('ویرایش نرخ دستی', 'Edit Manual Rate')} language={language} width="max-w-sm">
           <div className="p-4 flex flex-col gap-4">
              <div className="flex flex-col gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg">
                 <div className="flex items-center justify-between text-[14px]"><span className="text-slate-500 dark:text-slate-400 font-bold">{t('ارز پایه:', 'Base:')}</span><span className="font-black text-slate-800 dark:text-slate-200">{editingRate?.base_currency}</span></div>
                 <div className="flex items-center justify-between text-[14px]"><span className="text-slate-500 dark:text-slate-400 font-bold">{t('ارز هدف:', 'Target:')}</span><span className="font-black text-slate-800 dark:text-slate-200">{editingRate?.target_currency}</span></div>
                 <div className="flex items-center justify-between text-[14px]"><span className="text-slate-500 dark:text-slate-400 font-bold">{t('تاریخ:', 'Date:')}</span><span className="font-black text-slate-800 dark:text-slate-200 font-sans" dir="ltr">{formatGlobalDate ? formatGlobalDate(editingRate?.rate_date, globalCalendarMode) : editingRate?.rate_date}</span></div>
              </div>
              <CurrencyField formCode={formCode} label={t('مبلغ نرخ', 'Rate Amount')} value={editingRate?.rate || ''} onChange={(v) => setEditingRate({...editingRate, rate: v})} isRtl={isRtl} size="md" required />
              <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-slate-100 dark:border-slate-700/50">
                <Button variant="outline" size="sm" onClick={() => setIsEditRateModalOpen(false)}>{t('بستن', 'Close')}</Button>
                {!isReadOnly && <Button variant="primary" size="sm" icon={Save} onClick={handleSaveEditedRate}>{t('ذخیره تغییرات', 'Save Changes')}</Button>}
              </div>
           </div>
        </Modal>

        <Modal isOpen={isConverterOpen} onClose={() => setIsConverterOpen(false)} title={t('ماشین حساب تبدیل‌گر چندلایه', 'Multi-level Currency Converter')} language={language} width="max-w-lg">
           <div className="p-5 flex flex-col items-center">
              <div className="w-full mb-6 p-3 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800/50 rounded-lg">
                 <DatePicker size="sm" label={t('تاریخ مبنای محاسبات', 'Calculation Base Date')} value={convDate} onChange={setConvDate} isRtl={isRtl} language={language} required wrapperClassName="w-full" />
              </div>
              <div className="flex flex-col sm:flex-row items-end gap-3 w-full relative">
                 <CurrencyField label={t('مبلغ مبدا', 'Source Amount')} value={convAmount} onChange={setConvAmount} isRtl={isRtl} size="sm" wrapperClassName="flex-1" />
                 <SelectField label={t('از ارز', 'From')} value={convFrom} onChange={(e) => setConvFrom(e.target.value)} isRtl={isRtl} size="sm" wrapperClassName="w-24" options={currencies.map(c => ({value: c.code, label: c.code}))} />
                 <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-400 cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/40 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors mb-1 shrink-0" onClick={() => { const temp = convFrom; setConvFrom(convTo); setConvTo(temp); }}><ArrowRightLeft size={16} className={isRtl ? '' : 'rotate-180'} /></div>
                 <SelectField label={t('به ارز', 'To')} value={convTo} onChange={(e) => setConvTo(e.target.value)} isRtl={isRtl} size="sm" wrapperClassName="w-24" options={currencies.map(c => ({value: c.code, label: c.code}))} />
              </div>
              {currentConvRate !== null && (
                 <div className="w-full mt-4 flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800/50 rounded-lg animate-in fade-in">
                    <span className="text-[12px] font-bold text-emerald-700 dark:text-emerald-400">{t('نرخ برابری:', 'Exchange Rate:')}</span>
                    <span className="text-[14px] font-black font-sans text-emerald-800 dark:text-emerald-300" dir="ltr">1 {convFrom} = {currentConvRate.toLocaleString(undefined, { maximumFractionDigits: 10 })} {convTo}</span>
                 </div>
              )}
              <div className="mt-6 w-full p-5 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center gap-1 shadow-sm">
                 <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter">{t('حاصل تبدیل بر اساس تاریخ انتخابی', 'Conversion Result by Date')}</span>
                 <div className="text-2xl font-black text-indigo-700 dark:text-indigo-400 font-sans tracking-tight" dir="ltr">{convResult === null ? t('نامشخص', 'Unknown') : convResult} <span className="text-sm text-slate-400 dark:text-slate-500 font-sans ml-1">{convTo}</span></div>
              </div>
           </div>
        </Modal>

        <Modal isOpen={deleteConfirm.isOpen} onClose={() => setDeleteConfirm({ isOpen: false, type: null, data: null })} title={t('تایید عملیات حذف', 'Confirm Deletion')} language={language} width="max-w-sm">
          <div className="p-4 flex flex-col gap-3 items-center text-center">
            <div className="w-11 h-11 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center text-red-500 dark:text-red-400 mb-1"><AlertTriangle size={22} /></div>
            <div className="bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-3 py-1.5 rounded-full text-[10px] font-black flex items-center gap-1"><Lock size={12}/> {t('هشدار: غیرقابل بازگشت', 'WARNING: IRREVERSIBLE')}</div>
            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">{deleteConfirm.type === 'bulk' ? t(`آیا از حذف ${deleteConfirm.data?.length} مورد انتخاب شده اطمینان دارید؟`, `Delete selected items?`) : t(`آیا از حذف این سابقه اطمینان دارید؟`, `Delete this record?`)}</p>
            <div className="flex gap-2 mt-4 w-full">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setDeleteConfirm({ isOpen: false, type: null, data: null })}>{t('انصراف', 'Cancel')}</Button>
              <Button variant="primary" size="sm" onClick={executeDelete} className="flex-1 bg-red-600 dark:bg-red-500 hover:bg-red-700 dark:hover:bg-red-600 border-red-600 dark:border-red-500 shadow-lg shadow-red-100 dark:shadow-none">{t('تایید حذف', 'Delete Now')}</Button>
            </div>
          </div>
        </Modal>

        <Modal isOpen={isLogModalOpen} onClose={() => setIsLogModalOpen(false)} title={t('لاگ‌های سیستمی رکورد', 'System Logs')} language={language} width="max-w-xl">
           <LogTimeline logs={recordLogs} isLoading={isLogsLoading} language={language} />
        </Modal>

        <Toast isVisible={toast.isVisible} message={toast.message} type={toast.type} onClose={() => setToast(prev => ({ ...prev, isVisible: false }))} />
      </>
    );
  };

  window.CurrencyHistory = CurrencyHistory;
})();
