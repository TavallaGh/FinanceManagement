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
    Key, Building2, Fingerprint, Camera, Loader2
  } = window.LucideIcons || {};
  
  const supabase = window.supabase;

  const UserProfile = ({ language = 'fa' }) => {
    const isRtl = language === 'fa';
    const t = useCallback((fa, en) => isRtl ? fa : en, [isRtl]);
    
    const [currentUserId, setCurrentUserId] = useState(null);
    const [activeTab, setActiveTab] = useState('personal');
    const [isLoading, setIsLoading] = useState(false);
    const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' });

    const [profileInfo, setProfileInfo] = useState({
      fullName: 'در حال بارگذاری...',
      username: 'در حال بارگذاری...',
      partyRoles: [],
      userRoles: [],
      department: '---',
      avatarUrl: null
    });

    const [preferences, setPreferences] = useState({
      theme: 'system',
      language: 'fa',
      calendarType: 'jalali',
      defaultCostTypeId: ''
    });

    const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
    const [costTypes, setCostTypes] = useState([]);
    
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const fileInputRef = useRef(null);

    const showToast = useCallback((message, type = 'success') => {
      setToast({ isVisible: true, message, type });
      setTimeout(() => setToast(prev => ({ ...prev, isVisible: false })), 3000);
    }, []);

    useEffect(() => {
      const initProfile = async () => {
         try {
             let uId = window.NavigationSystem?.currentUser?.id;
             if (!uId && supabase) {
                const { data } = await supabase.auth.getUser();
                uId = data?.user?.id;
             }
             
             if (uId) {
                setCurrentUserId(uId);
                fetchUserData(uId);
                fetchPreferences(uId);
                fetchCostTypes();
             } else {
                setProfileInfo(prev => ({ ...prev, fullName: 'کاربر یافت نشد', username: '---' }));
             }
         } catch (err) {
             console.error("Auth init error:", err);
             setProfileInfo(prev => ({ ...prev, fullName: 'خطای دسترسی', username: '---' }));
         }
      };
      initProfile();
    }, []);

    const fetchUserData = async (userId) => {
      if (!supabase || !userId) return;
      try {
        let userData = null;
        
        const { data: pubUser, error: pubErr } = await supabase.from('sec_users').select('*').eq('id', userId).single();
        userData = pubUser;
        
        if (!userData) {
            const { data: altUser } = await supabase.from('sec_users').select('*').eq('user_id', userId).single();
            userData = altUser;
            if (!userData) {
                const { data: authUser } = await supabase.from('sec_users').select('*').eq('auth_id', userId).single();
                userData = authUser;
            }
        }
        
        if (!userData) {
             throw new Error('User record not found in database');
        }

        const partyId = userData.party_id || userData.person_id || userData.personnel_id;
        const fetchedUsername = userData.username || userData.user_name || userData.email || '---';

        let partyRoles = [];
        let fetchedFullName = userData.full_name || userData.fullname || '';
        let departmentName = '---';

        if (partyId) {
          const { data: partyData, error: partyErr } = await supabase
            .from('parties')
            .select('id, first_name, last_name, company_name, party_type, roles')
            .eq('id', partyId)
            .single();
          
          if (!partyErr && partyData) {
            if (typeof partyData.roles === 'string') {
                try { partyRoles = JSON.parse(partyData.roles); } catch(e){}
            } else if (Array.isArray(partyData.roles)) {
                partyRoles = partyData.roles;
            }

            if (partyData.party_type === 'legal') {
                fetchedFullName = partyData.company_name || fetchedFullName;
            } else {
                const combinedName = `${partyData.first_name || ''} ${partyData.last_name || ''}`.trim();
                fetchedFullName = combinedName || fetchedFullName;
            }
          }

          let orgData = null;
          const res1 = await supabase.from('fm_org_chart_personnel').select('node_id, from_date, to_date').eq('person_id', partyId);
          if (!res1.error && res1.data && res1.data.length > 0) {
              orgData = res1.data;
          } else {
              const res2 = await supabase.from('fm_org_chart_personnel').select('node_id, from_date, to_date').eq('personnel_id', partyId);
              if (!res2.error && res2.data && res2.data.length > 0) {
                  orgData = res2.data;
              }
          }
            
          if (orgData && orgData.length > 0) {
            const today = new Date().toISOString().split('T')[0];
            let activeNodeId = null;
            
            for (const p of orgData) {
               const fDate = p.from_date && p.from_date.length >= 10 ? p.from_date.substring(0,10).replace(/\//g, '-') : '1000-01-01';
               const tDate = p.to_date && p.to_date.length >= 10 ? p.to_date.substring(0,10).replace(/\//g, '-') : '9999-12-31';
               
               if (today >= fDate && today <= tDate) {
                   activeNodeId = p.node_id;
                   break;
               }
            }
            if (!activeNodeId) activeNodeId = orgData[0].node_id;

            if (activeNodeId) {
               const { data: nodeData } = await supabase
                 .from('fm_org_chart_nodes')
                 .select('title, is_active')
                 .eq('id', activeNodeId)
                 .single();
                 
               if (nodeData && nodeData.is_active) {
                  departmentName = nodeData.title;
               }
            }
          }
        }

        let userRoles = [];
        let rolesRes = await supabase.from('sec_user_roles').select('role_id').eq('user_id', userData.id);
        if ((rolesRes.error || !rolesRes.data || rolesRes.data.length === 0) && userData.id !== userId) {
             rolesRes = await supabase.from('sec_user_roles').select('role_id').eq('user_id', userId);
        }
          
        if (rolesRes.data && rolesRes.data.length > 0) {
            const roleIds = rolesRes.data.map(r => r.role_id);
            const { data: rolesRows } = await supabase
                .from('sec_roles')
                .select('title')
                .in('id', roleIds);
                
            if (rolesRows) {
                userRoles = rolesRows.map(r => r.title).filter(Boolean);
            }
        }

        setProfileInfo(prev => ({
          ...prev,
          fullName: fetchedFullName || fetchedUsername || 'بدون نام',
          username: fetchedUsername,
          partyRoles,
          userRoles,
          department: departmentName,
          avatarUrl: userData.avatar_url || null
        }));
      } catch (err) {
        console.error('Error in fetchUserData:', err);
        setProfileInfo(prev => ({
          ...prev,
          fullName: 'خطا در دریافت اطلاعات',
          username: '---'
        }));
      }
    };

    const fetchPreferences = async (userId) => {
      if (!supabase || !userId) return;
      try {
        const { data } = await supabase
          .from('fm_user_preferences')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (data) {
          setPreferences({
            theme: data.theme || 'system',
            language: data.language || 'fa',
            calendarType: data.calendar_type || 'jalali',
            defaultCostTypeId: data.default_cost_type_id || ''
          });
        }
      } catch (err) {}
    };

    const fetchCostTypes = async () => {
      if (!supabase) return;
      try {
        const { data } = await supabase
          .from('fm_cost_types')
          .select('id, title_fa, title_en, code')
          .eq('is_active', true)
          .order('title_fa');
        
        if (data) {
          setCostTypes(data.map(c => ({
            value: c.id,
            label: `[${c.code}] ${isRtl ? c.title_fa : (c.title_en || c.title_fa)}`
          })));
        }
      } catch (err) {}
    };

    const handleAvatarUpload = async (event) => {
      if (!currentUserId) return;
      try {
        if (!event.target.files || event.target.files.length === 0) return;
        const file = event.target.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${currentUserId}-${Date.now()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        setIsUploadingAvatar(true);

        const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
        if (uploadError) {
             console.error("Storage upload error:", uploadError);
             throw new Error(isRtl ? 'خطا در آپلود عکس.' : 'Storage upload failed.');
        }

        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);

        const { error: updateError } = await supabase.from('sec_users').update({ avatar_url: publicUrl }).eq('id', currentUserId);
        if (updateError) {
             console.error("Database update error:", updateError);
             throw new Error(isRtl ? 'خطا در ذخیره آدرس عکس.' : 'Database update failed.');
        }

        setProfileInfo(prev => ({ ...prev, avatarUrl: publicUrl }));
        showToast(t('تصویر پروفایل بروزرسانی شد.', 'Profile picture updated successfully.'));
      } catch (error) {
        showToast(error.message || t('خطا در عملیات.', 'Error.'), 'error');
      } finally {
        setIsUploadingAvatar(false);
      }
    };

    const handleSavePreferences = async () => {
      if (!supabase || !currentUserId) return;
      setIsLoading(true);
      try {
        const payload = {
          user_id: currentUserId,
          theme: preferences.theme,
          language: preferences.language,
          calendar_type: preferences.calendarType,
          default_cost_type_id: preferences.defaultCostTypeId || null,
          updated_at: new Date().toISOString()
        };

        const { error } = await supabase.from('fm_user_preferences').upsert(payload, { onConflict: 'user_id' });
        if (error) throw error;
        
        if (preferences.theme === 'dark') document.documentElement.classList.add('dark');
        else if (preferences.theme === 'light') document.documentElement.classList.remove('dark');
        else {
            if (window.matchMedia('(prefers-color-scheme: dark)').matches) document.documentElement.classList.add('dark');
            else document.documentElement.classList.remove('dark');
        }

        showToast(t('تنظیمات با موفقیت ذخیره شد.', 'Preferences saved successfully.'));
      } catch (err) {
        showToast(t('خطا در ذخیره تنظیمات.', 'Error saving preferences.'), 'error');
      } finally {
        setIsLoading(false);
      }
    };

    const handleChangePassword = async () => {
      if (!passwords.new || !passwords.confirm) return showToast(t('رمز عبور جدید را وارد کنید.', 'Enter new password.'), 'error');
      if (passwords.new !== passwords.confirm) return showToast(t('تکرار رمز تطابق ندارد.', 'Passwords do not match.'), 'error');
      
      setIsLoading(true);
      try {
        const { error } = await supabase.auth.updateUser({ password: passwords.new });
        if (error) throw error;
        showToast(t('رمز عبور تغییر کرد.', 'Password changed.'));
        setPasswords({ current: '', new: '', confirm: '' });
      } catch (err) {
        showToast(t('خطا در تغییر رمز عبور.', 'Error changing password.'), 'error');
      } finally {
        setIsLoading(false);
      }
    };

    const tabs = [
      { id: 'personal', label: t('اطلاعات کاربری', 'User Info'), icon: User },
      { id: 'preferences', label: t('تنظیمات پایه', 'Basic Preferences'), icon: Settings },
      { id: 'financial', label: t('تنظیمات مالی', 'Financial Prefs'), icon: CreditCard },
      { id: 'security', label: t('امنیت و رمز', 'Security'), icon: Shield }
    ];

    const formatRoleFa = (role) => {
        if (!role) return '';
        const rolesMap = { 'system_user': 'کاربر سیستم', 'vendor': 'تامین‌کننده', 'supplier': 'تامین‌کننده', 'customer': 'مشتری', 'employee': 'کارمند', 'broker': 'بروکر', 'shareholder': 'سهامدار', 'exchange': 'صرافی' };
        return rolesMap[role.toLowerCase()] || role;
    };

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
          
          <div className="w-full md:w-[260px] shrink-0 flex flex-col gap-2 min-h-0 overflow-y-auto custom-scrollbar">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex flex-col items-center text-center shadow-sm shrink-0">
                <div className="relative group w-20 h-20 mb-3">
                  <div className="w-full h-full rounded-full bg-indigo-50 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-500 border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                      {isUploadingAvatar ? (
                        <Loader2 size={24} className="animate-spin text-indigo-500" />
                      ) : profileInfo.avatarUrl ? (
                        <img src={profileInfo.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <User size={32} strokeWidth={1.5} />
                      )}
                  </div>
                  <label className="absolute inset-0 bg-black/50 text-white rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity backdrop-blur-sm">
                      <Camera size={18} className="mb-1" />
                      <span className="text-[9px] font-bold">{t('تغییر', 'Change')}</span>
                      <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} ref={fileInputRef} disabled={isUploadingAvatar} />
                  </label>
                </div>
                <h2 className="text-[14px] font-black text-slate-800 dark:text-white mb-0.5">{profileInfo.fullName}</h2>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 dir-ltr mb-3 truncate w-full">{profileInfo.username}</p>
                <div className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-700">
                    <Building2 size={14} className="text-slate-400 shrink-0" />
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate">{profileInfo.department}</span>
                </div>
            </div>

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

          <div className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm flex flex-col min-h-0">
            <div className="p-3 border-b border-slate-100 dark:border-slate-700 shrink-0 bg-slate-50/50 dark:bg-slate-800/50 rounded-t-xl">
                <h3 className="text-[13px] font-black text-slate-800 dark:text-white flex items-center gap-2">
                    {React.createElement(tabs.find(t => t.id === activeTab)?.icon || User, { size: 16, className: 'text-indigo-500' })}
                    {tabs.find(t => t.id === activeTab)?.label}
                </h3>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                
                {activeTab === 'personal' && (
                    <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{t('نام کامل', 'Full Name')}</label>
                                <div className="min-h-[36px] px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded flex items-center text-[12px] font-bold text-slate-800 dark:text-slate-200">
                                    {profileInfo.fullName}
                                </div>
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{t('نام کاربری', 'Username')}</label>
                                <div className="min-h-[36px] px-2.5 py-1.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded flex items-center text-[12px] font-bold text-slate-800 dark:text-slate-200 dir-ltr justify-end">
                                    {profileInfo.username}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                          <div className="flex flex-col gap-1">
                              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                  <Fingerprint size={12} /> {t('نقش‌های شخص (حقیقی/حقوقی)', 'Party Roles')}
                              </label>
                              <div className="min-h-[36px] p-1.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded flex flex-wrap gap-1 items-center">
                                  {profileInfo.partyRoles.length > 0 ? profileInfo.partyRoles.map((role, idx) => (
                                      <span key={idx} className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] font-bold rounded">
                                          {isRtl ? formatRoleFa(role) : role}
                                      </span>
                                  )) : <span className="text-[11px] text-slate-400 px-1">{t('ندارد', 'None')}</span>}
                              </div>
                          </div>

                          <div className="flex flex-col gap-1">
                              <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                  <Shield size={12} /> {t('دسترسی‌های سیستمی', 'System Roles')}
                              </label>
                              <div className="min-h-[36px] p-1.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded flex flex-wrap gap-1 items-center">
                                  {profileInfo.userRoles.length > 0 ? profileInfo.userRoles.map((role, idx) => (
                                      <span key={idx} className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold rounded">
                                          {role}
                                      </span>
                                  )) : <span className="text-[11px] text-slate-400 px-1">{t('ندارد', 'None')}</span>}
                              </div>
                          </div>
                        </div>
                    </div>
                )}

                {activeTab === 'preferences' && (
                    <div className="flex flex-col gap-3">
                        <Alert type="info" message={t('تنظیمات پایه‌ای مختص به حساب کاربری شما', 'Basic settings applied to your account.')} className="mb-1 py-2 px-3 text-[11px]" />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <SelectField 
                                size="sm" 
                                label={t('تم رنگی سیستم', 'System Theme')}
                                value={preferences.theme} 
                                onChange={e => setPreferences({...preferences, theme: e.target.value})} 
                                options={[ {value: 'light', label: t('روشن', 'Light')}, {value: 'dark', label: t('تاریک', 'Dark')}, {value: 'system', label: t('خودکار', 'System Default')} ]}
                                isRtl={isRtl} 
                            />
                            <SelectField 
                                size="sm" 
                                label={t('زبان پیش‌فرض', 'Default Language')}
                                value={preferences.language} 
                                onChange={e => setPreferences({...preferences, language: e.target.value})} 
                                options={[ {value: 'fa', label: 'فارسی'}, {value: 'en', label: 'English'} ]}
                                isRtl={isRtl} 
                            />
                            <SelectField 
                                size="sm" 
                                label={t('تقویم پیش‌فرض', 'Default Calendar')}
                                value={preferences.calendarType} 
                                onChange={e => setPreferences({...preferences, calendarType: e.target.value})} 
                                options={[ {value: 'jalali', label: t('شمسی', 'Jalali')}, {value: 'gregorian', label: t('میلادی', 'Gregorian')} ]}
                                isRtl={isRtl} 
                            />
                        </div>
                    </div>
                )}

                {activeTab === 'financial' && (
                    <div className="flex flex-col gap-3">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <SelectField 
                                size="sm" 
                                label={t('نوع هزینه پیش‌فرض', 'Default Cost Type')}
                                value={preferences.defaultCostTypeId} 
                                onChange={e => setPreferences({...preferences, defaultCostTypeId: e.target.value})} 
                                options={[{value: '', label: t('---', '---')}, ...costTypes]}
                                isRtl={isRtl} 
                            />
                        </div>
                    </div>
                )}

                {activeTab === 'security' && (
                    <form autoComplete="off" onSubmit={e => e.preventDefault()} className="flex flex-col gap-3 max-w-sm">
                        <input type="text" name="hidden_username" autoComplete="off" style={{ display: 'none' }} />
                        <input type="password" name="hidden_password" autoComplete="new-password" style={{ display: 'none' }} />
                        
                        <div className="bg-blue-50/80 border border-blue-100 p-3 rounded-xl mb-2 shadow-sm">
                          <p className="text-[11px] font-medium text-blue-700 leading-relaxed text-justify">
                             {t('راهنما: رمز عبور باید بین ۸ تا ۱۴ کاراکتر باشد و شامل حداقل یک حرف بزرگ، یک حرف کوچک، یک عدد و یک علامت باشد.', 'Hint: Password must be 8-14 chars, including uppercase, lowercase, number, and symbol.')}
                          </p>
                        </div>

                        <TextField 
                            size="sm" type="password"
                            label={t('رمز عبور فعلی', 'Current Password')} 
                            value={passwords.current} 
                            onChange={e => setPasswords({...passwords, current: e.target.value})} 
                            isRtl={isRtl} dir="ltr"
                            autoComplete="new-password"
                        />
                        <TextField 
                            size="sm" type="password"
                            label={t('رمز عبور جدید', 'New Password')} 
                            value={passwords.new} 
                            onChange={e => setPasswords({...passwords, new: e.target.value})} 
                            isRtl={isRtl} dir="ltr"
                            autoComplete="new-password"
                        />
                        <TextField 
                            size="sm" type="password"
                            label={t('تکرار رمز جدید', 'Confirm Password')} 
                            value={passwords.confirm} 
                            onChange={e => setPasswords({...passwords, confirm: e.target.value})} 
                            isRtl={isRtl} dir="ltr"
                            autoComplete="new-password"
                        />
                    </form>
                )}

            </div>

            <div className="p-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-end items-center shrink-0 rounded-b-xl gap-2 h-12">
                {activeTab === 'personal' && (
                    <span className="text-[11px] text-slate-500 font-bold ml-auto">{t('اطلاعات شخصی فقط جهت نمایش است.', 'Personal info is read-only.')}</span>
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

        <Toast isVisible={toast.isVisible} message={toast.message} type={toast.type} onClose={() => setToast(prev => ({ ...prev, isVisible: false }))} />
      </div>
    );
  };

  window.UserProfile = UserProfile;
})();