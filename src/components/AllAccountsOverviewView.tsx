import { useState, useEffect, useMemo } from 'react';
import { 
  Globe, 
  Wallet, 
  TrendingUp, 
  Cpu, 
  BarChart3, 
  RefreshCw, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  Calendar, 
  DollarSign, 
  ShieldCheck, 
  ExternalLink,
  Zap,
  Activity,
  ArrowUpRight,
  Sparkles
} from 'lucide-react';
import { UserAccount, DeviceItem, ActiveTab } from '../types';
import { storage, SUPPORTED_EARN_APPS } from '../services/storage';
import { proxyrackApi } from '../services/proxyrackApi';
import { useLanguage } from '../contexts/LanguageContext';

interface AllAccountsOverviewViewProps {
  accounts: UserAccount[];
  activeAccountId: string;
  onSelectAccount: (accountId: string) => void;
  onNavigateTab: (tab: ActiveTab) => void;
}

type TimeframePreset = 'week' | '7d' | 'month' | '30d';

const ACCOUNT_COLORS = [
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#8b5cf6', // Violet
  '#f59e0b', // Amber
  '#f43f5e', // Rose
  '#3b82f6', // Blue
  '#14b8a6', // Teal
  '#ec4899', // Pink
];

export function AllAccountsOverviewView({
  accounts,
  activeAccountId,
  onSelectAccount,
  onNavigateTab,
}: AllAccountsOverviewViewProps) {
  const { language } = useLanguage();
  const [preset, setPreset] = useState<TimeframePreset>('7d');
  const [chartMetric, setChartMetric] = useState<'bandwidth' | 'earnings'>('bandwidth');
  const [chartStyle, setChartStyle] = useState<'multi' | 'stacked'>('multi');
  
  // Account data states: [accountId]: { bandwidth: Record<date, number>, balance: number, balanceStr: string }
  const [accountDataMap, setAccountDataMap] = useState<Record<string, {
    bandwidth: Record<string, number>;
    balanceNum: number;
    balanceStr: string;
    lastUpdated: string;
  }>>({});
  
  const [isLoading, setIsLoading] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState<{ current: number; total: number } | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  // Helper date calculations
  const formatDateStr = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getDateRange = (p: TimeframePreset) => {
    const today = new Date();
    const endStr = formatDateStr(today);

    if (p === 'week') {
      const currentDay = today.getDay();
      const distance = currentDay === 0 ? 6 : currentDay - 1;
      const monday = new Date(today);
      monday.setDate(today.getDate() - distance);
      const start = formatDateStr(monday);
      let end = endStr;
      if (start >= end) {
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        end = formatDateStr(tomorrow);
      }
      return { start, end };
    }

    if (p === '7d') {
      const past = new Date(today);
      past.setDate(today.getDate() - 6);
      return { start: formatDateStr(past), end: endStr };
    }

    if (p === 'month') {
      const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const start = formatDateStr(firstOfMonth);
      let end = endStr;
      if (start >= end) {
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        end = formatDateStr(tomorrow);
      }
      return { start, end };
    }

    // 30d
    const past30 = new Date(today);
    past30.setDate(today.getDate() - 29);
    return { start: formatDateStr(past30), end: endStr };
  };

  const activeRange = useMemo(() => getDateRange(preset), [preset]);

  // Color mapping per account
  const accountColors = useMemo(() => {
    const map: Record<string, string> = {};
    accounts.forEach((acc, idx) => {
      map[acc.id] = ACCOUNT_COLORS[idx % ACCOUNT_COLORS.length];
    });
    return map;
  }, [accounts]);

  // Devices per account
  const allDevices = useMemo(() => {
    return storage.getDevices();
  }, [accounts]);

  const devicesByAccount = useMemo(() => {
    const map: Record<string, DeviceItem[]> = {};
    accounts.forEach((acc) => {
      map[acc.id] = allDevices.filter((d) => d.accountId === acc.id);
    });
    return map;
  }, [accounts, allDevices]);

  // Parse numerical balance from string like "$17.69" or "17.69"
  const parseBalanceNumber = (str?: string) => {
    if (!str) return 0;
    const clean = str.replace(/[^0-9.-]+/g, '');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  };

  // Fetch or load cached bandwidth & balance for all accounts
  const loadAllAccountsData = async (forceRefresh = false) => {
    if (accounts.length === 0) return;

    setIsLoading(true);
    setRefreshProgress({ current: 0, total: accounts.length });

    const newMap: Record<string, {
      bandwidth: Record<string, number>;
      balanceNum: number;
      balanceStr: string;
      lastUpdated: string;
    }> = { ...accountDataMap };

    const { start, end } = activeRange;
    const now = Date.now();
    const CACHE_KEY_PREFIX = 'earnhub_overview_cache_';
    const CACHE_TTL = 5 * 60 * 1000; // 5 phút

    for (let i = 0; i < accounts.length; i++) {
      const acc = accounts[i];
      setRefreshProgress({ current: i + 1, total: accounts.length });

      let balanceStr = acc.cachedBalance || '$0.00';
      let balanceNum = parseBalanceNumber(balanceStr);
      let bandwidth: Record<string, number> = {};

      const cacheKey = `${CACHE_KEY_PREFIX}${acc.id}_${start}_${end}`;
      let isCachedFresh = false;

      if (!forceRefresh) {
        try {
          const raw = localStorage.getItem(cacheKey);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (now - parsed.cachedAt < CACHE_TTL) {
              bandwidth = parsed.bandwidth;
              balanceStr = parsed.balanceStr || balanceStr;
              balanceNum = parsed.balanceNum || balanceNum;
              isCachedFresh = true;
            }
          }
        } catch (e) {
          // ignore cache read error
        }
      }

      if (!isCachedFresh && acc.apiKey && acc.earnAppId === 'proxyrack') {
        try {
          // 1. Fetch balance
          try {
            const balRes = await proxyrackApi.getBalance(acc.apiKey);
            if (balRes.status === 'success' && balRes.data?.balance) {
              balanceStr = balRes.data.balance;
              balanceNum = parseBalanceNumber(balanceStr);
              storage.updateAccount(acc.id, { cachedBalance: balanceStr, testStatus: 'valid' });
            }
          } catch (e) {
            // keep existing balance
          }

          // 2. Fetch bandwidth
          try {
            const bwRes = await proxyrackApi.getBandwidth(acc.apiKey, undefined, start, end);
            if (bwRes.status === 'success' && bwRes.data?.bandwidth) {
              bandwidth = bwRes.data.bandwidth;
            }
          } catch (e) {
            // keep existing bandwidth
          }

          // Save to local cache
          try {
            localStorage.setItem(cacheKey, JSON.stringify({
              bandwidth,
              balanceStr,
              balanceNum,
              cachedAt: Date.now(),
            }));
          } catch (e) {
            // ignore
          }

          // Gentle throttle between accounts
          await new Promise((r) => setTimeout(r, 150));
        } catch (err) {
          // fallback
        }
      }

      newMap[acc.id] = {
        bandwidth,
        balanceNum,
        balanceStr,
        lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
    }

    setAccountDataMap(newMap);
    setIsLoading(false);
    setRefreshProgress(null);
  };

  useEffect(() => {
    loadAllAccountsData(false);
  }, [preset, accounts.length]);

  // Combined dates for chart
  const chartDates = useMemo(() => {
    const dateSet = new Set<string>();
    Object.values(accountDataMap).forEach((item) => {
      Object.keys(item.bandwidth || {}).forEach((d) => dateSet.add(d));
    });

    if (dateSet.size === 0) {
      const { start, end } = activeRange;
      const curr = new Date(start);
      const stop = new Date(end);
      while (curr <= stop) {
        dateSet.add(formatDateStr(curr));
        curr.setDate(curr.getDate() + 1);
      }
    }

    return Array.from(dateSet).sort();
  }, [accountDataMap, activeRange]);

  // Series per account
  const seriesList = useMemo(() => {
    return accounts.map((acc) => {
      const data = accountDataMap[acc.id] || {
        bandwidth: {},
        balanceNum: parseBalanceNumber(acc.cachedBalance),
        balanceStr: acc.cachedBalance || '$0.00',
        lastUpdated: '',
      };

      const pointsGB = chartDates.map((date) => data.bandwidth[date] || 0);
      const totalGB = pointsGB.reduce((a, b) => a + b, 0);
      const pointsUsd = pointsGB.map((gb) => gb * 0.3); // ~$0.30/GB Proxyrack avg
      const totalEstUsd = totalGB * 0.3;
      const devices = devicesByAccount[acc.id] || [];

      return {
        account: acc,
        color: accountColors[acc.id] || '#10b981',
        pointsGB,
        pointsUsd,
        totalGB,
        totalEstUsd,
        balanceNum: data.balanceNum,
        balanceStr: data.balanceStr,
        deviceCount: devices.length,
        onlineCount: devices.filter((d) => d.lastPingStatus === 'online').length,
        offlineCount: devices.filter((d) => d.lastPingStatus === 'offline').length,
      };
    });
  }, [accounts, accountDataMap, chartDates, accountColors, devicesByAccount]);

  // Total System Aggregates
  const totalSystemBalance = useMemo(() => {
    return seriesList.reduce((acc, s) => acc + s.balanceNum, 0);
  }, [seriesList]);

  const totalSystemBandwidthGB = useMemo(() => {
    return seriesList.reduce((acc, s) => acc + s.totalGB, 0);
  }, [seriesList]);

  const totalSystemEstEarningsUsd = useMemo(() => {
    return seriesList.reduce((acc, s) => acc + s.totalEstUsd, 0);
  }, [seriesList]);

  const totalSystemDevices = useMemo(() => {
    return seriesList.reduce((acc, s) => acc + s.deviceCount, 0);
  }, [seriesList]);

  const totalSystemOnline = useMemo(() => {
    return seriesList.reduce((acc, s) => acc + s.onlineCount, 0);
  }, [seriesList]);

  // Chart max value for scaling
  const chartMaxVal = useMemo(() => {
    let peak = 0;
    if (chartStyle === 'stacked') {
      // Sum per date
      chartDates.forEach((_, dateIdx) => {
        const sumAtDate = seriesList.reduce((acc, s) => {
          return acc + (chartMetric === 'bandwidth' ? s.pointsGB[dateIdx] : s.pointsUsd[dateIdx]);
        }, 0);
        if (sumAtDate > peak) peak = sumAtDate;
      });
    } else {
      // Max single series peak
      seriesList.forEach((s) => {
        const pts = chartMetric === 'bandwidth' ? s.pointsGB : s.pointsUsd;
        pts.forEach((v) => {
          if (v > peak) peak = v;
        });
      });
    }
    return peak === 0 ? 1 : peak * 1.15;
  }, [seriesList, chartDates, chartStyle, chartMetric]);

  // SVG Chart Geometry
  const svgWidth = 800;
  const svgHeight = 260;
  const padLeft = 55;
  const padRight = 25;
  const padTop = 25;
  const padBottom = 35;
  const plotWidth = svgWidth - padLeft - padRight;
  const plotHeight = svgHeight - padTop - padBottom;

  const getX = (index: number) => {
    if (chartDates.length <= 1) return padLeft + plotWidth / 2;
    return padLeft + (index / (chartDates.length - 1)) * plotWidth;
  };

  const getY = (val: number) => {
    const ratio = Math.min(Math.max(val / chartMaxVal, 0), 1);
    return padTop + (1 - ratio) * plotHeight;
  };

  const generateLinePath = (values: number[]) => {
    if (values.length === 0) return '';
    if (values.length === 1) {
      const x = getX(0);
      const y = getY(values[0]);
      return `M ${x} ${y} L ${x + 1} ${y}`;
    }

    const coords = values.map((v, i) => ({ x: getX(i), y: getY(v) }));
    let d = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const curr = coords[i];
      const next = coords[i + 1];
      const cpX = (curr.x + next.x) / 2;
      d += ` C ${cpX} ${curr.y}, ${cpX} ${next.y}, ${next.x} ${next.y}`;
    }
    return d;
  };

  // Stacked totals per date
  const stackedTotalsPerDate = useMemo(() => {
    return chartDates.map((_, dateIdx) => {
      return seriesList.reduce((acc, s) => {
        return acc + (chartMetric === 'bandwidth' ? s.pointsGB[dateIdx] : s.pointsUsd[dateIdx]);
      }, 0);
    });
  }, [chartDates, seriesList, chartMetric]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-400 shadow-sm">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                {language === 'vi' ? 'Tổng quan Tất cả Tài khoản' : 'All Accounts Overview'}
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {language === 'vi'
                  ? `Thống kê tổng hợp số dư, lưu lượng và hiệu suất thiết bị trên ${accounts.length} tài khoản kết nối.`
                  : `Aggregate balance, bandwidth, and node metrics across ${accounts.length} connected accounts.`}
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls & Preset */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Timeframe selector */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl">
            {(['week', '7d', 'month', '30d'] as TimeframePreset[]).map((p) => {
              const labels = {
                week: language === 'vi' ? 'Trong tuần' : 'This Week',
                '7d': language === 'vi' ? '7 ngày' : '7 Days',
                month: language === 'vi' ? 'Trong tháng' : 'This Month',
                '30d': language === 'vi' ? '30 ngày' : '30 Days',
              };
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPreset(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    preset === p
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {labels[p]}
                </button>
              );
            })}
          </div>

          {/* Refresh all accounts button */}
          <button
            type="button"
            onClick={() => loadAllAccountsData(true)}
            disabled={isLoading || accounts.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
            title={language === 'vi' ? 'Tải lại số dư và băng thông cho tất cả các tài khoản' : 'Refresh balance and bandwidth for all accounts'}
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isLoading ? 'animate-spin' : ''}`} />
            <span>
              {isLoading 
                ? (language === 'vi' ? `Đang nạp (${refreshProgress?.current}/${refreshProgress?.total})...` : `Loading (${refreshProgress?.current}/${refreshProgress?.total})...`) 
                : (language === 'vi' ? 'Làm mới tất cả' : 'Refresh All')}
            </span>
          </button>
        </div>
      </div>

      {/* 4 HIGH-VISIBILITY KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Combined Balance */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-28 h-28 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">
              {language === 'vi' ? 'Tổng Số Dư Toàn Bộ TK' : 'Combined Total Balance'}
            </span>
            <div className="p-2 rounded-lg bg-emerald-950/80 border border-emerald-800/80 text-emerald-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-emerald-400 tracking-tight">
              ${totalSystemBalance.toFixed(2)} USD
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>{accounts.length} {language === 'vi' ? 'tài khoản' : 'accounts'}</span>
              <span className="text-emerald-400">{language === 'vi' ? 'Khả dụng' : 'Available'}</span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-400">
            {language === 'vi' ? 'Ước tính tích luỹ từ các ví chia sẻ mạng' : 'Estimated aggregate from connected nodes'}
          </div>
        </div>

        {/* Total Combined Bandwidth */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-28 h-28 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">
              {language === 'vi' ? 'Tổng Băng Thông Đã Dùng' : 'Total Bandwidth Used'}
            </span>
            <div className="p-2 rounded-lg bg-cyan-950/80 border border-cyan-800/80 text-cyan-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-cyan-300 tracking-tight">
              {totalSystemBandwidthGB.toFixed(3)} GB
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>~{Math.round(totalSystemBandwidthGB * 1024).toLocaleString()} MB</span>
              <span className="text-cyan-400">+{seriesList.length} {language === 'vi' ? 'nguồn' : 'sources'}</span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-400">
            {language === 'vi' ? 'Khoảng ngày:' : 'Date range:'} <strong className="text-slate-300">{activeRange.start}</strong> → <strong className="text-slate-300">{activeRange.end}</strong>
          </div>
        </div>

        {/* Total Devices / Nodes */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-28 h-28 bg-violet-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">
              {language === 'vi' ? 'Tổng Thiết Bị (Nodes)' : 'Total Devices (Nodes)'}
            </span>
            <div className="p-2 rounded-lg bg-violet-950/80 border border-violet-800/80 text-violet-400">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-violet-300 tracking-tight">
              {totalSystemDevices} Nodes
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span className="text-emerald-400">🟢 {totalSystemOnline} Online</span>
              <span className="text-rose-400">🔴 {totalSystemDevices - totalSystemOnline} Offline</span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
            <span>{language === 'vi' ? `Phân bố trên ${accounts.length} tài khoản` : `Across ${accounts.length} accounts`}</span>
            <button
              type="button"
              onClick={() => onNavigateTab('devices')}
              className="text-violet-400 hover:text-violet-300 flex items-center gap-0.5"
            >
              <span>{language === 'vi' ? 'Xem' : 'View'}</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Estimated Combined Earnings */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">
              {language === 'vi' ? 'Doanh Thu Đợt Này' : 'Period Revenue'}
            </span>
            <div className="p-2 rounded-lg bg-amber-950/80 border border-amber-800/80 text-amber-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-amber-400 tracking-tight">
              +${totalSystemEstEarningsUsd.toFixed(3)}
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>{language === 'vi' ? 'Tỷ giá ~$0.30/GB' : 'Rate ~$0.30/GB'}</span>
              <span className="text-amber-400">{language === 'vi' ? 'Đang chia sẻ' : 'Active Sharing'}</span>
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-400">
            {language === 'vi' ? `Tổng thu nhập ước tính trong mốc ${preset}` : `Est. revenue for period: ${preset}`}
          </div>
        </div>
      </div>

      {/* MULTI-ACCOUNT UNIFIED CHART */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-slate-100 uppercase tracking-wider">
                {language === 'vi' 
                  ? 'Đồ thị So sánh & Tổng hợp Lưu lượng giữa các Tài khoản' 
                  : 'Multi-Account Traffic Comparison & Aggregate Chart'}
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {language === 'vi'
                ? 'So sánh xu hướng chia sẻ dữ liệu hoặc thu nhập theo từng mốc ngày trên cùng một hệ quy chiếu.'
                : 'Compare data sharing trends or earnings day-by-day across all accounts on a unified scale.'}
            </p>
          </div>

          {/* Chart Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Metric Switch */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setChartMetric('bandwidth')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  chartMetric === 'bandwidth'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {language === 'vi' ? 'Băng thông (GB)' : 'Bandwidth (GB)'}
              </button>
              <button
                type="button"
                onClick={() => setChartMetric('earnings')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  chartMetric === 'earnings'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {language === 'vi' ? 'Thu nhập ($ USD)' : 'Earnings ($ USD)'}
              </button>
            </div>

            {/* Style Switch */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setChartStyle('multi')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  chartStyle === 'multi'
                    ? 'bg-slate-800 text-cyan-300 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {language === 'vi' ? 'Từng tài khoản' : 'Per Account'}
              </button>
              <button
                type="button"
                onClick={() => setChartStyle('stacked')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  chartStyle === 'stacked'
                    ? 'bg-slate-800 text-cyan-300 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {language === 'vi' ? 'Cộng dồn (Toàn hệ thống)' : 'Stacked (All Accounts)'}
              </button>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-2">
          {chartStyle === 'stacked' ? (
            <div className="flex items-center gap-1.5 text-xs font-mono bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="text-slate-200 font-semibold">
                {language === 'vi' ? 'Tổng hợp toàn hệ thống' : 'Total Combined Network'}
              </span>
              <span className="text-emerald-400 font-bold ml-1">
                {chartMetric === 'bandwidth'
                  ? `${totalSystemBandwidthGB.toFixed(3)} GB`
                  : `$${totalSystemEstEarningsUsd.toFixed(3)}`}
              </span>
            </div>
          ) : (
            seriesList.map((s) => (
              <div
                key={s.account.id}
                className="flex items-center gap-1.5 text-xs font-mono bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800"
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                <span className="text-slate-300 font-medium truncate max-w-[120px]">
                  {s.account.name}
                </span>
                <span className="text-slate-500 font-bold">
                  {chartMetric === 'bandwidth'
                    ? `${s.totalGB.toFixed(2)}G`
                    : `$${s.totalEstUsd.toFixed(2)}`}
                </span>
              </div>
            ))
          )}
        </div>

        {/* SVG Chart */}
        <div className="relative w-full">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto overflow-visible select-none cursor-crosshair"
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const mouseX = e.clientX - rect.left;
              const scaleX = svgWidth / rect.width;
              const virtualX = mouseX * scaleX;
              const clampedX = Math.max(padLeft, Math.min(padLeft + plotWidth, virtualX));
              const ratio = (clampedX - padLeft) / plotWidth;
              const nearest = Math.round(ratio * (chartDates.length - 1));
              setHoverIndex(nearest);
            }}
            onMouseLeave={() => setHoverIndex(null)}
          >
            <defs>
              <linearGradient id="globalStackedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid Lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
              const y = padTop + (1 - pct) * plotHeight;
              const val = (pct * chartMaxVal).toFixed(2);
              return (
                <g key={pct}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={padLeft + plotWidth}
                    y2={y}
                    stroke="#334155"
                    strokeWidth="1"
                    strokeDasharray={pct === 0 ? 'none' : '3 3'}
                    opacity="0.4"
                  />
                  <text
                    x={padLeft - 8}
                    y={y + 3}
                    fill="#94a3b8"
                    fontSize="10"
                    fontFamily="monospace"
                    textAnchor="end"
                  >
                    {chartMetric === 'earnings' ? `$${val}` : `${val}G`}
                  </text>
                </g>
              );
            })}

            {/* Render Stacked mode */}
            {chartStyle === 'stacked' && (
              <g>
                <path
                  d={`${generateLinePath(stackedTotalsPerDate)} L ${getX(chartDates.length - 1)} ${
                    padTop + plotHeight
                  } L ${getX(0)} ${padTop + plotHeight} Z`}
                  fill="url(#globalStackedGradient)"
                />
                <path
                  d={generateLinePath(stackedTotalsPerDate)}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </g>
            )}

            {/* Render Multi-Account Lines */}
            {chartStyle === 'multi' &&
              seriesList.map((s) => {
                const values = chartMetric === 'bandwidth' ? s.pointsGB : s.pointsUsd;
                return (
                  <g key={s.account.id}>
                    <path
                      d={generateLinePath(values)}
                      fill="none"
                      stroke={s.color}
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity="0.9"
                    />
                    {values.map((v, idx) => (
                      <circle
                        key={idx}
                        cx={getX(idx)}
                        cy={getY(v)}
                        r={hoverIndex === idx ? 5 : 3}
                        fill={s.color}
                        stroke="#0f172a"
                        strokeWidth="1.5"
                      />
                    ))}
                  </g>
                );
              })}

            {/* Crosshair on Hover */}
            {hoverIndex !== null && (
              <g pointerEvents="none">
                <line
                  x1={getX(hoverIndex)}
                  y1={padTop}
                  x2={getX(hoverIndex)}
                  y2={padTop + plotHeight}
                  stroke="#94a3b8"
                  strokeWidth="1.5"
                  strokeDasharray="2 2"
                />
              </g>
            )}

            {/* X-axis Labels */}
            {chartDates.map((date, i) => {
              const show =
                chartDates.length <= 10 ||
                i === 0 ||
                i === chartDates.length - 1 ||
                i % Math.ceil(chartDates.length / 7) === 0;

              if (!show) return null;
              return (
                <text
                  key={date}
                  x={getX(i)}
                  y={padTop + plotHeight + 18}
                  fill={hoverIndex === i ? '#34d399' : '#64748b'}
                  fontSize="10"
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  {date.slice(5).replace('-', '/')}
                </text>
              );
            })}
          </svg>

          {/* Boundary-Aware Interactive Tooltip */}
          {hoverIndex !== null && (() => {
            const pct = (getX(hoverIndex) / svgWidth) * 100;
            const isNearLeft = pct < 25 || hoverIndex === 0;
            const isNearRight = pct > 75 || hoverIndex === chartDates.length - 1;

            let transform = 'translateX(-50%)';
            let leftStyle = `${pct}%`;

            if (isNearLeft) {
              transform = 'translateX(0%)';
              leftStyle = `max(8px, ${pct - 1}%)`;
            } else if (isNearRight) {
              transform = 'translateX(-100%)';
              leftStyle = `min(calc(100% - 8px), ${pct + 1}%)`;
            }

            const currentDate = chartDates[hoverIndex];
            const totalOnDateGB = seriesList.reduce((acc, s) => acc + (s.pointsGB[hoverIndex] || 0), 0);
            const totalOnDateUsd = totalOnDateGB * 0.3;

            return (
              <div
                className="absolute z-30 top-2 pointer-events-none bg-slate-950/95 border border-slate-700/90 rounded-xl p-3 shadow-2xl text-xs space-y-2 backdrop-blur-md min-w-[210px] max-w-[calc(100%-16px)] transition-all duration-75"
                style={{
                  left: leftStyle,
                  transform,
                }}
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 font-mono">
                  <span className="text-slate-400">{language === 'vi' ? 'Mốc ngày:' : 'Date:'}</span>
                  <span className="text-emerald-400 font-bold">{currentDate}</span>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {seriesList
                    .map((s) => ({
                      name: s.account.name,
                      color: s.color,
                      gb: s.pointsGB[hoverIndex] || 0,
                      usd: s.pointsUsd[hoverIndex] || 0,
                    }))
                    .sort((a, b) => b.gb - a.gb)
                    .map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between font-mono text-[11px]">
                        <div className="flex items-center gap-1.5 truncate max-w-[120px]">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="text-slate-300 truncate">{item.name}</span>
                        </div>
                        <span className="text-white font-bold ml-2">
                          {chartMetric === 'bandwidth' ? `${item.gb.toFixed(3)} GB` : `$${item.usd.toFixed(3)}`}
                        </span>
                      </div>
                    ))}
                </div>

                <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between font-mono text-[11px]">
                  <span className="text-slate-400">{language === 'vi' ? 'Tổng toàn hệ thống:' : 'Combined Total:'}</span>
                  <span className="text-emerald-400 font-bold">
                    {chartMetric === 'bandwidth' ? `${totalOnDateGB.toFixed(3)} GB` : `$${totalOnDateUsd.toFixed(3)}`}
                  </span>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* ACCOUNT CARDS GRID */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>
              {language === 'vi' 
                ? `Danh sách Tài khoản & Phân bổ Tỷ trọng (${accounts.length})` 
                : `Account List & Share Breakdown (${accounts.length})`}
            </span>
          </h2>
          <button
            type="button"
            onClick={() => onNavigateTab('accounts')}
            className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium"
          >
            <span>{language === 'vi' ? 'Quản lý khóa API' : 'Manage API Keys'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {seriesList.map((s) => {
            const isCurrentActive = s.account.id === activeAccountId;
            const appInfo = SUPPORTED_EARN_APPS.find((app) => app.id === s.account.earnAppId);
            const percentOfTotal = totalSystemBandwidthGB > 0 ? (s.totalGB / totalSystemBandwidthGB) * 100 : 0;

            return (
              <div
                key={s.account.id}
                className={`bg-slate-900 border rounded-xl p-4 shadow-sm flex flex-col justify-between transition-all relative overflow-hidden ${
                  isCurrentActive
                    ? 'border-emerald-500/80 ring-1 ring-emerald-500/50'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Active Account Pill */}
                {isCurrentActive && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-950/90 border border-emerald-800 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{language === 'vi' ? 'Đang chọn' : 'Active'}</span>
                  </div>
                )}

                <div>
                  {/* Account Header */}
                  <div className="flex items-start gap-2.5">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 mt-0.5"
                      style={{ backgroundColor: s.color }}
                    />
                    <div className="truncate pr-16">
                      <h3 className="font-semibold text-sm text-slate-100 truncate">
                        {s.account.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                        <span>{appInfo?.name || s.account.earnAppId}</span>
                        <span>·</span>
                        <span className="text-emerald-400 font-mono text-[11px]">
                          {s.account.testStatus === 'valid' 
                            ? (language === 'vi' ? 'API Hợp lệ' : 'API Valid') 
                            : (language === 'vi' ? 'Hoạt động' : 'Active')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Account Metrics Grid */}
                  <div className="grid grid-cols-2 gap-2 mt-4 bg-slate-950/70 p-2.5 rounded-lg border border-slate-800/80">
                    <div>
                      <div className="text-[10px] text-slate-400">
                        {language === 'vi' ? 'Số dư hiện tại' : 'Current Balance'}
                      </div>
                      <div className="text-base font-bold font-mono text-emerald-400">
                        {s.balanceStr}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">
                        {language === 'vi' ? `Băng thông (${preset})` : `Bandwidth (${preset})`}
                      </div>
                      <div className="text-base font-bold font-mono text-cyan-300">
                        {s.totalGB.toFixed(2)} GB
                      </div>
                    </div>
                    <div className="mt-1 pt-1 border-t border-slate-800/60">
                      <div className="text-[10px] text-slate-400">
                        {language === 'vi' ? 'Thiết bị' : 'Devices'}
                      </div>
                      <div className="text-xs font-semibold font-mono text-slate-200">
                        {s.deviceCount} nodes ({s.onlineCount} on)
                      </div>
                    </div>
                    <div className="mt-1 pt-1 border-t border-slate-800/60">
                      <div className="text-[10px] text-slate-400">
                        {language === 'vi' ? 'Thu nhập ước tính' : 'Est. Earnings'}
                      </div>
                      <div className="text-xs font-semibold font-mono text-amber-400">
                        +${s.totalEstUsd.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Contribution bar */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono mb-1">
                      <span>{language === 'vi' ? 'Đóng góp lưu lượng' : 'Traffic Share'}</span>
                      <span className="font-bold text-slate-200">{percentOfTotal.toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(percentOfTotal, 100)}%`, backgroundColor: s.color }}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer Switch Action */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-500 font-mono">
                    ID: {s.account.id.slice(0, 8)}...
                  </span>

                  {isCurrentActive ? (
                    <button
                      type="button"
                      onClick={() => onNavigateTab('dashboard')}
                      className="text-xs font-medium text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                    >
                      <span>{language === 'vi' ? 'Vào Dashboard' : 'Open Dashboard'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        onSelectAccount(s.account.id);
                        onNavigateTab('dashboard');
                      }}
                      className="px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700 flex items-center gap-1"
                    >
                      <span>{language === 'vi' ? 'Chuyển sang TK này' : 'Switch to Account'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* DETAILED MULTI-ACCOUNT BREAKDOWN TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
          <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
            {language === 'vi' 
              ? `Bảng Kê Chi Tiết Hiệu Suất Theo Tài Khoản (${seriesList.length})` 
              : `Account Performance Breakdown (${seriesList.length})`}
          </h2>
          <span className="text-xs font-mono text-slate-400">
            {language === 'vi' ? 'Tổng cộng:' : 'Total:'}{' '}
            <strong className="text-emerald-400">${totalSystemBalance.toFixed(2)} USD</strong> ·{' '}
            <strong className="text-cyan-400">{totalSystemBandwidthGB.toFixed(3)} GB</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-sans font-medium">
                <th className="py-2.5 px-3">{language === 'vi' ? 'Tài khoản' : 'Account'}</th>
                <th className="py-2.5 px-3">{language === 'vi' ? 'Nền tảng' : 'Platform'}</th>
                <th className="py-2.5 px-3">{language === 'vi' ? 'Số dư (Balance)' : 'Balance'}</th>
                <th className="py-2.5 px-3">{language === 'vi' ? `Băng thông (${preset})` : `Bandwidth (${preset})`}</th>
                <th className="py-2.5 px-3">{language === 'vi' ? 'Doanh thu ước tính' : 'Est. Revenue'}</th>
                <th className="py-2.5 px-3">{language === 'vi' ? 'Số Nodes' : 'Nodes'}</th>
                <th className="py-2.5 px-3">{language === 'vi' ? 'Tỷ lệ đóng góp' : 'Traffic Share'}</th>
                <th className="py-2.5 px-3 text-right">{language === 'vi' ? 'Thao tác' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {seriesList.map((s) => {
                const percent = totalSystemBandwidthGB > 0 ? (s.totalGB / totalSystemBandwidthGB) * 100 : 0;
                const isCurrent = s.account.id === activeAccountId;

                return (
                  <tr key={s.account.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                        <div>
                          <div className="text-slate-100 font-semibold font-sans flex items-center gap-1.5">
                            <span>{s.account.name}</span>
                            {isCurrent && (
                              <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950 px-1 py-0.2 rounded border border-emerald-800/60">
                                {language === 'vi' ? 'Đang chọn' : 'Active'}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            ID: {s.account.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 font-sans">
                      {s.account.earnAppId === 'proxyrack' ? 'Proxyrack Peer' : s.account.earnAppId}
                    </td>
                    <td className="py-2.5 px-3 text-emerald-400 font-bold">
                      {s.balanceStr}
                    </td>
                    <td className="py-2.5 px-3 text-cyan-300 font-bold">
                      {s.totalGB.toFixed(3)} GB
                    </td>
                    <td className="py-2.5 px-3 text-amber-400">
                      +${s.totalEstUsd.toFixed(3)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">
                      {s.deviceCount} ({s.onlineCount} on)
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">
                      <div className="flex items-center gap-2">
                        <div className="w-14 h-1.5 bg-slate-950 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(percent, 100)}%`,
                              backgroundColor: s.color,
                            }}
                          />
                        </div>
                        <span>{percent.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {isCurrent ? (
                        <button
                          type="button"
                          onClick={() => onNavigateTab('dashboard')}
                          className="px-2 py-1 text-[11px] font-medium text-emerald-400 hover:text-white bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800/80 rounded transition-colors"
                        >
                          {language === 'vi' ? 'Vào Dashboard' : 'Open Dashboard'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectAccount(s.account.id);
                            onNavigateTab('dashboard');
                          }}
                          className="px-2 py-1 text-[11px] font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition-colors"
                        >
                          {language === 'vi' ? 'Chuyển đến' : 'Switch To'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
