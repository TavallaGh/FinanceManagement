/* Record attachments using the existing attachment table, storage and audit log. */
(() => {
  const React = window.React;
  const { useState, useEffect, useCallback, useRef } = React;
  const RecordAttachmentModal = ({ entityType, recordTable, recordId, recordTitle, storageFolder,
    auditEntityType, editableStatuses = ['DRAFT', 'TEMPORARY'], formCode, language = 'fa', onClose, onNotify,
    recordColumns = 'id,status', authorizeRecord }) => {
    const { Modal } = window.DSFeedback;
    const { Button, Badge, Skeleton, EmptyState } = window.DSCore;
    const { AttachmentManager } = window.DSForms;
    const client = window.supabase;
    const security = window.SecurityManager?.useSecurity?.();
    const access = security?.getActions(formCode) || { canView: false, canEdit: false };
    const t = useCallback((fa, en) => language === 'fa' ? fa : en, [language]);
    const [files, setFiles] = useState([]);
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);
    const [removeTarget, setRemoveTarget] = useState(null);
    const requestRef = useRef(0);
    const busyRef = useRef(false);
    const writable = access.canEdit && editableStatuses.includes(status);
    const notify = (message, type = 'success') => onNotify?.(message, type);
    const readStatus = useCallback(async () => {
      const result = await client.from(recordTable).select(recordColumns).eq('id', recordId).single();
      if (result.error) throw result.error;
      if (!result.data) throw new Error(t('رکورد در دسترس نیست', 'Record is unavailable'));
      if (authorizeRecord) await authorizeRecord(result.data);
      return result.data.status;
    }, [client, recordTable, recordId, recordColumns, authorizeRecord, t]);
    const reload = useCallback(async () => {
      const request = ++requestRef.current;
      setLoading(true);
      setError(null);
      try {
        if (!access.canView || !client) throw new Error(t('دسترسی مشاهده پیوست‌ها وجود ندارد', 'Attachment view access denied'));
        const currentStatus = await readStatus();
        const rows = [];
        for (let offset = 0; ; offset += 500) {
          const result = await client.from('fm_attachments').select('*').eq('entity_type', entityType)
            .eq('entity_id', recordId).order('id', { ascending: true }).range(offset, offset + 499);
          if (result.error) throw result.error;
          rows.push(...(result.data || []));
          if (!result.data || result.data.length < 500) break;
        }
        if (request !== requestRef.current) return;
        setFiles(rows);
        setStatus(currentStatus);
      } catch (failure) {
        if (request === requestRef.current) { setError(failure.message); setStatus(null); }
      } finally { if (request === requestRef.current) setLoading(false); }
    }, [access.canView, client, readStatus, entityType, recordId, t]);
    useEffect(() => { reload(); return () => { requestRef.current += 1; }; }, [reload]);
    const ensureWritable = async () => {
      if (!access.canView || !access.canEdit) throw new Error(t('دسترسی ویرایش پیوست ندارید', 'Attachment edit access denied'));
      const currentStatus = await readStatus();
      setStatus(currentStatus);
      if (!editableStatuses.includes(currentStatus))
        throw new Error(t('افزودن و حذف پیوست فقط در وضعیت یادداشت و موقت مجاز است.', 'Attachments can only be added or removed in draft and temporary status.'));
    };
    const audit = async (action, name) => {
      const result = await client.from('fm_record_logs').insert([{
        entity_type: auditEntityType, record_id: String(recordId), action,
        user_name: window.NavigationSystem?.currentUser?.name || 'system', details: `${recordTitle}: ${name}`
      }]);
      if (result.error) throw result.error;
    };
    const currentUserId = () => {
      try {
        const session = window.sessionStorage.getItem('fm_user_session') || window.localStorage.getItem('fm_user_session') || '{}';
        return JSON.parse(session).id || window.NavigationSystem?.currentUser?.id || null;
      } catch (_error) { return window.NavigationSystem?.currentUser?.id || null; }
    };
    const upload = async incoming => {
      if (!incoming?.length || busyRef.current || loading || error) return;
      busyRef.current = true;
      setBusy(true);
      let auditFailed = false;
      try {
        if (!client.storage) throw new Error(t('فضای ذخیره فایل در دسترس نیست', 'File storage is unavailable'));
        for (const file of Array.from(incoming)) {
          await ensureWritable();
          const extension = file.name.includes('.') ? file.name.split('.').pop().replace(/[^a-zA-Z0-9]/g, '') : '';
          const path = `${storageFolder}/${recordId}/${window.crypto.randomUUID()}${extension ? `.${extension}` : ''}`;
          const bucket = client.storage.from('attachments');
          const uploaded = await bucket.upload(path, file);
          if (uploaded.error) throw uploaded.error;
          try {
            await ensureWritable();
            const url = bucket.getPublicUrl(path);
            if (url.error) throw url.error;
            if (!url.data?.publicUrl) throw new Error(t('آدرس فایل دریافت نشد', 'File URL is unavailable'));
            const inserted = await client.from('fm_attachments').insert([{
              entity_type: entityType, entity_id: recordId, file_name: file.name, file_size: file.size,
              file_type: file.type || 'application/octet-stream', file_url: url.data.publicUrl, created_by: currentUserId()
            }]).select('id').single();
            if (inserted.error) throw inserted.error;
            if (!inserted.data) throw new Error(t('ثبت پیوست تأیید نشد', 'Attachment registration was not confirmed'));
          } catch (failure) {
            const cleanup = await bucket.remove([path]);
            if (cleanup.error) throw new Error(`${failure.message}; ${t('پاک‌سازی فایل ناموفق بود', 'File cleanup failed')}: ${cleanup.error.message}`);
            throw failure;
          }
          try { await audit('upload_attachment', file.name); } catch (_failure) { auditFailed = true; }
        }
        notify(auditFailed ? t('پیوست ثبت شد، اما ثبت سابقه ناموفق بود.', 'Attachment saved, but audit logging failed.')
          : t('فایل‌ها پیوست شدند', 'Files attached'), auditFailed ? 'warning' : 'success');
      } catch (failure) { notify(failure.message || t('ثبت پیوست ناموفق بود', 'Could not attach file'), 'error'); }
      finally { await reload(); busyRef.current = false; setBusy(false); }
    };
    const remove = async () => {
      if (!removeTarget || busyRef.current || loading || error) return;
      busyRef.current = true;
      setBusy(true);
      try {
        await ensureWritable();
        const result = await client.from('fm_attachments').delete().eq('id', removeTarget.id)
          .eq('entity_type', entityType).eq('entity_id', recordId).select('id').single();
        if (result.error) throw result.error;
        if (!result.data) throw new Error(t('حذف پیوست تأیید نشد', 'Attachment deletion was not confirmed'));
        setRemoveTarget(null);
        try {
          await audit('delete_attachment', removeTarget.file_name);
          notify(t('پیوست حذف شد', 'Attachment deleted'));
        } catch (_failure) { notify(t('پیوست حذف شد، اما ثبت سابقه ناموفق بود.', 'Attachment deleted, but audit logging failed.'), 'warning'); }
      } catch (failure) { notify(failure.message || t('حذف پیوست ناموفق بود', 'Could not delete attachment'), 'error'); }
      finally { await reload(); busyRef.current = false; setBusy(false); }
    };
    return <Modal isOpen onClose={() => !busyRef.current && onClose()} title={t('پیوست‌ها', 'Attachments')}
      language={language} width="max-w-xl">
      <div className="p-4 flex flex-col gap-4 max-h-[70vh] overflow-y-auto bg-slate-50/50 dark:bg-slate-900/50" dir={language === 'fa' ? 'rtl' : 'ltr'}>
        <div className="bg-indigo-50 dark:bg-indigo-900/30 p-3 rounded-lg flex items-center justify-between border border-indigo-100 dark:border-indigo-800/50">
          <span className="text-[12px] font-bold text-indigo-800 dark:text-indigo-300">{recordTitle}</span>
          {!writable && <Badge variant="slate">{t('فقط مشاهده', 'Read Only')}</Badge>}
        </div>
        {loading ? <Skeleton height="12rem" /> : error ? <EmptyState title={error}
          action={<Button size="sm" onClick={reload}>{t('تلاش دوباره', 'Retry')}</Button>} /> :
          <AttachmentManager files={files} onUpload={upload} onDelete={file => !busy && writable && setRemoveTarget(file)}
            onDownload={file => window.open(file.file_url, '_blank', 'noopener,noreferrer')}
            readOnly={!writable || busy} isUploading={busy} language={language} formCode={formCode} />}
      </div>
      <Modal isOpen={!!removeTarget} onClose={() => !busy && setRemoveTarget(null)}
        title={t('حذف پیوست', 'Delete Attachment')} language={language} width="max-w-sm">
        <EmptyState title={t('پیوست حذف شود؟', 'Delete attachment?')} description={removeTarget?.file_name}
          action={<div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={busy} onClick={() => setRemoveTarget(null)}>{t('انصراف', 'Cancel')}</Button>
            <Button size="sm" variant="danger" disabled={!writable} isLoading={busy} onClick={remove}>{t('حذف', 'Delete')}</Button>
          </div>} />
      </Modal>
    </Modal>;
  };
  window.DSRecordAttachments = { RecordAttachmentModal };
})();
