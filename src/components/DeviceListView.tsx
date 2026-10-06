import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  Search, 
  Plus, 
  Cpu, 
  Activity, 
  LineChart, 
  Copy, 
  Check, 
  RefreshCw, 
  Pencil, 
  Trash2, 
  Terminal, 
  TrendingUp, 
  Globe, 
  AlertTriangle, 
  X, 
  FileSpreadsheet, 
  BarChart3, 
  LayoutGrid,
  Table as TableIcon,
  CheckSquare,
  Square,
  MinusSquare,
  HardDrive,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CloudUpload,
  StopCircle,
  HelpCircle
} from 'lucide-react';
import { DeviceItem, ProxyrackBandwidthResponse, UserAccount } from '../types';
import { proxyrackApi } from '../services/proxyrackApi';
import { ImportExportModal } from './ImportExportModal';
import { MultiDeviceBandwidthChart } from './MultiDeviceBandwidthChart';
import { BulkDeleteModal } from './BulkDeleteModal';
import { useLanguage } from '../contexts/LanguageContext';

interface DeviceListViewProps {
  devices: DeviceItem[];
  apiKey: string;
  activeAccount: UserAccount | undefined;
  onSelectDevice: (device: DeviceItem) => void;
  onOpenAddModal: () => void;
  onEditDevice: (device: DeviceItem) => void;
  onDeleteDevice: (deviceId: string) => void;
  onBulkDeleteDevices: (deviceIds: string[]) => void;
  onImportDevices: (imported: DeviceItem[], overwrite: boolean) => void;
  onUpdateDeviceStatus: (deviceId: string, status: 'online' | 'offline' | 'error') => void;
  onNavigateToConsole?: () => void;
}

