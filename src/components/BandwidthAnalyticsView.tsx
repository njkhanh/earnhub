import { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  Calendar, 
  RefreshCw, 
  BarChart3, 
  ArrowUpRight, 
  ArrowDownRight, 
  Clock, 
  DollarSign, 
  Activity,
  Layers,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { ProxyrackBandwidthResponse, UserAccount, DeviceItem } from '../types';
import { proxyrackApi } from '../services/proxyrackApi';
import { BandwidthChart } from './BandwidthChart';
import { MultiDeviceBandwidthChart } from './MultiDeviceBandwidthChart';
import { useLanguage } from '../contexts/LanguageContext';

interface BandwidthAnalyticsViewProps {
  activeAccount: UserAccount | undefined;
  devices?: DeviceItem[];
}

type TimeframePreset = 'week' | '7d' | 'month' | '30d' | 'custom';

export function BandwidthAnalyticsView({ activeAccount, devices = [] }: BandwidthAnalyticsViewProps) {
  const { language } = useLanguage();
  const [activeTabMode, setActiveTabMode] = useState<'aggregate' | 'multi'>('aggregate');
  const [selectedPreset, setSelectedPreset] = useState<TimeframePreset>('7d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [bandwidthData, setBandwidthData] = useState<Record<string, number>>({});
  const [stateStr, setStateStr] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [activeRangeDates, setActiveRangeDates] = useState<{ start: string; end: string }>({ start: '', end: '' });

  // Format YYYY-MM-DD
  const formatDate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Calculate start & end date based on preset
  const getDateRangeForPreset = (preset: TimeframePreset, customS?: string, customE?: string) => {
    const today = new Date();
    const endStr = formatDate(today);

    if (preset === 'week') {
      // Monday of current week
      const currentDay = today.getDay(); // 0 is Sunday, 1 is Monday
      const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
      const monday = new Date(today);
      monday.setDate(today.getDate() - distanceToMonday);

      const start = formatDate(monday);
      let end = endStr;
      // Guarantee start < end (Proxyrack API strict requirement)
      if (start >= end) {
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        end = formatDate(tomorrow);
      }
      return { start, end };
    }

    if (preset === '7d') {
      const past7 = new Date(today);
      past7.setDate(today.getDate() - 6);
      return { start: formatDate(past7), end: endStr };
    }

    if (preset === 'month') {
      // 1st of current month
      const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const start = formatDate(firstOfMonth);
      let end = endStr;
      // If today is the 1st of the month, start === end -> set end to tomorrow so start < end
      if (start >= end) {
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        end = formatDate(tomorrow);
      }
      return { start, end };
    }

    if (preset === '30d') {
      const past30 = new Date(today);
      past30.setDate(today.getDate() - 29);
      return { start: formatDate(past30), end: endStr };
    }

    // Custom
    let start = customS || formatDate(new Date(today.getTime() - 6 * 86400000));
    let end = customE || endStr;
    if (start >= end) {
      const s = new Date(start);
      s.setDate(s.getDate() + 1);
      end = formatDate(s);
    }
    return { start, end };
  };

  const fetchBandwidthData = async (preset: TimeframePreset, customS?: string, customE?: string) => {
    if (!activeAccount?.apiKey) return;

    setIsLoading(true);
    setErrorMsg(null);

    const { start, end } = getDateRangeForPreset(preset, customS, customE);
    setActiveRangeDates({ start, end });

    const startTime = performance.now();
    try {
      // Explicitly DO NOT pass device_id -> Queries account-level bandwidth
      const res = await proxyrackApi.getBandwidth(activeAccount.apiKey, undefined, start, end);
      const elapsed = Math.round(performance.now() - startTime);
      setLatencyMs(elapsed);

      if (res.status === 'success' && res.data) {
        setBandwidthData(res.data.bandwidth || {});
        setStateStr(res.data.state || null);
      } else {
        setErrorMsg(res.error || (language === 'vi' ? 'Không thể lấy dữ liệu băng thông' : 'Unable to retrieve bandwidth data'));
      }
    } catch (err: any) {
      const elapsed = Math.round(performance.now() - startTime);
      setLatencyMs(elapsed);
      setErrorMsg(err.message || (language === 'vi' ? 'Lỗi khi gọi API bandwidth Proxyrack' : 'Error calling Proxyrack bandwidth API'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBandwidthData(selectedPreset);
  }, [selectedPreset, activeAccount?.apiKey]);

  // Handle custom date apply
  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customStart || !customEnd) return;
    fetchBandwidthData('custom', customStart, customEnd);
  };

  // Calculations
  const stats = useMemo(() => {
    const dates = Object.keys(bandwidthData).sort();
    const vals = dates.map((d) => bandwidthData[d] || 0);
    const totalGB = vals.reduce((a, b) => a + b, 0);
    const avgGB = dates.length > 0 ? totalGB / dates.length : 0;
    const maxGB = dates.length > 0 ? Math.max(...vals) : 0;
    const peakDate = dates.find((d) => (bandwidthData[d] || 0) === maxGB) || '';
    const estUsd = totalGB * 0.3; // standard ~$0.30/GB

    return {
      totalGB,
      avgGB,
      maxGB,
      peakDate,
      estUsd,
      countDays: dates.length,
    };
  }, [bandwidthData]);

  // Sorted records with day-over-day changes
  const tableRecords = useMemo(() => {
    const dates = Object.keys(bandwidthData).sort();
    return dates.map((date, idx) => {
      const gb = bandwidthData[date] || 0;
      const mb = Math.round(gb * 1024);
      const prevGb = idx > 0 ? bandwidthData[dates[idx - 1]] || 0 : null;
      let diffPercent: number | null = null;
      if (prevGb !== null && prevGb > 0) {
        diffPercent = Math.round(((gb - prevGb) / prevGb) * 100);
      } else if (prevGb === 0 && gb > 0) {
        diffPercent = 100;
      }

      const percentOfTotal = stats.totalGB > 0 ? (gb / stats.totalGB) * 100 : 0;
      const estUsd = gb * 0.3;

      return {
        date,
        gb,
        mb,
        diffPercent,
        percentOfTotal,
        estUsd,
      };
    }).reverse(); // Most recent first
  }, [bandwidthData, stats.totalGB]);

  const presetLabels: { id: TimeframePreset; label: string; desc: string }[] = [
    { 
      id: 'week', 
      label: language === 'vi' ? 'Trong tuần' : 'This Week', 
      desc: language === 'vi' ? 'Thứ Hai đến hôm nay' : 'Mon to Today' 
    },
    { 
      id: '7d', 
      label: language === 'vi' ? '7 ngày' : '7 Days', 
      desc: language === 'vi' ? '7 ngày gần nhất' : 'Past 7 Days' 
    },
    { 
      id: 'month', 
      label: language === 'vi' ? 'Trong tháng' : 'This Month', 
      desc: language === 'vi' ? 'Đầu tháng đến hôm nay' : 'Month to Date' 
    },
    { 
      id: '30d', 
      label: language === 'vi' ? '30 ngày' : '30 Days', 
      desc: language === 'vi' ? '30 ngày gần nhất' : 'Past 30 Days' 
    },
    { 
      id: 'custom', 
      label: language === 'vi' ? 'Tuỳ chọn' : 'Custom', 
      desc: language === 'vi' ? 'Khoảng ngày tuỳ chỉnh' : 'Custom Range' 
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Mode Tabs */}
      <div className="flex flex-wrap items-center bg-slate-900 border border-slate-800 p-1 rounded-xl gap-1">
        <button
          type="button"
          onClick={() => setActiveTabMode('aggregate')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTabMode === 'aggregate'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>{language === 'vi' ? 'Tổng hợp toàn tài khoản (Aggregated)' : 'Aggregated Account View'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTabMode('multi')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTabMode === 'multi'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>{language === 'vi' ? 'So sánh nhiều thiết bị (Multi-Device Chart)' : 'Multi-Device Comparison Chart'}</span>
          <span className="text-[10px] font-mono bg-slate-950 px-1.5 py-0.5 rounded text-emerald-300 border border-slate-800">
            {devices.length} {language === 'vi' ? 'node' : 'nodes'}
          </span>
        </button>
      </div>

      {activeTabMode === 'multi' ? (
        <MultiDeviceBandwidthChart
          devices={devices}
          apiKey={activeAccount?.apiKey || ''}
          activeAccount={activeAccount}
        />
      ) : (
        <>
          {/* View Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">
              {language === 'vi' ? 'Thống kê Băng thông Toàn cụm' : 'Cluster Bandwidth Analytics'}
            </h1>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 rounded">
              {language === 'vi' ? 'Không phụ thuộc thiết bị' : 'Device Independent'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {language === 'vi'
              ? 'Tổng hợp dữ liệu lưu lượng tải qua API POST https://peer.proxyrack.com/api/bandwidth theo từng mốc thời gian.'
              : 'Aggregated traffic data from API POST https://peer.proxyrack.com/api/bandwidth by timeframe.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchBandwidthData(selectedPreset, customStart, customEnd)}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg shadow-sm transition-colors self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
          <span>
            {isLoading 
              ? (language === 'vi' ? 'Đang cập nhật...' : 'Updating...') 
              : (language === 'vi' ? 'Làm mới dữ liệu từ API' : 'Refresh API Data')}
          </span>
        </button>
      </div>

      {/* Preset Selector Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              {language === 'vi' ? 'Chọn khoảng thời gian thống kê nhanh:' : 'Quick Timeframe Presets:'}
            </span>
          </div>

          <div className="text-[11px] font-mono text-slate-400">
            {language === 'vi' ? 'Khoảng ngày:' : 'Date range:'} <span className="text-emerald-400 font-semibold">{activeRangeDates.start || '...'}</span>{' '}
            {language === 'vi' ? 'đến' : 'to'}{' '}
            <span className="text-emerald-400 font-semibold">{activeRangeDates.end || '...'}</span>
          </div>
        </div>

        {/* Preset Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {presetLabels.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedPreset(p.id)}
              className={`p-2.5 rounded-lg border text-left transition-all ${
                selectedPreset === p.id
                  ? 'bg-emerald-950/60 border-emerald-500/80 text-white shadow-sm ring-1 ring-emerald-500/30'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <div className="text-xs font-semibold">{p.label}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">{p.desc}</div>
            </button>
          ))}
        </div>

        {/* Custom date range picker if custom selected */}
        {selectedPreset === 'custom' && (
          <form onSubmit={handleApplyCustom} className="pt-3 border-t border-slate-800 flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">{language === 'vi' ? 'Từ ngày (date_start):' : 'Start Date (date_start):'}</span>
              <input
                type="date"
                required
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-slate-200 text-xs font-mono"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">{language === 'vi' ? 'Đến ngày (date_end):' : 'End Date (date_end):'}</span>
              <input
                type="date"
                required
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-slate-200 text-xs font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading || !customStart || !customEnd}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {language === 'vi' ? 'Áp dụng bộ lọc' : 'Apply Filter'}
            </button>
          </form>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Bandwidth */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="uppercase tracking-wider font-mono text-[11px]">
                {language === 'vi' ? 'Tổng lưu lượng' : 'Total Bandwidth'}
              </span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-white tracking-tight">
              {stats.totalGB.toFixed(3)} <span className="text-xs font-normal text-slate-400">GB</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {language === 'vi' ? `Tương đương ${Math.round(stats.totalGB * 1024)} Megabytes` : `Approx. ${Math.round(stats.totalGB * 1024)} Megabytes`}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800/80 text-[11px] font-mono text-slate-500">
            {language === 'vi' ? `Tổng cộng ${stats.countDays} ngày ghi nhận` : `Total ${stats.countDays} days recorded`}
          </div>
        </div>

        {/* Metric 2: Estimated Earnings */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="uppercase tracking-wider font-mono text-[11px]">
                {language === 'vi' ? 'Ước tính thu nhập' : 'Estimated Earnings'}
              </span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-400 tracking-tight">
              +${stats.estUsd.toFixed(3)} <span className="text-xs font-normal text-slate-400">USD</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {language === 'vi' ? 'Tỷ giá ước tính: ~$0.30 / GB' : 'Estimated rate: ~$0.30 / GB'}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800/80 text-[11px] font-mono text-slate-500">
            {language === 'vi' ? 'Thanh toán theo chuẩn Proxyrack' : 'Proxyrack standard payout'}
          </div>
        </div>

        {/* Metric 3: Average Daily Bandwidth */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="uppercase tracking-wider font-mono text-[11px]">
                {language === 'vi' ? 'Trung bình / Ngày' : 'Daily Average'}
              </span>
              <BarChart3 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-white tracking-tight">
              {stats.avgGB.toFixed(3)} <span className="text-xs font-normal text-slate-400">{language === 'vi' ? 'GB/ngày' : 'GB/day'}</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {language === 'vi' ? `Khoảng ${Math.round(stats.avgGB * 1024)} MB mỗi 24h` : `Approx. ${Math.round(stats.avgGB * 1024)} MB per 24h`}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800/80 text-[11px] font-mono text-emerald-400">
            ~${(stats.avgGB * 0.3).toFixed(3)} USD / {language === 'vi' ? 'ngày' : 'day'}
          </div>
        </div>

        {/* Metric 4: Peak Day */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="uppercase tracking-wider font-mono text-[11px]">
                {language === 'vi' ? 'Ngày cao điểm nhất' : 'Peak Traffic Day'}
              </span>
              <Activity className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-white tracking-tight">
              {stats.maxGB.toFixed(3)} <span className="text-xs font-normal text-slate-400">GB</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-mono">
              {language === 'vi' ? 'Ngày:' : 'Date:'} {stats.peakDate || 'N/A'}
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800/80 text-[11px] font-mono text-emerald-400">
            {language === 'vi' ? 'Doanh thu đỉnh:' : 'Peak earnings:'} +${(stats.maxGB * 0.3).toFixed(3)} USD
          </div>
        </div>
      </div>

      {/* Real Bandwidth Chart Component */}
      <div>
        {errorMsg ? (
          <div className="p-4 bg-slate-900 border border-rose-900/50 rounded-xl text-xs text-rose-300">
            {errorMsg}
          </div>
        ) : (
          <BandwidthChart
            data={bandwidthData}
            title={language === 'vi' 
              ? `Biểu đồ băng thông theo ngày (${selectedPreset.toUpperCase()}: ${activeRangeDates.start} → ${activeRangeDates.end})` 
              : `Daily Bandwidth History (${selectedPreset.toUpperCase()}: ${activeRangeDates.start} → ${activeRangeDates.end})`}
            subtitle={language === 'vi'
              ? `Dữ liệu tài khoản tổng hợp · ${stats.countDays} mốc ngày · Tổng ${stats.totalGB.toFixed(3)} GB (${stateStr || 'Cập nhật từ Proxyrack'})`
              : `Aggregated account traffic · ${stats.countDays} days · Total ${stats.totalGB.toFixed(3)} GB (${stateStr || 'Live from Proxyrack'})`}
          />
        )}
      </div>

      {/* Daily Breakdown Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              {language === 'vi' 
                ? `Bảng kê chi tiết theo ngày (${tableRecords.length} ngày)` 
                : `Daily Traffic Breakdown (${tableRecords.length} days)`}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {language === 'vi'
                ? 'So sánh mức độ tăng trưởng lưu lượng so với ngày trước và doanh thu tương ứng.'
                : 'Compare day-over-day traffic growth and corresponding estimated revenue.'}
            </p>
          </div>

          <div className="text-[11px] text-slate-500 font-mono">
            {stateStr ? stateStr : (language === 'vi' ? 'Thời gian thực' : 'Real-time')}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-sans font-medium">
                <th className="py-2.5 px-3">{language === 'vi' ? 'Ngày' : 'Date'}</th>
                <th className="py-2.5 px-3">{language === 'vi' ? 'Băng thông (GB)' : 'Bandwidth (GB)'}</th>
                <th className="py-2.5 px-3">{language === 'vi' ? 'Băng thông (MB)' : 'Bandwidth (MB)'}</th>
                <th className="py-2.5 px-3">{language === 'vi' ? 'Tỷ lệ đóng góp' : 'Traffic Share'}</th>
                <th className="py-2.5 px-3">{language === 'vi' ? 'So với hôm trước' : 'vs Previous Day'}</th>
                <th className="py-2.5 px-3 text-right">{language === 'vi' ? 'Ước tính thu nhập' : 'Est. Earnings'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {tableRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 font-sans">
                    {language === 'vi' ? 'Không có dữ liệu trong khoảng thời gian này' : 'No bandwidth recorded in this date range'}
                  </td>
                </tr>
              ) : (
                tableRecords.map((r) => {
                  return (
                    <tr key={r.date} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3 text-slate-300 font-semibold">{r.date}</td>
                      <td className="py-2.5 px-3 text-slate-100 font-bold">{r.gb.toFixed(4)} GB</td>
                      <td className="py-2.5 px-3 text-slate-400">{r.mb} MB</td>
                      <td className="py-2.5 px-3 text-slate-400">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-slate-950 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${Math.min(r.percentOfTotal, 100)}%` }}
                            />
                          </div>
                          <span>{r.percentOfTotal.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        {r.diffPercent === null ? (
                          <span className="text-slate-600">-</span>
                        ) : r.diffPercent > 0 ? (
                          <span className="text-emerald-400 flex items-center gap-0.5">
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            +{r.diffPercent}%
                          </span>
                        ) : r.diffPercent < 0 ? (
                          <span className="text-rose-400 flex items-center gap-0.5">
                            <ArrowDownRight className="w-3.5 h-3.5" />
                            {r.diffPercent}%
                          </span>
                        ) : (
                          <span className="text-slate-400">0%</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-400 font-semibold">
                        +${r.estUsd.toFixed(3)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Real API Call Footer info */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400 shrink-0 font-mono text-[10px]">
            API
          </div>
          <div className="text-slate-400">
            Endpoint: <code className="text-slate-200">POST https://peer.proxyrack.com/api/bandwidth</code>{' '}
            (Payload: <code className="text-slate-200">{JSON.stringify({ date_start: activeRangeDates.start, date_end: activeRangeDates.end })}</code>)
          </div>
        </div>
        {latencyMs !== null && (
          <div className="text-[11px] font-mono text-slate-500">
            {language === 'vi' ? 'Thời gian phản hồi:' : 'Response time:'} {latencyMs}ms
          </div>
        )}
      </div>
      </>
      )}
    </div>
  );
}
