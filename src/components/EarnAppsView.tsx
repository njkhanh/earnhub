import { useState } from 'react';
import { 
  Layers, 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  ShieldCheck, 
  Key, 
  ArrowRight, 
  TrendingUp, 
  Server,
  Gift,
  Sparkles,
  Copy,
  Check,
  Flame,
  Coins,
  Award,
  Share2,
  Laptop,
  Smartphone,
  Globe,
  Filter,
  Zap
} from 'lucide-react';
import { SUPPORTED_EARN_APPS } from '../services/storage';
import { EarnAppId, EarnAppInfo } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface EarnAppsViewProps {
  onSelectApp: (appId: EarnAppId) => void;
  activeAppId: EarnAppId;
}

type FilterCategory = 'all' | 'bonus' | 'depin' | 'api';

const APP_THEME_COLORS: Record<EarnAppId, {
  border: string;
  badgeBg: string;
  badgeText: string;
  btnBg: string;
  accent: string;
  iconBg: string;
}> = {
  proxyrack: {
    border: 'border-emerald-500/40 hover:border-emerald-500/80',
    badgeBg: 'bg-emerald-950/80 border-emerald-800',
    badgeText: 'text-emerald-400',
    btnBg: 'bg-emerald-600 hover:bg-emerald-500',
    accent: '#10b981',
    iconBg: 'bg-emerald-950 text-emerald-400 border border-emerald-800/80',
  },
  earnapp: {
    border: 'border-cyan-500/40 hover:border-cyan-500/80',
    badgeBg: 'bg-cyan-950/80 border-cyan-800',
    badgeText: 'text-cyan-400',
    btnBg: 'bg-cyan-600 hover:bg-cyan-500',
    accent: '#06b6d4',
    iconBg: 'bg-cyan-950 text-cyan-400 border border-cyan-800/80',
  },
  honeygain: {
    border: 'border-amber-500/40 hover:border-amber-500/80',
    badgeBg: 'bg-amber-950/80 border-amber-800',
    badgeText: 'text-amber-400',
    btnBg: 'bg-amber-600 hover:bg-amber-500',
    accent: '#f59e0b',
    iconBg: 'bg-amber-950 text-amber-400 border border-amber-800/80',
  },
  grass: {
    border: 'border-lime-500/40 hover:border-lime-500/80',
    badgeBg: 'bg-lime-950/80 border-lime-800',
    badgeText: 'text-lime-400',
    btnBg: 'bg-lime-600 hover:bg-lime-500',
    accent: '#84cc16',
    iconBg: 'bg-lime-950 text-lime-400 border border-lime-800/80',
  },
  pawns: {
    border: 'border-violet-500/40 hover:border-violet-500/80',
    badgeBg: 'bg-violet-950/80 border-violet-800',
    badgeText: 'text-violet-400',
    btnBg: 'bg-violet-600 hover:bg-violet-500',
    accent: '#8b5cf6',
    iconBg: 'bg-violet-950 text-violet-400 border border-violet-800/80',
  },
  packetstream: {
    border: 'border-blue-500/40 hover:border-blue-500/80',
    badgeBg: 'bg-blue-950/80 border-blue-800',
    badgeText: 'text-blue-400',
    btnBg: 'bg-blue-600 hover:bg-blue-500',
    accent: '#3b82f6',
    iconBg: 'bg-blue-950 text-blue-400 border border-blue-800/80',
  },
};

