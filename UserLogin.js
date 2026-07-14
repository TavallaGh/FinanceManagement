/* Filename: UserLogin.js */
(() => {
  const React = window.React;
  const { useState } = React;
  
  const FallbackIcon = (props) => <span {...props} style={{ display: 'inline-block', width: props.size || 16, height: props.size || 16 }} />;
  const LucideIcons = window.LucideIcons || {};
  const { 
    User = FallbackIcon, Lock = FallbackIcon, Mail = FallbackIcon, Smartphone = FallbackIcon, 
    ArrowRight = FallbackIcon, ArrowLeft = FallbackIcon, KeyRound = FallbackIcon, Building2 = FallbackIcon, 
    CheckCircle2 = FallbackIcon, ShieldCheck = FallbackIcon, Globe = FallbackIcon, Loader2 = FallbackIcon,
    HelpCircle = FallbackIcon, FileText = FallbackIcon
  } = LucideIcons;

  const UserLogin = ({ 
    t = {}, isRtl = true, authView, setAuthView, 
    loginMethod, setLoginMethod, 
    loginData, setLoginData, 
    error, handleLogin, toggleLanguage 
  }) => {
    const [resetData, setResetData] = useState({ identifier: '', otp: '', newPassword: '', confirmPassword: '' });
    const [isLoading, setIsLoading] = useState(false);
    const [toastState, setToastState] = useState({ isVisible: false, message: '', type: 'success' });
    const [docModalInfo, setDocModalInfo] = useState({ isOpen: false, type: 'user' });
    
    const { Toast } = window.DSFeedback || {};
    const NavigationDocsComponent = window.NavigationDocs;
    
    const showToast = (message, type = 'success') => {
      setToastState({ isVisible: true, message, type });
      setTimeout(() => setToastState(prev => ({ ...prev, isVisible: false })), 4000);
    };

    const showSuccess = (msg) => showToast(msg, 'success');
    const showError = (msg) => showToast(msg, 'error');

    const handleResetNext = (e, nextView) => {
      e.preventDefault();
      setAuthView(nextView);
    };

    const hashPassword = async (pass) => {
      const msgBuffer = new TextEncoder().encode(pass);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    };

    const handleResetPasswordSubmit = async (e) => {
      e.preventDefault();
      if(resetData.newPassword !== resetData.confirmPassword) {
         showError(isRtl ? 'کلمات عبور مطابقت ندارند.' : 'Passwords do not match.');
         return;
      }
      
      setIsLoading(true);
      try {
        const isReachable = await window.isSupabaseReachable?.();
        if (isReachable === false) {
          showError(isRtl ? 'اتصال به سرور دیتابیس برقرار نیست. لطفاً شبکه یا VPN را بررسی کنید.' : 'Database server is not reachable. Check your network or VPN.');
          return;
        }

        const supabase = window.supabase;
        
        const { data: userData, error: userErr } = await supabase
          .from('sec_users')
          .select('id')
          .ilike('username', resetData.identifier.trim())
          .single();
          
        if (userErr || !userData) {
           showError(isRtl ? 'نام کاربری در سیستم یافت نشد.' : 'Username not found.');
           setIsLoading(false);
           return;
        }

        const hashedPassword = await hashPassword(resetData.newPassword);
        
        const { error: resetErr } = await supabase.rpc('reset_user_password', {
           p_user_id: userData.id,
           p_new_password: hashedPassword
        });
        
        if (resetErr) {
           showError(isRtl ? 'خطا در تغییر رمز عبور. با مدیر سیستم تماس بگیرید.' : 'Error resetting password.');
        } else {
           showSuccess(isRtl ? 'کلمه عبور با موفقیت تغییر کرد. اکنون می‌توانید وارد شوید.' : 'Password changed successfully. Please login.');
           setAuthView('login');
           setResetData({ identifier: '', otp: '', newPassword: '', confirmPassword: '' });
        }
      } catch(err) {
         console.error(err);
         showError(isRtl ? 'خطای ارتباط با سرور' : 'Server error');
      } finally {
         setIsLoading(false);
      }
    };

    const getHeaderTitle = () => {
      switch (authView) {
        case 'login': return t.loginTitle || (isRtl ? 'ورود به سیستم' : 'System Login');
        case 'forgot-choice': return t.recoveryMethod || (isRtl ? 'روش بازیابی' : 'Recovery Method');
        case 'forgot-identify': return t.forgotPassword || (isRtl ? 'فراموشی کلمه عبور' : 'Forgot Password');
        case 'otp': return t.enterOtp || (isRtl ? 'تایید کد' : 'Verify OTP');
        case 'email-sent': return t.emailSent || (isRtl ? 'ایمیل ارسال شد' : 'Email Sent');
        case 'reset': return t.resetPassword || (isRtl ? 'تغییر کلمه عبور' : 'Reset Password');
        default: return t.loginTitle || (isRtl ? 'ورود به سیستم' : 'System Login');
      }
    };

    return (
      <div className={`min-h-screen w-full flex items-center justify-center bg-slate-100 relative overflow-hidden font-sans`} dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-200 rounded-full mix-blend-multiply filter blur-[100px] opacity-70"></div>
          <div className="absolute top-[20%] right-[-5%] w-[30%] h-[30%] bg-blue-200 rounded-full mix-blend-multiply filter blur-[80px] opacity-60"></div>
          <div className="absolute bottom-[-10%] left-[20%] w-[50%] h-[50%] bg-purple-200 rounded-full mix-blend-multiply filter blur-[120px] opacity-60"></div>
        </div>

        <div className={`absolute top-6 ${isRtl ? 'left-6' : 'right-6'} z-20 flex items-center gap-2`}>
          <button 
            onClick={() => setDocModalInfo({ isOpen: true, type: 'user' })} 
            className="flex items-center justify-center bg-white/60 backdrop-blur-md border border-white/50 w-9 h-9 rounded-full shadow-sm text-indigo-600 hover:bg-white transition-all" 
            title={isRtl ? 'راهنمای کاربری' : 'User Guide'}
          >
            <HelpCircle size={16} />
          </button>
          <button 
            onClick={() => setDocModalInfo({ isOpen: true, type: 'dev' })} 
            className="flex items-center justify-center bg-white/60 backdrop-blur-md border border-white/50 w-9 h-9 rounded-full shadow-sm text-amber-500 hover:bg-white transition-all" 
            title={isRtl ? 'مستندات توسعه' : 'Developer Docs'}
          >
            <FileText size={16} />
          </button>
          <div className="w-px h-5 bg-slate-300 mx-1"></div>
          <button 
            onClick={toggleLanguage}
            className="flex items-center gap-2 bg-white/60 backdrop-blur-md border border-white/50 px-4 py-2 rounded-full shadow-sm text-[12px] font-bold text-slate-700 hover:bg-white transition-all"
          >
            <Globe size={16} />
            {isRtl ? 'English' : 'فارسی'}
          </button>
        </div>

        <div className="w-full max-w-md relative z-10 mx-4">
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-8 sm:p-10 overflow-hidden relative">
            
            {isLoading && (
              <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-50 flex items-center justify-center rounded-3xl">
                 <Loader2 className="animate-spin text-indigo-600" size={40} />
              </div>
            )}

            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-500 shadow-lg shadow-indigo-200 mb-4">
                <ShieldCheck size={32} className="text-white" strokeWidth={1.5} />
              </div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">{getHeaderTitle()}</h1>
              <p className="text-[12px] text-slate-500 mt-2 font-medium">
                {t.loginSubtitle || (isRtl ? 'سیستم یکپارچه مدیریت مالی' : 'Financial Management Enterprise System')}
              </p>
            </div>

            {error && authView === 'login' && (
              <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-xl text-center shadow-sm">
                <span className="text-[12px] font-bold text-red-600">{error}</span>
              </div>
            )}

            {authView === 'login' && (
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="flex p-1 bg-slate-200/50 rounded-xl mb-6">
                  <button
                    type="button"
                    onClick={() => setLoginMethod('standard')}
                    className={`flex-1 py-2 text-[12px] font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                      loginMethod === 'standard' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <User size={16} />
                    {t.standardLogin || (isRtl ? 'ورود استاندارد' : 'Standard')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoginMethod('ad')}
                    className={`flex-1 py-2 text-[12px] font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                      loginMethod === 'ad' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Building2 size={16} />
                    {t.adLogin || (isRtl ? 'اکتیو دایرکتوری' : 'Active Directory')}
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[12px] font-bold text-slate-700 mb-1.5 ml-1">
                      {loginMethod === 'ad' ? (t.domainUser || (isRtl ? 'نام کاربری دامین' : 'Domain Username')) : (t.username || (isRtl ? 'نام کاربری' : 'Username'))}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={loginData.identifier}
                        onChange={(e) => setLoginData({ ...loginData, identifier: e.target.value })}
                        className={`w-full h-11 bg-white/80 border border-slate-200 rounded-xl text-[13px] font-bold outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all dir-ltr ${isRtl ? 'pr-10 pl-3' : 'pl-10 pr-3'}`}
                        placeholder={loginMethod === 'ad' ? "DOMAIN\\username" : "admin"}
                      />
                      <User size={18} className={`absolute top-3.5 ${isRtl ? 'right-3.5' : 'left-3.5'} text-slate-400`} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[12px] font-bold text-slate-700 mb-1.5 ml-1">
                      {t.password || (isRtl ? 'کلمه عبور' : 'Password')}
                    </label>
                    
                    <div className="relative">
                      <input
                        type="password"
                        required
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        className={`w-full h-11 bg-white/80 border border-slate-200 rounded-xl text-[13px] font-bold outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all dir-ltr ${isRtl ? 'pr-10 pl-3' : 'pl-10 pr-3'}`}
                        placeholder="••••••••"
                      />
                      <Lock size={18} className={`absolute top-3.5 ${isRtl ? 'right-3.5' : 'left-3.5'} text-slate-400`} />
                    </div>

                    <div className="flex justify-end mt-2 px-1">
                      <button 
                        type="button" 
                        onClick={() => setAuthView('forgot-identify')}
                        className="text-[12px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                      >
                        {t.forgotPasswordLink || (isRtl ? 'رمز عبور را فراموش کرده‌اید؟' : 'Forgot password?')}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full h-12 mt-6 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl font-bold text-[13px] shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                >
                  {t.loginBtn || (isRtl ? 'ورود به سیستم' : 'Sign In')}
                  {isRtl ? <ArrowLeft size={16} /> : <ArrowRight size={16} />}
                </button>
              </form>
            )}

            {authView === 'forgot-identify' && (
              <form onSubmit={(e) => handleResetNext(e, 'forgot-choice')} className="space-y-5 animate-in fade-in slide-in-from-right-4">
                <p className="text-[12px] font-medium text-slate-600 text-center mb-6 leading-relaxed">
                  {t.forgotDesc || (isRtl ? 'برای بازیابی کلمه عبور، لطفا نام کاربری یا ایمیل خود را وارد کنید.' : 'Enter your username or email to recover your password.')}
                </p>
                <div>
                  <label className="block text-[12px] font-bold text-slate-700 mb-1.5 ml-1">
                    {t.usernameOrEmail || (isRtl ? 'نام کاربری سیستم' : 'System Username')}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={resetData.identifier}
                      onChange={(e) => setResetData({ ...resetData, identifier: e.target.value })}
                      className={`w-full h-11 bg-white/80 border border-slate-200 rounded-xl text-[13px] font-bold outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all dir-ltr ${isRtl ? 'pr-10 pl-3' : 'pl-10 pr-3'}`}
                      placeholder="admin"
                    />
                    <User size={18} className={`absolute top-3.5 ${isRtl ? 'right-3.5' : 'left-3.5'} text-slate-400`} />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setAuthView('login')} className="flex-1 h-11 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-[12px] transition-all">
                    {t.cancel || (isRtl ? 'انصراف' : 'Cancel')}
                  </button>
                  <button type="submit" className="flex-1 h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-[12px] shadow-md transition-all">
                    {t.next || (isRtl ? 'مرحله بعد' : 'Next')}
                  </button>
                </div>
              </form>
            )}

            {authView === 'forgot-choice' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                <p className="text-[12px] font-medium text-slate-600 text-center mb-6">
                  {t.chooseRecovery || (isRtl ? 'کد تایید به کدام روش برای شما ارسال شود؟' : 'How would you like to receive the code?')}
                </p>
                
                <button onClick={(e) => handleResetNext(e, 'email-sent')} className="w-full p-4 border border-slate-200 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 transition-all flex items-center gap-4 group bg-white/50">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Mail size={20} />
                  </div>
                  <div className="text-start flex-1">
                    <div className="font-bold text-slate-800 text-[13px]">{t.sendEmail || (isRtl ? 'ارسال ایمیل' : 'Send Email')}</div>
                    <div className="text-[12px] text-slate-500 mt-0.5 dir-ltr w-full text-start">***@domain.com</div>
                  </div>
                </button>

                <button onClick={(e) => handleResetNext(e, 'otp')} className="w-full p-4 border border-slate-200 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 transition-all flex items-center gap-4 group bg-white/50">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Smartphone size={20} />
                  </div>
                  <div className="text-start flex-1">
                    <div className="font-bold text-slate-800 text-[13px]">{t.sendSms || (isRtl ? 'ارسال پیامک' : 'Send SMS')}</div>
                    <div className="text-[12px] text-slate-500 mt-0.5 dir-ltr w-full text-start">0912 *** **89</div>
                  </div>
                </button>

                <button type="button" onClick={() => setAuthView('forgot-identify')} className="w-full h-11 mt-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-[12px] transition-all">
                  {t.back || (isRtl ? 'بازگشت' : 'Back')}
                </button>
              </div>
            )}

            {authView === 'email-sent' && (
              <div className="space-y-6 text-center animate-in fade-in zoom-in-95">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-500 mb-2 shadow-inner">
                  <CheckCircle2 size={40} />
                </div>
                <div>
                  <h3 className="font-black text-[14px] text-slate-800 mb-2">
                    {t.checkEmail || (isRtl ? 'ایمیل خود را بررسی کنید' : 'Check your email')}
                  </h3>
                  <p className="text-[12px] text-slate-600 leading-relaxed font-medium">
                    {t.emailSentDesc || (isRtl ? 'لینک بازیابی کلمه عبور به ایمیل شما ارسال شد. لطفا پوشه Spam را نیز بررسی کنید.' : 'Recovery link sent to your email. Please check your spam folder as well.')}
                  </p>
                </div>
                <button onClick={() => setAuthView('login')} className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-[12px] shadow-md transition-all">
                  {t.backToLogin || (isRtl ? 'بازگشت به صفحه ورود' : 'Back to Login')}
                </button>
              </div>
            )}

            {authView === 'otp' && (
              <form onSubmit={(e) => handleResetNext(e, 'reset')} className="space-y-5 animate-in fade-in slide-in-from-right-4">
                <p className="text-[12px] font-medium text-slate-600 text-center mb-6">
                  {t.enterOtpDesc || (isRtl ? 'کد 5 رقمی پیامک شده را وارد کنید (شبیه‌سازی: هر کدی قابل قبول است)' : 'Enter the 5-digit code sent to you (Simulation: any code works)')}
                </p>
                <div>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      maxLength={5}
                      value={resetData.otp}
                      onChange={(e) => setResetData({ ...resetData, otp: e.target.value.replace(/\D/g, '') })}
                      className="w-full h-14 bg-white/80 border border-slate-200 rounded-xl text-center text-2xl tracking-[0.5em] font-bold outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all dir-ltr"
                      placeholder="•••••"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setAuthView('forgot-choice')} className="flex-1 h-11 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-[12px] transition-all">
                    {t.back || (isRtl ? 'بازگشت' : 'Back')}
                  </button>
                  <button type="submit" disabled={resetData.otp.length < 5} className="flex-1 h-11 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white rounded-xl font-bold text-[12px] shadow-md transition-all">
                    {t.verify || (isRtl ? 'تایید' : 'Verify')}
                  </button>
                </div>
              </form>
            )}

            {authView === 'reset' && (
              <form onSubmit={handleResetPasswordSubmit} className="space-y-4 animate-in fade-in slide-in-from-right-4">
                
                <div className="bg-blue-50/80 border border-blue-100 p-3 rounded-xl mb-4 shadow-sm">
                  <p className="text-[12px] font-medium text-blue-700 leading-relaxed text-justify">
                     {isRtl ? 'راهنما: رمز عبور باید بین 8 تا 14 کاراکتر باشد و شامل حداقل یک حرف بزرگ، یک حرف کوچک، یک عدد و یک علامت (مانند @, #, $) باشد.' : 'Hint: Password must be 8-14 chars, including uppercase, lowercase, number, and symbol.'}
                  </p>
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-slate-700 mb-1.5 ml-1">
                    {t.newPassword || (isRtl ? 'کلمه عبور جدید' : 'New Password')}
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      value={resetData.newPassword}
                      onChange={(e) => setResetData({ ...resetData, newPassword: e.target.value })}
                      className={`w-full h-11 bg-white/80 border border-slate-200 rounded-xl text-[13px] font-bold outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all dir-ltr ${isRtl ? 'pr-10 pl-3' : 'pl-10 pr-3'}`}
                    />
                    <KeyRound size={18} className={`absolute top-3.5 ${isRtl ? 'right-3.5' : 'left-3.5'} text-slate-400`} />
                  </div>
                </div>
                <div>
                  <label className="block text-[12px] font-bold text-slate-700 mb-1.5 ml-1">
                    {t.confirmNewPassword || (isRtl ? 'تکرار کلمه عبور جدید' : 'Confirm New Password')}
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      required
                      value={resetData.confirmPassword}
                      onChange={(e) => setResetData({ ...resetData, confirmPassword: e.target.value })}
                      className={`w-full h-11 bg-white/80 border border-slate-200 rounded-xl text-[13px] font-bold outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all dir-ltr ${isRtl ? 'pr-10 pl-3' : 'pl-10 pr-3'}`}
                    />
                    <Lock size={18} className={`absolute top-3.5 ${isRtl ? 'right-3.5' : 'left-3.5'} text-slate-400`} />
                  </div>
                </div>
                <div className="flex gap-3 pt-2 mt-4">
                  <button type="button" onClick={() => {setAuthView('login'); setResetData({ identifier: '', otp: '', newPassword: '', confirmPassword: '' });}} className="flex-1 h-11 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-[12px] transition-all">
                    {t.cancel || (isRtl ? 'انصراف' : 'Cancel')}
                  </button>
                  <button type="submit" className="flex-1 h-11 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl font-bold text-[12px] shadow-lg shadow-indigo-200 transition-all flex items-center justify-center">
                    {t.savePassword || (isRtl ? 'ذخیره' : 'Save')}
                  </button>
                </div>
              </form>
            )}

          </div>

          <div className="text-center mt-6 text-[12px] text-slate-400 font-medium">
            {isRtl ? 'تمامی حقوق برای شرکت توسعه نرم‌افزار محفوظ است. © 2026' : 'All rights reserved © 2026'}
          </div>
        </div>

        {Toast && <Toast isVisible={toastState.isVisible} message={toastState.message} type={toastState.type} onClose={() => setToastState(prev => ({ ...prev, isVisible: false }))} />}
        
        {NavigationDocsComponent && (
          <NavigationDocsComponent
            isOpen={docModalInfo.isOpen}
            onClose={() => setDocModalInfo({ ...docModalInfo, isOpen: false })}
            pageKey="login_page"
            pageName={isRtl ? 'صفحه ورود به سیستم' : 'Login Page'}
            docType={docModalInfo.type}
            isAdmin={true}
            language={isRtl ? 'fa' : 'en'}
          />
        )}
      </div>
    );
  };

  window.UserLogin = UserLogin;
})();