export function DeviceListView({
  devices,
  apiKey,
  activeAccount,
  onSelectDevice,
  onOpenAddModal,
  onEditDevice,
  onDeleteDevice,
  onBulkDeleteDevices,
  onImportDevices,
  onUpdateDeviceStatus,
  onNavigateToConsole,
}: DeviceListViewProps) {
  const { language } = useLanguage();
  const [activeViewMode, setActiveViewMode] = useState<'cards' | 'table' | 'chart'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pingingId, setPingingId] = useState<string | null>(null);
  const [pingFeedback, setPingFeedback] = useState<Record<string, string>>({});

  // Multi-select state for bulk actions
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<Set<string>>(new Set());
  const [isBulkPinging, setIsBulkPinging] = useState(false);
  const [bulkPingProgress, setBulkPingProgress] = useState<{
    current: number;
    total: number;
    currentDeviceName: string;
  } | null>(null);
  const [bulkPingSummary, setBulkPingSummary] = useState<{
    total: number;
    online: number;
    offline: number;
    error: number;
  } | null>(null);

  // Bulk Add to API state (with 5-second delay between each device)
  const [isBulkAddingApi, setIsBulkAddingApi] = useState(false);
  const [bulkAddProgress, setBulkAddProgress] = useState<{
    current: number;
    total: number;
    currentDeviceName: string;
    countdownSeconds?: number;
    statusText?: string;
  } | null>(null);
  const [bulkAddSummary, setBulkAddSummary] = useState<{
    total: number;
    success: number;
    failed: number;
  } | null>(null);
  const cancelBulkAddRef = useRef(false);

  // Modals
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [singleDeviceToDelete, setSingleDeviceToDelete] = useState<DeviceItem | null>(null);

  // Bandwidth overview for current account
  const [bandwidthResponse, setBandwidthResponse] = useState<ProxyrackBandwidthResponse | null>(null);
  const [isLoadingBandwidth, setIsLoadingBandwidth] = useState(false);

  const fetchBandwidthSummary = async () => {
    if (!apiKey) return;
    setIsLoadingBandwidth(true);
    try {
      const res = await proxyrackApi.getBandwidth(apiKey);
      setBandwidthResponse(res);
    } catch {
      // silently handle
    } finally {
      setIsLoadingBandwidth(false);
    }
  };

  useEffect(() => {
    fetchBandwidthSummary();
  }, [apiKey]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handlePing = async (device: DeviceItem) => {
    if (device.device_id === 'ALL') {
      setPingingId('ALL');
      try {
        const bal = await proxyrackApi.getBalance(apiKey);
        setPingFeedback((prev) => ({
          ...prev,
          ALL: language === 'vi' 
            ? `Cụm ALL Online · Số dư: ${bal.data?.balance || 'N/A'}`
            : `Cluster ALL Online · Balance: ${bal.data?.balance || 'N/A'}`,
        }));
      } catch {
        setPingFeedback((prev) => ({
          ...prev,
          ALL: language === 'vi' ? 'Lỗi kiểm tra cụm' : 'Cluster test error',
        }));
      } finally {
        setPingingId(null);
      }
      return;
    }

    setPingingId(device.device_id);
    try {
      const res = await proxyrackApi.checkDeviceStatus(apiKey, device.device_id);
      if (res.status === 'success') {
        setPingFeedback((prev) => ({
          ...prev,
          [device.device_id]: language === 'vi' ? 'Online · Phản hồi tốt' : 'Online · Healthy',
        }));
        onUpdateDeviceStatus(device.device_id, 'online');
      } else {
        const errMsg = res.error || '';
        const isApiOrNetworkError = (
          res.status === 'error' &&
          (errMsg.toLowerCase().includes('lỗi') ||
           errMsg.toLowerCase().includes('error') ||
           errMsg.toLowerCase().includes('connect') ||
           errMsg.toLowerCase().includes('máy chủ') ||
           errMsg.toLowerCase().includes('server') ||
           errMsg.toLowerCase().includes('timeout') ||
           errMsg.toLowerCase().includes('502') ||
           errMsg.toLowerCase().includes('500') ||
           errMsg.toLowerCase().includes('network') ||
           errMsg.toLowerCase().includes('failed'))
        );

        if (isApiOrNetworkError) {
          setPingFeedback((prev) => ({
            ...prev,
            [device.device_id]: errMsg || (language === 'vi' ? 'Lỗi kết nối API máy chủ' : 'API server connection error'),
          }));
          onUpdateDeviceStatus(device.device_id, 'error');
        } else {
          setPingFeedback((prev) => ({
            ...prev,
            [device.device_id]: errMsg || (language === 'vi' ? 'Offline · Chưa online hoặc ID mới' : 'Offline or new ID'),
          }));
          onUpdateDeviceStatus(device.device_id, 'offline');
        }
      }
    } catch {
      setPingFeedback((prev) => ({
        ...prev,
        [device.device_id]: language === 'vi' ? 'Lỗi kết nối máy chủ' : 'Server connection error',
      }));
      onUpdateDeviceStatus(device.device_id, 'error');
    } finally {
      setPingingId(null);
    }
  };

  // Sorting state for device list (default sorted by device_name ascending with natural sort)
  const [sortField, setSortField] = useState<'device_name' | 'device_id' | 'status' | 'addedAt'>('device_name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: 'device_name' | 'device_id' | 'status' | 'addedAt') => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Alphanumeric natural comparison (e.g. vb1, vb2, .. vb9, vb10)
  const naturalCompare = (a: string = '', b: string = ''): number => {
    return (a || '').localeCompare(b || '', undefined, { numeric: true, sensitivity: 'base' });
  };

  // Helper to determine exact device status: 'online' | 'offline' | 'error' | 'unknown'
  const getDeviceStatus = useCallback((device: DeviceItem): 'online' | 'offline' | 'error' | 'unknown' => {
    // 1. Session live ping feedback has top priority
    const fb = pingFeedback[device.device_id];
    if (fb) {
      const lower = fb.toLowerCase();
      if (lower.includes('online') || lower.includes('phản hồi tốt') || lower.includes('healthy')) return 'online';
      if (lower.includes('lỗi') || lower.includes('error') || lower.includes('thất bại') || lower.includes('failed')) return 'error';
      if (lower.includes('offline') || lower.includes('chưa online') || lower.includes('id mới')) return 'offline';
    }

    // 2. An unchecked device without verified ping timestamp is strictly 'unknown' (neither online nor offline nor error)
    if (!device.lastPingTime || device.lastPingTime === 'Chưa kiểm tra' || device.lastPingStatus === 'unknown') {
      return 'unknown';
    }

    if (device.lastPingStatus === 'online') return 'online';
    if (device.lastPingStatus === 'offline') return 'offline';
    if (device.lastPingStatus === 'error') return 'error';
    return 'unknown';
  }, [pingFeedback]);

  // Aggregate counts for the 4 distinct statuses
  const statusCounts = useMemo(() => {
    let online = 0;
    let offline = 0;
    let error = 0;
    let unknown = 0;
    devices.forEach((d) => {
      const s = getDeviceStatus(d);
      if (s === 'online') online++;
      else if (s === 'offline') offline++;
      else if (s === 'error') error++;
      else unknown++;
    });
    return { online, offline, error, unknown };
  }, [devices, getDeviceStatus]);

  // Filter and naturally sort devices for current search
  const filteredCustomDevices = useMemo(() => {
    const list = devices.filter((d) => {
      const q = searchQuery.toLowerCase();
      return (
        d.device_name.toLowerCase().includes(q) ||
        d.device_id.toLowerCase().includes(q)
      );
    });

    return [...list].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'device_name') {
        cmp = naturalCompare(a.device_name, b.device_name);
      } else if (sortField === 'device_id') {
        cmp = naturalCompare(a.device_id, b.device_id);
      } else if (sortField === 'status') {
        // Group by status priority: online (1) -> offline (2) -> error (3) -> unknown (4)
        const orderMap: Record<string, number> = { online: 1, offline: 2, error: 3, unknown: 4 };
        const statusA = getDeviceStatus(a);
        const statusB = getDeviceStatus(b);
        cmp = (orderMap[statusA] || 4) - (orderMap[statusB] || 4);
        if (cmp === 0) {
          cmp = naturalCompare(a.device_name, b.device_name);
        }
      } else if (sortField === 'addedAt') {
        cmp = (a.addedAt || '').localeCompare(b.addedAt || '');
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [devices, searchQuery, sortField, sortOrder, getDeviceStatus]);

  // Bulk Selection Handlers
  const handleToggleSelectRow = (deviceId: string) => {
    setSelectedDeviceIds((prev) => {
      const next = new Set(prev);
      if (next.has(deviceId)) {
        next.delete(deviceId);
      } else {
        next.add(deviceId);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedDeviceIds.size === filteredCustomDevices.length && filteredCustomDevices.length > 0) {
      // Unselect all
      setSelectedDeviceIds(new Set());
    } else {
      // Select all visible
      const all = new Set<string>();
      filteredCustomDevices.forEach((d) => all.add(d.device_id));
      setSelectedDeviceIds(all);
    }
  };

  const isAllSelected = filteredCustomDevices.length > 0 && selectedDeviceIds.size === filteredCustomDevices.length;
  const isPartiallySelected = selectedDeviceIds.size > 0 && selectedDeviceIds.size < filteredCustomDevices.length;

  const selectedDevicesList = useMemo(() => {
    return devices.filter((d) => selectedDeviceIds.has(d.device_id));
  }, [devices, selectedDeviceIds]);

  const handleBulkPing = async () => {
    if (selectedDevicesList.length === 0 || !apiKey || isBulkPinging) return;

    setIsBulkPinging(true);
    setBulkPingSummary(null);
    let onlineCount = 0;
    let offlineCount = 0;
    let errorCount = 0;

    for (let i = 0; i < selectedDevicesList.length; i++) {
      const device = selectedDevicesList[i];
      setBulkPingProgress({
        current: i + 1,
        total: selectedDevicesList.length,
        currentDeviceName: device.device_name,
      });
      setPingingId(device.device_id);

      try {
        if (device.device_id === 'ALL') {
          const bal = await proxyrackApi.getBalance(apiKey);
          setPingFeedback((prev) => ({
            ...prev,
            ALL: language === 'vi'
              ? `Cụm ALL Online · Số dư: ${bal.data?.balance || 'N/A'}`
              : `Cluster ALL Online · Balance: ${bal.data?.balance || 'N/A'}`,
          }));
          onlineCount++;
        } else {
          const res = await proxyrackApi.checkDeviceStatus(apiKey, device.device_id);
          if (res.status === 'success') {
            setPingFeedback((prev) => ({
              ...prev,
              [device.device_id]: language === 'vi' ? 'Online · Phản hồi tốt' : 'Online · Healthy',
            }));
            onUpdateDeviceStatus(device.device_id, 'online');
            onlineCount++;
          } else {
            const errMsg = res.error || '';
            const isApiOrNetworkError = (
              res.status === 'error' &&
              (errMsg.toLowerCase().includes('lỗi') ||
               errMsg.toLowerCase().includes('error') ||
               errMsg.toLowerCase().includes('connect') ||
               errMsg.toLowerCase().includes('máy chủ') ||
               errMsg.toLowerCase().includes('server') ||
               errMsg.toLowerCase().includes('timeout') ||
               errMsg.toLowerCase().includes('502') ||
               errMsg.toLowerCase().includes('500') ||
               errMsg.toLowerCase().includes('network') ||
               errMsg.toLowerCase().includes('failed'))
            );

            if (isApiOrNetworkError) {
              setPingFeedback((prev) => ({
                ...prev,
                [device.device_id]: errMsg || (language === 'vi' ? 'Lỗi kết nối API máy chủ' : 'API server connection error'),
              }));
              onUpdateDeviceStatus(device.device_id, 'error');
              errorCount++;
            } else {
              setPingFeedback((prev) => ({
                ...prev,
                [device.device_id]: errMsg || (language === 'vi' ? 'Offline · Chưa online hoặc ID mới' : 'Offline or new ID'),
              }));
              onUpdateDeviceStatus(device.device_id, 'offline');
              offlineCount++;
            }
          }
        }
      } catch {
        setPingFeedback((prev) => ({
          ...prev,
          [device.device_id]: language === 'vi' ? 'Lỗi kết nối máy chủ' : 'Server connection error',
        }));
        onUpdateDeviceStatus(device.device_id, 'error');
        errorCount++;
      } finally {
        setPingingId(null);
      }

      // Delay 300ms between each ping request from API to prevent rate limits
      if (i < selectedDevicesList.length - 1) {
        await new Promise((r) => setTimeout(r, 300));
      }
    }

    setBulkPingProgress(null);
    setIsBulkPinging(false);
    setBulkPingSummary({
      total: selectedDevicesList.length,
      online: onlineCount,
      offline: offlineCount,
      error: errorCount,
    });
  };

  const handleCancelBulkAdd = () => {
    cancelBulkAddRef.current = true;
  };

  const handleBulkAddToApi = async () => {
    if (selectedDevicesList.length === 0 || !apiKey || isBulkAddingApi || isBulkPinging) return;

    setIsBulkAddingApi(true);
    setBulkAddSummary(null);
    cancelBulkAddRef.current = false;
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < selectedDevicesList.length; i++) {
      if (cancelBulkAddRef.current) break;

      const device = selectedDevicesList[i];
      setBulkAddProgress({
        current: i + 1,
        total: selectedDevicesList.length,
        currentDeviceName: device.device_name,
        statusText: language === 'vi' ? 'Đang gửi API Proxyrack...' : 'Sending Proxyrack API...',
      });
      setPingingId(device.device_id);

      try {
        const res = await proxyrackApi.addDevice(apiKey, device.device_id, device.device_name);
        setPingFeedback((prev) => ({
          ...prev,
          [device.device_id]: res.message || (language === 'vi' ? 'Đã thêm vào API' : 'Added to API'),
        }));
        successCount++;
      } catch (err: any) {
        setPingFeedback((prev) => ({
          ...prev,
          [device.device_id]: err.message || (language === 'vi' ? 'Lỗi thêm API' : 'API error'),
        }));
        failCount++;
      } finally {
        setPingingId(null);
      }

      // Delay 15 seconds before adding the next device
      if (i < selectedDevicesList.length - 1 && !cancelBulkAddRef.current) {
        for (let sec = 15; sec > 0; sec--) {
          if (cancelBulkAddRef.current) break;
          setBulkAddProgress({
            current: i + 1,
            total: selectedDevicesList.length,
            currentDeviceName: device.device_name,
            countdownSeconds: sec,
            statusText: language === 'vi' ? `Delay 15s (còn ${sec}s)...` : `Delay 15s (${sec}s remaining)...`,
          });
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    }

    setBulkAddProgress(null);
    setIsBulkAddingApi(false);
    setBulkAddSummary({
      total: selectedDevicesList.length,
      success: successCount,
      failed: failCount,
    });
  };

  const handleBulkDeletedDone = (deletedIds: string[]) => {
    onBulkDeleteDevices(deletedIds);
    setSelectedDeviceIds((prev) => {
      const next = new Set(prev);
      deletedIds.forEach((id) => next.delete(id));
      return next;
    });
    setIsBulkDeleteOpen(false);
  };

  const totalBwGB = Object.values(bandwidthResponse?.data?.bandwidth || {}).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-white tracking-tight">
              {language === 'vi' ? 'Danh sách Thiết bị' : 'Device Management'}
            </h1>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 rounded">
              {devices.length} {language === 'vi' ? 'thiết bị' : 'devices'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {language === 'vi'
              ? 'Quản lý thiết bị (Thêm, Sửa, Xóa đồng loạt, Xuất/Nhập) tự động gắn với tài khoản: '
              : 'Device management (Add, Edit, Bulk Delete, Import/Export) linked to account: '}
            <strong className="text-emerald-400">{activeAccount?.name || (language === 'vi' ? 'Tài khoản hiện tại' : 'Current Account')}</strong>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle: Cards vs Table vs Chart */}
          <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeViewMode === 'table'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>{language === 'vi' ? 'Dạng bảng' : 'Table'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveViewMode('cards')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeViewMode === 'cards'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>{language === 'vi' ? 'Dạng thẻ' : 'Cards'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveViewMode('chart')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeViewMode === 'chart'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>{language === 'vi' ? 'Biểu đồ so sánh' : 'Compare Chart'}</span>
            </button>
          </div>

          {/* Import / Export Button */}
          <button
            type="button"
            onClick={() => setIsImportExportOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>{language === 'vi' ? 'Xuất / Nhập' : 'Import / Export'}</span>
          </button>

          <button
            type="button"
            onClick={fetchBandwidthSummary}
            disabled={isLoadingBandwidth}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBandwidth ? 'animate-spin text-emerald-400' : ''}`} />
            <span>{language === 'vi' ? 'Làm mới' : 'Refresh'}</span>
          </button>

          {onNavigateToConsole && (
            <button
              type="button"
              onClick={onNavigateToConsole}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors"
            >
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              <span>API Console</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenAddModal}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{language === 'vi' ? 'Thêm thiết bị mới' : 'Add New Node'}</span>
          </button>
        </div>
      </div>

      {/* Cluster Overview (ALL) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-100">
                {language === 'vi' ? 'Toàn bộ cụm tài khoản (ALL Devices Cluster)' : 'Account Cluster (ALL Devices)'}
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-1.5 py-0.2 rounded">
                API Native
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {language === 'vi' ? 'Tổng lưu lượng 7 ngày:' : '7-Day Total Traffic:'}{' '}
              <strong className="text-white font-mono">{totalBwGB.toFixed(3)} GB</strong> (~${(totalBwGB * 0.3).toFixed(2)} USD) · {bandwidthResponse?.data?.state || (language === 'vi' ? 'Trực tiếp từ Proxyrack' : 'Live from Proxyrack')}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            onSelectDevice({
              device_id: 'ALL',
              device_name: language === 'vi' ? 'Tất cả thiết bị (Cluster Tổng)' : 'All Devices (Aggregate Cluster)',
              accountId: activeAccount?.id || '',
              addedAt: new Date().toISOString(),
              systemType: 'Linux/VPS',
              notes: language === 'vi' ? 'Tổng hợp mọi thiết bị của tài khoản Proxyrack' : 'Aggregated cluster for all Proxyrack nodes',
            })
          }
          className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-800/60 rounded-lg transition-colors shrink-0"
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>{language === 'vi' ? 'Xem biểu đồ cụm tổng' : 'View Cluster Chart'}</span>
        </button>
      </div>

      {/* BULK ACTION BAR */}
      {selectedDeviceIds.size > 0 && (
        <div className="bg-slate-900 border border-emerald-500/50 rounded-xl p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shadow-lg ring-1 ring-emerald-500/20 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-800/80 flex items-center justify-center text-emerald-400 shrink-0 font-bold text-xs">
              {selectedDeviceIds.size}
            </div>
            <div>
              <div className="text-xs font-semibold text-white flex flex-wrap items-center gap-2">
                <span>
                  {language === 'vi' 
                    ? `Đã chọn ${selectedDeviceIds.size} / ${devices.length} thiết bị`
                    : `Selected ${selectedDeviceIds.size} / ${devices.length} devices`}
                </span>
                {isBulkPinging && bulkPingProgress && (
                  <span className="text-[10px] text-cyan-300 font-mono bg-cyan-950/90 px-2 py-0.5 rounded border border-cyan-800 flex items-center gap-1.5 animate-pulse">
                    <Activity className="w-3 h-3 animate-spin text-cyan-400" />
                    <span>
                      {language === 'vi'
                        ? `Đang ping (${bulkPingProgress.current}/${bulkPingProgress.total}): ${bulkPingProgress.currentDeviceName} (delay 300ms)`
                        : `Pinging (${bulkPingProgress.current}/${bulkPingProgress.total}): ${bulkPingProgress.currentDeviceName}`}
                    </span>
                  </span>
                )}
                {isBulkAddingApi && bulkAddProgress && (
                  <span className="text-[10px] text-indigo-300 font-mono bg-indigo-950/90 px-2 py-0.5 rounded border border-indigo-800 flex items-center gap-1.5 animate-pulse">
                    <CloudUpload className="w-3 h-3 text-indigo-400" />
                    <span>
                      {language === 'vi'
                        ? `Đang thêm API (${bulkAddProgress.current}/${bulkAddProgress.total}): ${bulkAddProgress.currentDeviceName} ${
                            bulkAddProgress.countdownSeconds !== undefined
                              ? `· Chờ delay ${bulkAddProgress.countdownSeconds}s...`
                              : '· Gửi API...'
                          }`
                        : `Adding to API (${bulkAddProgress.current}/${bulkAddProgress.total}): ${bulkAddProgress.currentDeviceName} ${
                            bulkAddProgress.countdownSeconds !== undefined
                              ? `· Delay ${bulkAddProgress.countdownSeconds}s...`
                              : '· Calling API...'
                          }`}
                    </span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {bulkAddSummary ? (
                  <span className="text-indigo-400 font-medium">
                    {language === 'vi' 
                      ? `✓ Đã hoàn tất thêm lên API cho ${bulkAddSummary.total} thiết bị: ` 
                      : `✓ API registration finished for ${bulkAddSummary.total} devices: `}
                    <strong className="text-emerald-300">{bulkAddSummary.success} thành công</strong>,{' '}
                    <strong className="text-rose-400">{bulkAddSummary.failed} lỗi/bỏ qua</strong>.
                  </span>
                ) : bulkPingSummary ? (
                  <span className="text-emerald-400 font-medium">
                    {language === 'vi' 
                      ? `✓ Hoàn tất ping ${bulkPingSummary.total} thiết bị: ` 
                      : `✓ Ping finished for ${bulkPingSummary.total} devices: `}
                    <strong className="text-emerald-300">{bulkPingSummary.online} online</strong>,{' '}
                    <strong className="text-rose-400">{bulkPingSummary.offline} offline</strong>
                    {bulkPingSummary.error > 0 && (
                      <>, <strong className="text-amber-400">{bulkPingSummary.error} {language === 'vi' ? 'lỗi' : 'error'}</strong></>
                    )}.
                  </span>
                ) : (
                  <span>
                    {language === 'vi' 
                      ? 'Thực hiện thêm thiết bị lên API Proxyrack (delay 15s), ping kiểm tra hàng loạt, xóa đồng loạt hoặc so sánh biểu đồ.'
                      : 'Add devices to Proxyrack API (15s delay), bulk ping, bulk delete, or compare bandwidth charts.'}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Bulk Add to API Button (with 15s delay) */}
            {isBulkAddingApi ? (
              <button
                type="button"
                onClick={handleCancelBulkAdd}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-lg shadow-sm transition-colors"
                title={language === 'vi' ? 'Dừng tiến trình thêm thiết bị vào Proxyrack' : 'Stop adding devices to Proxyrack'}
              >
                <StopCircle className="w-3.5 h-3.5 animate-pulse" />
                <span>
                  {language === 'vi' ? 'Dừng lại' : 'Stop'} ({bulkAddProgress?.current}/{bulkAddProgress?.total}
                  {bulkAddProgress?.countdownSeconds !== undefined ? ` · ${bulkAddProgress.countdownSeconds}s` : ''})
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleBulkAddToApi}
                disabled={isBulkPinging || isBulkAddingApi}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg shadow-sm transition-colors"
                title={
                  language === 'vi'
                    ? 'Thêm lần lượt từng thiết bị vào API Proxyrack, mỗi lần thêm tự động delay 15s trước khi thêm thiết bị kế tiếp'
                    : 'Add selected devices sequentially to Proxyrack API with a 15-second delay before each next device'
                }
              >
                <CloudUpload className="w-3.5 h-3.5" />
                <span>
                  {language === 'vi' ? 'Thêm vào Proxyrack' : 'Add to Proxyrack'} ({selectedDeviceIds.size})
                </span>
              </button>
            )}

            {/* Bulk Ping Button */}
            <button
              type="button"
              onClick={handleBulkPing}
              disabled={isBulkPinging || isBulkAddingApi}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 rounded-lg shadow-sm transition-colors"
              title="Ping sequentially with 300ms delay"
            >
              <Activity className={`w-3.5 h-3.5 ${isBulkPinging ? 'animate-spin' : ''}`} />
              <span>
                {isBulkPinging
                  ? `${language === 'vi' ? 'Đang ping' : 'Pinging'} (${bulkPingProgress?.current}/${bulkPingProgress?.total})...`
                  : `Ping (${selectedDeviceIds.size})`}
              </span>
            </button>

            {/* Compare Chart Button */}
            <button
              type="button"
              disabled={isBulkPinging || isBulkAddingApi}
              onClick={() => setActiveViewMode('chart')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-800/60 rounded-lg transition-colors disabled:opacity-50"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>{language === 'vi' ? 'Biểu đồ' : 'Chart'} ({selectedDeviceIds.size})</span>
            </button>

            {/* Deselect Button */}
            <button
              type="button"
              disabled={isBulkPinging || isBulkAddingApi}
              onClick={() => {
                setSelectedDeviceIds(new Set());
                setBulkPingSummary(null);
                setBulkAddSummary(null);
              }}
              className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {language === 'vi' ? 'Bỏ chọn' : 'Deselect'}
            </button>

            {/* Bulk Delete Button */}
            <button
              type="button"
              disabled={isBulkPinging || isBulkAddingApi}
              onClick={() => setIsBulkDeleteOpen(true)}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-50 rounded-lg shadow-sm transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{language === 'vi' ? 'Xóa đồng loạt' : 'Bulk Delete'} ({selectedDeviceIds.size})</span>
            </button>
          </div>
        </div>
      )}

      {/* VIEW MODE 1: MULTI-DEVICE COMPARISON CHART */}
      {activeViewMode === 'chart' ? (
        <MultiDeviceBandwidthChart
          devices={devices}
          apiKey={apiKey}
          activeAccount={activeAccount}
          initialSelectedIds={selectedDeviceIds.size > 0 ? Array.from(selectedDeviceIds) : undefined}
        />
      ) : (
        <>
          {/* Search & Sort Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={language === 'vi' ? 'Tìm theo tên thiết bị hoặc Device ID...' : 'Search by device name or Device ID...'}
                className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <span className="hidden sm:inline">{language === 'vi' ? 'Sắp xếp:' : 'Sort:'}</span>
                <button
                  type="button"
                  onClick={() => handleSort('device_name')}
                  className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${
                    sortField === 'device_name'
                      ? 'bg-emerald-950/70 border-emerald-800 text-emerald-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                  title={language === 'vi' ? 'Sắp xếp theo tên (vb1, vb2, .. vb9, vb10)' : 'Natural sort by name (vb1, vb2, .. vb9, vb10)'}
                >
                  <span>{language === 'vi' ? 'Tên (vb1→vb10)' : 'Name (vb1→vb10)'}</span>
                  {sortField === 'device_name' ? (
                    sortOrder === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-emerald-400" /> : <ArrowDown className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />
                  )}
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800 text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{statusCounts.online} Online</span>
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-rose-950/60 border border-rose-800 text-rose-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                  <span>{statusCounts.offline} Offline</span>
                </span>
                {statusCounts.error > 0 && (
                  <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-950/60 border border-amber-800 text-amber-300">
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                    <span>{statusCounts.error} {language === 'vi' ? 'Lỗi' : 'Error'}</span>
                  </span>
                )}
                <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300">
                  <HelpCircle className="w-3 h-3 text-slate-400" />
                  <span>{statusCounts.unknown} {language === 'vi' ? 'Chưa kiểm tra' : 'Unchecked'}</span>
                </span>
                <span className="text-slate-600 hidden sm:inline">|</span>
                <span className="text-slate-400">
                  {language === 'vi' ? 'Tổng:' : 'Total:'} <strong className="text-slate-200">{filteredCustomDevices.length}</strong> / {devices.length} {language === 'vi' ? 'node' : 'nodes'}
                </span>
              </div>
            </div>
          </div>

          {/* Empty State */}
          {devices.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center space-y-4">
              <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 mx-auto">
                <Cpu className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-200">
                  {language === 'vi' ? 'Chưa có thiết bị nào trong danh sách' : 'No devices in your management list yet'}
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                  {language === 'vi'
                    ? 'Nhập mã device_id và tên gợi nhớ để thêm thiết bị hoặc nhập từ file CSV/JSON.'
                    : 'Enter device_id and a friendly name to add nodes or import from CSV/JSON.'}
                </p>
              </div>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={onOpenAddModal}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-2 transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>{language === 'vi' ? 'Thêm thiết bị đầu tiên' : 'Add First Device'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsImportExportOpen(true)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold inline-flex items-center gap-2 transition-colors shadow-sm"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>{language === 'vi' ? 'Nhập từ file (Import)' : 'Import from File'}</span>
                </button>
              </div>
            </div>
          ) : filteredCustomDevices.length === 0 ? (
            <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-400">
              {language === 'vi' 
                ? `Không tìm thấy thiết bị nào khớp với từ khóa "${searchQuery}".`
                : `No devices matched your search "${searchQuery}".`}
            </div>
          ) : activeViewMode === 'table' ? (
            /* VIEW MODE 2: TABLE VIEW WITH CHECKBOXES */
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 font-sans font-medium">
                      {/* Checkbox All */}
                      <th className="py-3 px-4 w-12 text-center">
                        <button
                          type="button"
                          onClick={handleToggleSelectAll}
                          className="text-slate-400 hover:text-white transition-colors"
                          title={isAllSelected ? (language === 'vi' ? 'Bỏ chọn tất cả' : 'Deselect all') : (language === 'vi' ? 'Chọn tất cả' : 'Select all')}
                        >
                          {isAllSelected ? (
                            <CheckSquare className="w-4 h-4 text-emerald-400" />
                          ) : isPartiallySelected ? (
                            <MinusSquare className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </th>
                      <th className="py-3 px-3">
                        <button
                          type="button"
                          onClick={() => handleSort('device_name')}
                          className="inline-flex items-center gap-1.5 hover:text-slate-200 transition-colors group cursor-pointer"
                          title={language === 'vi' ? 'Nhấp để đổi thứ tự sắp xếp theo tên (vb1, vb2.. vb9, vb10)' : 'Click to sort by name (vb1, vb2.. vb9, vb10)'}
                        >
                          <span>{language === 'vi' ? 'Tên thiết bị' : 'Device Name'}</span>
                          {sortField === 'device_name' ? (
                            sortOrder === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-emerald-400" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100" />
                          )}
                        </button>
                      </th>
                      <th className="py-3 px-3">
                        <button
                          type="button"
                          onClick={() => handleSort('device_id')}
                          className="inline-flex items-center gap-1.5 hover:text-slate-200 transition-colors group cursor-pointer"
                          title={language === 'vi' ? 'Nhấp để sắp xếp theo ID' : 'Click to sort by ID'}
                        >
                          <span>{language === 'vi' ? 'Mã Device ID' : 'Device ID'}</span>
                          {sortField === 'device_id' ? (
                            sortOrder === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-emerald-400" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100" />
                          )}
                        </button>
                      </th>
                      <th className="py-3 px-3">
                        <button
                          type="button"
                          onClick={() => handleSort('status')}
                          className="inline-flex items-center gap-1.5 hover:text-slate-200 transition-colors group cursor-pointer"
                          title={language === 'vi' ? 'Nhấp để sắp xếp theo trạng thái (Online, Offline, Chưa kiểm tra)' : 'Click to sort by status'}
                        >
                          <span>{language === 'vi' ? 'Trạng thái' : 'Status'}</span>
                          {sortField === 'status' ? (
                            sortOrder === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-emerald-400" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100" />
                          )}
                        </button>
                      </th>
                      <th className="py-3 px-3">
                        <button
                          type="button"
                          onClick={() => handleSort('addedAt')}
                          className="inline-flex items-center gap-1.5 hover:text-slate-200 transition-colors group cursor-pointer"
                          title={language === 'vi' ? 'Nhấp để sắp xếp theo ngày thêm' : 'Click to sort by date added'}
                        >
                          <span>{language === 'vi' ? 'Ngày thêm' : 'Date Added'}</span>
                          {sortField === 'addedAt' ? (
                            sortOrder === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-emerald-400" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100" />
                          )}
                        </button>
                      </th>
                      <th className="py-3 px-3 text-right">{language === 'vi' ? 'Thao tác' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredCustomDevices.map((device) => {
                      const isSelected = selectedDeviceIds.has(device.device_id);
                      const isPinging = pingingId === device.device_id;
                      const feedback = pingFeedback[device.device_id];
                      const status = getDeviceStatus(device);

                      return (
                        <tr
                          key={device.device_id}
                          className={`transition-colors ${
                            isSelected
                              ? 'bg-slate-800/70'
                              : 'hover:bg-slate-800/40'
                          }`}
                        >
                          {/* Row Checkbox */}
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleSelectRow(device.device_id)}
                              className="text-slate-400 hover:text-white transition-colors"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          </td>

                          {/* Device Name */}
                          <td className="py-3 px-3 font-sans">
                            <div className="flex items-center gap-2">
                              <Cpu className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span className="font-semibold text-slate-100">{device.device_name}</span>
                            </div>
                          </td>

                          {/* Device ID with copy */}
                          <td className="py-3 px-3 text-slate-300">
                            <div className="flex items-center gap-1.5 font-mono max-w-[220px]">
                              <span className="truncate select-all text-slate-200">{device.device_id}</span>
                              <button
                                type="button"
                                onClick={() => handleCopy(device.device_id, device.device_id)}
                                className="text-slate-500 hover:text-slate-200 p-0.5 shrink-0"
                                title={language === 'vi' ? 'Sao chép ID' : 'Copy ID'}
                              >
                                {copiedId === device.device_id ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </td>

                          {/* Trạng thái (Online / Offline / Chưa kiểm tra) */}
                          <td className="py-3 px-3">
                            {isPinging ? (
                              <span className="inline-flex items-center gap-1.5 text-xs text-cyan-300 bg-cyan-950/80 border border-cyan-800/80 px-2.5 py-1 rounded-full font-mono animate-pulse">
                                <Activity className="w-3 h-3 animate-spin text-cyan-400" />
                                <span>{language === 'vi' ? 'Đang ping...' : 'Pinging...'}</span>
                              </span>
                            ) : (
                              <div className="inline-flex items-center gap-2">
                                {status === 'online' ? (
                                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300 bg-emerald-950/80 border border-emerald-800 px-2.5 py-1 rounded-full shadow-sm">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    <span>Online</span>
                                  </span>
                                ) : status === 'offline' ? (
                                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-300 bg-rose-950/80 border border-rose-800 px-2.5 py-1 rounded-full shadow-sm">
                                    <span className="w-2 h-2 rounded-full bg-rose-400" />
                                    <span>Offline</span>
                                  </span>
                                ) : status === 'error' ? (
                                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-300 bg-amber-950/80 border border-amber-800 px-2.5 py-1 rounded-full shadow-sm">
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                                    <span>{language === 'vi' ? 'Lỗi' : 'Error'}</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-300 bg-slate-800/90 border border-slate-700 px-2.5 py-1 rounded-full shadow-sm">
                                    <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                                    <span>{language === 'vi' ? 'Chưa kiểm tra' : 'Not checked'}</span>
                                  </span>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handlePing(device)}
                                  disabled={isPinging || isBulkPinging}
                                  className="p-1 text-slate-500 hover:text-emerald-400 hover:bg-slate-800 rounded transition-colors disabled:opacity-40"
                                  title={
                                    feedback 
                                      ? `${language === 'vi' ? 'Chi tiết phản hồi:' : 'Feedback:'} ${feedback}` 
                                      : (language === 'vi' ? 'Nhấp để ping kiểm tra lại' : 'Click to ping status')
                                  }
                                >
                                  <Activity className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>

                          {/* Added Date */}
                          <td className="py-3 px-3 text-slate-500 text-[11px]">
                            {device.addedAt ? device.addedAt.split('T')[0] : (language === 'vi' ? 'Gần đây' : 'Recent')}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1 font-sans">
                              {/* View detail & stats */}
                              <button
                                type="button"
                                onClick={() => onSelectDevice(device)}
                                className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors"
                                title={language === 'vi' ? 'Xem thống kê băng thông' : 'View bandwidth statistics'}
                              >
                                <LineChart className="w-3.5 h-3.5" />
                              </button>

                              {/* Edit */}
                              <button
                                type="button"
                                onClick={() => onEditDevice(device)}
                                className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors"
                                title={language === 'vi' ? 'Chỉnh sửa tên' : 'Edit device'}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>

                              {/* Single Delete */}
                              <button
                                type="button"
                                onClick={() => setSingleDeviceToDelete(device)}
                                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                                title={language === 'vi' ? 'Xóa thiết bị' : 'Delete device'}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* VIEW MODE 3: CARDS GRID (Dạng thẻ) */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCustomDevices.map((device) => {
                const isSelected = selectedDeviceIds.has(device.device_id);
                const isPinging = pingingId === device.device_id;
                const feedback = pingFeedback[device.device_id];
                const status = getDeviceStatus(device);

                return (
                  <div
                    key={device.device_id}
                    className={`bg-slate-900 border rounded-xl p-5 shadow-sm transition-all flex flex-col justify-between space-y-4 group ${
                      isSelected ? 'border-emerald-500/80 ring-1 ring-emerald-500/50' : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      {/* Top info and action buttons (Edit, Delete, Checkbox) */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleSelectRow(device.device_id)}
                            className="text-slate-400 hover:text-white"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>

                          <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center shrink-0">
                            <Cpu className="w-4 h-4 text-emerald-400" />
                          </div>
                          <div>
                            <h3 className="text-sm font-semibold text-slate-100 group-hover:text-emerald-400 transition-colors">
                              {device.device_name}
                            </h3>
                            <div className="mt-1">
                              {status === 'online' ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300 bg-emerald-950/80 border border-emerald-800 px-2 py-0.5 rounded-full">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                  <span>Online</span>
                                </span>
                              ) : status === 'offline' ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-300 bg-rose-950/80 border border-rose-800 px-2 py-0.5 rounded-full">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                                  <span>Offline</span>
                                </span>
                              ) : status === 'error' ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300 bg-amber-950/80 border border-amber-800 px-2 py-0.5 rounded-full">
                                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                                  <span>{language === 'vi' ? 'Lỗi' : 'Error'}</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-300 bg-slate-800/90 border border-slate-700 px-2 py-0.5 rounded-full">
                                  <HelpCircle className="w-3 h-3 text-slate-400" />
                                  <span>{language === 'vi' ? 'Chưa kiểm tra' : 'Not checked'}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          {/* Edit Button */}
                          <button
                            type="button"
                            onClick={() => onEditDevice(device)}
                            className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors"
                            title={language === 'vi' ? 'Chỉnh sửa thiết bị' : 'Edit device'}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => setSingleDeviceToDelete(device)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                            title={language === 'vi' ? 'Xóa thiết bị' : 'Delete device'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Device ID Display with Copy */}
                      <div className="bg-slate-950 border border-slate-800/90 rounded-lg p-2.5 flex items-center justify-between text-xs font-mono text-slate-300 mt-3">
                        <div className="truncate mr-2">
                          <span className="text-slate-500 mr-1.5">ID:</span>
                          <strong className="text-slate-200 select-all">{device.device_id}</strong>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(device.device_id, device.device_id)}
                          className="text-slate-500 hover:text-slate-300 p-1 shrink-0 transition-colors"
                          title={language === 'vi' ? 'Sao chép Device ID' : 'Copy Device ID'}
                        >
                          {copiedId === device.device_id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      {/* Feedback notice if pinged */}
                      {feedback && (
                        <div className="mt-2 text-[11px] font-mono text-emerald-300 bg-emerald-950/40 border border-emerald-800/40 rounded px-2.5 py-1">
                          {feedback}
                        </div>
                      )}
                    </div>

                    {/* Bottom Actions: Ping Status & View Bandwidth Detail */}
                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handlePing(device)}
                        disabled={isPinging || isBulkPinging}
                        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-800/80 hover:bg-slate-800 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Activity className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin text-cyan-400' : ''}`} />
                        <span>
                          {isPinging 
                            ? (language === 'vi' ? 'Đang ping (300ms)...' : 'Pinging (300ms)...') 
                            : (language === 'vi' ? 'Kiểm tra status' : 'Check Status')}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onSelectDevice(device)}
                        className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 hover:text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/40 border border-emerald-800/40 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <LineChart className="w-3.5 h-3.5" />
                        <span>{language === 'vi' ? 'Xem thống kê' : 'View Stats'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Single Delete Confirmation Modal */}
      {singleDeviceToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-950/60 border border-rose-800/60 flex items-center justify-center text-rose-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">
                  {language === 'vi' ? 'Xác nhận xóa thiết bị?' : 'Confirm Device Deletion'}
                </h3>
                <p className="text-xs text-slate-400">
                  {language === 'vi' ? 'Gỡ bỏ khỏi danh sách quản lý.' : 'Remove from device management list.'}
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs space-y-1">
              <div>
                <span className="text-slate-400">{language === 'vi' ? 'Tên thiết bị:' : 'Device Name:'}</span>{' '}
                <strong className="text-slate-200">{singleDeviceToDelete.device_name}</strong>
              </div>
              <div className="truncate font-mono">
                <span className="text-slate-400">Device ID:</span>{' '}
                <span className="text-slate-300">{singleDeviceToDelete.device_id}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSingleDeviceToDelete(null)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              >
                {language === 'vi' ? 'Hủy' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteDevice(singleDeviceToDelete.device_id);
                  setSingleDeviceToDelete(null);
                }}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-colors shadow-sm"
              >
                {language === 'vi' ? 'Xóa vĩnh viễn' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Modal with choices: Storage only vs API & Storage */}
      <BulkDeleteModal
        isOpen={isBulkDeleteOpen}
        onClose={() => setIsBulkDeleteOpen(false)}
        selectedDevices={selectedDevicesList}
        apiKey={apiKey}
        onBulkDeleted={handleBulkDeletedDone}
      />

      {/* Import / Export Modal */}
      <ImportExportModal
        isOpen={isImportExportOpen}
        onClose={() => setIsImportExportOpen(false)}
        devices={devices}
        activeAccount={activeAccount}
        onImportDevices={onImportDevices}
      />
    </div>
  );
}
