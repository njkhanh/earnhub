import { useState } from 'react';
import { UserAccount } from '../types';
import { 
  Layers, 
  RefreshCw, 
  Key, 
  ChevronDown, 
  Check, 
  Plus
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface NavbarProps {
  accounts: UserAccount[];
  activeAccount: UserAccount | undefined;
  onSelectAccount: (accountId: string) => void;
  onOpenAccountsModal: () => void;
  onRefreshData: () => void;
  isRefreshing: boolean;
  balanceStr: string | null;
  lastUpdatedStr: string | null;
  onNavigateHome?: () => void;
}

export function Navbar({
  accounts,
  activeAccount,
  onSelectAccount,
  onOpenAccountsModal,
  onRefreshData,
  isRefreshing,
  balanceStr,
  lastUpdatedStr,
  onNavigateHome,
}: NavbarProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { language, setLanguage, t } = useLanguage();

  // Reusable Language Switcher Pill
  const renderLanguageSwitcher = () => (
    <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs font-medium shrink-0">
      <button
        type="button"
        onClick={() => setLanguage('en')}
        className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md transition-all flex items-center gap-1 text-[11px] ${
          language === 'en'
            ? 'bg-emerald-600 text-white font-bold shadow-sm'
            : 'text-slate-400 hover:text-slate-200'
        }`}
        title="Switch to English (Default)"
      >
        <span>🇺🇸</span>
        <span>EN</span>
      </button>
      <button
        type="button"
        onClick={() => setLanguage('vi')}
        className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md transition-all flex items-center gap-1 text-[11px] ${
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
  );

  // Reusable Compact 1-line Balance
  const renderBalance = () => (
    <div className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1 sm:py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono shrink-0 shadow-sm">
      <span className="text-slate-400 font-sans text-[11px] sm:text-xs">
        {t('navbar.balance')}:
      </span>
      <span className="font-bold text-emerald-400 text-xs">
        {balanceStr || '$0.00'}
      </span>
    </div>
  );

  // Reusable Account Selector Dropdown Menu
  const renderAccountDropdownMenu = () => {
    if (!isDropdownOpen) return null;
    return (
      <>
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsDropdownOpen(false)}
        />
        <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1.5 z-50">
          <div className="px-3 py-1.5 border-b border-slate-800/80 text-[11px] font-medium text-slate-400 flex items-center justify-between">
            <span>{t('navbar.accountList')} ({accounts.length})</span>
            <span className="text-[10px] text-slate-500 font-mono">Proxyrack API</span>
          </div>

          <div className="max-h-60 overflow-y-auto py-1">
            {accounts.map((acc) => (
              <button
                key={acc.id}
                type="button"
                onClick={() => {
                  onSelectAccount(acc.id);
                  setIsDropdownOpen(false);
                }}
                className={`w-full px-3 py-2 text-left flex items-start justify-between gap-2 hover:bg-slate-800/70 transition-colors ${
                  acc.id === activeAccount?.id ? 'bg-slate-800/50 text-white' : 'text-slate-300'
                }`}
              >
                <div className="truncate">
                  <div className="text-xs font-medium truncate">{acc.name}</div>
                  <div className="text-[10px] font-mono text-slate-500 truncate">
                    {acc.apiKey.slice(0, 8)}...{acc.apiKey.slice(-4)}
                  </div>
                </div>
                {acc.id === activeAccount?.id && (
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                )}
              </button>
            ))}
          </div>

          <div className="p-2 border-t border-slate-800/80 bg-slate-950/40">
            <button
              type="button"
              onClick={() => {
                setIsDropdownOpen(false);
                onOpenAccountsModal();
              }}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs text-emerald-400 bg-emerald-950/40 hover:bg-emerald-900/40 border border-emerald-800/40 rounded-lg transition-colors font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('navbar.manageKeys')}</span>
            </button>
          </div>
        </div>
      </>
    );
  };

  return (
    <header className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        
        {/* ======================================================== */}
        {/* DESKTOP VIEW (Single Row: Logo, Live Tag, Subtitle -> Language, Balance, Account, Refresh) */}
        {/* ======================================================== */}
        <div className="hidden md:flex items-center justify-between gap-4 h-16">
          {/* Brand & Subtitle */}
          <a
            href="/dashboard"
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
                return;
              }
              e.preventDefault();
              onNavigateHome?.();
            }}
            className="flex items-center gap-3 shrink-0 hover:opacity-90 transition-opacity"
            title="EarnHub Dashboard"
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-white">EarnHub</span>
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-1.5 py-0.2 rounded">
                  {t('navbar.proxyrackLive')}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 hidden lg:block">
                {t('navbar.brandSubtitle')}
              </div>
            </div>
          </a>

          {/* Right Controls: Language Switcher, Balance, Account Selector, Refresh */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Language Switcher */}
            {renderLanguageSwitcher()}

            {/* Compact 1-line Balance */}
            {renderBalance()}

            {/* Account Selector Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 transition-colors"
              >
                <Key className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <div className="text-left max-w-[140px] truncate">
                  <div className="font-medium truncate text-xs">
                    {activeAccount ? activeAccount.name : t('navbar.selectAccount')}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>
              {renderAccountDropdownMenu()}
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={onRefreshData}
              disabled={isRefreshing}
              title={lastUpdatedStr ? `${t('navbar.lastUpdated')}: ${lastUpdatedStr}` : t('navbar.refresh')}
              className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 rounded-lg transition-colors disabled:opacity-50 shrink-0"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* MOBILE VIEW (2 Rows exactly as requested)                */}
        {/* Hàng 1: Logo (không Proxyrack Live), Ngôn ngữ, Số dư     */}
        {/* Hàng 2: Phần còn lại (Chọn tài khoản & Nút Làm mới)      */}
        {/* ======================================================== */}
        <div className="flex md:hidden flex-col gap-2 py-2.5">
          {/* HÀNG 1: Logo | Ngôn ngữ | Số dư */}
          <div className="flex items-center justify-between gap-2">
            {/* Logo (chỉ icon + EarnHub, bỏ text Proxyrack Live) */}
            <a
              href="/dashboard"
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
                  return;
                }
                e.preventDefault();
                onNavigateHome?.();
              }}
              className="flex items-center gap-2 shrink-0 hover:opacity-90 transition-opacity"
              title="EarnHub Dashboard"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Layers className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-sm tracking-tight text-white">EarnHub</span>
            </a>

            {/* Right of Row 1: Ngôn ngữ & Số dư */}
            <div className="flex items-center gap-1.5 shrink-0">
              {renderLanguageSwitcher()}
              {renderBalance()}
            </div>
          </div>

          {/* HÀNG 2: Phần còn lại (Chọn tài khoản & Nút làm mới) */}
          <div className="flex items-center gap-2 pt-0.5">
            {/* Account Selector (Chiếm toàn bộ không gian còn lại flex-1) */}
            <div className="relative flex-1">
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-700 rounded-lg text-xs text-slate-200 transition-colors shadow-sm"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Key className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="font-medium truncate text-xs">
                    {activeAccount ? activeAccount.name : t('navbar.selectAccount')}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>
              {renderAccountDropdownMenu()}
            </div>

            {/* Nút Làm mới dữ liệu */}
            <button
              type="button"
              onClick={onRefreshData}
              disabled={isRefreshing}
              title={lastUpdatedStr ? `${t('navbar.lastUpdated')}: ${lastUpdatedStr}` : t('navbar.refresh')}
              className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 rounded-lg transition-colors disabled:opacity-50 shrink-0 shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
          </div>
        </div>

      </div>
    </header>
  );
}
