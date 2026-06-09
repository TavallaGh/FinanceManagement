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
    Sun, Moon, Monitor
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
          if (error) console.warn('sec_users fetch warning:', error.message, error.code);
          else allUsers = data || [];
        } catch (e) {
          console.warn('sec_users fetch exception:', e);
        }

        // Step 2: resolve userId — اولویت با sessionStorage است (id مستقیم، نیازی به match name نیست)
        let safeMyUserId = windowCurrentUserId;
        // فقط اگر id از session نداشتیم، سعی می‌کنیم با username match کنیم (نه full_name)
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
          } catch (e) {
            console.warn('auth.getUser exception:', e);
          }
        }

        console.log('[UserProfile] resolved userId:', safeMyUserId, '| navUser:', windowCurrentUserObj);
        setCurrentUserId(safeMyUserId);

        // Step 3: fetch profile details (non-fatal — keep NavigationSystem data on failure)
        const tasks = [fetchCostTypes()];
        if (safeMyUserId) {
          tasks.push(fetchUserData(safeMyUserId, allUsers));
          tasks.push(fetchPreferences(safeMyUserId));
        } else {
          console.warn('[UserProfile] userId not resolved — showing NavigationSystem data only');
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
          if (error) { console.warn('sec_users single fetch warning:', error.message); }
          userData = data;
        }

        if (!userData) {
          console.warn('[UserProfile] no userData found for userId:', userId, '— keeping NavigationSystem data');
          return;
        }

        console.log('[UserProfile] userData:', userData);

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

          if (partyRes.error) console.warn('parties fetch warning:', partyRes.error.message);
          if (!partyRes.error && partyRes.data) {
            const p = partyRes.data;
            // فقط اگر full_name خالی باشد از parties استفاده می‌کنیم
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

          if (personnelRes.error) console.warn('org_chart_personnel fetch warning:', personnelRes.error.message);
          // کوئری مستقیم بر اساس node_id بدون fetch همه نودها
          if (!personnelRes.error && personnelRes.data?.node_id) {
            const nodeRes = await supabase
              .from('fm_org_chart_nodes')
              .select('title')
              .eq('id', personnelRes.data.node_id)
              .maybeSingle();
            if (nodeRes.error) console.warn('org_chart_nodes fetch warning:', nodeRes.error.message);
            if (!nodeRes.error && nodeRes.data?.title) {
              department = nodeRes.data.title;
            }
          }

          if (!userRolesRes.error && userRolesRes.data) {
            accessRoles = userRolesRes.data
              .map(r => r.sec_roles?.title)
              .filter(Boolean);
          } else if (userRolesRes.error) {
            console.warn('sec_user_roles fetch warning:', userRolesRes.error.message);
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

        console.log('[UserProfile] resolved — fullName:', fullName, '| username:', username, '| department:', department);

        setProfileInfo({
          fullName:    fullName || username || t('بدون نام', 'No name'),
          username,
          partyRoles,
          accessRoles,
          department,
          avatarUrl: userData.avatar_url ?? null,
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
          .select('theme, language, calendar_type, default_cost_type_id')
          .eq('user_id', userId)
          .maybeSingle();
        if (!error && data) {
          setPreferences({
            theme:             data.theme             ?? 'system',
            language:          data.language          ?? 'fa',
            calendarType:      data.calendar_type     ?? 'jalali',
            defaultCostTypeId: data.default_cost_type_id ?? '',
          });
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
        const fileName = `${currentUserId}-${Date.now()}.${ext}`;
        const filePath = `avatars/${fileName}`;

        const { error: uploadErr } = await supabase.storage
          .from('avatars')
          .upload(filePath, file, { upsert: false, contentType: file.type });
        if (uploadErr) throw uploadErr;

        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
        const publicUrl = urlData?.publicUrl;
        if (!publicUrl) throw new Error(t('خطا در دریافت آدرس عکس.', 'Could not retrieve public URL.'));

        const { error: updateErr } = await supabase
          .from('sec_users')
          .update({ avatar_url: publicUrl })
          .eq('id', currentUserId);
        if (updateErr) throw updateErr;

        setProfileInfo(prev => ({ ...prev, avatarUrl: publicUrl }));
        showToast(t('تصویر پروفایل بروزرسانی شد.', 'Profile picture updated successfully.'));
      } catch (err) {
        console.error('Avatar upload error:', err);
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
                  <Alert
                    type="info"
                    message={t('تنظیمات پایه‌ای مختص به حساب کاربری شما', 'Basic settings applied to your account.')}
                    className="py-2 px-3 text-[11px]"
                  />

                  {/* Theme — segmented control */}
                  <div className="flex flex-col gap-2">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      {t('تم رنگی سیستم', 'System Theme')}
                    </label>
                    <ThemeSegment
                      value={preferences.theme}
                      onChange={v => setPreferences(p => ({ ...p, theme: v }))}
                      isRtl={isRtl}
                    />
                  </div>

                  {/* Language — toggle switch */}
                  <div className="flex flex-col gap-2">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      {t('زبان پیش‌فرض', 'Default Language')}
                    </label>
                    <LangToggle
                      value={preferences.language}
                      onChange={v => setPreferences(p => ({ ...p, language: v }))}
                    />
                  </div>

                  {/* Calendar — select */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <SelectField
                      size="sm"
                      label={t('تقویم پیش‌فرض', 'Default Calendar')}
                      value={preferences.calendarType}
                      onChange={e => setPreferences(p => ({ ...p, calendarType: e.target.value }))}
                      options={[
                        { value: 'jalali',    label: t('شمسی',   'Jalali')    },
                        { value: 'gregorian', label: t('میلادی', 'Gregorian') },
                      ]}
                      isRtl={isRtl}
                    />
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