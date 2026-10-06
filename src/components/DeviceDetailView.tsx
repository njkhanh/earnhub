import { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Cpu, 
  Copy, 
  Check, 
  RefreshCw, 
  Calendar, 
  Activity, 
  Server, 
  AlertCircle,
  CheckCircle2,
  Clock,
  TrendingUp,
  Globe,
  Plus,
  Send,
  Search
} from 'lucide-react';
import { DeviceItem, DeviceStatusResponse } from '../types';
import { proxyrackApi } from '../services/proxyrackApi';
import { BandwidthChart } from './BandwidthChart';
import { useLanguage } from '../contexts/LanguageContext';

interface DeviceDetailViewProps {
  device: DeviceItem | null | undefined;
  allDevices: DeviceItem[];
  apiKey: string;
  onBack: () => void;
  onSelectDevice: (device: DeviceItem) => void;
  onUpdateDeviceNotes: (deviceId: string, notes: string) => void;
  onOpenAddModal?: () => void;
}

export function DeviceDetailView({
  device,
  allDevices,
  apiKey,
  onBack,
  onSelectDevice,
  onUpdateDeviceNotes,
  onOpenAddModal,
}: DeviceDetailViewProps) {
  const { language } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [statusResult, setStatusResult] = useState<DeviceStatusResponse | null>(null);
  const [statusLatency, setStatusLatency] = useState<number | null>(null);

  // Bandwidth state
  const [dateRangePreset, setDateRangePreset] = useState<'7d' | '14d' | '30d' | 'custom'>('7d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [bandwidthData, setBandwidthData] = useState<Record<string, number>>({});
  const [isLoadingBandwidth, setIsLoadingBandwidth] = useState(false);
  const [bandwidthError, setBandwidthError] = useState<string | null>(null);

  // Notes editing
  const [deviceNotes, setDeviceNotes] = useState(device?.notes || '');
  const [isSavedNotes, setIsSavedNotes] = useState(false);

  // Ad-hoc input if no device selected
  const [lookupId, setLookupId] = useState('');

  // Format date helper
  const formatDateStr = (d: Date) => {
    return d.toISOString().split('T')[0];
  };

  // Fetch device bandwidth
  const loadDeviceBandwidth = async (
    targetDeviceId: string,
    preset: '7d' | '14d' | '30d' | 'custom',
    start?: string,
    end?: string
  ) => {
    if (!targetDeviceId) return;
    setIsLoadingBandwidth(true);
    setBandwidthError(null);

    let startDate: string | undefined;
    let endDate: string | undefined;

    const today = new Date();
    if (preset === '7d') {
      const past = new Date();
      past.setDate(today.getDate() - 6);
      startDate = formatDateStr(past);
      endDate = formatDateStr(today);
    } else if (preset === '14d') {
      const past = new Date();
      past.setDate(today.getDate() - 13);
      startDate = formatDateStr(past);
      endDate = formatDateStr(today);
    } else if (preset === '30d') {
      const past = new Date();
      past.setDate(today.getDate() - 29);
      startDate = formatDateStr(past);
      endDate = formatDateStr(today);
    } else {
      startDate = start;
      endDate = end;
    }

    try {
      const res = await proxyrackApi.getBandwidth(apiKey, targetDeviceId, startDate, endDate);
      if (res.status === 'success' && res.data) {
        setBandwidthData(res.data.bandwidth || {});
      } else {
        setBandwidthError(res.error || (language === 'vi' ? 'Không thể lấy dữ liệu băng thông' : 'Failed to retrieve bandwidth data'));
      }
    } catch (err: any) {
      setBandwidthError(err.message || (language === 'vi' ? 'Lỗi khi gọi API bandwidth Proxyrack' : 'Error calling Proxyrack bandwidth API'));
    } finally {
      setIsLoadingBandwidth(false);
    }
  };

  // Perform live device status check: POST /api/device/status
  const handleCheckStatus = async (targetDeviceId?: string) => {
    const idToCheck = targetDeviceId || device?.device_id;
    if (!idToCheck) return;

    if (idToCheck === 'ALL') {
      setIsCheckingStatus(true);
      setStatusResult(null);
      const start = performance.now();
      try {
        const bal = await proxyrackApi.getBalance(apiKey);
        const latency = Math.round(performance.now() - start);
        setStatusLatency(latency);
        setStatusResult({
          status: 'success',
          data: {
            device: 'ALL',
            account_status: language === 'vi' ? 'Cụm thiết bị đang hoạt động tốt' : 'Device cluster is running healthy',
            available_balance: bal.data?.balance,
            cluster_state: bal.data?.state,
          },
        });
      } catch (err: any) {
        const latency = Math.round(performance.now() - start);
        setStatusLatency(latency);
        setStatusResult({
          status: 'error',
          error: err.message || (language === 'vi' ? 'Lỗi kiểm tra cụm thiết bị' : 'Cluster test error'),
        });
      } finally {
        setIsCheckingStatus(false);
      }
      return;
    }

    setIsCheckingStatus(true);
    setStatusResult(null);
    const start = performance.now();
    try {
      const res = await proxyrackApi.checkDeviceStatus(apiKey, idToCheck);
      const latency = Math.round(performance.now() - start);
      setStatusLatency(latency);
      setStatusResult(res);
    } catch (err: any) {
      const latency = Math.round(performance.now() - start);
      setStatusLatency(latency);
      setStatusResult({
        status: 'error',
        error: err.message || (language === 'vi' ? 'Lỗi kết nối tới máy chủ' : 'Server connection error'),
      });
    } finally {
      setIsCheckingStatus(false);
    }
  };

  useEffect(() => {
    if (device?.device_id) {
      setDeviceNotes(device.notes || '');
      loadDeviceBandwidth(device.device_id, dateRangePreset);
      handleCheckStatus(device.device_id);
    }
  }, [device?.device_id, apiKey]);

  const handleCopyId = () => {
    if (!device?.device_id) return;
    navigator.clipboard.writeText(device.device_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSaveNotes = () => {
    if (!device?.device_id) return;
    onUpdateDeviceNotes(device.device_id, deviceNotes);
    setIsSavedNotes(true);
    setTimeout(() => setIsSavedNotes(false), 2000);
  };

  const handleLookupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupId.trim()) return;

    const matched = allDevices.find((d) => d.device_id === lookupId.trim());
    if (matched) {
      onSelectDevice(matched);
    } else {
      // Create ad-hoc view
      const temporaryDevice: DeviceItem = {
        device_id: lookupId.trim(),
        device_name: `${language === 'vi' ? 'Thiết bị' : 'Device'} ${lookupId.trim().slice(0, 10)}`,
        accountId: '',
        addedAt: new Date().toISOString(),
        systemType: 'Linux/VPS',
      };
      onSelectDevice(temporaryDevice);
    }
  };

  // If no device is currently available, show lookup & selection screen
  if (!device) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              {language === 'vi' ? 'Chi tiết & Thống kê Thiết bị' : 'Device Details & Statistics'}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {language === 'vi'
                ? 'Tra cứu trạng thái hoặc chọn một thiết bị để xem thống kê băng thông chi tiết và biểu đồ.'
                : 'Inspect status or pick a node to view detailed bandwidth statistics and graphs.'}
            </p>
          </div>
        </div>

        {/* Ad-hoc device checker card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm max-w-xl mx-auto space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100">
                {language === 'vi' ? 'Tra cứu Device ID trực tiếp' : 'Direct Device ID Lookup'}
              </h2>
              <p className="text-xs text-slate-400">
                {language === 'vi'
                  ? 'Nhập Device ID bất kỳ để kiểm tra trạng thái và xem biểu đồ lưu lượng băng thông.'
                  : 'Enter any Device ID to query live status and review historical bandwidth usage.'}
              </p>
            </div>
          </div>

          <form onSubmit={handleLookupSubmit} className="space-y-3">
            <div>
              <input
                type="text"
                value={lookupId}
                onChange={(e) => setLookupId(e.target.value)}
                placeholder={language === 'vi' ? 'Nhập mã device_id (ví dụ: device-id-01)...' : 'Enter device_id (e.g. device-id-01)...'}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={!lookupId.trim()}
                className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{language === 'vi' ? 'Xem thống kê thiết bị' : 'Inspect Device'}</span>
              </button>
              {onOpenAddModal && (
                <button
                  type="button"
                  onClick={onOpenAddModal}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{language === 'vi' ? 'Gán mới' : 'Add New'}</span>
                </button>
              )}
            </div>
          </form>

          {allDevices.length > 0 && (
            <div className="pt-4 border-t border-slate-800 space-y-2">
              <div className="text-xs text-slate-400 font-medium">
                {language === 'vi' ? 'Hoặc chọn từ danh sách đã lưu:' : 'Or choose from saved devices:'}
              </div>
              <div className="space-y-1.5">
                {allDevices.map((d) => (
                  <button
                    key={d.device_id}
                    type="button"
                    onClick={() => onSelectDevice(d)}
                    className="w-full text-left p-2.5 bg-slate-950/60 hover:bg-slate-950 border border-slate-800 rounded-lg text-xs flex items-center justify-between group transition-colors"
                  >
                    <div>
                      <span className="font-medium text-slate-200 group-hover:text-emerald-400">
                        {d.device_name}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono ml-2">
                        ({d.device_id})
                      </span>
                    </div>
                    <span className="text-emerald-400 text-xs">
                      {language === 'vi' ? 'Xem chi tiết →' : 'View Details →'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const totalBandwidthInView = Object.values(bandwidthData).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      {/* Top Bar Navigation & Device Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-lg transition-colors"
            title={language === 'vi' ? 'Quay lại danh sách thiết bị' : 'Back to devices'}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">{device.device_name}</h1>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
                {device.systemType || 'Linux Node'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span>Device ID:</span>
              <code className="text-slate-300 font-mono">{device.device_id}</code>
              <button
                type="button"
                onClick={handleCopyId}
                className="text-slate-500 hover:text-slate-300 p-0.5 transition-colors"
                title={language === 'vi' ? 'Sao chép Device ID' : 'Copy Device ID'}
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Quick device switch select */}
        {allDevices.length > 1 && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <label className="text-xs text-slate-400 hidden sm:inline">
              {language === 'vi' ? 'Chuyển node:' : 'Switch Node:'}
            </label>
            <select
              value={device.device_id}
              onChange={(e) => {
                const selected = allDevices.find((d) => d.device_id === e.target.value);
                if (selected) onSelectDevice(selected);
              }}
              className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              {allDevices.map((d) => (
                <option key={d.device_id} value={d.device_id}>
                  {d.device_name} ({d.device_id})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Live Device Status Diagnostic Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-100">
                  {language === 'vi' ? 'Trạng thái node thiết bị' : 'Node Live Diagnostic'}
                </span>
                <span className="text-[10px] font-mono text-slate-500">POST /api/device/status</span>
              </div>
              <p className="text-xs text-slate-400">
                {language === 'vi'
                  ? 'Kiểm tra trực tiếp phản hồi từ cụm máy chủ Proxyrack Peer'
                  : 'Direct health ping from Proxyrack Peer servers'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleCheckStatus()}
            disabled={isCheckingStatus}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-400 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-800/60 rounded-lg transition-colors self-start sm:self-auto disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isCheckingStatus ? 'animate-spin' : ''}`} />
            <span>
              {isCheckingStatus 
                ? (language === 'vi' ? 'Đang ping Proxyrack...' : 'Pinging Proxyrack...') 
                : (language === 'vi' ? 'Ping kiểm tra ngay' : 'Ping Status Now')}
            </span>
          </button>
        </div>

        {/* Live Status Result Display */}
        {statusResult ? (
          <div className="space-y-2">
            <div
              className={`p-3 rounded-lg border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                statusResult.status === 'success'
                  ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300'
                  : 'bg-slate-950 border-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                {statusResult.status === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                )}
                <div>
                  <span className="font-semibold">
                    {statusResult.status === 'success'
                      ? (language === 'vi' ? 'Thiết bị phản hồi thành công (Online)' : 'Device responding successfully (Online)')
                      : statusResult.error || (language === 'vi' ? 'Trạng thái node chưa kích hoạt hoặc ID mới' : 'Inactive or new device ID')}
                  </span>
                  {statusResult.details && (
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {language === 'vi' ? 'Chi tiết:' : 'Details:'} {JSON.stringify(statusResult.details)}
                    </div>
                  )}
                </div>
              </div>
              {statusLatency !== null && (
                <div className="text-[11px] font-mono text-slate-400 self-end sm:self-auto">
                  {language === 'vi' ? 'Độ trễ API:' : 'API Latency:'} {statusLatency}ms
                </div>
              )}
            </div>

            {statusResult.data && (
              <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-[11px] font-mono text-slate-300 overflow-x-auto">
                {JSON.stringify(statusResult.data, null, 2)}
              </pre>
            )}
          </div>
        ) : (
          <div className="text-xs text-slate-500 italic py-1">
            {language === 'vi'
              ? 'Bấm "Ping kiểm tra ngay" để lấy dữ liệu trạng thái thời gian thực từ Proxyrack.'
              : 'Click "Ping Status Now" to query live status from Proxyrack.'}
          </div>
        )}
      </div>

      {/* Date Range Selector & Bandwidth Chart */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-slate-100">
              {language === 'vi' ? 'Thống kê lưu lượng băng thông thiết bị' : 'Device Bandwidth Analytics'}
            </h2>
          </div>

          {/* Presets */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-lg">
            {(['7d', '14d', '30d', 'custom'] as const).map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => {
                  setDateRangePreset(preset);
                  if (preset !== 'custom') {
                    loadDeviceBandwidth(device.device_id, preset);
                  }
                }}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  dateRangePreset === preset
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {preset === '7d' 
                  ? (language === 'vi' ? '7 ngày' : '7 Days') 
                  : preset === '14d' 
                  ? (language === 'vi' ? '14 ngày' : '14 Days') 
                  : preset === '30d' 
                  ? (language === 'vi' ? '30 ngày' : '30 Days') 
                  : (language === 'vi' ? 'Tuỳ chọn' : 'Custom')}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Form if selected */}
        {dateRangePreset === 'custom' && (
          <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">{language === 'vi' ? 'Từ ngày (Y-m-d):' : 'Start Date (Y-m-d):'}</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-2.5 py-1 bg-slate-950 border border-slate-700 rounded text-slate-200 text-xs font-mono"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">{language === 'vi' ? 'Đến ngày (Y-m-d):' : 'End Date (Y-m-d):'}</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-2.5 py-1 bg-slate-950 border border-slate-700 rounded text-slate-200 text-xs font-mono"
              />
            </div>
            <button
              type="button"
              onClick={() => loadDeviceBandwidth(device.device_id, 'custom', customStart, customEnd)}
              disabled={!customStart || !customEnd || isLoadingBandwidth}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium transition-colors disabled:opacity-50"
            >
              {language === 'vi' ? 'Áp dụng lọc' : 'Apply Filter'}
            </button>
          </div>
        )}

        {/* Bandwidth Chart */}
        {bandwidthError ? (
          <div className="p-4 bg-slate-900 border border-rose-900/40 rounded-xl text-xs text-rose-300">
            {bandwidthError}
          </div>
        ) : (
          <BandwidthChart
            data={bandwidthData}
            title={language === 'vi' ? `Băng thông của thiết bị: ${device.device_name}` : `Bandwidth for: ${device.device_name}`}
            subtitle={language === 'vi'
              ? `Lưu lượng đã tải: ${totalBandwidthInView.toFixed(3)} GB · Thu nhập ước tính: ~$${(totalBandwidthInView * 0.3).toFixed(2)}`
              : `Traffic consumed: ${totalBandwidthInView.toFixed(3)} GB · Estimated earnings: ~$${(totalBandwidthInView * 0.3).toFixed(2)}`}
          />
        )}
      </div>

      {/* Daily Breakdown Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider mb-3">
          {language === 'vi' 
            ? `Bảng kê chi tiết theo ngày (${Object.keys(bandwidthData).length} bản ghi)` 
            : `Daily Usage Breakdown (${Object.keys(bandwidthData).length} records)`}
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-medium">
                <th className="py-2.5 px-3">{language === 'vi' ? 'Ngày' : 'Date'}</th>
                <th className="py-2.5 px-3">{language === 'vi' ? 'Lưu lượng (GB)' : 'Traffic (GB)'}</th>
                <th className="py-2.5 px-3">{language === 'vi' ? 'Lưu lượng (MB)' : 'Traffic (MB)'}</th>
                <th className="py-2.5 px-3 text-right">{language === 'vi' ? 'Ước tính doanh thu' : 'Est. Revenue'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {Object.keys(bandwidthData).length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-slate-500">
                    {language === 'vi' ? 'Không có dữ liệu trong khoảng thời gian đã chọn' : 'No bandwidth data found for selected period'}
                  </td>
                </tr>
              ) : (
                Object.keys(bandwidthData)
                  .sort()
                  .reverse()
                  .map((date) => {
                    const gb = bandwidthData[date] || 0;
                    const mb = Math.round(gb * 1024);
                    const est = (gb * 0.3).toFixed(3);
                    return (
                      <tr key={date} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-3 text-slate-300">{date}</td>
                        <td className="py-2.5 px-3 text-slate-100 font-semibold">{gb.toFixed(4)} GB</td>
                        <td className="py-2.5 px-3 text-slate-400">{mb} MB</td>
                        <td className="py-2.5 px-3 text-right text-emerald-400 font-semibold">+${est}</td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Metadata & Config Notes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Device specs */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
            {language === 'vi' ? 'Thông số kỹ thuật & Hạ tầng' : 'Technical Specifications & Infrastructure'}
          </h3>
          <div className="space-y-2 text-xs divide-y divide-slate-800/60">
            <div className="flex items-center justify-between py-1.5">
              <span className="text-slate-400">{language === 'vi' ? 'Môi trường triển khai:' : 'Deployment Environment:'}</span>
              <span className="font-mono text-slate-200">{device.systemType || 'Linux/VPS'}</span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-slate-400">{language === 'vi' ? 'Địa chỉ IP công khai:' : 'Public IP Address:'}</span>
              <span className="font-mono text-slate-200">{device.ip || (language === 'vi' ? 'Chưa gán' : 'Not assigned')}</span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-slate-400">{language === 'vi' ? 'Khu vực địa lý:' : 'Geolocation:'}</span>
              <span className="text-slate-200">{device.location || (language === 'vi' ? 'Tự động phát hiện' : 'Auto-detected')}</span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="text-slate-400">{language === 'vi' ? 'Thời gian tạo:' : 'Created At:'}</span>
              <span className="text-slate-400 font-mono">
                {device.addedAt ? new Date(device.addedAt).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Notes & Security lock */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                {language === 'vi' ? 'Ghi chú quản lý thiết bị' : 'Device Management Notes'}
              </h3>
              {isSavedNotes && (
                <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono">
                  <Check className="w-3 h-3" /> {language === 'vi' ? 'Đã lưu' : 'Saved'}
                </span>
              )}
            </div>
            <textarea
              rows={3}
              value={deviceNotes}
              onChange={(e) => setDeviceNotes(e.target.value)}
              placeholder={language === 'vi' 
                ? 'Nhập ghi chú cho node này (ví dụ: port, tên VPS, chi phí server...)' 
                : 'Enter notes for this node (e.g., VPS provider, port, monthly cost...)'}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={handleSaveNotes}
              className="mt-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 rounded-lg transition-colors"
            >
              {language === 'vi' ? 'Lưu ghi chú' : 'Save Notes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
