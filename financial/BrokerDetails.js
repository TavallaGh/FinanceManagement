/* Filename: financial/BrokerDetails.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useRef } = React;
  const Fallback = () => null;
  const DS = window.DesignSystem || {};
  const DSCore = window.DSCore || DS;
  const DSForms = window.DSForms || DS;
  const DSGrid = window.DSGrid || DS;
  const DSFeedback = window.DSFeedback || DS;

  const Button = DSCore.Button || DS.Button || Fallback;
  const Modal = DSFeedback.Modal || DS.Modal || Fallback;
  const Toast = DSFeedback.Toast || DS.Toast || Fallback;
  const LOVField = DSGrid.LOVField || DS.LOVField || Fallback;
  const TextField = DSForms.TextField || DS.TextField || Fallback;
  const SelectField = DSForms.SelectField || DS.SelectField || Fallback;
  const ToggleField = DSForms.ToggleField || DS.ToggleField || Fallback;
  const CheckboxField = DSForms.CheckboxField || DS.CheckboxField || Fallback;
  const DatePicker = DSForms.DatePicker || DS.DatePicker || Fallback;
  const LogTimeline = DSFeedback.LogTimeline || DS.LogTimeline || Fallback;

  const LucideIcons = window.LucideIcons || {};
  const FallbackIcon = () => null;
  const Save = LucideIcons.Save || FallbackIcon;
  const Plus = LucideIcons.Plus || FallbackIcon;
  const AlertTriangle = LucideIcons.AlertTriangle || FallbackIcon;

  const supabase = window.supabase;

  const BrokerDetailsApp = ({ defaultLang = 'fa' }) => {
    const [language, setLanguage] = useState(defaultLang);
    const isRtl = language === 'fa';
    const t = (fa, en) => isRtl ? fa : en;

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentRecord, setCurrentRecord] = useState(null);
    const [formData, setFormData] = useState({ partyId: '', accountId: '', validFrom: '', validTo: '', isActive: true });

    const [isQuickPartyModalOpen, setIsQuickPartyModalOpen] = useState(false);
    const [isSavingParty, setIsSavingParty] = useState(false);
    const [quickPartyData, setQuickPartyData] = useState({ partyType: 'real', companyName: '', code: '', firstName: '', lastName: '', latinTitle: '', nationalId: '', mobile: '', email: '', roles: ['broker'] });

    const [allParties, setAllParties] = useState([]);
    const [partiesDropdown, setPartiesDropdown] = useState([]);

    const [allCoaAccounts, setAllCoaAccounts] = useState([]);
    const [accounts, setAccounts] = useState([]);

    const [isQuickAccountModalOpen, setIsQuickAccountModalOpen] = useState(false);
    const [isSavingAccount, setIsSavingAccount] = useState(false);
    const [quickAccountData, setQuickAccountData] = useState({ parentId: '', code: '', titleFa: '', titleEn: '', isActive: true });

    const [isLoading, setIsLoading] = useState(false);
    const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' });
    const showToast = (message, type = 'success') => {
      setToast({ isVisible: true, message, type });
      setTimeout(() => setToast(prev => ({ ...prev, isVisible: false })), 3500);
    };

    const EXTERNAL_PARTY_ROLES = [
      { id: 'customer', label: t('مشتری', 'Customer') },
      { id: 'supplier', label: t('تامین‌کننده', 'Supplier') },
      { id: 'shareholder', label: t('سهامدار', 'Shareholder') },
      { id: 'broker', label: t('بروکر', 'Broker') }
    ];

    useEffect(() => {
      fetchDropdownData();
    }, []);

    const fetchDropdownData = async () => {
      try {
        const [{ data: coaData }, { data: chartsData }, { data: currenciesData }, { data: partiesData }] = await Promise.all([
          supabase.from('fm_coa_accounts').select('id, parent_id, title_fa, title_en, code, currency_id, is_active, chart_id'),
          supabase.from('fm_coa_charts').select('id, title').eq('is_active', true),
          supabase.from('fm_currencies').select('id, code'),
          supabase.from('parties').select('id, first_name, last_name, company_name, party_type, code, roles, mobile, email')
        ]);
        if (partiesData) {
          setAllParties(partiesData);
          setPartiesDropdown(partiesData.map(p => ({ id: p.id, label: `${p.party_type === 'legal' ? (p.company_name || '') : ((p.first_name || '') + ' ' + (p.last_name || '')).trim()} (${p.code})`, code: p.code || '---', mobile: p.mobile || '---', email: p.email })));
        }

        if (coaData && chartsData) {
          const activeChartIds = new Set(chartsData.map(c => c.id));
          const chartsMap = new Map(chartsData.map(c => [c.id, c.title]));
          const currenciesMap = new Map((currenciesData || []).map(c => [c.id, c.code]));

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
              const parent = coaData.find(c => c.id === current.parent_id);
              if(parent) {
                pathFa = (parent.title_fa || '') + ' / ' + pathFa;
                pathEn = (parent.title_en || parent.title_fa || '') + ' / ' + pathEn;
                current = parent;
              } else { break; }
            }
            return { pathFa, pathEn };
          };

          const allWithPaths = coaData.map(acc => {
            const paths = buildPath(acc);
            return { ...acc, pathFa: paths.pathFa, pathEn: paths.pathEn, chartName: chartsMap.get(acc.chart_id) || '', isActiveChart: activeChartIds.has(acc.chart_id), currency_code: currenciesMap.get(acc.currency_id) || '' };
          });
          setAllCoaAccounts(allWithPaths);

          const parentIds = new Set(coaData.map(c => c.parent_id).filter(Boolean));
          const leaves = coaData.filter(c => !parentIds.has(c.id) && activeChartIds.has(c.chart_id) && isEffectivelyActive(c));
          const accOptions = leaves.map(leaf => {
            const paths = buildPath(leaf);
            return { id: leaf.id, code: leaf.code, titleFa: leaf.title_fa, titleEn: leaf.title_en, pathFa: paths.pathFa, pathEn: paths.pathEn, chartName: chartsMap.get(leaf.chart_id) || '', currency_code: currenciesMap.get(leaf.currency_id) || '' };
          });
          setAccounts(accOptions);
        }
      } catch (err) {
        console.error('BrokerDetails fetchDropdownData error', err);
      }
    };

    const suggestNextCode = (parentId) => {
      const parent = allCoaAccounts.find(a => a.id === parentId);
      if (!parent || !parent.code) return '';
      const parentCode = parent.code;
      const children = allCoaAccounts.filter(a => a.parent_id === parentId);
      if (children.length === 0) return parentCode + '01';
      const nums = children.map(c => { const s = c.code?.startsWith(parentCode) ? c.code.slice(parentCode.length) : c.code; return parseInt(s, 10); }).filter(n => !isNaN(n));
      const nextNum = (nums.length > 0 ? Math.max(...nums) : 0) + 1;
      return parentCode + String(nextNum).padStart(2, '0');
    };

    const handleSaveBroker = async () => {
      if (!formData.partyId) { alert(t('انتخاب شخص/شرکت الزامی است.', 'Party selection is required.')); return; }
      if (formData.validFrom && formData.validTo) {
        const fromDate = new Date(formData.validFrom);
        const toDate = new Date(formData.validTo);
        if (toDate < fromDate) { alert(t('تاریخ پایان اعتبار نمی‌تواند قبل از تاریخ شروع باشد.', 'Valid To date cannot be earlier than Valid From date.')); return; }
      }
      setIsLoading(true);
      try {
        const payload = { party_id: formData.partyId, account_id: formData.accountId || null, valid_from: formData.validFrom || null, valid_to: formData.validTo || null, is_active: formData.isActive, updated_at: new Date().toISOString() };
        if (currentRecord?.id) {
          const { error } = await supabase.from('fm_brokers').update(payload).eq('id', currentRecord.id);
          if (error) { if (error.code === '23505') alert(t('این بروکر قبلاً ثبت شده است.', 'This broker is already registered.')); else throw error; return; }
        } else {
          const { data: newRec, error } = await supabase.from('fm_brokers').insert([payload]).select();
          if (error) { if (error.code === '23505') alert(t('این بروکر قبلاً ثبت شده است.', 'This broker is already registered.')); else throw error; return; }
        }
        setIsModalOpen(false);
        // Notify parent/listeners to refresh
        window.dispatchEvent(new CustomEvent('broker:changed'));
      } catch (err) {
        console.error('BrokerDetails save error', err);
      } finally { setIsLoading(false); }
    };

    const handleSaveQuickParty = async () => {
      const isLegal = quickPartyData.partyType === 'legal';
      if (!quickPartyData.code || !quickPartyData.latinTitle || (isLegal && !quickPartyData.companyName) || (!isLegal && (!quickPartyData.firstName || !quickPartyData.lastName))) { alert(t('لطفاً فیلدهای ستاره‌دار را تکمیل کنید.', 'Please fill required fields.')); return; }
      setIsSavingParty(true);
      try {
        const payload = { party_type: quickPartyData.partyType, code: quickPartyData.code, first_name: isLegal ? null : quickPartyData.firstName, last_name: isLegal ? null : quickPartyData.lastName, company_name: isLegal ? quickPartyData.companyName : null, latin_title: quickPartyData.latinTitle, national_id: quickPartyData.nationalId, mobile: quickPartyData.mobile, email: quickPartyData.email, roles: Array.from(new Set([...quickPartyData.roles, 'broker'])), is_active: true, created_at: new Date().toISOString() };
        const { data: newPartyData, error } = await supabase.from('parties').insert([payload]).select().single();
        if (error) { if (error.code === '23505') { alert(t('کد شخص یا شناسه ملی تکراری است.', 'Duplicate party code or national ID.')); } else { throw error; } return; }
        const partyLabel = isLegal ? `${newPartyData.company_name} (${newPartyData.code})` : `${newPartyData.first_name} ${newPartyData.last_name} (${newPartyData.code})`;
        const newDropdownItem = { id: newPartyData.id, label: partyLabel, code: newPartyData.code || '---', mobile: newPartyData.mobile || '---', email: newPartyData.email };
        setAllParties(prev => [...prev, newPartyData]);
        setPartiesDropdown(prev => [...prev, newDropdownItem]);
        setFormData(prev => ({ ...prev, partyId: newPartyData.id }));
        setIsQuickPartyModalOpen(false);
        setQuickPartyData({ partyType: 'real', companyName: '', code: '', firstName: '', lastName: '', latinTitle: '', nationalId: '', mobile: '', email: '', roles: ['broker'] });
      } catch (err) { console.error('Save Quick Party Error:', err); alert(t('خطا در ذخیره اطلاعات شخص.', 'Error saving party.')); } finally { setIsSavingParty(false); }
    };

    const openQuickAccountModal = () => {
      const selectedParty = allParties.find(p => p.id === formData.partyId);
      const titleFa = selectedParty ? (selectedParty.party_type === 'legal' ? (selectedParty.company_name || '') : `${selectedParty.first_name || ''} ${selectedParty.last_name || ''}`.trim()) : '';
      const titleEn = titleFa;
      setQuickAccountData({ parentId: '', code: '', titleFa, titleEn });
      setIsQuickAccountModalOpen(true);
    };

    const handleSaveQuickAccount = async () => {
      if (!quickAccountData.parentId || !quickAccountData.code || !quickAccountData.titleFa) { showToast(t('حساب پدر، کد و عنوان فارسی الزامی هستند', 'Parent account, code and Persian title are required'), 'error'); return; }
      setIsSavingAccount(true);
      try {
        const parentAcc = allCoaAccounts.find(a => a.id === quickAccountData.parentId);
        const payload = { parent_id: quickAccountData.parentId, chart_id: parentAcc?.chart_id || null, code: quickAccountData.code, title_fa: quickAccountData.titleFa, title_en: quickAccountData.titleEn || quickAccountData.titleFa, is_active: quickAccountData.isActive ?? true, created_at: new Date().toISOString() };
        const { data: newAcc, error } = await supabase.from('fm_coa_accounts').insert([payload]).select().single();
        if (error) { if (error.code === '23505') showToast(t('کد حساب تکراری است', 'Account code already exists'), 'error'); else throw error; return; }
        const buildPath = (node, allAccs) => { let parts = [node.title_fa || '']; let cur = allAccs.find(a => a.id === node.parent_id); while (cur) { parts.unshift(cur.title_fa || ''); cur = allAccs.find(a => a.id === cur.parent_id); } return parts.join(' > '); };
        const updatedAll = [...allCoaAccounts, newAcc];
        setAllCoaAccounts(updatedAll);
        const newAccOption = { id: newAcc.id, code: newAcc.code, titleFa: newAcc.title_fa, titleEn: newAcc.title_en, pathFa: buildPath(newAcc, updatedAll), pathEn: buildPath(newAcc, updatedAll) };
        setAccounts(prev => [...prev, newAccOption]);
        setFormData(prev => ({ ...prev, accountId: newAcc.id }));
        setIsQuickAccountModalOpen(false);
        showToast(t('حساب با موفقیت ایجاد شد', 'Account created successfully'));
      } catch (err) { console.error('Save Quick Account Error:', err); showToast(t('خطا در ایجاد حساب', 'Error creating account'), 'error'); } finally { setIsSavingAccount(false); }
    };

    // Expose an open function globally
    useEffect(() => {
      window.openBrokerDetails = (record = null, lang = defaultLang) => {
        setLanguage(lang);
        setFormData(record ? { partyId: record.party_id || '', accountId: record.account_id || '', validFrom: record.valid_from ? record.valid_from.substring(0,10) : '', validTo: record.valid_to ? record.valid_to.substring(0,10) : '', isActive: record.is_active ?? true } : { partyId: '', accountId: '', validFrom: '', validTo: '', isActive: true });
        setCurrentRecord(record);
        setIsModalOpen(true);
      };
      return () => { if (window.openBrokerDetails && window.openBrokerDetails === window.openBrokerDetails) delete window.openBrokerDetails; };
    }, []);

    return (
      <>
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={currentRecord ? t('ویرایش بروکر', 'Edit Broker') : t('تعریف بروکر جدید', 'New Broker')} width="max-w-2xl" language={language}>
          <div className="p-4 flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-end gap-2">
                <div className="flex-1 min-w-0">
                  <LOVField size="sm" label={t('انتخاب شخص / شرکت (بروکر)', 'Select Party (Broker)')} data={partiesDropdown} columns={[{ field: 'code' }, { field: 'label' }]} displayValue={partiesDropdown.find(p => p.id === formData.partyId)?.label || ''} onChange={row => setFormData({...formData, partyId: row ? row.id : ''})} isRtl={isRtl} required />
                </div>
                <Button variant="outline" size="sm" icon={Plus} onClick={() => setIsQuickPartyModalOpen(true)} className="h-8 w-8 px-0" title={t('تعریف شخص جدید', 'Add New Party')} />
              </div>

              <div className="flex items-end gap-2">
                <div className="flex-1 min-w-0">
                  <LOVField size="sm" label={isRtl ? 'حساب مرتبط (آخرین سطح)' : 'Linked Account'} data={accounts} columns={[{ field: 'code' }, { field: 'titleFa' }]} displayValue={accounts.find(a => String(a.id) === String(formData.accountId))?.titleFa ? `${accounts.find(a => String(a.id) === String(formData.accountId))?.code} - ${accounts.find(a => String(a.id) === String(formData.accountId))?.titleFa}` : ''} onChange={row => setFormData({...formData, accountId: row ? row.id : ''})} isRtl={isRtl} />
                </div>
                <Button variant="outline" size="sm" icon={Plus} onClick={openQuickAccountModal} className="h-8 w-8 px-0" title={t('تعریف حساب جدید', 'Add New Account')} />
              </div>

              <DatePicker size="sm" label={t('تاریخ اعتبار از', 'Valid From')} value={formData.validFrom} onChange={val => setFormData({...formData, validFrom: val?.target ? val.target.value : val})} isRtl={isRtl} dir="ltr" />
              <DatePicker size="sm" label={t('تاریخ اعتبار تا', 'Valid To')} value={formData.validTo} onChange={val => setFormData({...formData, validTo: val?.target ? val.target.value : val})} isRtl={isRtl} dir="ltr" />

              <div className="md:col-span-2 flex items-center mt-2">
                 <ToggleField size="sm" label={t('بروکر فعال است', 'Is Active')} checked={formData.isActive} onChange={v => setFormData({...formData, isActive: v})} isRtl={isRtl} />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/50">
              <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>{t('انصراف', 'Cancel')}</Button>
              <Button variant="primary" size="sm" icon={Save} onClick={handleSaveBroker} isLoading={isLoading}>{t('ذخیره اطلاعات', 'Save Changes')}</Button>
            </div>
          </div>
        </Modal>

        <Modal isOpen={isQuickPartyModalOpen} onClose={() => setIsQuickPartyModalOpen(false)} title={t('تعریف سریع شخص / شرکت', 'Quick Add Party')} width="max-w-3xl" language={language}>
          <div className="p-4 flex flex-col gap-4">
            <div className="mb-2">
               <SelectField size="sm" label={t('نوع شخص', 'Party Type')} value={quickPartyData.partyType} onChange={e => setQuickPartyData({...quickPartyData, partyType: e.target.value, companyName: '', firstName: '', lastName: '', latinTitle: '', roles: ['broker']})} isRtl={isRtl} options={[{ value: 'real', label: t('حقیقی (فرد)', 'Real Person') }, { value: 'legal', label: t('حقوقی (شرکت)', 'Legal Entity') }]} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <TextField size="sm" label={t('کد شخص/شرکت', 'Party Code')} value={quickPartyData.code} onChange={e => setQuickPartyData({...quickPartyData, code: e.target.value})} isRtl={isRtl} required dir="ltr" />
              {quickPartyData.partyType === 'real' ? (
                <>
                  <TextField size="sm" label={t('نام', 'First Name')} value={quickPartyData.firstName} onChange={e => setQuickPartyData({...quickPartyData, firstName: e.target.value})} isRtl={isRtl} required />
                  <TextField size="sm" label={t('نام خانوادگی', 'Last Name')} value={quickPartyData.lastName} onChange={e => setQuickPartyData({...quickPartyData, lastName: e.target.value})} isRtl={isRtl} required />
                </>
              ) : (
                <div className="md:col-span-2"><TextField size="sm" label={t('نام شرکت', 'Company Name')} value={quickPartyData.companyName} onChange={e => setQuickPartyData({...quickPartyData, companyName: e.target.value})} isRtl={isRtl} required /></div>
              )}
              <TextField size="sm" label={t('عنوان لاتین', 'Latin Title')} value={quickPartyData.latinTitle} onChange={e => setQuickPartyData({...quickPartyData, latinTitle: e.target.value})} isRtl={isRtl} required dir="ltr" />
              <TextField size="sm" label={quickPartyData.partyType === 'real' ? t('کد ملی', 'National ID') : t('شناسه ملی / ثبت', 'Registration ID')} value={quickPartyData.nationalId} onChange={e => setQuickPartyData({...quickPartyData, nationalId: e.target.value})} isRtl={isRtl} dir="ltr" />
              <TextField size="sm" label={t('موبایل / تلفن', 'Mobile / Phone')} value={quickPartyData.mobile} onChange={e => setQuickPartyData({...quickPartyData, mobile: e.target.value})} isRtl={isRtl} dir="ltr" />
              <TextField size="sm" label={t('ایمیل', 'Email')} value={quickPartyData.email} onChange={e => setQuickPartyData({...quickPartyData, email: e.target.value})} isRtl={isRtl} dir="ltr" />
              <div className="md:col-span-2 flex flex-col justify-end">
                <label className="text-[12px] font-bold text-slate-700 dark:text-slate-300 mb-1.5 block">{t('نقش‌های مرتبط', 'Associated Roles')}</label>
                <div className="flex flex-wrap gap-x-4 gap-y-2 bg-slate-50 dark:bg-slate-800/50 px-3 py-2 rounded-lg border border-slate-100 dark:border-slate-700/50">
                  {EXTERNAL_PARTY_ROLES.map(role => (
                    <CheckboxField key={role.id} size="sm" label={role.label} checked={quickPartyData.roles.includes(role.id)} disabled={role.id === 'broker'} onChange={(checked) => { if (role.id === 'broker') return; setQuickPartyData(prev => ({ ...prev, roles: checked ? [...prev.roles, role.id] : prev.roles.filter(r => r !== role.id) })); }} isRtl={isRtl} />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/50">
              <Button variant="outline" size="sm" onClick={() => setIsQuickPartyModalOpen(false)}>{t('انصراف', 'Cancel')}</Button>
              <Button variant="primary" size="sm" icon={Save} onClick={handleSaveQuickParty} isLoading={isSavingParty}>{t('ذخیره و انتخاب', 'Save & Select')}</Button>
            </div>
          </div>
        </Modal>

        <Modal isOpen={isQuickAccountModalOpen} onClose={() => setIsQuickAccountModalOpen(false)} title={t('تعریف سریع حساب مرتبط', 'Quick Add Account')} width="max-w-2xl" language={language}>
          <div className="p-4 flex flex-col gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-3">
              <p className="text-[12px] text-blue-700 dark:text-blue-300 font-medium leading-relaxed">{t('ابتدا حساب پدر را از طریق LOV انتخاب کنید. عنوان حساب از نام Party بروکر پیش‌پر شده است.', 'First select the parent account via LOV. Account title is pre-filled from the broker\'s party name.')}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <LOVField wrapperClassName="w-full" size="sm" label={t('حساب پدر', 'Parent Account')} data={(() => {
                    const parentIdSet = new Set(allCoaAccounts.map(a => a.parent_id).filter(Boolean));
                    const allCoaMap = new Map(allCoaAccounts.map(a => [a.id, a]));
                    const checkActive = (acc) => { if (!acc) return true; if (!acc.is_active) return false; if (!acc.parent_id) return true; return checkActive(allCoaMap.get(acc.parent_id)); };
                    return allCoaAccounts.filter(a => a.isActiveChart && checkActive(a) && allCoaAccounts.some(c => c.parent_id === a.id && !parentIdSet.has(c.id)));
                  })()} columns={[{ field: 'chartName' }, { field: 'code' }, { field: 'title_fa' }]} dropdownWidth="min-w-[430px] max-w-[430px]" displayValue={(() => { const a = allCoaAccounts.find(x => x.id === quickAccountData.parentId); return a ? `${a.code} - ${a.title_fa}` : ''; })()} onChange={row => { const suggested = row ? suggestNextCode(row.id) : ''; setQuickAccountData(prev => ({ ...prev, parentId: row ? row.id : '', code: suggested })); }} isRtl={isRtl} required />
              </div>
              <TextField size="sm" label={t('کد حساب', 'Account Code')} value={quickAccountData.code} onChange={e => setQuickAccountData(prev => ({ ...prev, code: e.target.value }))} isRtl={isRtl} dir="ltr" required />
              <div className="flex items-end pb-1"><ToggleField size="sm" label={t('حساب فعال است', 'Is Active')} checked={quickAccountData.isActive ?? true} onChange={v => setQuickAccountData(prev => ({ ...prev, isActive: v }))} isRtl={isRtl} /></div>
              <TextField size="sm" label={t('عنوان فارسی', 'Persian Title')} value={quickAccountData.titleFa} onChange={e => setQuickAccountData(prev => ({ ...prev, titleFa: e.target.value }))} isRtl={isRtl} required />
              <TextField size="sm" label={t('عنوان انگلیسی', 'English Title')} value={quickAccountData.titleEn} onChange={e => setQuickAccountData(prev => ({ ...prev, titleEn: e.target.value }))} isRtl={isRtl} dir="ltr" />
            </div>
            <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-slate-100 dark:border-slate-700/50">
              <Button variant="outline" size="sm" onClick={() => setIsQuickAccountModalOpen(false)}>{t('انصراف', 'Cancel')}</Button>
              <Button variant="primary" size="sm" icon={Save} onClick={handleSaveQuickAccount} isLoading={isSavingAccount}>{t('ذخیره و انتخاب', 'Save & Select')}</Button>
            </div>
          </div>
        </Modal>

        <Toast isVisible={toast.isVisible} message={toast.message} type={toast.type} onClose={() => setToast(prev => ({ ...prev, isVisible: false }))} language={language} />
      </>
    );
  };

  // mount to body to be globally available
  const mountPoint = document.createElement('div');
  mountPoint.id = 'broker-details-root';
  document.body.appendChild(mountPoint);
  const root = window.ReactDOM?.createRoot ? window.ReactDOM.createRoot(mountPoint) : null;
  if (root) root.render(React.createElement(BrokerDetailsApp));
  else if (window.ReactDOM && window.ReactDOM.render) window.ReactDOM.render(React.createElement(BrokerDetailsApp), mountPoint);

  window.BrokerDetails = BrokerDetailsApp;
})();
