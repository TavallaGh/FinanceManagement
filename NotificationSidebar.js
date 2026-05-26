/* Filename: NotificationSidebar.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useMemo } = React;
  const { X, Trash2, Bell, CheckCircle2, AlertCircle, Info, Loader2, Check } = window.LucideIcons || {};

  const NotificationSidebar = ({ isOpen, onClose, language = 'fa', onUpdateUnread }) => {
    const { Button, Badge, EmptyState, Dialog, Toast } = window.DesignSystem || {};
    const supabase = window.supabase;
    
    const calendarMode = window.DSCore?.useCalendarMode ? window.DSCore.useCalendarMode() : 'jalali';
    
    const MOCK_USER_ID = '00000000-0000-0000-0000-000000000000';
    
    const isRtl = language === 'fa';
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const itemsPerPage = 20;

    const [dialogState, setDialogState] = useState({ isOpen: false, title: '', message: '', type: 'info', onConfirm: null });
    const [toastState, setToastState] = useState({ isVisible: false, message: '', type: 'success' });

    const t = (fa, en) => isRtl ? fa : en;

    const showToast = (message, type = 'info') => {
      setToastState({ isVisible: true, message, type });
      setTimeout(() => setToastState(prev => ({ ...prev, isVisible: false })), 3000);
    };

    const showDialog = (title, message, type, onConfirm) => {
      setDialogState({ isOpen: true, title, message, type, onConfirm });
    };

    const closeDialog = () => setDialogState(prev => ({ ...prev, isOpen: false }));

    const unreadCount = useMemo(() => notifications.filter(n => !n.is_read).length, [notifications]);

    useEffect(() => {
      if (onUpdateUnread) {
        onUpdateUnread(unreadCount);
      }
    }, [unreadCount, onUpdateUnread]);

    useEffect(() => {
      if (!supabase) return;

      const fetchNotifications = async () => {
        setLoading(true);
        try {
          const { data, error } = await supabase
            .from('system_notifications')
            .select('*')
            .eq('user_id', MOCK_USER_ID)
            .order('created_at', { ascending: false });
            
          if (error) throw error;
          if (data) {
            setNotifications(data);
          }
        } catch (err) {
          console.error('Error fetching notifications:', err);
          showToast(t('خطا در دریافت اطلاعات اعلان‌ها.', 'Error fetching notifications.'), 'error');
        } finally {
          setLoading(false);
        }
      };

      fetchNotifications();

      const channel = supabase.channel('realtime_notifications')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'system_notifications',
          filter: `user_id=eq.${MOCK_USER_ID}`
        }, (payload) => {
          if (payload.eventType === 'INSERT') {
            setNotifications(prev => [payload.new, ...prev]);
          } else if (payload.eventType === 'DELETE') {
            setNotifications(prev => prev.filter(n => n.id !== payload.old.id));
          } else if (payload.eventType === 'UPDATE') {
            setNotifications(prev => prev.map(n => n.id === payload.new.id ? payload.new : n));
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }, [supabase]);

    const markAsRead = async (id) => {
      if (!id) return;
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      try {
        const { error } = await supabase
          .from('system_notifications')
          .update({ is_read: true })
          .eq('id', id);
        if (error) throw error;
      } catch (err) {
        console.error('Error marking as read in DB:', err);
        showToast(t('خطا در ثبت وضعیت خوانده شده.', 'Error marking as read.'), 'error');
      }
    };

    const markAllAsRead = async () => {
      const ids = notifications.filter(n => !n.is_read).map(n => n.id);
      if (ids.length === 0) return;
      
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      try {
        const { error } = await supabase
          .from('system_notifications')
          .update({ is_read: true })
          .eq('user_id', MOCK_USER_ID)
          .eq('is_read', false);
        if (error) throw error;
      } catch (err) {
        console.error('Error marking all as read in DB:', err);
        showToast(t('خطا در ثبت وضعیت خوانده شده برای همه اعلان‌ها.', 'Error marking all as read.'), 'error');
      }
    };

    const deleteOne = async (id) => {
      setNotifications(prev => prev.filter(n => n.id !== id));
      try {
        const { error } = await supabase.from('system_notifications').delete().eq('id', id);
        if (error) throw error;
      } catch (err) {
        console.error('Error deleting notification:', err);
        showToast(t('خطا در حذف اعلان.', 'Error deleting notification.'), 'error');
      }
    };

    const deleteAll = async () => {
      showDialog(
        t('حذف تمام اعلان‌ها', 'Delete All Notifications'),
        t('آیا از حذف تمام اعلان‌ها اطمینان دارید؟', 'Are you sure you want to delete all notifications?'),
        'error',
        async () => {
          closeDialog();
          setNotifications([]);
          setPage(1);
          try {
            const { error } = await supabase.from('system_notifications').delete().eq('user_id', MOCK_USER_ID);
            if (error) throw error;
            showToast(t('تمام اعلان‌ها با موفقیت حذف شدند.', 'All notifications deleted successfully.'), 'success');
          } catch (err) {
            console.error('Error deleting all notifications:', err);
            showToast(t('خطا در حذف گروهی اعلان‌ها.', 'Error deleting notifications.'), 'error');
          }
        }
      );
    };

    const formatTime = (isoString) => {
      try {
        const date = new Date(isoString);
        return date.toLocaleString(isRtl ? 'fa-IR' : 'en-US', {
          month: 'short', 
          day: 'numeric', 
          hour: '2-digit', 
          minute: '2-digit',
          calendar: calendarMode === 'jalali' ? 'persian' : 'gregory'
        });
      } catch(e) { return isoString; }
    };

    const totalPages = Math.ceil(notifications.length / itemsPerPage);
    const currentData = notifications.slice((page - 1) * itemsPerPage, page * itemsPerPage);

    if (!isOpen) return null;

    return (
      <>
        <div className="fixed inset-0 bg-slate-900/20 dark:bg-slate-900/60 backdrop-blur-sm z-[60] transition-opacity" onClick={onClose} />
        
        <aside 
          className={`fixed top-0 bottom-0 w-full max-w-[340px] bg-white dark:bg-slate-800 shadow-2xl z-[70] flex flex-col transition-transform duration-300 ease-in-out ${
            isRtl ? 'left-0 animate-slide-in-left' : 'right-0 animate-slide-in-right'
          }`}
          dir={isRtl ? 'rtl' : 'ltr'}
        >
          <div className="h-12 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between px-4 shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-indigo-600 dark:text-indigo-400" />
              <span className="font-black text-slate-800 dark:text-slate-100 text-[12px]">{t('اعلان‌های سیستم', 'System Notifications')}</span>
              <Badge variant={unreadCount > 0 ? 'danger' : 'gray'}>
                {unreadCount > 0 ? `${unreadCount} ${t('جدید', 'New')}` : t('همه خوانده شده', 'All Read')}
              </Badge>
            </div>
            <Button size="sm" variant="ghost" icon={X} onClick={onClose} title={t('بستن', 'Close')} className="!px-1.5" />
          </div>

          {notifications.length > 0 && (
            <div className="px-3 py-1.5 border-b border-slate-50 dark:border-slate-700/50 flex items-center justify-between bg-slate-50/30 dark:bg-slate-900/30">
              <Button 
                size="sm" variant="ghost" icon={Check} onClick={markAllAsRead} disabled={unreadCount === 0}
                className="!text-indigo-600 dark:!text-indigo-400 hover:!bg-indigo-50 dark:hover:!bg-indigo-900/30 !px-2 !h-7 !text-[10px]"
              >
                {t('خواندن همه', 'Mark All Read')}
              </Button>
              <Button 
                size="sm" variant="danger-outline" icon={Trash2} onClick={deleteAll}
                className="!px-2 !h-7 !text-[10px]"
              >
                {t('حذف همه', 'Clear All')}
              </Button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
            {loading ? (
              <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600 dark:text-indigo-400" /></div>
            ) : currentData.length > 0 ? (
              currentData.map((notif) => (
                <div 
                  key={notif.id} 
                  className={`group relative border rounded-lg p-3 transition-all animate-in fade-in slide-in-from-bottom-2 ${
                    notif.is_read 
                      ? 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600' 
                      : 'bg-indigo-50/40 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800/50 hover:border-indigo-200 dark:hover:border-indigo-700 hover:shadow-sm'
                  }`}
                >
                  <div className="flex gap-2">
                    <div className={`mt-0.5 shrink-0 ${notif.is_read ? 'opacity-50' : ''} ${notif.type === 'success' ? 'text-emerald-500 dark:text-emerald-400' : notif.type === 'error' ? 'text-red-500 dark:text-red-400' : 'text-blue-500 dark:text-blue-400'}`}>
                      {notif.type === 'success' ? <CheckCircle2 size={14} /> : notif.type === 'error' ? <AlertCircle size={14} /> : <Info size={14} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={`text-[12px] font-bold mb-1 leading-tight ${notif.is_read ? 'text-slate-600 dark:text-slate-400' : 'text-slate-800 dark:text-slate-100'}`}>{notif.title}</h4>
                      <p className={`text-[11px] leading-relaxed mb-1.5 line-clamp-2 ${notif.is_read ? 'text-slate-400 dark:text-slate-500' : 'text-slate-600 dark:text-slate-300'}`}>{notif.message}</p>
                      <div className="block mt-1.5 text-[10px] text-slate-400 dark:text-slate-500 font-medium">{formatTime(notif.created_at)}</div>
                    </div>
                    
                    <div className="flex flex-col gap-0.5 transition-all self-start shrink-0">
                      {!notif.is_read && (
                        <Button 
                          size="sm" variant="ghost" icon={Check} 
                          onClick={() => markAsRead(notif.id)} 
                          title={t('علامت‌گذاری خوانده شده', 'Mark as read')} 
                          className="!text-slate-400 dark:!text-slate-500 hover:!text-indigo-600 dark:hover:!text-indigo-400 hover:!bg-indigo-50 dark:hover:!bg-indigo-900/30 !px-1 !h-6" 
                        />
                      )}
                      <Button 
                        size="sm" variant="ghost" icon={Trash2} 
                        onClick={() => deleteOne(notif.id)} 
                        title={t('حذف اعلان', 'Delete')} 
                        className="!text-slate-400 dark:!text-slate-500 hover:!text-red-500 dark:hover:!text-red-400 hover:!bg-red-50 dark:hover:!bg-red-900/30 !px-1 !h-6" 
                      />
                    </div>
                  </div>
                  {!notif.is_read && (
                    <div className={`absolute top-1/2 -translate-y-1/2 ${isRtl ? 'right-0 w-1 rounded-l-md' : 'left-0 w-1 rounded-r-md'} h-6 bg-indigo-500 dark:bg-indigo-400`} />
                  )}
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center">
                <EmptyState 
                  title={t('هیچ اعلانی یافت نشد', 'No notifications found')} 
                  description={t('اعلان جدیدی برای نمایش وجود ندارد.', 'There are no new notifications.')} 
                  icon={Bell} 
                />
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="p-2 border-t border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
              <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)} className="!px-2 !h-7 !text-[10px]">{t('قبلی', 'Prev')}</Button>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                {t('صفحه', 'Page')} {page} {t('از', 'of')} {totalPages}
              </span>
              <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="!px-2 !h-7 !text-[10px]">{t('بعدی', 'Next')}</Button>
            </div>
          )}
        </aside>
        
        {Dialog && (
          <Dialog 
            isOpen={dialogState.isOpen} 
            title={dialogState.title} 
            type={dialogState.type} 
            onConfirm={dialogState.onConfirm} 
            onCancel={closeDialog} 
            confirmLabel={t('تایید', 'Confirm')} 
            cancelLabel={t('انصراف', 'Cancel')}
          >
            {dialogState.message}
          </Dialog>
        )}
        
        {Toast && (
          <Toast 
            isVisible={toastState.isVisible} 
            message={toastState.message} 
            type={toastState.type} 
            onClose={() => setToastState(prev => ({ ...prev, isVisible: false }))} 
          />
        )}
      </>
    );
  };

  window.NotificationSidebar = NotificationSidebar;
})();