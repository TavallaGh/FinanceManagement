/* Filename: UserProfile.js */
(() => {
  const React = window.React;
  const { useState, useEffect, useCallback, useRef } = React;
  
  const { 
    Button, PageHeader, 
    TextField, SelectField, 
    Toast, Alert
  } = window.DesignSystem || window.DSCore || window.DSForms || {};
  
  const { 
    User, Settings, Shield, CreditCard, Save, 
    Key, Building2, Fingerprint, Camera, Loader2,
    Sun, Moon, Monitor, Calendar, Globe
  } = window.LucideIcons || {};
  
  const supabase = window.supabase;

  // ─── Read-Only display field ─────────────────────────────────────────────────
  const ReadOnlyField = ({ label, value, ltr = false }) => (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{label}</label>
      <div className={`min-h-[36px] px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded flex items-center text-[12px] font-bold text-slate-800 dark:text-slate-200 ${ltr ? 'dir-ltr justify-end' : ''}`}>
        {value}
      </div>
    </div>
  );

  // ─── Language toggle switch ──────────────────────────────────────────────────
  const LangToggle = ({ value, onChange }) => {
    const isEn = value === 'en';
    return (
      <div className="flex items-center gap-3">
        <span className={`text-[12px] font-bold transition-colors select-none ${!isEn ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`}>
          فارسی
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={isEn}
          onClick={() => onChange(isEn ? 'fa' : 'en')}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 ${
            isEn ? 'bg-indigo-600 dark:bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
              isEn ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <span className={`text-[12px] font-bold transition-colors select-none ${isEn ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`}>
          English
        </span>
      </div>
    );
  };

  // ─── Theme segmented control ─────────────────────────────────────────────────
  const THEME_OPTIONS = [
    { value: 'light',  fa: 'روشن',   en: 'Light',  Icon: Sun     },
    { value: 'dark',   fa: 'تاریک',  en: 'Dark',   Icon: Moon    },
    { value: 'system', fa: 'خودکار', en: 'System', Icon: Monitor },
  ];

  const ThemeSegment = ({ value, onChange, isRtl }) => (
    <div className="inline-flex rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-900/50 shadow-sm">
      {THEME_OPTIONS.map(({ value: v, fa, en, Icon }) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`flex items-center gap-1.5 px-4 py-2 text-[11px] font-bold transition-all border-0 ${
            value === v
              ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-inner'
              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Icon size={13} strokeWidth={2} />
          {isRtl ? fa : en}
        </button>
      ))}
    </div>
  );

  // ─── Party role label map ────────────────────────────────────────────────────
  const PARTY_ROLE_LABELS = {
    system_user: { fa: 'کاربر سیستم', en: 'System User'  },
    vendor:      { fa: 'تامین‌کننده', en: 'Vendor'        },
    supplier:    { fa: 'تامین‌کننده', en: 'Supplier'      },
    customer:    { fa: 'مشتری',       en: 'Customer'      },
    employee:    { fa: 'کارمند',      en: 'Employee'      },
    broker:      { fa: 'بروکر',       en: 'Broker'        },
    shareholder: { fa: 'سهامدار',     en: 'Shareholder'   },
    exchange:    { fa: 'صرافی',       en: 'Exchange'      },
  };

  // ─── Apply theme to DOM ──────────────────────────────────────────────────────
  const applyTheme = (theme) => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.toggle(
        'dark',
        window.matchMedia('(prefers-color-scheme: dark)').matches
      );
    }
  };

  // ─── Main component ──────────────────────────────────────────────────────────
  const UserProfile = ({ language = 'fa' }) => {
    const isRtl = language === 'fa';
    const t = useCallback((fa, en) => isRtl ? fa : en, [isRtl]);

    const windowCurrentUserObj = window.NavigationSystem?.currentUser || {};
    // Session واقعی از sessionStorage خوانده می‌شود (توسط app.js پس از لاگین ذخیره می‌شود)
    const storedSession = (() => { try { return JSON.parse(sessionStorage.getItem('fm_user_session') || '{}'); } catch(_) { return {}; } })();
    const windowCurrentUserId = storedSession.id || windowCurrentUserObj.id || null;
    const windowCurrentUserUsername = storedSession.username || windowCurrentUserObj.username || '';
    const windowCurrentUserName = windowCurrentUserObj.name || windowCurrentUserObj.full_name || windowCurrentUserUsername || '';

    const [currentUserId, setCurrentUserId]   = useState(windowCurrentUserId);
    const [activeTab, setActiveTab]           = useState('personal');
    const [isLoading, setIsLoading]           = useState(false);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [toast, setToast]                   = useState({ isVisible: false, message: '', type: 'success' });

    const [profileInfo, setProfileInfo] = useState({
      fullName:    windowCurrentUserName || windowCurrentUserUsername || '...',
      username:    windowCurrentUserUsername || '...',
      partyRoles:  [],
      accessRoles: [],
      department:  '---',
      avatarUrl:   null,
    });

    const [preferences, setPreferences] = useState({
      theme:             'system',
      language:          'fa',
      calendarType:      'jalali',
      defaultCostTypeId: '',
    });

    const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
    const [costTypes, setCostTypes] = useState([]);
    const fileInputRef = useRef(null);

    // ── Toast helper ────────────────────────────────────────────────────────────
    const showToast = useCallback((message, type = 'success') => {
      setToast({ isVisible: true, message, type });
      setTimeout(() => setToast(prev => ({ ...prev, isVisible: false })), 3000);
    }, []);

    // ── Initialization ──────────────────────────────────────────────────────────
    useEffect(() => {
      if (!supabase) return;
      const init = async () => {
        // Step 1: try to fetch users list (non-fatal)
        let allUsers = [];
        try {
          const { data, error } = await supabase
            .from('sec_users')
            .select('id, username, email, full_name, party_id');
          if (!error) allUsers = data || [];
        } catch (_) {}

        // Step 2: resolve userId
        let safeMyUserId = windowCurrentUserId;
        if (!safeMyUserId || safeMyUserId === '00000000-0000-0000-0000-000000000000') {
          if (windowCurrentUserUsername) {
            const matchedUser = allUsers.find(u => u.username === windowCurrentUserUsername);
            if (matchedUser) safeMyUserId = matchedUser.id;
          }
        }

        if (!safeMyUserId) {
          try {
            const { data: authData } = await supabase.auth.getUser();
            if (authData?.user?.id) safeMyUserId = authData.user.id;
          } catch (_) {}
        }

        setCurrentUserId(safeMyUserId);

        const tasks = [fetchCostTypes()];
        if (safeMyUserId) {
          tasks.push(fetchUserData(safeMyUserId, allUsers));
          tasks.push(fetchPreferences(safeMyUserId));
        }
        await Promise.allSettled(tasks);
      };
      init();
    }, [windowCurrentUserId, windowCurrentUserUsername, windowCurrentUserName]);

    // ── Fetch user profile ──────────────────────────────────────────────────────
    const fetchUserData = async (userId, preloadedUsers) => {
      if (!supabase || !userId) return;
      try {
        let userData = (preloadedUsers || []).find(u => u.id === userId);
        
        if (!userData) {
          const { data, error } = await supabase
            .from('sec_users')
            .select('id, username, email, full_name, party_id')
            .eq('id', userId)
            .maybeSingle();
          if (!error) userData = data;
        }

        if (!userData) return;

        const partyId  = userData.party_id;
        const username = userData.username || windowCurrentUserUsername || '---';
        // full_name از DB اولویت دارد؛ اگر خالی بود از first_name + last_name در parties استفاده می‌شود
        let   fullName = userData.full_name || '';
        let   partyRoles = [];
        let   accessRoles = [];
        let   department = '---';

        if (partyId) {
        const [partyRes, personnelRes, userRolesRes] = await Promise.all([
            supabase
              .from('parties')
              .select('first_name, last_name, company_name, party_type, roles')
              .eq('id', partyId)
              .maybeSingle(),
            supabase
              .from('fm_org_chart_personnel')
              .select('node_id')
              .eq('person_id', partyId)
              .maybeSingle(),
            supabase
              .from('sec_user_roles')
              .select('role_id, sec_roles(id, title)')
              .eq('user_id', userId),
          ]);

          if (!partyRes.error && partyRes.data) {
            const p = partyRes.data;
            if (!fullName) {
              if (p.party_type === 'legal' || p.party_type === 'COMPANY') {
                fullName = p.company_name || '';
              } else {
                fullName = `${p.first_name || ''} ${p.last_name || ''}`.trim();
              }
            }
            if (Array.isArray(p.roles)) {
              partyRoles = p.roles;
            } else if (typeof p.roles === 'string') {
              try { partyRoles = JSON.parse(p.roles); } catch (_) {}
            }
          }

          if (!personnelRes.error && personnelRes.data?.node_id) {
            const nodeRes = await supabase
              .from('fm_org_chart_nodes')
              .select('title')
              .eq('id', personnelRes.data.node_id)
              .maybeSingle();
            if (!nodeRes.error && nodeRes.data?.title) {
              department = nodeRes.data.title;
            }
          }

          if (!userRolesRes.error && userRolesRes.data) {
            accessRoles = userRolesRes.data
              .map(r => r.sec_roles?.title)
              .filter(Boolean);
          } else if (userRolesRes.error) {
            // silent fail
          }
        } else {
          // اگر party_id نداشت، فقط نقش‌های دسترسی رو بگیر
          const userRolesRes = await supabase
            .from('sec_user_roles')
            .select('role_id, sec_roles(id, title)')
            .eq('user_id', userId);
          if (!userRolesRes.error && userRolesRes.data) {
            accessRoles = userRolesRes.data
              .map(r => r.sec_roles?.title)
              .filter(Boolean);
          }
        }

        console.log = console.log; // no-op line removed
        setProfileInfo({
          fullName:    fullName || username || t('بدون نام', 'No name'),
          username,
          partyRoles,
          accessRoles,
          department,
          avatarUrl: null,
        });
      } catch (err) {
        console.error('fetchUserData error:', err);
        // Don't overwrite profileInfo — keep what's already shown (NavigationSystem data)
      }
    };

    // ── Fetch preferences ───────────────────────────────────────────────────────
    const fetchPreferences = async (userId) => {
      if (!supabase || !userId) return;
      try {
        const { data, error } = await supabase
          .from('fm_user_preferences')
          .select('theme, language, calendar_type, default_cost_type_id, photo_url')
          .eq('user_id', userId)
          .maybeSingle();
        if (!error && data) {
          setPreferences({
            theme:             data.theme             ?? 'system',
            language:          data.language          ?? 'fa',
            calendarType:      data.calendar_type     ?? 'jalali',
            defaultCostTypeId: data.default_cost_type_id ?? '',
          });
          if (data.photo_url) {
            setProfileInfo(prev => ({ ...prev, avatarUrl: data.photo_url }));
            try {
              const stored = JSON.parse(sessionStorage.getItem('fm_user_session') || '{}');
              if (!stored.photo_url) {
                stored.photo_url = data.photo_url;
                sessionStorage.setItem('fm_user_session', JSON.stringify(stored));
                window.dispatchEvent(new CustomEvent('fm_avatar_change', { detail: data.photo_url }));
              }
            } catch (_) {}
          }
        }
      } catch (_) {}
    };

    // ── Fetch cost types ────────────────────────────────────────────────────────
    const fetchCostTypes = async () => {
      if (!supabase) return;
      try {
        const { data, error } = await supabase
          .from('fm_cost_types')
          .select('id, title_fa, title_en, code')
          .eq('is_active', true)
          .order('title_fa');
        if (!error && data) {
          setCostTypes(data.map(c => ({
            value: c.id,
            label: `[${c.code}] ${isRtl ? c.title_fa : (c.title_en || c.title_fa)}`,
          })));
        }
      } catch (_) {}
    };

    // ── Avatar upload ───────────────────────────────────────────────────────────
    const handleAvatarUpload = async (event) => {
      const file = event.target.files?.[0];
      if (!file || !currentUserId) return;

      setIsUploadingAvatar(true);
      try {
        const ext      = file.name.split('.').pop().toLowerCase();
        const fileName = `avatar_${currentUserId}.${ext}`;
        const filePath = `user-avatars/${fileName}`;
        const BUCKET   = 'attachments';

        // حذف فایل قبلی اگر وجود داشت
        await supabase.storage.from(BUCKET).remove([filePath]);

        const { error: uploadErr } = await supabase.storage
          .from(BUCKET)
          .upload(filePath, file, { upsert: true, contentType: file.type });
        if (uploadErr) throw uploadErr;

        const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
        const publicUrl = urlData?.publicUrl;
        if (!publicUrl) throw new Error(t('خطا در دریافت آدرس عکس.', 'Could not retrieve public URL.'));

        const { error: updateErr } = await supabase
          .from('fm_user_preferences')
          .upsert(
            { user_id: currentUserId, photo_url: publicUrl },
            { onConflict: 'user_id' }
          );
        if (updateErr) throw updateErr;

        // آپدیت در session و اطلاع به NavigationSystem
        try {
          const stored = JSON.parse(sessionStorage.getItem('fm_user_session') || '{}');
          stored.photo_url = publicUrl;
          sessionStorage.setItem('fm_user_session', JSON.stringify(stored));
          window.dispatchEvent(new CustomEvent('fm_avatar_change', { detail: publicUrl }));
        } catch (_) {}

        setProfileInfo(prev => ({ ...prev, avatarUrl: publicUrl }));
        showToast(t('تصویر پروفایل بروزرسانی شد.', 'Profile picture updated successfully.'));
      } catch (err) {
        showToast(err.message || t('خطا در بارگذاری تصویر.', 'Error uploading image.'), 'error');
      } finally {
        setIsUploadingAvatar(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    // ── Save preferences ────────────────────────────────────────────────────────
    const handleSavePreferences = async () => {
      if (!supabase || !currentUserId) return;
      setIsLoading(true);
      try {
        const { error } = await supabase
          .from('fm_user_preferences')
          .upsert(
            {
              user_id:              currentUserId,
              theme:                preferences.theme,
              language:             preferences.language,
              calendar_type:        preferences.calendarType,
              default_cost_type_id: preferences.defaultCostTypeId || null,
              updated_at:           new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          );
        if (error) throw error;
        applyTheme(preferences.theme);
        showToast(t('تنظیمات با موفقیت ذخیره شد.', 'Preferences saved successfully.'));
      } catch (err) {
        console.error('Save preferences error:', err);
        showToast(t('خطا در ذخیره تنظیمات.', 'Error saving preferences.'), 'error');
      } finally {
        setIsLoading(false);
      }
    };

    // ── Change password ─────────────────────────────────────────────────────────
    const handleChangePassword = async () => {
      if (!passwords.new || !passwords.confirm) {
        return showToast(t('رمز عبور جدید را وارد کنید.', 'Enter new password.'), 'error');
      }
      if (passwords.new !== passwords.confirm) {
        return showToast(t('تکرار رمز تطابق ندارد.', 'Passwords do not match.'), 'error');
      }
      setIsLoading(true);
      try {
        const { error } = await supabase.auth.updateUser({ password: passwords.new });
        if (error) throw error;
        showToast(t('رمز عبور با موفقیت تغییر کرد.', 'Password changed successfully.'));
        setPasswords({ current: '', new: '', confirm: '' });
      } catch (err) {
        console.error('Change password error:', err);
        showToast(t('خطا در تغییر رمز عبور.', 'Error changing password.'), 'error');
      } finally {
        setIsLoading(false);
      }
    };

    const tabs = [
      { id: 'personal',    label: t('اطلاعات کاربری', 'User Info'),        icon: User       },
      { id: 'preferences', label: t('تنظیمات پایه',   'Basic Preferences'), icon: Settings   },
      { id: 'financial',   label: t('تنظیمات مالی',   'Financial Prefs'),   icon: CreditCard },
      { id: 'security',    label: t('امنیت و رمز',    'Security'),          icon: Shield     },
    ];

    const formatRole = useCallback((role) => {
      const entry = PARTY_ROLE_LABELS[role?.toLowerCase()];
      return entry ? (isRtl ? entry.fa : entry.en) : role;
    }, [isRtl]);

    const activeTabMeta = tabs.find(tab => tab.id === activeTab) ?? tabs[0];

    return (
      <div className="flex flex-col h-full p-2 md:p-3 bg-slate-100 dark:bg-slate-900" dir={isRtl ? 'rtl' : 'ltr'}>
        <PageHeader
          title={t('پروفایل کاربری', 'User Profile')}
          icon={User}
          description={t('مدیریت اطلاعات و تنظیمات سیستم', 'Manage info and system preferences')}
          language={language}
          breadcrumbs={[{ label: t('داشبورد', 'Dashboard') }, { label: t('پروفایل من', 'My Profile') }]}
        />

        <div className="flex-1 flex flex-col md:flex-row gap-2 mt-2 min-h-0">

          {/* ── Left sidebar ───────────────────────────────────────────────────── */}
          <div className="w-full md:w-[260px] shrink-0 flex flex-col gap-2 min-h-0 overflow-y-auto custom-scrollbar">

            {/* Identity card */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex flex-col items-center text-center shadow-sm shrink-0">
              <div className="relative group w-20 h-20 mb-3">
                <div className="w-full h-full rounded-full bg-indigo-50 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-500 border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                  {isUploadingAvatar ? (
                    <Loader2 size={24} className="animate-spin text-indigo-500" />
                  ) : profileInfo.avatarUrl ? (
                    <img src={profileInfo.avatarUrl} alt={t('تصویر پروفایل', 'Avatar')} className="w-full h-full object-cover" />
                  ) : (
                    <User size={32} strokeWidth={1.5} />
                  )}
                </div>
                <label className="absolute inset-0 bg-black/50 text-white rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity backdrop-blur-sm">
                  <Camera size={18} className="mb-1" />
                  <span className="text-[9px] font-bold">{t('تغییر', 'Change')}</span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/png,image/jpeg,image/gif,image/webp"
                    onChange={handleAvatarUpload}
                    ref={fileInputRef}
                    disabled={isUploadingAvatar}
                  />
                </label>
              </div>
              <h2 className="text-[14px] font-black text-slate-800 dark:text-white mb-0.5">{profileInfo.fullName}</h2>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-3 truncate w-full dir-ltr">{profileInfo.username}</p>
              <div className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700">
                <Building2 size={14} className="text-slate-400 shrink-0" />
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">{profileInfo.department}</span>
              </div>
            </div>

            {/* Tab navigation */}
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1.5 flex flex-col gap-1 shadow-sm shrink-0">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-bold transition-colors ${
                    activeTab === tab.id
                      ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <tab.icon size={16} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Main panel ─────────────────────────────────────────────────────── */}
          <div className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm flex flex-col min-h-0">

            {/* Panel header */}
            <div className="p-3 border-b border-slate-100 dark:border-slate-700 shrink-0 bg-slate-50/50 dark:bg-slate-800/50 rounded-t-xl">
              <h3 className="text-[13px] font-black text-slate-800 dark:text-white flex items-center gap-2">
                {React.createElement(activeTabMeta.icon, { size: 16, className: 'text-indigo-500' })}
                {activeTabMeta.label}
              </h3>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4">

              {/* Tab: Personal Info */}
              {activeTab === 'personal' && (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <ReadOnlyField label={t('نام کامل', 'Full Name')} value={profileInfo.fullName} />
                    <ReadOnlyField label={t('نام کاربری', 'Username')} value={profileInfo.username} ltr />
                    <ReadOnlyField label={t('دپارتمان / واحد سازمانی', 'Department')} value={profileInfo.department} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Fingerprint size={12} /> {t('نقش‌های شخص', 'Party Roles')}
                      </label>
                      <div className="min-h-[36px] p-1.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded flex flex-wrap gap-1 items-center">
                        {profileInfo.partyRoles.length > 0
                          ? profileInfo.partyRoles.map((role, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] font-bold rounded">
                                {formatRole(role)}
                              </span>
                            ))
                          : <span className="text-[11px] text-slate-400 px-1">{t('ندارد', 'None')}</span>
                        }
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Shield size={12} /> {t('نقش‌های دسترسی', 'Access Roles')}
                      </label>
                      <div className="min-h-[36px] p-1.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded flex flex-wrap gap-1 items-center">
                        {profileInfo.accessRoles.length > 0
                          ? profileInfo.accessRoles.map((role, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold rounded">
                                {role}
                              </span>
                            ))
                          : <span className="text-[11px] text-slate-400 px-1">{t('ندارد', 'None')}</span>
                        }
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Basic Preferences */}
              {activeTab === 'preferences' && (
                <div className="flex flex-col gap-5">

                  {/* ── Theme ── */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Sun size={12} className="text-slate-500 dark:text-slate-400" />
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{t('تم رنگی', 'Color Theme')}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: 'light',  fa: 'روشن',   en: 'Light',  Icon: Sun     },
                        { value: 'dark',   fa: 'تاریک',  en: 'Dark',   Icon: Moon    },
                        { value: 'system', fa: 'خودکار', en: 'System', Icon: Monitor },
                      ].map(({ value: v, fa, en, Icon }) => {
                        const sel = preferences.theme === v;
                        return (
                          <button key={v} type="button"
                            onClick={() => {
                              setPreferences(p => ({ ...p, theme: v }));
                              if (v === 'system') {
                                const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                                window.DSCore?.setGlobalTheme?.(isDark ? 'dark' : 'light');
                              } else {
                                window.DSCore?.setGlobalTheme?.(v);
                              }
                            }}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border outline-none transition-all duration-150 ${
                              sel
                                ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-600'
                            }`}>
                            <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                              sel ? 'bg-indigo-500 dark:bg-indigo-400 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                            }`}>
                              <Icon size={12} strokeWidth={2} />
                            </div>
                            <span className={`text-[11px] font-bold ${
                              sel ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400'
                            }`}>{isRtl ? fa : en}</span>
                            {sel && <span className="ms-auto text-indigo-400 text-[10px] font-black">✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* ── Language ── */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Globe size={12} className="text-slate-500 dark:text-slate-400" />
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{t('زبان سیستم', 'System Language')}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: 'fa', label: 'فارسی',   sublabel: 'Persian', flag: '🇮🇷' },
                        { value: 'en', label: 'English', sublabel: 'انگلیسی',   flag: '🇬🇧' },
                      ].map(({ value: v, label, sublabel, flag }) => {
                        const sel = preferences.language === v;
                        return (
                          <button key={v} type="button"
                            onClick={() => {
                              setPreferences(p => ({ ...p, language: v }));
                              window.DSCore?.setGlobalLanguage?.(v);
                            }}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border outline-none transition-all duration-150 ${
                              sel
                                ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-600'
                            }`}>
                            <span className="text-lg select-none leading-none">{flag}</span>
                            <div className="flex flex-col items-start">
                              <span className={`text-[11px] font-bold ${
                                sel ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400'
                              }`}>{label}</span>
                              <span className="text-[9px] text-slate-400">{sublabel}</span>
                            </div>
                            {sel && <span className="ms-auto text-indigo-400 text-[10px] font-black">✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* ── Calendar ── */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Calendar size={12} className="text-slate-500 dark:text-slate-400" />
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{t('نوع تقویم', 'Calendar Type')}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: 'jalali',    fa: 'شمسی (جلالی)', en: 'Jalali',    abbrFa: 'ج', abbrEn: 'Ja' },
                        { value: 'gregorian', fa: 'میلادی',        en: 'Gregorian', abbrFa: 'م', abbrEn: 'Gr' },
                      ].map(({ value: v, fa, en, abbrFa, abbrEn }) => {
                        const sel = preferences.calendarType === v;
                        return (
                          <button key={v} type="button"
                            onClick={() => {
                              setPreferences(p => ({ ...p, calendarType: v }));
                              window.DSCore?.setGlobalCalendarMode?.(v);
                            }}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border outline-none transition-all duration-150 ${
                              sel
                                ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-600'
                            }`}>
                            <div className={`w-6 h-6 rounded-md flex flex-col items-center justify-center shrink-0 ${
                              sel ? 'bg-indigo-500 dark:bg-indigo-400 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                            }`}>
                              <span className="text-[9px] font-black leading-none">{isRtl ? abbrFa : abbrEn}</span>
                            </div>
                            <span className={`text-[11px] font-bold ${
                              sel ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-600 dark:text-slate-400'
                            }`}>{isRtl ? fa : en}</span>
                            {sel && <span className="ms-auto text-indigo-400 text-[10px] font-black">✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                </div>
              )}

              {/* Tab: Financial Preferences */}
              {activeTab === 'financial' && (
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <SelectField
                      size="sm"
                      label={t('نوع هزینه پیش‌فرض', 'Default Cost Type')}
                      value={preferences.defaultCostTypeId}
                      onChange={e => setPreferences(p => ({ ...p, defaultCostTypeId: e.target.value }))}
                      options={[{ value: '', label: '---' }, ...costTypes]}
                      isRtl={isRtl}
                    />
                  </div>
                </div>
              )}

              {/* Tab: Security */}
              {activeTab === 'security' && (
                <form autoComplete="off" onSubmit={e => e.preventDefault()} className="flex flex-col gap-3 max-w-sm">
                  {/* Honeypot inputs to suppress browser autofill */}
                  <input type="text"     name="username_fake" autoComplete="off"          style={{ display: 'none' }} readOnly />
                  <input type="password" name="password_fake" autoComplete="new-password" style={{ display: 'none' }} readOnly />

                  <div className="bg-blue-50/80 border border-blue-100 dark:bg-blue-900/20 dark:border-blue-800/50 p-3 rounded-xl shadow-sm">
                    <p className="text-[11px] font-medium text-blue-700 dark:text-blue-300 leading-relaxed text-justify">
                      {t(
                        'راهنما: رمز عبور باید بین ۸ تا ۱۴ کاراکتر باشد و شامل حداقل یک حرف بزرگ، یک حرف کوچک، یک عدد و یک علامت باشد.',
                        'Hint: Password must be 8–14 characters, including at least one uppercase letter, one lowercase letter, one number, and one symbol.'
                      )}
                    </p>
                  </div>

                  <TextField
                    size="sm" type="password"
                    label={t('رمز عبور فعلی', 'Current Password')}
                    value={passwords.current}
                    onChange={e => setPasswords(p => ({ ...p, current: e.target.value }))}
                    isRtl={isRtl} dir="ltr" autoComplete="new-password"
                  />
                  <TextField
                    size="sm" type="password"
                    label={t('رمز عبور جدید', 'New Password')}
                    value={passwords.new}
                    onChange={e => setPasswords(p => ({ ...p, new: e.target.value }))}
                    isRtl={isRtl} dir="ltr" autoComplete="new-password"
                  />
                  <TextField
                    size="sm" type="password"
                    label={t('تکرار رمز جدید', 'Confirm Password')}
                    value={passwords.confirm}
                    onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))}
                    isRtl={isRtl} dir="ltr" autoComplete="new-password"
                  />
                </form>
              )}
            </div>

            {/* Panel footer */}
            <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-end items-center shrink-0 rounded-b-xl gap-2 h-12">
              {activeTab === 'personal' && (
                <span className="text-[11px] text-slate-500 font-bold ml-auto">
                  {t('اطلاعات شخصی فقط جهت نمایش است.', 'Personal info is read-only.')}
                </span>
              )}
              {(activeTab === 'preferences' || activeTab === 'financial') && (
                <Button variant="primary" size="sm" icon={Save} onClick={handleSavePreferences} isLoading={isLoading}>
                  {t('ذخیره تغییرات', 'Save Changes')}
                </Button>
              )}
              {activeTab === 'security' && (
                <Button variant="primary" size="sm" icon={Key} onClick={handleChangePassword} isLoading={isLoading}>
                  {t('تغییر رمز عبور', 'Update Password')}
                </Button>
              )}
            </div>
          </div>
        </div>

        <Toast
          isVisible={toast.isVisible}
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
        />
      </div>
    );
  };

  window.UserProfile = UserProfile;
})();