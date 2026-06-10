/* Filename: NotificationSidebar.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useMemo } = React;
  const { Trash2, Bell, Loader2, Check } = window.LucideIcons || {};

  const NotificationSidebar = ({ isOpen, onClose, language = 'fa', onUpdateUnread }) => {
    const DS = window.DesignSystem || {};
    const DSCore = window.DSCore || DS;
    const DSFeedback = window.DSFeedback || DS;
    const DSOverlays = window.DSOverlays || DS;

    const Button = DSCore.Button || (() => null);
    const Badge = DSCore.Badge || (() => null);
    const EmptyState = DSCore.EmptyState || (() => null);
    const Dialog = DSFeedback.Dialog || (() => null);
    const Toast = DSFeedback.Toast || (() => null);
    const NotificationCard = DSFeedback.NotificationCard || (() => null);
    const Drawer = DSOverlays.Drawer || (() => null);

    const supabase = window.supabase;

    const calendarMode = DSCore.useCalendarMode ? DSCore.useCalendarMode() : 'jalali';

    const CURRENT_USER_ID = (() => {
      try {
        const s = sessionStorage.getItem('fm_user_session') || localStorage.getItem('fm_user_session') || '{}';
        return JSON.parse(s).id || null;
      } catch(e) { return null; }
    })();

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
            .eq('user_id', CURRENT_USER_ID)
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
          filter: `user_id=eq.${CURRENT_USER_ID}`
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

    // mapping from entity_type to form component name
    const ENTITY_FORM_MAP = {
      'ORGANIZATION_INFO': 'OrganizationInfo',
      'PARTIES': 'Parties',
      'CHART_OF_ACCOUNTS': 'ChartOfAccountsMain',
      'TRANSACTION_MAIN': 'TransactionMain',
      'BROKER_CONTRACT': 'BrokerContract',
      'BROKER_MANAGEMENT': 'BrokerManagement',
    };

    const handleNotificationClick = async (notif) => {
      const payload = notif.action_payload;
      if (!payload || (!payload.entity_type && !payload.action)) return;

      await markAsRead(notif.id);
      onClose();

      const action = payload.action || 'open_record';
      const formComponent = payload.form_component || ENTITY_FORM_MAP[payload.entity_type] || null;

      if (action === 'open_record' || action === 'open_comments') {
        const dispatchFilter = () => {
          window.dispatchEvent(new CustomEvent('filterToRecord', {
            detail: { entity_type: payload.entity_type, entity_id: payload.entity_id }
          }));
        };

        if (formComponent) {
          if (window.__navigateToForm) {
            window.__navigateToForm(formComponent);
            setTimeout(dispatchFilter, 300);
          } else {
            window.dispatchEvent(new CustomEvent('navigateToForm', { detail: { formComponent } }));
            setTimeout(dispatchFilter, 500);
          }
        } else {
          dispatchFilter();
        }
      }
    };

    const markAsUnread = async (id) => {
      if (!id) return;
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: false } : n));
      try {
        const { error } = await supabase
          .from('system_notifications')
          .update({ is_read: false })
          .eq('id', id);
        if (error) throw error;
      } catch (err) {
        console.error('Error marking as unread in DB:', err);
        showToast(t('خطا در ثبت وضعیت خوانده نشده.', 'Error marking as unread.'), 'error');
      }
    };

    const markAllAsUnread = async () => {
      const ids = notifications.filter(n => n.is_read).map(n => n.id);
      if (ids.length === 0) return;
      setNotifications(prev => prev.map(n => ({ ...n, is_read: false })));
      try {
        const { error } = await supabase
          .from('system_notifications')
          .update({ is_read: false })
          .eq('user_id', CURRENT_USER_ID)
          .eq('is_read', true);
        if (error) throw error;
      } catch (err) {
        console.error('Error marking all as unread in DB:', err);
        showToast(t('خطا در ثبت وضعیت خوانده نشده برای همه اعلان‌ها.', 'Error marking all as unread.'), 'error');
      }
    };

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
          .eq('user_id', CURRENT_USER_ID)
          .eq('is_read', false);
        if (error) throw error;
      } catch (err) {
        console.error('Error marking all as read in DB:', err);
        showToast(t('خطا در ثبت وضعیت خوانده شده برای همه اعلان‌ها.', 'Error marking all as read.'), 'error');
      }
    };

    const deleteOne = async (id) => {
      showDialog(
        t('حذف اعلان', 'Delete Notification'),
        t('آیا از حذف این اعلان اطمینان دارید؟', 'Are you sure you want to delete this notification?'),
        'error',
        async () => {
          closeDialog();
          setNotifications(prev => prev.filter(n => n.id !== id));
          try {
            const { error } = await supabase.from('system_notifications').delete().eq('id', id);
            if (error) throw error;
          } catch (err) {
            console.error('Error deleting notification:', err);
            showToast(t('خطا در حذف اعلان.', 'Error deleting notification.'), 'error');
          }
        }
      );
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
            const { error } = await supabase.from('system_notifications').delete().eq('user_id', CURRENT_USER_ID);
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

    const DrawerTitle = (
       <div className="flex items-center gap-2">
         <Bell size={16} className="text-indigo-600 dark:text-indigo-400" />
         <span className="font-black text-slate-800 dark:text-slate-100 text-[12px]">{t('اعلان‌های سیستم', 'System Notifications')}</span>
         <Badge variant={unreadCount > 0 ? 'danger' : 'gray'}>
           {unreadCount > 0 ? `${unreadCount} ${t('جدید', 'New')}` : t('همه خوانده شده', 'All Read')}
         </Badge>
       </div>
    );

    const DrawerFooter = totalPages > 1 ? (
       <div className="flex items-center justify-between w-full">
         <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)} className="!px-2 !h-7 !text-[10px]">{t('قبلی', 'Prev')}</Button>
         <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
           {t('صفحه', 'Page')} {page} {t('از', 'of')} {totalPages}
         </span>
         <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="!px-2 !h-7 !text-[10px]">{t('بعدی', 'Next')}</Button>
       </div>
    ) : null;

    return (
      <>
        <Drawer
           isOpen={isOpen}
           onClose={onClose}
           position="end"
           title={DrawerTitle}
           footer={DrawerFooter}
           language={language}
           width="max-w-[340px]"
        >
          <div className="flex flex-col h-full">
              {notifications.length > 0 && (
                <div className="px-1 pb-2 mb-2 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm" variant="ghost" icon={Check} onClick={markAllAsRead} disabled={unreadCount === 0}
                      className="!text-indigo-600 dark:!text-indigo-400 hover:!bg-indigo-50 dark:hover:!bg-indigo-900/30 !px-2 !h-7 !text-[10px]"
                    >
                      {t('خواندن همه', 'All Read')}
                    </Button>
                    <Button
                      size="sm" variant="ghost" onClick={markAllAsUnread} disabled={unreadCount === notifications.length}
                      className="!text-slate-500 dark:!text-slate-400 hover:!bg-slate-100 dark:hover:!bg-slate-700/50 !px-2 !h-7 !text-[10px]"
                    >
                      {t('نخوانده همه', 'All Unread')}
                    </Button>
                  </div>
                  <Button
                    size="sm" variant="danger-outline" icon={Trash2} onClick={deleteAll}
                    className="!px-2 !h-7 !text-[10px]"
                  >
                    {t('حذف همه', 'Clear All')}
                  </Button>
                </div>
              )}

              <div className="flex-1 flex flex-col gap-2">
                {loading ? (
                  <div className="h-full flex items-center justify-center py-10"><Loader2 className="animate-spin text-indigo-600 dark:text-indigo-400" /></div>
                ) : currentData.length > 0 ? (
                  currentData.map((notif) => (
                    <NotificationCard
                        key={notif.id}
                        id={notif.id}
                        title={notif.title}
                        message={notif.message}
                        type={notif.type}
                        isRead={notif.is_read}
                        timestamp={notif.created_at}
                        onRead={markAsRead}
                        onUnread={markAsUnread}
                        onDelete={deleteOne}
                        onClick={notif.action_payload?.entity_type || notif.action_payload?.action ? () => handleNotificationClick(notif) : undefined}
                        formatTime={formatTime}
                        language={language}
                    />
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center py-10">
                    <EmptyState
                      title={t('هیچ اعلانی یافت نشد', 'No notifications found')}
                      description={t('اعلان جدیدی برای نمایش وجود ندارد.', 'There are no new notifications.')}
                      icon={Bell}
                    />
                  </div>
                )}
              </div>
          </div>
        </Drawer>

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
