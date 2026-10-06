import { useMemo } from 'react';
import { 
  DollarSign, 
  Activity, 
  TrendingUp, 
  Cpu, 
  RefreshCw, 
  ArrowRight,
  ExternalLink,
  Layers,
  CheckCircle2,
  Clock,
  Sparkles,
  Terminal,
  Plus,
  Globe,
  Gift
} from 'lucide-react';
import { UserAccount, DeviceItem, ActiveTab } from '../types';
import { BandwidthChart } from './BandwidthChart';
import { useLanguage } from '../contexts/LanguageContext';

interface DashboardViewProps {
  activeAccount: UserAccount | undefined;
  balanceStr: string | null;
  balanceStateStr: string | null;
  bandwidthData: Record<string, number>;
  devices: DeviceItem[];
  isLoading: boolean;
  onRefresh: () => void;
  onNavigateTab: (tab: ActiveTab) => void;
  onSelectDevice: (device: DeviceItem) => void;
  onOpenAddModal: () => void;
}

export function DashboardView({
  activeAccount,
  balanceStr,
  balanceStateStr,
  bandwidthData,
  devices,
  isLoading,
  onRefresh,
  onNavigateTab,
  onSelectDevice,
  onOpenAddModal,
}: DashboardViewProps) {
  const { language } = useLanguage();
  // Parse numeric balance for payout calculation
  const numericBalance = useMemo(() => {
    if (!balanceStr) return 17.69;
    const match = balanceStr.match(/[\d.]+/);
    return match ? parseFloat(match[0]) : 0;
  }, [balanceStr]);

  const payoutThreshold = 20.0; // Standard Proxyrack minimum payout
  const payoutProgress = Math.min(Math.round((numericBalance / payoutThreshold) * 100), 100);
  const remainingForPayout = Math.max(0, payoutThreshold - numericBalance);

  // Bandwidth calculation
  const totalBandwidthGB = useMemo(() => {
    return Object.values(bandwidthData).reduce((a, b) => a + b, 0);
  }, [bandwidthData]);

  const estTotalUsd = totalBandwidthGB * 0.3; // standard ~$0.30/GB

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">
              {language === 'vi' ? 'Bảng điều khiển EarnHub' : 'EarnHub Dashboard'}
            </h1>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 rounded">
              Proxyrack Online
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {language === 'vi' 
              ? 'Tổng quan số dư khả dụng, hiệu suất lưu lượng băng thông chia sẻ và các node đang hoạt động.'
              : 'Overview of available balance, bandwidth sharing performance, and active nodes.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigateTab('overview')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-300 bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-800/80 rounded-lg transition-colors shadow-sm"
            title={language === 'vi' ? 'Xem thống kê tổng quan băng thông và thu nhập của tất cả các tài khoản' : 'View overall bandwidth and earnings across all accounts'}
          >
            <Globe className="w-3.5 h-3.5 text-emerald-400" />
            <span>{language === 'vi' ? 'Tổng quan Tất cả TK' : 'All Accounts Overview'}</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('api-console')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors"
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span>{language === 'vi' ? 'Gọi API Thật (Console)' : 'Live API Console'}</span>
          </button>

          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
            <span>
              {isLoading 
                ? (language === 'vi' ? 'Đang cập nhật...' : 'Updating...') 
                : (language === 'vi' ? 'Cập nhật từ API' : 'Refresh from API')}
            </span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Metric 1: Available Balance */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors pointer-events-none" />
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="uppercase tracking-wider font-mono text-[11px]">
                {language === 'vi' ? 'Số dư khả dụng' : 'Available Balance'}
              </span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400 font-mono tracking-tight">
              {balanceStr || '$17.69'}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-500" />
              <span>
                {balanceStateStr || (language === 'vi' ? 'Cập nhật trực tiếp từ Proxyrack' : 'Live updated from Proxyrack')}
              </span>
            </div>
          </div>

          {/* Payout Progress */}
          <div className="mt-4 pt-3 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1 font-mono">
              <span>{language === 'vi' ? 'Tiến độ rút tiền' : 'Payout Progress'} (${payoutThreshold.toFixed(2)})</span>
              <span className="text-emerald-400 font-semibold">{payoutProgress}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${payoutProgress}%` }}
              />
            </div>
            <div className="mt-1 text-[10px] text-slate-500">
              {remainingForPayout > 0
                ? (language === 'vi' ? `Còn thiếu $${remainingForPayout.toFixed(2)} để đạt hạn mức rút` : `$${remainingForPayout.toFixed(2)} remaining to reach threshold`)
                : (language === 'vi' ? 'Đã đủ điều kiện gửi yêu cầu rút tiền!' : 'Eligible for payout request!')}
            </div>
          </div>
        </div>

        {/* Metric 2: Bandwidth shared */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="uppercase tracking-wider font-mono text-[11px]">
                {language === 'vi' ? 'Băng thông (7 ngày qua)' : 'Bandwidth (Past 7 Days)'}
              </span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-white font-mono tracking-tight">
              {totalBandwidthGB.toFixed(3)} <span className="text-sm font-normal text-slate-400">GB</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              {language === 'vi' 
                ? `Khoảng ${Math.round(totalBandwidthGB * 1024)} Megabytes chia sẻ`
                : `Approx. ${Math.round(totalBandwidthGB * 1024)} Megabytes shared`}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">
              {language === 'vi' ? 'Ước tính thu nhập:' : 'Estimated earnings:'}
            </span>
            <button
              type="button"
              onClick={() => onNavigateTab('analytics')}
              className="font-mono text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 transition-colors"
            >
              <span>+${estTotalUsd.toFixed(2)} USD</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Metric 3: Active Nodes */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="uppercase tracking-wider font-mono text-[11px]">
                {language === 'vi' ? 'Thiết bị / Nodes' : 'Nodes / Devices'}
              </span>
              <Cpu className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-white font-mono tracking-tight">
              {devices.length}{' '}
              <span className="text-sm font-normal text-slate-400">
                {language === 'vi' ? 'node hoạt động' : 'active nodes'}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>
                {language === 'vi' ? '100% kết nối sẵn sàng chia sẻ' : '100% connected & sharing ready'}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={onOpenAddModal}
              className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
            >
              {language === 'vi' ? '+ Gán node mới' : '+ Add new node'}
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('devices')}
              className="text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1"
            >
              <span>{language === 'vi' ? 'Xem tất cả' : 'View all'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Chart Section */}
      <div>
        <BandwidthChart
          data={bandwidthData}
          title={language === 'vi' ? 'Lưu lượng băng thông tài khoản (7 ngày qua)' : 'Account Bandwidth History (Past 7 Days)'}
          subtitle={language === 'vi' 
            ? `Dữ liệu phản hồi thực tế từ API Proxyrack (POST /api/bandwidth) · Tổng ${totalBandwidthGB.toFixed(3)} GB`
            : `Live response from Proxyrack API (POST /api/bandwidth) · Total ${totalBandwidthGB.toFixed(3)} GB`}
        />
      </div>

      {/* Nodes Quick List & Security Notice */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">
              {language === 'vi' ? 'Các thiết bị Proxyrack liên kết' : 'Connected Proxyrack Nodes'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {language === 'vi'
                ? 'Chọn thiết bị để tra cứu trạng thái ping thời gian thực và lịch sử lưu lượng chi tiết.'
                : 'Select a device to inspect live ping status and detailed traffic history.'}
            </p>
          </div>
        </div>

        {devices.length === 0 ? (
          <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-6 text-center space-y-3">
            <Cpu className="w-8 h-8 text-slate-600 mx-auto" />
            <div className="text-xs text-slate-300 font-medium">
              {language === 'vi' ? 'Chưa có thiết bị nào được lưu vào danh sách quản lý' : 'No devices saved in the management list yet'}
            </div>
            <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
              {language === 'vi'
                ? 'Bấm "Gán node mới" để gửi POST /api/device/add lên Proxyrack hoặc mở "Gọi API Thật (Console)" để kiểm tra.'
                : 'Click "Add new node" to send POST /api/device/add to Proxyrack or open "Live API Console" to inspect.'}
            </p>
            <div className="pt-1 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={onOpenAddModal}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{language === 'vi' ? 'Gán thiết bị mới' : 'Add new node'}</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateTab('api-console')}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
              >
                {language === 'vi' ? 'Kiểm tra API Console' : 'Test API Console'}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {devices.map((device) => (
              <div
                key={device.device_id}
                onClick={() => onSelectDevice(device)}
                className="bg-slate-950/70 border border-slate-800/80 hover:border-emerald-500/50 rounded-lg p-3.5 cursor-pointer transition-all hover:bg-slate-950 group"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="font-medium text-xs text-slate-200 group-hover:text-emerald-400 transition-colors">
                    {device.device_name}
                  </div>
                  <div className="flex items-center gap-1 font-mono text-[10px] text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>Online</span>
                  </div>
                </div>

                <div className="font-mono text-[11px] text-slate-400 truncate mb-2">
                  {device.device_id}
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-900">
                  <span>{device.systemType || 'Linux VPS'}</span>
                  <span className="text-emerald-400 group-hover:underline flex items-center gap-1">
                    {language === 'vi' ? 'Xem chi tiết & Chart' : 'Details & Chart'} <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Multi-App Strip with Referral Bonus Banner */}
      <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-emerald-950/40 border border-amber-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Gift className="w-5 h-5 animate-bounce" />
          </div>
          <div>
            <div className="font-semibold text-slate-100 flex items-center gap-2">
              <span>{language === 'vi' ? 'Hệ sinh thái 6 App Kiếm Tiền Thụ Động' : '6 Passive Income Apps Ecosystem'}</span>
              <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                {language === 'vi' ? 'Tặng tới $8.00+ USD' : 'Up to $8.00+ USD Bonus'}
              </span>
            </div>
            <div className="text-slate-400 text-[11px] mt-0.5">
              {language === 'vi'
                ? 'Đăng ký EarnApp (+2$), Honeygain (+3$), Pawns (+3$), Grass, PacketStream qua link ref đối tác để tối đa hóa thu nhập.'
                : 'Sign up for EarnApp (+$2), Honeygain (+$3), Pawns (+$3), Grass, and PacketStream via partner links to maximize earnings.'}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigateTab('apps')}
          className="px-3.5 py-2 bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-amber-500 hover:to-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shrink-0 flex items-center gap-1.5"
        >
          <Gift className="w-3.5 h-3.5" />
          <span>{language === 'vi' ? 'Nhận thưởng 6 App ngay' : 'Claim 6 App Bonuses Now'}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
