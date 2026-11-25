/* Parent selection and affected-account count for the account designer. */
(() => {
  const { useState, useEffect, useMemo, useRef } = window.React;
  const { Modal, Alert } = window.DSFeedback;
  const { Button } = window.DSCore;
  const { TextField } = window.DSForms;
  const { LOVField } = window.DSGrid;
  const Logic = window.ChartOfAccountsLogic;
  const FallbackIcon = () => null;
  const { Save = FallbackIcon, RefreshCw = FallbackIcon } = window.LucideIcons || {};

  const ChartOfAccountsMove = ({ node, chart, language, formCode, onClose, onSaved }) => {
    const isRtl = language === 'fa';
    const t = (fa, en) => isRtl ? fa : en;
    const securityCtx = window.SecurityManager?.useSecurity ? window.SecurityManager.useSecurity() : null;
    const canEdit = securityCtx ? !!securityCtx.getActions(formCode)?.canEdit : true;
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [loadError, setLoadError] = useState(null);
    const [saveError, setSaveError] = useState(null);
    const [parent, setParent] = useState(null);
    const [code, setCode] = useState('');
    const [reload, setReload] = useState(0);
    const busy = useRef(false);
    const errorText = error => error?.fa ? t(error.fa, error.en) :
      t('عملیات انجام نشد؛ دوباره تلاش کنید. ', 'Operation failed; please try again. ') + (error?.message || '');

    useEffect(() => {
      let cancelled = false;
      setLoading(true);
      setLoadError(null);
      setSaveError(null);
      setParent(null);
      setCode('');
      Logic.fetchAccounts(window.supabase, chart.id).then(data => {
        if (!cancelled) setRows(data);
      }).catch(error => {
        if (!cancelled) setLoadError(error);
      }).finally(() => {
        if (!cancelled) setLoading(false);
      });
      return () => { cancelled = true; };
    }, [chart.id, node.id, reload]);

    const nodes = useMemo(() => Logic.asNodes(rows), [rows]);
    const candidates = useMemo(() => {
      if (loading || loadError) return { data: [], error: null };
      try {
        const data = Logic.parentOptions(nodes, node.id).map(account => ({
          ...account,
          // LOV rows need a stable ID, including the virtual root destination.
          id: account.isRoot ? '__root__' : account.id,
          levelLabel: [t('بدون پدر', 'No parent'), t('گروه', 'Group'), t('کل', 'General ledger'), t('معین', 'Subsidiary')][account.level],
          title: account.isRoot ? t('ریشه درخت (بدون پدر)', 'Tree root (no parent)') :
            (isRtl ? account.titleFa : account.titleEn || account.titleFa)
        }));
        return { data, error: null };
      } catch (error) { return { data: [], error }; }
    }, [nodes, node.id, loading, loadError, isRtl]);

    const preview = useMemo(() => {
      if (!parent) return { changes: [], error: null };
      try {
        return { changes: Logic.planMove(nodes, node.id, parent.isRoot ? null : parent.id, code, chart), error: null };
      } catch (error) { return { changes: [], error }; }
    }, [nodes, node.id, parent, code, chart]);

    const selectParent = account => {
      setParent(account);
      setSaveError(null);
      if (!account) { setCode(''); return; }
      const parentId = account.isRoot ? null : account.id;
      setCode(Logic.suggestNextCode(nodes, parentId, Logic.getNewNodeDepth(nodes, parentId), chart));
    };

    const save = async () => {
      if (busy.current || !canEdit || loading || !parent || preview.error || !preview.changes.length) return;
      busy.current = true;
      setSaving(true);
      setSaveError(null);
      try {
        const result = await Logic.saveMove({
          supabase: window.supabase, chart, rows, nodeId: node.id,
          parentId: parent.isRoot ? null : parent.id, code,
          canEdit: securityCtx ? !!securityCtx.getActions(formCode)?.canEdit : canEdit,
          userName: window.NavigationSystem?.currentUser?.name || 'مدیر سیستم'
        });
        await onSaved(node.id, result.logError, result.accounts);
      } catch (error) {
        setSaveError(error);
      } finally {
        busy.current = false;
        setSaving(false);
      }
    };

    const current = nodes.find(account => String(account.id) === String(node.id)) || node;

    return (
      <Modal isOpen onClose={() => { if (!busy.current) onClose(); }}
        title={t('تغییر شاخه حساب', 'Move account branch')} language={language} width="max-w-2xl">
        <div className="p-4 flex flex-col gap-4" dir={isRtl ? 'rtl' : 'ltr'}>
          <Alert type="info" message={t(
            'پدر جدید را انتخاب و کد پیشنهادی را تأیید یا ویرایش کنید. کد زیرمجموعه‌ها نیز متناسب با شاخه جدید تغییر می‌کند.',
            'Choose the new parent, then accept or edit the suggested code. Descendant codes will also follow the new branch.'
          )} />
          <TextField size="sm" label={t('حساب انتخاب‌شده', 'Selected account')}
            value={`${current.code} - ${isRtl ? current.titleFa : current.titleEn || current.titleFa}`} disabled isRtl={isRtl} />
          {loading && <span role="status" className="text-sm text-slate-500 dark:text-slate-400">{t('در حال بارگذاری ساختار…', 'Loading account tree…')}</span>}
          {(loadError || candidates.error) && <Alert type="error" message={errorText(loadError || candidates.error)} />}
          {!loading && !loadError && !candidates.error && !candidates.data.length &&
            <Alert type="info" message={t('پدر دیگری با رعایت سقف چهار سطح برای این شاخه وجود ندارد.', 'No alternative parent fits this branch within four levels.')} />}
          <LOVField size="sm" formCode={formCode} label={t('حساب پدر جدید', 'New parent account')}
            data={candidates.data} columns={[
              { field: 'levelLabel', header_fa: 'سطح حساب', header_en: 'Account level', width: '120px' },
              { field: 'code', header_fa: 'کد', header_en: 'Code', width: '120px' },
              { field: 'title', header_fa: 'عنوان', header_en: 'Title', width: '250px' }
            ]} displayValue={parent ? `${parent.code ? parent.code + ' - ' : ''}${parent.title}` : ''}
            onChange={selectParent} isRtl={isRtl} required disabled={loading || saving || !canEdit || !!loadError || !!candidates.error} />
          <TextField size="sm" formCode={formCode} label={t('کد جدید حساب (قابل ویرایش)', 'New account code (editable)')}
            value={code} onChange={event => { setCode(event.target.value); setSaveError(null); }}
            disabled={!parent || saving || !canEdit} isRtl={isRtl} dir="ltr" required />
          {preview.error && <Alert type="error" message={errorText(preview.error)} />}
          {preview.changes.length > 0 && (
            <span className="text-sm text-slate-600 dark:text-slate-300">
              {t(`تعداد حساب‌های تحت تأثیر: ${preview.changes.length}`, `Affected accounts: ${preview.changes.length}`)}
            </span>
          )}
          {saveError && <Alert type="error" message={errorText(saveError)} />}
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700/50">
            <Button variant="ghost" size="sm" icon={RefreshCw} disabled={loading || saving}
              onClick={() => setReload(value => value + 1)}>{t('بارگذاری مجدد', 'Reload')}</Button>
            <Button variant="outline" size="sm" disabled={saving} onClick={onClose}>{t('انصراف', 'Cancel')}</Button>
            <Button variant="primary" size="sm" icon={Save} isLoading={saving} onClick={save}
              disabled={!canEdit || loading || !!loadError || !preview.changes.length || !!preview.error}>
              {t('تأیید تغییر شاخه و کدها', 'Confirm branch and code changes')}
            </Button>
          </div>
        </div>
      </Modal>
    );
  };

  window.ChartOfAccountsMove = ChartOfAccountsMove;
})();
