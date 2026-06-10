/* Filename: designsystem/DSComments.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useCallback, useRef, useMemo } = React;

  const FallbackComponent = () => null;
  const FallbackIcon = ({ size = 16 }) => React.createElement('span', { style: { display: 'inline-block', width: size, height: size } });

  const safeComp = (moduleObj, compName) => {
      const comp = moduleObj && moduleObj[compName];
      if (typeof comp === 'function' || (comp && typeof comp === 'object' && comp.$$typeof)) return comp;
      if (comp && comp.default && (typeof comp.default === 'function' || comp.default.$$typeof)) return comp.default;
      return FallbackComponent;
  };

  const safeIcon = (moduleObj, iconName) => {
      const icon = moduleObj && moduleObj[iconName];
      if (typeof icon === 'function' || (icon && typeof icon === 'object' && icon.$$typeof)) return icon;
      if (icon && icon.default && (typeof icon.default === 'function' || icon.default.$$typeof)) return icon.default;
      return FallbackIcon;
  };

  const DS = window.DesignSystem || {};
  const Core = window.DSCore || DS || {};
  const Button = safeComp(Core, 'Button');
  const Badge = safeComp(Core, 'Badge');
  const Card = safeComp(Core, 'Card');

  const Feedback = window.DSFeedback || window.DSOverlays || DS || {};
  const Modal = safeComp(Feedback, 'Modal');
  const Toast = safeComp(Feedback, 'Toast');

  const LucideIcons = window.LucideIcons || {};
  const MessageSquare = safeIcon(LucideIcons, 'MessageSquare');
  const Send = safeIcon(LucideIcons, 'Send');
  const AtSign = safeIcon(LucideIcons, 'AtSign');
  const User = safeIcon(LucideIcons, 'User');
  const Clock = safeIcon(LucideIcons, 'Clock');
  const Pencil = safeIcon(LucideIcons, 'Pencil');
  const Trash2 = safeIcon(LucideIcons, 'Trash2');
  const X = safeIcon(LucideIcons, 'X');
  const Check = safeIcon(LucideIcons, 'Check');

  const CommentModal = ({ 
    isOpen, 
    onClose, 
    entityType, 
    entityId, 
    entityTitle,
    formTitle = null,
    formComponent = null,
    language = 'fa' 
  }) => {
    const isRtl = language === 'fa';
    const t = useCallback((fa, en) => isRtl ? fa : en, [isRtl]);
    const supabase = window.supabase;
    const calendarMode = Core.useCalendarMode ? Core.useCalendarMode() : (isRtl ? 'jalali' : 'gregorian');

    const [comments, setComments] = useState([]);
    const [users, setUsers] = useState([]);
    const [usersMap, setUsersMap] = useState({});
    
    const [newComment, setNewComment] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' });

    const [showMentions, setShowMentions] = useState(false);
    const [mentionFilter, setMentionFilter] = useState('');
    const [editingCommentId, setEditingCommentId] = useState(null);
    const [editingContent, setEditingContent] = useState('');
    
    const textareaRef = useRef(null);
    const entityRef = useRef({ entityId, entityTitle, entityType, formComponent, formTitle });

    // keep ref in sync with latest props on every render
    entityRef.current = { entityId, entityTitle, entityType, formComponent, formTitle };

    const currentUserId = (() => {
      try {
        const s = sessionStorage.getItem('fm_user_session') || localStorage.getItem('fm_user_session') || '{}';
        const parsed = JSON.parse(s);
        return parsed.id || null;
      } catch(e) { return null; }
    })();

    const canEditComment = (comment) => {
      if (!currentUserId || comment.author_id !== currentUserId) return false;
      return (Date.now() - new Date(comment.created_at).getTime()) < 2 * 60 * 60 * 1000;
    };

    const showToast = useCallback((message, type = 'success') => {
      setToast({ isVisible: true, message, type });
      setTimeout(() => setToast(prev => ({ ...prev, isVisible: false })), 3000);
    }, []);

    const fetchUsers = useCallback(async () => {
      if (!supabase) return;
      try {
        const { data: usersData, error: usersError } = await supabase
          .from('sec_users')
          .select('id, username, party_id')
          .eq('is_active', true);
        if (usersError || !usersData) return;

        const partyIds = usersData.filter(u => u.party_id).map(u => u.party_id);
        let partiesMap = {};
        if (partyIds.length > 0) {
          const { data: partiesData } = await supabase
            .from('parties')
            .select('id, first_name, last_name')
            .in('id', partyIds);
          if (partiesData) {
            partiesData.forEach(p => { partiesMap[p.id] = p; });
          }
        }

        const enrichedUsers = usersData.map(u => {
          const party = u.party_id ? partiesMap[u.party_id] : null;
          const displayName = party
            ? `${party.first_name || ''} ${party.last_name || ''}`.trim()
            : '';
          return { ...u, displayName: displayName || u.username };
        });

        setUsers(enrichedUsers);
        const uMap = {};
        enrichedUsers.forEach(u => { uMap[u.id] = u.displayName; });
        setUsersMap(uMap);
      } catch (err) {
        console.error("Error fetching users for mentions", err);
      }
    }, [supabase]);

    const fetchComments = useCallback(async () => {
      if (!supabase || !entityType || !entityId) return;
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('sys_comments')
          .select('*')
          .eq('entity_type', entityType)
          .eq('entity_id', String(entityId))
          .order('created_at', { ascending: false }); 
        
        if (error) throw error;
        setComments(data || []);
      } catch (err) {
        showToast(t('خطا در دریافت کامنت‌ها', 'Error fetching comments'), 'error');
      } finally {
        setIsLoading(false);
      }
    }, [supabase, entityType, entityId, t, showToast]);

    useEffect(() => {
      if (isOpen) {
        fetchUsers();
        fetchComments();
        setNewComment('');
        setShowMentions(false);
      }
    }, [isOpen, fetchUsers, fetchComments]);

    const handleTextChange = (e) => {
      const val = e.target.value;
      setNewComment(val);

      const cursorPosition = e.target.selectionStart;
      const textBeforeCursor = val.slice(0, cursorPosition);
      
      const match = textBeforeCursor.match(/@([\w\u0600-\u06FF]*)$/);
      
      if (match) {
        setMentionFilter(match[1].toLowerCase());
        setShowMentions(true);
      } else {
        setShowMentions(false);
      }
    };

    const insertMention = (user) => {
        const cursorPosition = textareaRef.current.selectionStart;
        const textBeforeCursor = newComment.slice(0, cursorPosition);
        const textAfterCursor = newComment.slice(cursorPosition);
        
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');
        if (lastAtIndex !== -1) {
            const newTextBefore = textBeforeCursor.slice(0, lastAtIndex) + `@${user.username} `;
            setNewComment(newTextBefore + textAfterCursor);
            setShowMentions(false);
            
            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.focus();
                    const newPos = newTextBefore.length;
                    textareaRef.current.setSelectionRange(newPos, newPos);
                }
            }, 0);
        }
    };

    const filteredUsers = useMemo(() => {
        if (!mentionFilter) return users;
        return users.filter(u =>
            (u.username && u.username.toLowerCase().includes(mentionFilter)) ||
            (u.displayName && u.displayName.toLowerCase().includes(mentionFilter))
        );
    }, [users, mentionFilter]);

    const handleSubmit = async () => {
        if (!newComment.trim()) return;
        setIsSubmitting(true);
        // read from ref to always get the latest entity props, avoiding stale closures
        const { entityId: eid, entityTitle: etitle, entityType: etype, formComponent: eform, formTitle: eformTitle } = entityRef.current;
        try {
            const safeAuthorId = currentUserId;

            if (!safeAuthorId) {
                 showToast(t('شناسه کاربر یافت نشد. لطفاً مجدداً وارد سیستم شوید.', 'User ID not found. Please log in.'), 'error');
                 setIsSubmitting(false);
                 return;
            }

            const mentionRegex = /@([\w\u0600-\u06FF]+)/g;
            const matches = [...newComment.matchAll(mentionRegex)].map(m => m[1]);
            
            const mentionedUsers = users.filter(u => matches.includes(u.username));
            const mentionIds = mentionedUsers.map(u => u.id);

            const { error: commentError } = await supabase.from('sys_comments').insert([{
                entity_type: etype,
                entity_id: String(eid),
                author_id: safeAuthorId,
                content: newComment,
                mentions: mentionIds
            }]);

            if (commentError) throw commentError;

            if (mentionIds.length > 0) {
                const notifs = mentionedUsers.map(u => ({
                    user_id: u.id,
                    title: t('کامنت جدید', 'New Mention'),
                    message: t(
                        `شما در یک کامنت روی فرم ${eformTitle || etype}، ${etitle}، منشن شده‌اید.`,
                        `You were mentioned in a comment on form ${eformTitle || etype}: ${etitle}.`
                    ),
                    type: 'info',
                    action_payload: {
                        action: 'open_record',
                        form_component: eform,
                        entity_type: etype,
                        entity_id: String(eid),
                        entity_title: etitle
                    }
                }));
                await supabase.from('system_notifications').insert(notifs);
            }

            setNewComment('');
            setShowMentions(false);
            showToast(t('کامنت با موفقیت ثبت شد', 'Comment added successfully'));
            fetchComments();
        } catch (error) {
            console.error(error);
            showToast(t('خطا در ثبت کامنت', 'Error saving comment'), 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const deleteComment = async (id) => {
        if (!window.confirm(t('آیا از حذف این کامنت اطمینان دارید؟', 'Are you sure you want to delete this comment?'))) return;
        try {
            const { error } = await supabase.from('sys_comments').delete().eq('id', id);
            if (error) throw error;
            setComments(prev => prev.filter(c => c.id !== id));
            showToast(t('کامنت حذف شد', 'Comment deleted'));
        } catch (err) {
            showToast(t('خطا در حذف کامنت', 'Error deleting comment'), 'error');
        }
    };

    const updateComment = async (id) => {
        if (!editingContent.trim()) return;
        try {
            const { error } = await supabase.from('sys_comments').update({ content: editingContent }).eq('id', id);
            if (error) throw error;
            setComments(prev => prev.map(c => c.id === id ? { ...c, content: editingContent } : c));
            setEditingCommentId(null);
            setEditingContent('');
            showToast(t('کامنت ویرایش شد', 'Comment updated'));
        } catch (err) {
            showToast(t('خطا در ویرایش کامنت', 'Error updating comment'), 'error');
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        try {
            const d = new Date(dateString);
            if (calendarMode === 'jalali') {
                return new Intl.DateTimeFormat('fa-IR', { 
                    year: 'numeric', month: '2-digit', day: '2-digit', 
                    hour: '2-digit', minute: '2-digit',
                    calendar: 'persian'
                }).format(d);
            }
            return new Intl.DateTimeFormat('en-US', { 
                year: 'numeric', month: '2-digit', day: '2-digit',
                hour: '2-digit', minute: '2-digit'
            }).format(d);
        } catch (e) {
            return dateString;
        }
    };

    const renderCommentContent = (content, isOwn) => {
        const parts = content.split(/(@[\w\u0600-\u06FF]+)/g);
        return parts.map((part, i) => {
            if (part.startsWith('@')) {
                const cls = isOwn
                    ? "font-bold text-yellow-300"
                    : "font-bold text-indigo-600 dark:text-indigo-400";
                return React.createElement('span', { key: i, className: cls }, part);
            }
            return React.createElement('span', { key: i, style: { whiteSpace: 'pre-wrap' } }, part);
        });
    };

    if (!isOpen) return null;

    return React.createElement(Modal, {
        isOpen: isOpen,
        onClose: onClose,
        title: t('کامنت‌ها', 'Comments'),
        language: language,
        width: "max-w-xl"
    },
        React.createElement('div', { className: "flex flex-col bg-white dark:bg-slate-900 font-sans text-[12px] relative", style: { height: '70vh' } },

            // Header: form name + record title
            React.createElement('div', { className: "shrink-0 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2" },
                React.createElement('div', { className: "w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center shrink-0" },
                    React.createElement(MessageSquare, { size: 14, className: "text-indigo-600 dark:text-indigo-400" })
                ),
                React.createElement('div', { className: "flex flex-col min-w-0" },
                    formTitle && React.createElement('span', { className: "text-[10px] font-bold text-indigo-600 dark:text-indigo-400 leading-none mb-0.5" }, formTitle),
                    React.createElement('span', { className: "text-[12px] font-bold text-slate-700 dark:text-slate-200 truncate" }, entityTitle || entityId)
                ),
                React.createElement('div', { className: "mr-auto shrink-0" },
                    React.createElement('span', { className: "text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400" },
                        `${comments.length} ${t('کامنت', 'comment')}${!isRtl && comments.length !== 1 ? 's' : ''}`
                    )
                )
            ),

            // Messages list
            React.createElement('div', { className: "flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-4 custom-scrollbar" },
                isLoading ? (
                    React.createElement('div', { className: "flex-1 flex items-center justify-center text-slate-400 py-10" }, t('در حال بارگذاری...', 'Loading...'))
                ) : comments.length === 0 ? (
                    React.createElement('div', { className: "flex-1 flex flex-col items-center justify-center text-slate-400 gap-2 py-10" },
                        React.createElement(MessageSquare, { size: 28, className: "opacity-30" }),
                        React.createElement('span', { className: "text-[11px]" }, t('هنوز کامنتی ثبت نشده است.', 'No comments yet.'))
                    )
                ) : (
                    comments.map(comment => {
                        const isOwn = comment.author_id === currentUserId;
                        const authorName = isOwn ? t('شما', 'You') : (usersMap[comment.author_id] || t('نامشخص', 'Unknown'));
                        // all bubbles aligned to the reading direction start (RTL=right, LTR=left)
                        return React.createElement('div', { key: comment.id, className: "flex flex-col gap-1" },
                            // meta row: avatar + name + date + actions
                            React.createElement('div', { className: "flex items-center gap-1.5" },
                                React.createElement('div', { className: `w-5 h-5 rounded-full flex items-center justify-center font-black text-[9px] shrink-0 ${isOwn ? 'bg-indigo-500 text-white' : 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300'}` },
                                    authorName.charAt(0)
                                ),
                                React.createElement('span', { className: `text-[11px] font-black ${isOwn ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400'}` }, authorName),
                                React.createElement('span', { className: "text-[10px] text-slate-400 dark:text-slate-500 font-medium", dir: "ltr" }, formatDate(comment.created_at)),
                                canEditComment(comment) && React.createElement(React.Fragment, null,
                                    React.createElement('button', {
                                        onClick: () => { setEditingCommentId(comment.id); setEditingContent(comment.content); },
                                        className: "p-0.5 rounded text-slate-300 hover:text-indigo-500 transition-colors",
                                        title: t('ویرایش', 'Edit')
                                    }, React.createElement(Pencil, { size: 11 })),
                                    React.createElement('button', {
                                        onClick: () => deleteComment(comment.id),
                                        className: "p-0.5 rounded text-slate-300 hover:text-red-500 transition-colors",
                                        title: t('حذف', 'Delete')
                                    }, React.createElement(Trash2, { size: 11 }))
                                )
                            ),
                            // bubble
                            editingCommentId === comment.id
                                ? React.createElement('div', { className: "flex flex-col gap-2" },
                                    React.createElement('textarea', {
                                        value: editingContent,
                                        onChange: e => setEditingContent(e.target.value),
                                        className: "w-full bg-slate-50 dark:bg-slate-800 border border-indigo-300 dark:border-indigo-600 rounded-lg p-2 text-[12px] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none min-h-[56px]",
                                        dir: isRtl ? 'rtl' : 'ltr'
                                    }),
                                    React.createElement('div', { className: "flex gap-2 justify-end" },
                                        React.createElement('button', {
                                            onClick: () => { setEditingCommentId(null); setEditingContent(''); },
                                            className: "flex items-center gap-1 px-2 py-1 rounded text-[11px] text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-600"
                                        }, React.createElement(X, { size: 11 }), t('انصراف', 'Cancel')),
                                        React.createElement('button', {
                                            onClick: () => updateComment(comment.id),
                                            className: "flex items-center gap-1 px-2 py-1 rounded text-[11px] bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                                        }, React.createElement(Check, { size: 11 }), t('ذخیره', 'Save'))
                                    )
                                  )
                                : React.createElement('div', {
                                    className: `inline-block max-w-[88%] px-3 py-2 rounded-xl text-[12px] leading-relaxed shadow-sm ${
                                        isOwn
                                            ? 'bg-indigo-600 dark:bg-indigo-500 text-white'
                                            : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                    }`
                                  },
                                    renderCommentContent(comment.content, isOwn)
                                  )
                        );
                    })
                )
            ),

            // Input area
            React.createElement('div', { className: "shrink-0 px-4 py-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 relative" },
                showMentions && React.createElement('div', { className: "absolute bottom-full left-4 right-4 mb-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-40 overflow-y-auto z-50 p-1" },
                    filteredUsers.length === 0 ? (
                        React.createElement('div', { className: "p-2 text-center text-slate-500 text-[11px]" }, t('کاربری یافت نشد', 'No users found'))
                    ) : (
                        filteredUsers.map(u => (
                            React.createElement('div', { 
                                key: u.id, 
                                onClick: () => insertMention(u),
                                className: "flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer rounded transition-colors" 
                            },
                                React.createElement(AtSign, { size: 12, className: "text-slate-400 shrink-0" }),
                                React.createElement('span', { className: "font-bold text-slate-700 dark:text-slate-200 text-[11px]" }, u.username),
                                u.displayName !== u.username && React.createElement('span', { className: "text-slate-400 dark:text-slate-500 text-[10px]" }, u.displayName)
                            )
                        ))
                    )
                ),
                React.createElement('textarea', {
                    ref: textareaRef,
                    value: newComment,
                    onChange: handleTextChange,
                    onKeyDown: (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit(); },
                    placeholder: t('کامنت بنویسید... (@ برای منشن، Ctrl+Enter برای ارسال)', 'Write a comment... (@ to mention, Ctrl+Enter to send)'),
                    className: "w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-[12px] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none",
                    style: { minHeight: '60px', maxHeight: '120px' },
                    dir: isRtl ? 'rtl' : 'ltr'
                }),
                React.createElement('div', { className: "flex items-center justify-between mt-2" },
                    React.createElement('span', { className: "text-[10px] text-slate-400 dark:text-slate-500" },
                        t('@ برای منشن کردن', '@ to mention')
                    ),
                    React.createElement(Button, { 
                        variant: "primary",
                        size: "sm",
                        icon: Send, 
                        onClick: handleSubmit,
                        disabled: !newComment.trim() || isSubmitting,
                        isLoading: isSubmitting
                    }, t('ارسال', 'Send'))
                )
            ),

            React.createElement(Toast, {
                isVisible: toast.isVisible,
                message: toast.message,
                type: toast.type,
                onClose: () => setToast(prev => ({ ...prev, isVisible: false }))
            })
        )
    );
  };

  if (!window.DSComments) {
      window.DSComments = {};
  }
  window.DSComments.CommentModal = CommentModal;

})();