export function EarnAppsView({ onSelectApp, activeAppId }: EarnAppsViewProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('all');
  const { language, t } = useLanguage();

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const filteredApps = SUPPORTED_EARN_APPS.filter((app) => {
    if (activeFilter === 'bonus') {
      return app.bonusAmount && app.bonusAmount.includes('$');
    }
    if (activeFilter === 'depin') {
      return app.id === 'grass';
    }
    if (activeFilter === 'api') {
      return app.status === 'active';
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* HERO PROMOTIONAL BANNER */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950/90 via-slate-900 to-cyan-950/90 border border-emerald-500/30 p-6 md:p-8 shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
            <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-pulse" />
            <span>{language === 'vi' ? 'Ưu Đãi Độc Quyền Dành Cho Người Dùng EarnHub' : 'Exclusive Partner Offers for EarnHub Users'}</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight">
            {language === 'vi' ? (
              <>
                Nhận Tới <span className="text-emerald-400 font-mono">+$8.00+ USD</span> Tiền Thưởng &{' '}
                <span className="text-cyan-400 font-mono">5,000 Points</span> Khi Đăng Ký Link Đối Tác!
              </>
            ) : (
              <>
                Claim Up To <span className="text-emerald-400 font-mono">+$8.00+ USD</span> Bonus &{' '}
                <span className="text-cyan-400 font-mono">5,000 Points</span> with Partner Links!
              </>
            )}
          </h1>

          <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
            {language === 'vi' 
              ? 'Kiếm tiền thụ động hiệu quả nhất bằng cách cài đặt chạy đồng thời cả 6 ứng dụng trên cùng một đường mạng / VPS / Docker. Đăng ký qua liên kết đối tác chính thức dưới đây để nhận ngay tiền thưởng khởi đầu vào ví và giảm đáng kể thời gian đạt hạn mức rút tiền.'
              : 'Maximize passive income by running all 6 applications concurrently on the same network / VPS / Docker. Register using our official partner links below to receive instant startup bonuses and reach payout thresholds faster.'}
          </p>

          <div className="flex flex-wrap gap-4 pt-2 text-xs font-medium text-slate-300">
            <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-xl">
              <Gift className="w-4 h-4 text-emerald-400" />
              <span>{language === 'vi' ? 'Cộng tiền thưởng ngay sau khi đăng ký' : 'Instant bonus credited after registration'}</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-xl">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>{language === 'vi' ? 'Chạy song song không xung đột băng thông' : 'Run concurrently with zero traffic conflict'}</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-xl">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>{language === 'vi' ? 'Nền tảng BrightData, Wynd, Proxyrack uy tín' : 'Trusted by BrightData, Wynd, and Proxyrack'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* FILTER BUTTONS & STATS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            {language === 'vi' ? 'Phân loại App:' : 'Filter Apps:'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeFilter === 'all'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            {language === 'vi' ? 'Tất cả (6 App)' : 'All (6 Apps)'}
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('bonus')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeFilter === 'bonus'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span>{language === 'vi' ? 'Thưởng tiền USD ($8.00+)' : 'Cash Bonus ($8.00+)'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('depin')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeFilter === 'depin'
                ? 'bg-lime-600 text-white shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-lime-400" />
            <span>DePIN AI Token (Grass)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('api')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeFilter === 'api'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Server className="w-3.5 h-3.5 text-cyan-400" />
            <span>{language === 'vi' ? 'Đã tích hợp API trực tiếp' : 'Direct API Ready'}</span>
          </button>
        </div>
      </div>

      {/* APP CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredApps.map((app) => {
          const isActive = app.id === activeAppId;
          const isReady = app.status === 'active';
          const theme = APP_THEME_COLORS[app.id] || APP_THEME_COLORS.proxyrack;
          const isCopied = copiedKey === `link_${app.id}`;

          return (
            <div
              key={app.id}
              className={`bg-slate-900 border rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-md transition-all relative overflow-hidden group ${
                theme.border
              } ${isActive ? 'ring-2 ring-emerald-500/50' : ''}`}
            >
              {/* Top ambient glow */}
              <div
                className="absolute -top-16 -right-16 w-36 h-36 rounded-full blur-3xl opacity-20 pointer-events-none transition-opacity group-hover:opacity-40"
                style={{ backgroundColor: theme.accent }}
              />

              <div className="space-y-4">
                {/* Header: Title, Category & Direct Homepage */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${theme.iconBg}`}>
                      {app.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <span>{app.name}</span>
                        {isReady && (
                          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 border border-emerald-800 px-1.5 py-0.5 rounded">
                            {language === 'vi' ? 'API Sẵn sàng' : 'API Ready'}
                          </span>
                        )}
                      </h3>
                      <div className="text-[11px] text-slate-400 font-medium">
                        {(language === 'en' && app.categoryEn) ? app.categoryEn : app.category}
                      </div>
                    </div>
                  </div>

                  <a
                    href={app.website}
                    target="_blank"
                    rel="noreferrer"
                    className="text-slate-500 hover:text-slate-300 p-1.5 bg-slate-950 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors"
                    title={language === 'vi' ? `Mở trang chủ chính thức ${app.name}` : `Visit official ${app.name} website`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                  </a>
                </div>

                {/* THE HIGH-CONVERSION BONUS CARD / CALLOUT */}
                <div className="rounded-xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-amber-500/30 p-3.5 space-y-2 relative shadow-inner">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Gift className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-bold text-amber-300 uppercase tracking-wide">
                        {language === 'vi' ? 'Ưu đãi Link Ref:' : 'Partner Bonus:'}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-extrabold px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300">
                      {((language === 'en' && app.bonusAmountEn) ? app.bonusAmountEn : app.bonusAmount) || (language === 'vi' ? 'Thưởng đăng ký' : 'Sign-up Bonus')}
                    </span>
                  </div>

                  <div className="text-xs font-semibold text-white leading-snug">
                    {(language === 'en' && app.bonusHighlightEn) ? app.bonusHighlightEn : app.bonusHighlight}
                  </div>

                  <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                    {(language === 'en' && app.bonusDetailsEn) ? app.bonusDetailsEn : app.bonusDetails}
                  </p>
                </div>

                {/* Specs list */}
                <div className="space-y-1.5 text-xs divide-y divide-slate-800/60 font-mono bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-400 font-sans">
                      {language === 'vi' ? 'Min rút tiền:' : 'Min Payout:'}
                    </span>
                    <strong className="text-emerald-400">{app.payoutMinimum}</strong>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-400 font-sans">
                      {language === 'vi' ? 'Đơn giá chia sẻ:' : 'Sharing Rate:'}
                    </span>
                    <span className="text-cyan-300">
                      {(language === 'en' && app.earningsRateEn) ? app.earningsRateEn : app.earningsRate}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-400 font-sans">
                      {language === 'vi' ? 'Phương thức rút:' : 'Payout Methods:'}
                    </span>
                    <span className="text-slate-300 text-[11px] truncate max-w-[170px] text-right">
                      {app.payoutMethods.join(', ')}
                    </span>
                  </div>
                  {app.platforms && (
                    <div className="flex items-center justify-between py-1 pt-1.5">
                      <span className="text-slate-400 font-sans">
                        {language === 'vi' ? 'Thiết bị hỗ trợ:' : 'Supported Devices:'}
                      </span>
                      <div className="flex flex-wrap gap-1 justify-end">
                        {app.platforms.map((p) => (
                          <span key={p} className="text-[10px] bg-slate-800 px-1.5 py-0.2 rounded text-slate-300">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ACTION FOOTER */}
              <div className="pt-3 border-t border-slate-800/90 space-y-2">
                {/* Primary Large Prominent Register Button */}
                <a
                  href={app.referralUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={`w-full flex items-center justify-center gap-2.5 px-4 py-3.5 text-sm font-extrabold text-white rounded-xl shadow-lg shadow-black/40 transition-all transform active:scale-[0.99] hover:brightness-110 ${theme.btnBg} ring-1 ring-white/15`}
                >
                  <Gift className="w-5 h-5 shrink-0" />
                  <span>{language === 'vi' ? 'Đăng ký nhận thưởng' : 'Register & Claim Bonus'}</span>
                  <ExternalLink className="w-4 h-4 shrink-0 opacity-80" />
                </a>

                {/* Secondary Action: Copy Referral Link or Manage API */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopy(`link_${app.id}`, app.referralUrl)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-950 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 text-slate-200 hover:text-white rounded-xl text-xs font-semibold transition-all shadow-sm"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-bold">
                          {language === 'vi' ? 'Đã sao chép!' : 'Copied!'}
                        </span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>{language === 'vi' ? 'Sao chép link' : 'Copy Link'}</span>
                      </>
                    )}
                  </button>

                  {isReady && (
                    <button
                      type="button"
                      onClick={() => onSelectApp(app.id)}
                      className="flex items-center justify-center gap-1 py-1.5 px-3 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-800/80 text-emerald-300 rounded-lg text-xs font-semibold transition-colors shrink-0"
                      title={language === 'vi' ? 'Mở Bảng điều khiển Proxyrack' : 'Open Proxyrack Dashboard'}
                    >
                      <span>{language === 'vi' ? 'Vào Quản trị' : 'Manage'}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* STRATEGY GUIDE FOR USERS (MẸO TỐI ƯU HÓA THU NHẬP) */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2.5 text-slate-100 font-bold text-sm">
          <Award className="w-5 h-5 text-amber-400" />
          <h2>
            {language === 'vi' 
              ? 'Chiến lược tối ưu hóa thu nhập thụ động 24/7 từ Băng thông' 
              : '24/7 Passive Income Optimization Strategy from Bandwidth'}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-2">
            <div className="font-semibold text-emerald-400 flex items-center gap-1.5">
              <span>{language === 'vi' ? '1. Chạy đa nhiệm đồng thời (Multi-Running)' : '1. Concurrent Multi-Running'}</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              {language === 'vi'
                ? 'Các ứng dụng Proxyrack, EarnApp, Honeygain, Pawns và PacketStream không hề xung đột với nhau. Cài đặt toàn bộ 5-6 app trên cùng 1 thiết bị giúp bạn bán cùng 1 lượng băng thông nhàn rỗi cho nhiều người mua khác nhau, nhân 4 đến 5 lần doanh thu mỗi ngày.'
                : 'Proxyrack, EarnApp, Honeygain, Pawns, and PacketStream operate without interference. Running all 5-6 applications on the same machine monetizes idle bandwidth across multiple buyers, multiplying revenue 4x to 5x daily.'}
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-2">
            <div className="font-semibold text-cyan-400 flex items-center gap-1.5">
              <span>{language === 'vi' ? '2. Ưu tiên đường truyền Residential IP (Mạng gia đình)' : '2. Prioritize Residential IP Connections'}</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              {language === 'vi'
                ? 'Mạng internet hộ gia đình có giá trị cao nhất vì các công ty AI và web scraping cần IP người dùng thật. Hãy giữ Uptime 24/7 để giữ điểm danh tiếng (reputation score) cao trên mọi ứng dụng.'
                : 'Residential broadband connections carry the highest value because AI companies and web scrapers need real residential IPs. Keep 24/7 uptime to maximize reputation scores across all platforms.'}
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-2">
            <div className="font-semibold text-amber-400 flex items-center gap-1.5">
              <span>{language === 'vi' ? '3. Tận dụng triệt để tiền thưởng khi đăng ký qua Link Ref' : '3. Leverage Partner Referral Bonuses'}</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              {language === 'vi'
                ? 'Đăng ký qua liên kết đối tác phía trên giúp bạn bỏ túi ngay $2.00 tại EarnApp (min rút chỉ $2.50), $3.00 tại Honeygain và $3.00 tại Pawns.app. Bạn chỉ cần chạy thêm một khoảng thời gian ngắn là có thể rút tiền mặt ngay lập tức!'
                : 'Registering through partner links above grants you $2.00 at EarnApp ($2.50 min payout), $3.00 at Honeygain, and $3.00 at Pawns.app. You reach minimum payout thresholds within hours of running!'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
