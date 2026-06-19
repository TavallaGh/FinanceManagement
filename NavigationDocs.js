/* Filename: NavigationDocs.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useRef } = React;
  
  const FallbackIcon = (props) => <span {...props} style={{ display: 'inline-block', width: props.size || 16, height: props.size || 16 }} />;
  const LucideIcons = window.LucideIcons || {};
  const { 
    FileText = FallbackIcon, HelpCircle = FallbackIcon, UploadCloud = FallbackIcon, 
    Trash2 = FallbackIcon, Download = FallbackIcon, File = FallbackIcon, 
    AlertCircle = FallbackIcon, FileSpreadsheet = FallbackIcon, Lock = FallbackIcon, AlertTriangle = FallbackIcon
  } = LucideIcons;

  const NavigationDocs = ({ isOpen, onClose, pageKey, pageName, docType, isAdmin, language }) => {
    const isRtl = language === 'fa';
    const t = (fa, en) => isRtl ? fa : en;
    const { Modal, Button } = window.DesignSystem || window.DSCore || {};
    const { Toast } = window.DSFeedback || {};
    const supabase = window.supabase;
    
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [docs, setDocs] = useState([]);
    const [hasFile, setHasFile] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, doc: null });
    const [toastState, setToastState] = useState({ isVisible: false, message: '', type: 'success' });
    const fileInputRef = useRef(null);

    const showToast = (message, type = 'success') => {
      setToastState({ isVisible: true, message, type });
      setTimeout(() => setToastState(prev => ({ ...prev, isVisible: false })), 4000);
    };

    const showSuccess = (msg) => showToast(msg, 'success');
    const showError = (msg) => showToast(msg, 'error');

    useEffect(() => {
      if (isOpen && pageKey) {
        fetchDocuments();
        setHasFile(false);
      }
    }, [isOpen, pageKey, docType]);

    const fetchDocuments = async () => {
      if (!supabase) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('page_documents')
          .select('*')
          .eq('page_key', pageKey)
          .eq('doc_type', docType)
          .order('created_at', { ascending: false });

        if (!error) {
          setDocs(data || []);
        } else {
          setDocs([]);
        }
      } catch (err) {
        console.error("System Error:", err);
      } finally {
        setLoading(false);
      }
    };

    const handleFileSelect = (e) => {
      if (e.target.files && e.target.files.length > 0) {
        setHasFile(true);
      } else {
        setHasFile(false);
      }
    };

    const handleFileUpload = async () => {
      const file = fileInputRef.current?.files[0];
      if (!file) return;

      if (file.size > 10 * 1024 * 1024) {
        showError(t('حجم فایل نباید بیشتر از ۱۰ مگابایت باشد.', 'File size must be less than 10MB.'));
        return;
      }

      setUploading(true);
      try {
        const fileExt = file.name.split('.').pop();
        const safePageKey = pageKey.replace(/[^a-zA-Z0-9]/g, '_');
        const fileNameInStorage = `${safePageKey}_${docType}_${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('documentation')
          .upload(fileNameInStorage, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        const docData = {
          page_key: pageKey,
          doc_type: docType,
          file_path: fileNameInStorage,
          file_name: file.name,
          content_type: file.type,
          updated_at: new Date().toISOString()
        };

        const { error: insertError } = await supabase
          .from('page_documents')
          .insert([docData]);

        if (insertError) throw insertError;

        await fetchDocuments();
        setHasFile(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        
        showSuccess(t('فایل با موفقیت آپلود و اضافه شد.', 'File uploaded successfully.'));

      } catch (err) {
        console.error("Upload process error:", err);
        showError(t('خطا در آپلود فایل. مطمئن شوید تنظیمات سرور و دیتابیس صحیح است.', 'Error uploading file. Make sure settings are correct.'));
      } finally {
        setUploading(false);
      }
    };

    const executeDelete = async () => {
      if (!deleteConfirm.doc) return;
      
      setUploading(true);
      try {
        if (deleteConfirm.doc.file_path) {
          await supabase.storage.from('documentation').remove([deleteConfirm.doc.file_path]);
        }
        const { error: dbError } = await supabase.from('page_documents').delete().eq('id', deleteConfirm.doc.id);
        if (dbError) throw dbError;
        
        await fetchDocuments();
        setDeleteConfirm({ isOpen: false, doc: null });
        showSuccess(t('سند مورد نظر با موفقیت حذف شد.', 'Document deleted successfully.'));
      } catch (err) {
        console.error(err);
        showError(t('خطا در حذف سند.', 'Error deleting document.'));
      } finally {
        setUploading(false);
      }
    };

    const getDownloadUrl = (path) => {
      if (!path) return '#';
      const { data } = supabase.storage.from('documentation').getPublicUrl(path);
      return data.publicUrl;
    };

    const getFileIcon = (fileName) => {
        if (!fileName) return <File size={24} />;
        const ext = fileName.split('.').pop().toLowerCase();
        if (['xls', 'xlsx', 'csv'].includes(ext)) return <FileSpreadsheet size={24} />;
        if (['pdf'].includes(ext)) return <FileText size={24} />;
        return <File size={24} />;
    };

    if (!isOpen || !Modal) return null;

    const modalTitle = docType === 'dev' ? t('مستندات فنی (توسعه‌دهنده)', 'Developer Documentation') : t('راهنمای کاربری', 'User Guide');

    return (
      <>
        <Modal
          isOpen={isOpen}
          onClose={onClose}
          title={
            <div className="flex items-center gap-2">
               {docType === 'dev' ? <FileText className="text-amber-500" size={18}/> : <HelpCircle className="text-indigo-500" size={18}/>}
               <span className="text-[14px] font-black">{modalTitle}</span>
               <span className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 text-[12px] font-bold px-2.5 py-0.5 rounded-full">{pageName}</span>
            </div>
          }
          width="max-w-xl"
          language={language}
        >
          <div className="p-4 flex flex-col gap-5 min-h-[200px] max-h-[70vh] overflow-y-auto custom-scrollbar" dir={isRtl ? 'rtl' : 'ltr'}>
            {loading ? (
              <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-2">
                 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
                 <span className="text-[12px] font-bold">{t('در حال دریافت اطلاعات...', 'Loading...')}</span>
              </div>
            ) : (
              <>
                {docs.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    <div className="text-[12px] font-bold text-slate-500 dark:text-slate-400 mb-1">{t('فایل‌های ضمیمه شده:', 'Attached Files:')}</div>
                    {docs.map(doc => (
                      <div key={doc.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-3 flex items-center justify-between shadow-sm hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-all group">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-10 h-10 bg-slate-50 dark:bg-slate-900 rounded-md border border-slate-100 dark:border-slate-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                             {getFileIcon(doc.file_name)}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <div className="text-[12px] font-bold text-slate-800 dark:text-slate-100 truncate" dir="ltr" title={doc.file_name}>
                              {doc.file_name}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              {new Date(doc.updated_at).toLocaleString(isRtl ? 'fa-IR' : 'en-US')}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <a 
                            href={getDownloadUrl(doc.file_path)} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="w-8 h-8 flex items-center justify-center text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition-colors"
                            title={t('دانلود / مشاهده', 'Download / View')}
                          >
                            <Download size={16} />
                          </a>
                          
                          {isAdmin && (
                            <button 
                              onClick={() => setDeleteConfirm({ isOpen: true, doc })}
                              disabled={uploading}
                              className="w-8 h-8 flex items-center justify-center text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                              title={t('حذف سند', 'Delete Document')}
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg p-8 flex flex-col items-center justify-center text-center shadow-inner">
                    <div className="bg-slate-100 dark:bg-slate-800/80 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400 dark:text-slate-500">
                      {docType === 'dev' ? <FileText size={32} opacity={0.5} /> : <HelpCircle size={32} opacity={0.5} />}
                    </div>
                    <p className="text-[12px] text-slate-500 dark:text-slate-400 font-medium">
                      {t('سندی برای این صفحه بارگذاری نشده است.', 'No documentation uploaded for this page.')}
                    </p>
                  </div>
                )}

                {isAdmin && (
                  <div className="border-t border-slate-100 dark:border-slate-700/50 pt-4 mt-2">
                    <div className="flex items-center gap-2 mb-3">
                       <UploadCloud size={16} className="text-slate-400 dark:text-slate-500" />
                       <span className="text-[12px] font-bold text-slate-600 dark:text-slate-300">
                         {t('آپلود فایل سند جدید', 'Upload New Document')}
                       </span>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-3">
                       <input 
                          type="file" 
                          ref={fileInputRef}
                          onChange={handleFileSelect}
                          className={`block w-full text-[12px] text-slate-500 dark:text-slate-400
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-full file:border-0
                            file:text-[12px] file:font-bold
                            file:bg-indigo-50 file:text-indigo-700
                            dark:file:bg-indigo-900/30 dark:file:text-indigo-400
                            file:cursor-pointer hover:file:bg-indigo-100 dark:hover:file:bg-indigo-900/50
                            cursor-pointer border border-slate-200 dark:border-slate-700 rounded-full p-1 bg-white dark:bg-slate-800 flex-1
                          `}
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg,.txt"
                          disabled={uploading}
                       />
                       
                       <button 
                          onClick={handleFileUpload}
                          disabled={uploading || !hasFile}
                          className={`
                            sm:w-32 h-10 flex items-center justify-center gap-2 rounded-full text-[12px] font-bold transition-all shrink-0
                            ${hasFile ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md' : 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}
                          `}
                       >
                          {uploading ? t('در حال آپلود...', 'Uploading...') : (
                            <>
                              {hasFile && <UploadCloud size={16}/>}
                              <span>{t('آپلود', 'Upload')}</span>
                            </>
                          )}
                       </button>
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-3 flex items-center gap-1 bg-slate-50 dark:bg-slate-800/50 p-2 rounded border border-slate-100 dark:border-slate-700">
                      <AlertCircle size={12} className="shrink-0" />
                      {t('فرمت‌های مجاز: PDF, Word, Excel, تصویر (حداکثر ۱۰ مگابایت)', 'Allowed: PDF, Word, Excel, Images (Max 10MB)')}
                    </div>
                  </div>
                )}

                {!isAdmin && docs.length === 0 && (
                   <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 text-indigo-700 dark:text-indigo-300 p-3 rounded-lg text-[12px] flex gap-2">
                      <AlertCircle size={16} className="shrink-0" />
                      {t('برای دسترسی به راهنما لطفا با مدیر سیستم تماس بگیرید.', 'Please contact system admin for documentation.')}
                   </div>
                )}
              </>
            )}
          </div>
        </Modal>

        <Modal isOpen={deleteConfirm.isOpen} onClose={() => setDeleteConfirm({ isOpen: false, doc: null })} title={t('تایید حذف سند', 'Confirm Deletion')} language={language} width="max-w-sm">
          <div className="p-4 flex flex-col gap-3 items-center text-center">
            <div className="w-11 h-11 rounded-full bg-red-50 dark:bg-red-900/30 flex items-center justify-center text-red-500 dark:text-red-400 mb-1">
               <AlertTriangle size={22} />
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-3 py-1.5 rounded-full text-[10px] font-black flex items-center gap-1">
               <Lock size={12}/> {t('هشدار: غیرقابل بازگشت', 'WARNING: IRREVERSIBLE')}
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
              {t(`آیا از حذف سند "${deleteConfirm.doc?.file_name}" اطمینان دارید؟`, `Are you sure you want to delete "${deleteConfirm.doc?.file_name}"?`)}
            </p>
            <div className="flex gap-2 mt-4 w-full">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setDeleteConfirm({ isOpen: false, doc: null })}>{t('انصراف', 'Cancel')}</Button>
              <Button variant="primary" size="sm" onClick={executeDelete} isLoading={uploading} className="flex-1 bg-red-600 dark:bg-red-500 hover:bg-red-700 dark:hover:bg-red-600 border-red-600 dark:border-red-500">{t('تایید حذف', 'Delete')}</Button>
            </div>
          </div>
        </Modal>

        {Toast && <Toast isVisible={toastState.isVisible} message={toastState.message} type={toastState.type} onClose={() => setToastState(prev => ({ ...prev, isVisible: false }))} />}
      </>
    );
  };

  window.NavigationDocs = NavigationDocs;
})();