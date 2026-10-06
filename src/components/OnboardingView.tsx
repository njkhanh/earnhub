import { useState } from 'react';
import { 
  Key, 
  ShieldCheck, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  ExternalLink, 
  Sparkles, 
  Cpu, 
  Eye, 
  EyeOff, 
  Loader2,
  Lock,
  Gift
} from 'lucide-react';
import { proxyrackApi } from '../services/proxyrackApi';
import { UserAccount } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface OnboardingViewProps {
  onAccountCreated: (account: UserAccount) => void;
}

export function OnboardingView({ onAccountCreated }: OnboardingViewProps) {
  const { language, setLanguage, t } = useLanguage();
  const [accountName, setAccountName] = useState(
    language === 'vi' ? 'Proxyrack - Tài khoản Chính' : 'Proxyrack - Main Account'
  );
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [verifiedBalance, setVerifiedBalance] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = apiKey.trim();
    if (!cleanKey) {
      setErrorMsg(language === 'vi' ? 'Vui lòng nhập Proxyrack API Key để tiếp tục.' : 'Please enter Proxyrack API Key to continue.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setVerifiedBalance(null);

    try {
      // Live verify key with Proxyrack Balance API
      const res = await proxyrackApi.getBalance(cleanKey);
      if (res.status === 'success' && res.data) {
        setVerifiedBalance(res.data.balance || '$0.00');

        const newAccount: UserAccount = {
          id: `acc_${Date.now()}`,
          name: accountName.trim() || (language === 'vi' ? 'Proxyrack - Tài khoản Chính' : 'Proxyrack - Main Account'),
          earnAppId: 'proxyrack',
          apiKey: cleanKey,
          notes: language === 'vi' ? 'Tài khoản kết nối ban đầu' : 'Initial connected account',
          createdAt: new Date().toISOString(),
          isDefault: true,
          lastTestedAt: new Date().toISOString(),
          testStatus: 'valid',
          cachedBalance: res.data.balance || '$0.00',
        };

        setTimeout(() => {
          onAccountCreated(newAccount);
        }, 800);
      } else {
        throw new Error(res.error || (language === 'vi' ? 'API Key không hợp lệ. Vui lòng kiểm tra lại trên trang Proxyrack.' : 'Invalid API Key. Please verify on Proxyrack dashboard.'));
      }
    } catch (err: any) {
      setErrorMsg(err.message || (language === 'vi' ? 'Không thể xác thực API Key với Proxyrack. Vui lòng kiểm tra lại kết nối mạng hoặc tính chính xác của Key.' : 'Could not authenticate API Key with Proxyrack. Please check network connection or Key accuracy.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 selection:bg-emerald-500/30 selection:text-emerald-300 relative overflow-hidden">
      {/* Top Language Switcher */}
      <div className="absolute top-4 right-4 z-20 flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs font-medium shadow-md">
        <button
          type="button"
          onClick={() => setLanguage('en')}
          className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 text-xs ${
            language === 'en'
              ? 'bg-emerald-600 text-white font-bold shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Switch to English"
        >
          <span>🇺🇸</span>
          <span>EN</span>
        </button>
        <button
          type="button"
          onClick={() => setLanguage('vi')}
          className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 text-xs ${
            language === 'vi'
              ? 'bg-emerald-600 text-white font-bold shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Chuyển sang Tiếng Việt"
        >
          <span>🇻🇳</span>
          <span>VI</span>
        </button>
      </div>

      {/* Background ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg relative z-10 space-y-6 animate-fade-in">
        {/* Logo and Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-xl shadow-emerald-500/20 mb-1 border border-emerald-400/30">
            <Cpu className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
              EarnHub Manager
            </h1>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              {t('onboarding.subtitle')}
            </p>
          </div>
        </div>

        {/* Main Setup Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <h2 className="text-sm font-bold text-white tracking-wide uppercase">
                {t('onboarding.reqTitle')}
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {t('onboarding.reqDesc')}
            </p>
          </div>

          {/* Guide for Users who don't have an API Key or Account yet */}
          <div className="bg-gradient-to-br from-amber-950/60 via-slate-950 to-emerald-950/60 border border-amber-500/40 rounded-xl p-4 space-y-3 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wide">
                  {t('onboarding.guideTitle')}
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full">
                {t('onboarding.partnerBonus')}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              {t('onboarding.guideDesc')}
            </p>

            <a
              href="https://peer.proxyrack.com/ref/52q2pwpn7cvfthv8qbt0goiahml1xrew7uhiuz1l"
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-amber-500 hover:to-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-[0.99]"
            >
              <Gift className="w-4 h-4" />
              <span>{t('onboarding.guideBtn')}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/80">
              <span>{t('onboarding.guideNote')}</span>
              <span className="text-emerald-400 font-medium">{t('onboarding.free')}</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Account Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-200">
                {t('onboarding.accNameLabel')}
              </label>
              <input
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder={t('onboarding.accNamePlaceholder')}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            {/* API Key */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-200 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{t('onboarding.apiKeyLabel')} <span className="text-rose-400">*</span></span>
                </label>
                <a
                  href="https://peer.proxyrack.com/ref/52q2pwpn7cvfthv8qbt0goiahml1xrew7uhiuz1l"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-amber-300 hover:text-amber-200 flex items-center gap-1 transition-colors font-semibold"
                  title="Proxyrack partner link"
                >
                  <span>{t('onboarding.noKeyPrompt')}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  required
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={t('onboarding.apiKeyPlaceholder')}
                  className="w-full pl-3.5 pr-10 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error Feedback */}
            {errorMsg && (
              <div className="p-3 bg-rose-950/50 border border-rose-800/80 rounded-xl flex items-start gap-2 text-xs text-rose-300 animate-shake">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Success Feedback */}
            {verifiedBalance && (
              <div className="p-3 bg-emerald-950/50 border border-emerald-800/80 rounded-xl flex items-center gap-2 text-xs text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  {language === 'vi' ? (
                    <>Xác thực thành công! Số dư hiện tại: <strong className="text-white font-mono">{verifiedBalance}</strong>. Đang tải Dashboard...</>
                  ) : (
                    <>Authenticated successfully! Current balance: <strong className="text-white font-mono">{verifiedBalance}</strong>. Loading Dashboard...</>
                  )}
                </span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !apiKey.trim()}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{language === 'vi' ? 'Đang kiểm tra API Key với máy chủ...' : 'Validating API Key with Proxyrack...'}</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>{language === 'vi' ? 'Xác thực & Kết nối vào Dashboard' : 'Authenticate & Unlock Dashboard'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Privacy Note */}
          <div className="flex items-center gap-2 text-[11px] text-slate-500 border-t border-slate-800 pt-3">
            <Lock className="w-3.5 h-3.5 shrink-0 text-slate-400" />
            <span>
              {language === 'vi'
                ? 'API Key được lưu trữ cục bộ an toàn trong trình duyệt của bạn (Local Storage) và chỉ dùng để gửi yêu cầu đến Proxyrack API.'
                : 'Your API Key is safely stored in your local browser storage and used solely to communicate directly with Proxyrack API.'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
