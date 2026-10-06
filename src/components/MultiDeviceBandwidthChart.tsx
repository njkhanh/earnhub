import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  TrendingUp, 
  Calendar, 
  RefreshCw, 
  CheckSquare, 
  Square, 
  Check, 
  Activity, 
  Info,
  DollarSign,
  BarChart3,
  Layers,
  ArrowUpRight,
  Tag,
  Filter,
  X,
  Sparkles,
  Zap,
  Clock,
  Database,
  RotateCcw,
  AlertTriangle
} from 'lucide-react';
import { DeviceItem, UserAccount } from '../types';
import { proxyrackApi } from '../services/proxyrackApi';
import { useLanguage } from '../contexts/LanguageContext';

interface MultiDeviceBandwidthChartProps {
  devices: DeviceItem[];
  apiKey: string;
  activeAccount: UserAccount | undefined;
  initialSelectedIds?: string[];
}

export interface DeviceBandwidthCacheEntry {
  deviceId: string;
  start: string;
  end: string;
  bandwidth: Record<string, number>;
  cachedAt: number; // timestamp in ms
}

// 5 phút hạn lưu dữ liệu đệm chống quá tải API Proxyrack
const CACHE_TTL_MS = 5 * 60 * 1000;

type PresetTimeframe = 'week' | '7d' | 'month' | '30d';

const DEVICE_COLOR_PALETTE = [
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#8b5cf6', // Violet
  '#f59e0b', // Amber
  '#f43f5e', // Rose
  '#3b82f6', // Blue
  '#14b8a6', // Teal
  '#f97316', // Orange
  '#ec4899', // Pink
  '#6366f1', // Indigo
  '#84cc16', // Lime
  '#d946ef', // Fuchsia
];

export function MultiDeviceBandwidthChart({
  devices,
  apiKey,
  activeAccount,
  initialSelectedIds,
}: MultiDeviceBandwidthChartProps) {
  const { language } = useLanguage();
  // Timeframe
  const [preset, setPreset] = useState<PresetTimeframe>('7d');
  const [activeDates, setActiveDates] = useState<{ start: string; end: string }>({ start: '', end: '' });

  // Selected device IDs for chart display (mặc định không chọn thiết bị nào)
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (initialSelectedIds && initialSelectedIds.length > 0) {
      initialSelectedIds.forEach((id) => initial.add(id));
    }
    return initial;
  });

  // Prefix Selection State
  const [prefixInput, setPrefixInput] = useState<string>('');
  const [filterOnlyMatching, setFilterOnlyMatching] = useState<boolean>(false);

  // Sync initialSelectedIds when changed externally
  useEffect(() => {
    if (initialSelectedIds && initialSelectedIds.length > 0) {
      setSelectedDeviceIds(new Set(initialSelectedIds));
    }
  }, [initialSelectedIds]);

  // Clean prefix string (e.g. user types "va*" or "va " -> "va")
  const cleanPrefix = useMemo(() => {
    return prefixInput.trim().replace(/\*+$/, '').toLowerCase();
  }, [prefixInput]);

  const prefixLabel = cleanPrefix ? `${cleanPrefix}*` : 'prefix*';

  // Matched devices based on prefix (checks device_name or device_id, naturally sorted)
  const matchedDevices = useMemo(() => {
    if (!cleanPrefix) return [];
    return devices
      .filter((d) => {
        const name = (d.device_name || '').toLowerCase();
        const id = (d.device_id || '').toLowerCase();
        return name.startsWith(cleanPrefix) || id.startsWith(cleanPrefix);
      })
      .sort((a, b) =>
        (a.device_name || '').localeCompare(b.device_name || '', undefined, { numeric: true, sensitivity: 'base' })
      );
  }, [devices, cleanPrefix]);

  // Auto-detect common prefixes from device names
  const detectedPrefixes = useMemo(() => {
    const prefixCount: Record<string, number> = {};
    devices.forEach((d) => {
      const name = (d.device_name || '').trim();
      const match = name.match(/^([a-zA-Z]+)([-_]|\d+)?/i);
      if (match && match[1]) {
        const p = match[1].toLowerCase();
        if (p.length >= 2) {
          prefixCount[p] = (prefixCount[p] || 0) + 1;
        }
      }
    });

    return Object.entries(prefixCount)
      .filter(([_, count]) => count >= 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([prefix, count]) => ({ prefix, count }));
  }, [devices]);

  // Prefix selection handler
  const handleSelectByPrefix = (mode: 'add' | 'replace' | 'remove', overrideDevices?: DeviceItem[]) => {
    const targetList = overrideDevices || matchedDevices;
    if (targetList.length === 0) return;
    const targetIds = targetList.map((d) => d.device_id);

    setSelectedDeviceIds((prev) => {
      if (mode === 'replace') {
        return new Set(targetIds);
      }
      const next = new Set(prev);
      if (mode === 'add') {
        targetIds.forEach((id) => next.add(id));
      } else if (mode === 'remove') {
        targetIds.forEach((id) => next.delete(id));
      }
      return next;
    });
  };

  // Bandwidth data per device: [deviceId]: { [date]: number }
  const [deviceDataMap, setDeviceDataMap] = useState<Record<string, Record<string, number>>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [loadingDeviceIds, setLoadingDeviceIds] = useState<Set<string>>(new Set());
  const [rateLimitWarning, setRateLimitWarning] = useState<string | null>(null);
  const [cacheMessage, setCacheMessage] = useState<string | null>(null);

  // 5-minute persistent cache key for current account
  const cacheStorageKey = `earnhub_bw_cache_v2_${activeAccount?.id || 'default'}`;

  // Local state for cache map initialized from localStorage
  const [bandwidthCache, setBandwidthCache] = useState<Record<string, DeviceBandwidthCacheEntry>>(() => {
    try {
      const raw = localStorage.getItem(cacheStorageKey);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      // ignore JSON parse error
    }
    return {};
  });

  // Current timestamp updated every 3s to refresh live remaining countdowns
  const [nowTs, setNowTs] = useState<number>(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTs(Date.now());
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  // Helper to generate unique cache key for (deviceId, start, end)
  const getCacheKey = (devId: string, s: string, e: string) => `${devId}_${s}_${e}`;

  // Helper to format remaining time
  const formatRemaining = (seconds: number) => {
    if (seconds <= 0) return '0s';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m > 0) return `${m}p ${s < 10 ? '0' : ''}${s}s`;
    return `${s}s`;
  };

  // Helper to update cache both in state and localStorage
  const updateCacheEntries = (newEntries: DeviceBandwidthCacheEntry[]) => {
    setBandwidthCache((prev) => {
      const next = { ...prev };
      newEntries.forEach((entry) => {
        next[getCacheKey(entry.deviceId, entry.start, entry.end)] = entry;
      });
      try {
        localStorage.setItem(cacheStorageKey, JSON.stringify(next));
      } catch (err) {
        // storage quota fallback
      }
      return next;
    });
  };

  // Interactive Hover in SVG
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Format YYYY-MM-DD
  const formatDateStr = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Compute start/end dates ensuring date_start < date_end
  const getDateRange = (p: PresetTimeframe) => {
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

  // Assign stable color for each device
  const deviceColors = useMemo(() => {
    const map: Record<string, string> = {};
    devices.forEach((d, idx) => {
      map[d.device_id] = DEVICE_COLOR_PALETTE[idx % DEVICE_COLOR_PALETTE.length];
    });
    return map;
  }, [devices]);

  // Fetch data for selected devices with 5-minute cache protection
  const fetchAllSelectedDevices = async (forceRefresh = false) => {
    if (!apiKey || selectedDeviceIds.size === 0) return;

    const { start, end } = getDateRange(preset);
    setActiveDates({ start, end });
    setRateLimitWarning(null);

    const now = Date.now();
    const selectedList = Array.from(selectedDeviceIds);
    const newMap: Record<string, Record<string, number>> = { ...deviceDataMap };

    const devicesToFetch: string[] = [];
    let cachedCount = 0;

    selectedList.forEach((deviceId) => {
      const key = getCacheKey(deviceId, start, end);
      const cached = bandwidthCache[key];
      const isFresh = cached && (now - cached.cachedAt < CACHE_TTL_MS);

      if (!forceRefresh && isFresh) {
        newMap[deviceId] = cached.bandwidth;
        cachedCount++;
      } else {
        devicesToFetch.push(deviceId);
      }
    });

    // If all selected devices are fresh in the 5-minute cache, use them directly
    if (devicesToFetch.length === 0) {
      setDeviceDataMap(newMap);
      setCacheMessage(
        language === 'vi'
          ? `Đã lấy dữ liệu từ bộ nhớ đệm cho ${cachedCount} thiết bị (lưu trong 5 phút).`
          : `Loaded data from 5-minute cache for ${cachedCount} devices.`
      );
      return;
    }

    // Otherwise, fetch only devices that expired or are missing from cache
    setIsLoading(true);
    setLoadingDeviceIds(new Set(devicesToFetch));
    setCacheMessage(null);

    const newlyFetchedEntries: DeviceBandwidthCacheEntry[] = [];
    let hadError = false;

    // Small sequential batches of 2 with 120ms gap to avoid 1-minute API rate limits
    for (let i = 0; i < devicesToFetch.length; i += 2) {
      const batch = devicesToFetch.slice(i, i + 2);
      await Promise.all(
        batch.map(async (deviceId) => {
          try {
            const res = await proxyrackApi.getBandwidth(apiKey, deviceId, start, end);
            if (res.status === 'success' && res.data?.bandwidth) {
              newMap[deviceId] = res.data.bandwidth;
              newlyFetchedEntries.push({
                deviceId,
                start,
                end,
                bandwidth: res.data.bandwidth,
                cachedAt: Date.now(),
              });
            } else {
              // Fallback to older cache if available
              const key = getCacheKey(deviceId, start, end);
              if (bandwidthCache[key]?.bandwidth) {
                newMap[deviceId] = bandwidthCache[key].bandwidth;
              }
            }
          } catch (err: any) {
            hadError = true;
            // Fallback to older cache if available
            const key = getCacheKey(deviceId, start, end);
            if (bandwidthCache[key]?.bandwidth) {
              newMap[deviceId] = bandwidthCache[key].bandwidth;
            }
          }
        })
      );

      if (i + 2 < devicesToFetch.length) {
        await new Promise((r) => setTimeout(r, 120));
      }
    }

    if (hadError) {
      setRateLimitWarning(
        language === 'vi'
          ? 'Một số yêu cầu gặp giới hạn gọi/phút (Rate Limit) hoặc lỗi mạng. Hệ thống đã tự động dùng dữ liệu đệm gần nhất.'
          : 'Some requests encountered rate limits or network issues. Cached data was used where available.'
      );
    }

    if (newlyFetchedEntries.length > 0) {
      updateCacheEntries(newlyFetchedEntries);
    }

    setDeviceDataMap(newMap);
    setIsLoading(false);
    setLoadingDeviceIds(new Set());
  };

  useEffect(() => {
    fetchAllSelectedDevices(false);
  }, [preset, apiKey, selectedDeviceIds]);

  // Compute cache statistics for currently selected devices
  const cacheStats = useMemo(() => {
    const { start, end } = getDateRange(preset);
    const selectedList = Array.from(selectedDeviceIds);
    let cachedCount = 0;
    let expiredCount = 0;
    let minRemaining = Infinity;

    selectedList.forEach((id) => {
      const key = getCacheKey(id, start, end);
      const cached = bandwidthCache[key];
      if (cached) {
        const diff = nowTs - cached.cachedAt;
        if (diff < CACHE_TTL_MS) {
          cachedCount++;
          const remainingSec = Math.max(0, Math.ceil((CACHE_TTL_MS - diff) / 1000));
          if (remainingSec < minRemaining) {
            minRemaining = remainingSec;
          }
        } else {
          expiredCount++;
        }
      } else {
        expiredCount++;
      }
    });

    return {
      total: selectedList.length,
      cachedCount,
      expiredCount,
      minRemainingSeconds: minRemaining === Infinity ? 0 : minRemaining,
    };
  }, [selectedDeviceIds, preset, bandwidthCache, nowTs]);

  // Selection toggle handlers
  const handleToggleDevice = (deviceId: string) => {
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

  const handleSelectAll = () => {
    const all = new Set<string>();
    devices.forEach((d) => all.add(d.device_id));
    setSelectedDeviceIds(all);
  };

  const handleDeselectAll = () => {
    setSelectedDeviceIds(new Set());
  };

  // Extract all unique dates from the fetched data
  const chartDates = useMemo(() => {
    const dateSet = new Set<string>();
    Object.values(deviceDataMap).forEach((bwMap) => {
      Object.keys(bwMap).forEach((d) => dateSet.add(d));
    });

    if (dateSet.size === 0) {
      // Generate placeholder dates if not loaded yet
      const { start, end } = getDateRange(preset);
      const curr = new Date(start);
      const stop = new Date(end);
      while (curr <= stop) {
        dateSet.add(formatDateStr(curr));
        curr.setDate(curr.getDate() + 1);
      }
    }

    return Array.from(dateSet).sort();
  }, [deviceDataMap, preset]);

  // Compute selected series
  const seriesData = useMemo(() => {
    const selectedDevicesList = devices.filter((d) => selectedDeviceIds.has(d.device_id));

    return selectedDevicesList.map((dev) => {
      const bwMap = deviceDataMap[dev.device_id] || {};
      const points = chartDates.map((date) => bwMap[date] || 0);
      const totalGB = points.reduce((a, b) => a + b, 0);
      const maxGB = points.length > 0 ? Math.max(...points) : 0;
      const avgGB = points.length > 0 ? totalGB / points.length : 0;

      return {
        deviceId: dev.device_id,
        deviceName: dev.device_name,
        color: deviceColors[dev.device_id] || '#10b981',
        points,
        totalGB,
        maxGB,
        avgGB,
      };
    });
  }, [devices, selectedDeviceIds, deviceDataMap, chartDates, deviceColors]);

  // Overall chart bounds
  const maxVal = useMemo(() => {
    let peak = 0;
    seriesData.forEach((s) => {
      s.points.forEach((v) => {
        if (v > peak) peak = v;
      });
    });
    return peak === 0 ? 0.1 : peak * 1.15; // 15% top padding
  }, [seriesData]);

  // SVG Dimension Constants
  const svgWidth = 800;
  const svgHeight = 280;
  const paddingLeft = 55;
  const paddingRight = 25;
  const paddingTop = 25;
  const paddingBottom = 40;
  const plotWidth = svgWidth - paddingLeft - paddingRight;
  const plotHeight = svgHeight - paddingTop - paddingBottom;

  // Coordinate helper
  const getX = (index: number) => {
    if (chartDates.length <= 1) return paddingLeft + plotWidth / 2;
    return paddingLeft + (index / (chartDates.length - 1)) * plotWidth;
  };

  const getY = (val: number) => {
    const normalized = Math.min(Math.max(val / maxVal, 0), 1);
    return paddingTop + (1 - normalized) * plotHeight;
  };

  // SVG Smooth Path Generator
  const generatePath = (points: number[]) => {
    if (points.length === 0) return '';
    if (points.length === 1) {
      const x = getX(0);
      const y = getY(points[0]);
      return `M ${x} ${y} L ${x + 1} ${y}`;
    }

    const coords = points.map((p, idx) => ({ x: getX(idx), y: getY(p) }));
    let d = `M ${coords[0].x} ${coords[0].y}`;

    for (let i = 0; i < coords.length - 1; i++) {
      const curr = coords[i];
      const next = coords[i + 1];
      const cpX = (curr.x + next.x) / 2;
      d += ` C ${cpX} ${curr.y}, ${cpX} ${next.y}, ${next.x} ${next.y}`;
    }
    return d;
  };

  // Mouse hover detection
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || chartDates.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const scaleX = svgWidth / rect.width;
    const virtualX = mouseX * scaleX;

    const clampedX = Math.max(paddingLeft, Math.min(paddingLeft + plotWidth, virtualX));
    const ratio = (clampedX - paddingLeft) / plotWidth;
    const nearestIndex = Math.round(ratio * (chartDates.length - 1));
    setHoverIndex(nearestIndex);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  // Overall combined totals
  const totalCombinedGB = seriesData.reduce((acc, s) => acc + s.totalGB, 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-white tracking-tight">
              {language === 'vi' ? 'Biểu đồ So sánh Băng thông Thiết bị' : 'Device Bandwidth Comparison Chart'}
            </h2>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 rounded">
              Multi-Device Chart
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {language === 'vi'
              ? 'Biểu diễn lưu lượng của nhiều thiết bị trên cùng 1 biểu đồ theo mốc ngày để so sánh hiệu suất trực quan.'
              : 'Visualize traffic from multiple devices on a single daily chart for intuitive performance comparison.'}
          </p>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-xl self-start sm:self-auto">
          {(['week', '7d', 'month', '30d'] as PresetTimeframe[]).map((p) => {
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
      </div>

      {/* COMPACT CARD LIST FOR DEVICES (Card nhỏ để chọn hiển thị) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              {language === 'vi' ? 'Chọn thiết bị hiển thị trên biểu đồ:' : 'Select devices to display:'}
            </span>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded">
              {selectedDeviceIds.size} / {devices.length} {language === 'vi' ? 'đã chọn' : 'selected'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {cacheStats.cachedCount > 0 && (
              <span
                className="text-[11px] font-mono text-cyan-400 bg-cyan-950/80 border border-cyan-800/80 px-2 py-1 rounded-lg flex items-center gap-1.5"
                title={
                  language === 'vi'
                    ? `Đang dùng bộ nhớ đệm 5 phút cho ${cacheStats.cachedCount} thiết bị để tránh quá tải API Proxyrack`
                    : `Using 5-min cache for ${cacheStats.cachedCount} devices to protect Proxyrack API limits`
                }
              >
                <Zap className="w-3 h-3 text-amber-400 shrink-0" />
                <span>{language === 'vi' ? 'Đệm' : 'Cache'}: {cacheStats.cachedCount}/{cacheStats.total}</span>
                {cacheStats.minRemainingSeconds > 0 && (
                  <span className="text-slate-400">({formatRemaining(cacheStats.minRemainingSeconds)})</span>
                )}
              </span>
            )}

            <button
              type="button"
              onClick={handleSelectAll}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
              <span>{language === 'vi' ? 'Chọn tất cả' : 'Select All'}</span>
            </button>
            <button
              type="button"
              onClick={handleDeselectAll}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <Square className="w-3.5 h-3.5 text-slate-400" />
              <span>{language === 'vi' ? 'Hủy tất cả' : 'Deselect All'}</span>
            </button>

            {/* Smart Refresh: only fetches expired devices */}
            <button
              type="button"
              onClick={() => fetchAllSelectedDevices(false)}
              disabled={isLoading || selectedDeviceIds.size === 0}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-emerald-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
              title={language === 'vi' ? 'Tải lại các thiết bị đã hết hạn đệm 5 phút' : 'Reload devices whose 5-minute cache expired'}
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{language === 'vi' ? 'Làm mới' : 'Refresh'}</span>
            </button>

            {/* Force Refresh: bypass 5-min cache */}
            <button
              type="button"
              onClick={() => fetchAllSelectedDevices(true)}
              disabled={isLoading || selectedDeviceIds.size === 0}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-amber-300 hover:text-amber-200 bg-amber-950/40 hover:bg-amber-950/70 border border-amber-900/60 rounded-lg transition-colors disabled:opacity-50"
              title={language === 'vi' ? 'Bỏ qua bộ nhớ đệm 5 phút và gọi API nạp mới ngay lập tức' : 'Bypass 5-min cache and fetch live from API immediately'}
            >
              <RotateCcw className="w-3 h-3 text-amber-400" />
              <span>{language === 'vi' ? 'Bắt buộc tải lại' : 'Force Reload'}</span>
            </button>
          </div>
        </div>

        {/* Cache status banner or rate limit alert */}
        {rateLimitWarning && (
          <div className="flex items-center gap-2 p-2.5 bg-amber-950/50 border border-amber-800/80 rounded-lg text-xs text-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{rateLimitWarning}</span>
          </div>
        )}

        {cacheStats.cachedCount > 0 && !rateLimitWarning && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 py-2 bg-slate-950/60 border border-slate-800/80 rounded-lg text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5 truncate">
              <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>
                <strong>{language === 'vi' ? 'Bảo vệ API 5 phút:' : '5-min API Protection:'}</strong>{' '}
                {language === 'vi' ? 'Đang dùng dữ liệu đã lưu từ lần gọi trước cho' : 'Using cached data from recent requests for'}{' '}
                <span className="text-emerald-400 font-semibold">{cacheStats.cachedCount}</span>{' '}
                {language === 'vi' ? 'thiết bị (tránh lỗi giới hạn số lần gọi/phút).' : 'devices (prevents rate limits).'}
              </span>
            </div>
            {cacheStats.minRemainingSeconds > 0 && (
              <span className="text-cyan-400 font-mono font-medium shrink-0">
                {language === 'vi' ? 'Tự động cho phép tải mới sau:' : 'Auto reload allowed in:'} {formatRemaining(cacheStats.minRemainingSeconds)}
              </span>
            )}
          </div>
        )}

        {/* TOOLBAR CHỌN THEO TIỀN TỐ (PREFIX SELECTION TOOLBAR) */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-emerald-400">
                <Tag className="w-3.5 h-3.5" />
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-semibold text-slate-200">
                  {language === 'vi' ? 'Chọn thiết bị theo Tiền tố (Prefix):' : 'Select devices by Prefix:'}
                </span>
                <span className="text-[11px] text-slate-400">
                  {language === 'vi' ? (
                    <>(VD: nhập <code className="text-emerald-400 font-mono bg-slate-900 px-1 py-0.5 rounded border border-slate-800">va</code> sẽ tự động tìm các node <code className="text-emerald-400 font-mono bg-slate-900 px-1 py-0.5 rounded border border-slate-800">va*</code> như va1, va2...)</>
                  ) : (
                    <>(e.g. typing <code className="text-emerald-400 font-mono bg-slate-900 px-1 py-0.5 rounded border border-slate-800">va</code> matches <code className="text-emerald-400 font-mono bg-slate-900 px-1 py-0.5 rounded border border-slate-800">va*</code> nodes like va1, va2...)</>
                  )}
                </span>
              </div>
            </div>

            {/* Match status feedback */}
            {cleanPrefix && (
              <div className="text-[11px] font-mono px-2.5 py-1 rounded-md border flex items-center gap-1.5 bg-slate-900/90 border-slate-700/80 shrink-0">
                {matchedDevices.length > 0 ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-slate-200">
                      {language === 'vi' ? 'Khớp' : 'Matched'} <strong className="text-emerald-400">{matchedDevices.length}</strong> {language === 'vi' ? 'thiết bị:' : 'devices:'}{' '}
                      <span className="text-slate-400">
                        {matchedDevices.slice(0, 3).map((d) => d.device_name).join(', ')}
                        {matchedDevices.length > 3 ? '...' : ''}
                      </span>
                    </span>
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="text-amber-300">
                      {language === 'vi' ? `Không tìm thấy thiết bị nào khớp "${prefixInput}"` : `No devices matched "${prefixInput}"`}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Input field for prefix */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <input
                type="text"
                value={prefixInput}
                onChange={(e) => setPrefixInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSelectByPrefix('add');
                  }
                }}
                placeholder={language === 'vi' ? 'Nhập prefix (VD: va, node, vps...)' : 'Enter prefix (e.g., va, node, vps...)'}
                className="w-full pl-3 pr-8 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
              {prefixInput && (
                <button
                  type="button"
                  onClick={() => setPrefixInput('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  title={language === 'vi' ? 'Xóa prefix' : 'Clear prefix'}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Action Buttons */}
            <button
              type="button"
              disabled={matchedDevices.length === 0}
              onClick={() => handleSelectByPrefix('add')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 rounded-lg transition-colors shadow-sm"
              title={language === 'vi' ? 'Thêm tất cả thiết bị khớp prefix vào biểu đồ' : 'Add all prefix-matching devices to chart'}
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{language === 'vi' ? `Chọn tất cả ${prefixLabel}` : `Select all ${prefixLabel}`}</span>
            </button>

            <button
              type="button"
              disabled={matchedDevices.length === 0}
              onClick={() => handleSelectByPrefix('replace')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 rounded-lg transition-colors border border-slate-700"
              title={language === 'vi' ? 'Bỏ chọn các thiết bị khác, chỉ hiển thị nhóm khớp prefix này' : 'Deselect others, only show devices matching this prefix'}
            >
              <Filter className="w-3 h-3 text-cyan-400" />
              <span>{language === 'vi' ? `Chỉ chọn ${prefixLabel}` : `Only ${prefixLabel}`}</span>
            </button>

            <button
              type="button"
              disabled={matchedDevices.length === 0}
              onClick={() => handleSelectByPrefix('remove')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-rose-300 hover:text-rose-200 bg-rose-950/40 hover:bg-rose-950/70 disabled:opacity-40 disabled:hover:bg-rose-950/40 rounded-lg transition-colors border border-rose-900/50"
              title={language === 'vi' ? 'Bỏ chọn nhóm thiết bị khớp prefix này khỏi biểu đồ' : 'Deselect devices matching this prefix'}
            >
              <X className="w-3 h-3 text-rose-400" />
              <span>{language === 'vi' ? `Bỏ chọn ${prefixLabel}` : `Deselect ${prefixLabel}`}</span>
            </button>

            {/* Toggle show only matching cards */}
            {cleanPrefix && matchedDevices.length > 0 && (
              <label className="flex items-center gap-1.5 text-[11px] text-slate-300 hover:text-white cursor-pointer ml-auto select-none bg-slate-900 px-2 py-1 rounded-md border border-slate-800">
                <input
                  type="checkbox"
                  checked={filterOnlyMatching}
                  onChange={(e) => setFilterOnlyMatching(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-0 focus:ring-offset-0"
                />
                <span>{language === 'vi' ? `Chỉ hiện thẻ khớp (${matchedDevices.length})` : `Show matching only (${matchedDevices.length})`}</span>
              </label>
            )}
          </div>

          {/* Quick Auto-Detected Prefix Suggestions */}
          {detectedPrefixes.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800/80">
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>{language === 'vi' ? 'Gợi ý tiền tố có sẵn:' : 'Available prefix suggestions:'}</span>
              </span>
              {detectedPrefixes.map(({ prefix, count }) => {
                const isCurrent = cleanPrefix === prefix;
                return (
                  <button
                    key={prefix}
                    type="button"
                    onClick={() => {
                      setPrefixInput(prefix);
                      const targetList = devices.filter((d) => {
                        const name = (d.device_name || '').toLowerCase();
                        const id = (d.device_id || '').toLowerCase();
                        return name.startsWith(prefix) || id.startsWith(prefix);
                      });
                      handleSelectByPrefix('add', targetList);
                    }}
                    className={`text-[11px] font-mono px-2.5 py-0.5 rounded-md border transition-all ${
                      isCurrent
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-500 font-bold shadow-sm'
                        : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:border-slate-500 hover:text-white'
                    }`}
                    title={language === 'vi' ? `Bấm để chọn ngay tất cả thiết bị bắt đầu bằng "${prefix}"` : `Click to select all devices starting with "${prefix}"`}
                  >
                    {prefix}* ({count})
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Small Device Cards Grid */}
        {devices.length === 0 ? (
          <div className="text-center py-4 text-xs text-slate-500">
            {language === 'vi'
              ? 'Chưa có thiết bị nào trong tài khoản. Hãy thêm thiết bị tại tab "Danh sách thiết bị".'
              : 'No devices found in this account. Add devices in the "Device Management" tab.'}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {(cleanPrefix && filterOnlyMatching
              ? devices.filter((d) => matchedDevices.some((m) => m.device_id === d.device_id))
              : devices
            )
              .slice()
              .sort((a, b) =>
                (a.device_name || '').localeCompare(b.device_name || '', undefined, { numeric: true, sensitivity: 'base' })
              )
              .map((device) => {
              const isSelected = selectedDeviceIds.has(device.device_id);
              const color = deviceColors[device.device_id] || '#10b981';
              const isLoadingThis = loadingDeviceIds.has(device.device_id);
              const deviceBw = deviceDataMap[device.device_id];
              const deviceTotal = deviceBw
                ? Object.values(deviceBw).reduce((a, b) => a + b, 0)
                : null;
              const isPrefixMatch = cleanPrefix
                ? (device.device_name || '').toLowerCase().startsWith(cleanPrefix) ||
                  (device.device_id || '').toLowerCase().startsWith(cleanPrefix)
                : false;

              // Check 5-minute cache state for this device with current preset
              const { start, end } = getDateRange(preset);
              const cacheKey = getCacheKey(device.device_id, start, end);
              const cached = bandwidthCache[cacheKey];
              const isCached = cached && (nowTs - cached.cachedAt < CACHE_TTL_MS);
              const remainingSec = isCached ? Math.max(0, Math.ceil((CACHE_TTL_MS - (nowTs - cached.cachedAt)) / 1000)) : 0;

              return (
                <button
                  key={device.device_id}
                  type="button"
                  onClick={() => handleToggleDevice(device.device_id)}
                  className={`p-2 rounded-lg border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                    isSelected
                      ? 'bg-slate-800/90 border-slate-600 shadow-sm ring-1'
                      : isPrefixMatch
                      ? 'bg-slate-900/90 border-emerald-500/60 text-slate-200'
                      : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:border-slate-700 opacity-60 hover:opacity-100'
                  }`}
                  style={{
                    borderColor: isSelected ? color : isPrefixMatch ? '#10b981' : undefined,
                    boxShadow: isSelected ? `0 0 0 1px ${color}` : undefined,
                  }}
                >
                  <div className="flex items-start justify-between gap-1 w-full">
                    <div className="flex items-center gap-1.5 truncate">
                      {/* Color indicator dot */}
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-xs font-semibold text-slate-200 truncate">
                        {device.device_name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {isPrefixMatch && (
                        <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950 px-1 py-0.5 rounded border border-emerald-800/80 leading-none">
                          {language === 'vi' ? 'khớp' : 'match'}
                        </span>
                      )}

                      {/* Checkbox indicator */}
                      <div
                        className={`w-3.5 h-3.5 rounded shrink-0 flex items-center justify-center border text-[9px] ${
                          isSelected
                            ? 'border-transparent text-white'
                            : 'border-slate-600 bg-transparent'
                        }`}
                        style={{ backgroundColor: isSelected ? color : 'transparent' }}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                    </div>
                  </div>

                  <div className="mt-1 flex items-center justify-between text-[10px] font-mono text-slate-500 w-full gap-1">
                    <div className="flex items-center gap-1 truncate">
                      <span className="truncate max-w-[50px]">
                        {device.device_id.slice(0, 6)}...
                      </span>
                      {isCached && (
                        <span
                          className="text-[9px] text-cyan-300 bg-cyan-950/80 px-1 py-0.2 rounded border border-cyan-800/60 flex items-center gap-0.5 shrink-0"
                          title={
                            language === 'vi'
                              ? `Dữ liệu đã lưu lúc ${new Date(cached.cachedAt).toLocaleTimeString()}. Sẽ cho phép tải lại mới sau 5 phút.`
                              : `Cached at ${new Date(cached.cachedAt).toLocaleTimeString()}. Reload allowed after 5 min.`
                          }
                        >
                          <Zap className="w-2.5 h-2.5 text-amber-400" />
                          <span>{formatRemaining(remainingSec)}</span>
                        </span>
                      )}
                    </div>
                    {isLoadingThis ? (
                      <span className="text-emerald-400 animate-pulse text-[9px]">{language === 'vi' ? 'Tải...' : 'Loading...'}</span>
                    ) : deviceTotal !== null ? (
                      <span className="text-slate-300 font-semibold">{deviceTotal.toFixed(2)} GB</span>
                    ) : (
                      <span>-</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* MULTI-DEVICE SVG CHART */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <div className="text-xs font-semibold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              <span>{language === 'vi' ? 'Đồ thị đa đường so sánh cùng mốc thời gian' : 'Multi-Line Comparative Chart Over Timeframe'}</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {language === 'vi' ? 'Khoảng ngày:' : 'Date range:'} <strong className="text-slate-200">{activeDates.start}</strong> →{' '}
              <strong className="text-slate-200">{activeDates.end}</strong> · {language === 'vi' ? 'Tổng cộng' : 'Total'}{' '}
              <strong className="text-emerald-400 font-mono">{totalCombinedGB.toFixed(3)} GB</strong> (~$
              {(totalCombinedGB * 0.3).toFixed(2)} USD)
            </p>
          </div>

          {/* Legend Items */}
          <div className="flex flex-wrap items-center gap-2 max-w-md">
            {seriesData.map((s) => (
              <div
                key={s.deviceId}
                className="flex items-center gap-1.5 text-[11px] font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800"
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-slate-300 truncate max-w-[90px]">{s.deviceName}</span>
                <span className="text-slate-500 font-semibold">{s.totalGB.toFixed(2)}G</span>
              </div>
            ))}
          </div>
        </div>

        {selectedDeviceIds.size === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400 space-y-2">
            <Layers className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-slate-300 font-medium">
              {language === 'vi' ? 'Chưa có thiết bị nào được chọn hiển thị.' : 'No devices selected to display.'}
            </p>
            <p className="text-slate-500 text-[11px] max-w-md mx-auto">
              {language === 'vi' ? (
                <>Hãy bấm chọn trực tiếp các thiết bị ở danh sách thẻ trên, hoặc nhập tiền tố vào ô <strong className="text-emerald-400">Chọn theo Tiền tố (Prefix)</strong> (ví dụ: <code className="text-emerald-400">va</code>) để so sánh nhanh.</>
              ) : (
                <>Click on devices in the cards above, or use <strong className="text-emerald-400">Select by Prefix</strong> (e.g. <code className="text-emerald-400">va</code>) for instant comparison.</>
              )}
            </p>
          </div>
        ) : (
          <div className="relative">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-auto overflow-visible select-none cursor-crosshair"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              {/* Horizontal Grid lines and Y axis values */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const y = paddingTop + (1 - ratio) * plotHeight;
                const val = (ratio * maxVal).toFixed(2);
                return (
                  <g key={ratio}>
                    <line
                      x1={paddingLeft}
                      y1={y}
                      x2={paddingLeft + plotWidth}
                      y2={y}
                      stroke="#334155"
                      strokeWidth="1"
                      strokeDasharray={ratio === 0 ? 'none' : '3 3'}
                      opacity="0.4"
                    />
                    <text
                      x={paddingLeft - 8}
                      y={y + 3}
                      fill="#94a3b8"
                      fontSize="9"
                      fontFamily="monospace"
                      textAnchor="end"
                    >
                      {val} GB
                    </text>
                  </g>
                );
              })}

              {/* Render each selected device's line */}
              {seriesData.map((s) => {
                const pathD = generatePath(s.points);
                return (
                  <g key={s.deviceId}>
                    {/* Glowing shadow line */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke={s.color}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="transition-all duration-300"
                    />

                    {/* Points on line */}
                    {s.points.map((p, pIdx) => {
                      const x = getX(pIdx);
                      const y = getY(p);
                      const isHovered = hoverIndex === pIdx;
                      return (
                        <circle
                          key={pIdx}
                          cx={x}
                          cy={y}
                          r={isHovered ? 4.5 : 2.5}
                          fill={s.color}
                          stroke="#0f172a"
                          strokeWidth={isHovered ? 2 : 1}
                          className="transition-all"
                        />
                      );
                    })}
                  </g>
                );
              })}

              {/* Hover Crosshair Vertical Line */}
              {hoverIndex !== null && (
                <g>
                  <line
                    x1={getX(hoverIndex)}
                    y1={paddingTop}
                    x2={getX(hoverIndex)}
                    y2={paddingTop + plotHeight}
                    stroke="#94a3b8"
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                  />
                  {/* Date badge on X axis */}
                  <rect
                    x={getX(hoverIndex) - 35}
                    y={paddingTop + plotHeight + 6}
                    width="70"
                    height="18"
                    rx="4"
                    fill="#1e293b"
                    stroke="#475569"
                    strokeWidth="1"
                  />
                  <text
                    x={getX(hoverIndex)}
                    y={paddingTop + plotHeight + 18}
                    fill="#38bdf8"
                    fontSize="9"
                    fontFamily="monospace"
                    textAnchor="middle"
                    fontWeight="bold"
                  >
                    {chartDates[hoverIndex]}
                  </text>
                </g>
              )}

              {/* X Axis Labels */}
              {chartDates.map((date, idx) => {
                // Show label every N dates depending on array size
                const step = chartDates.length > 14 ? Math.ceil(chartDates.length / 7) : 1;
                if (idx % step !== 0 && idx !== chartDates.length - 1) return null;
                const x = getX(idx);
                return (
                  <text
                    key={date}
                    x={x}
                    y={svgHeight - 12}
                    fill="#64748b"
                    fontSize="9"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    {date.slice(5)} {/* MM-DD */}
                  </text>
                );
              })}
            </svg>

            {/* Interactive Tooltip Card with boundary protection */}
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

              return (
                <div
                  className="absolute z-20 top-2 pointer-events-none bg-slate-950/95 border border-slate-700/90 rounded-xl p-3 shadow-2xl text-xs space-y-2 backdrop-blur-md min-w-[210px] max-w-[calc(100%-16px)] transition-all duration-75"
                  style={{
                    left: leftStyle,
                    transform,
                  }}
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 font-mono">
                    <span className="text-slate-400">{language === 'vi' ? 'Mốc ngày:' : 'Date:'}</span>
                    <span className="text-emerald-400 font-bold">{chartDates[hoverIndex]}</span>
                  </div>

                  <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                    {seriesData
                      .map((s) => ({
                        name: s.deviceName,
                        color: s.color,
                        gb: s.points[hoverIndex] || 0,
                      }))
                      .sort((a, b) => b.gb - a.gb)
                      .map((item, i) => (
                        <div key={i} className="flex items-center justify-between font-mono text-[11px]">
                          <div className="flex items-center gap-1.5 truncate max-w-[130px]">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="text-slate-300 truncate">{item.name}</span>
                          </div>
                          <span className="text-white font-bold ml-2">
                            {item.gb.toFixed(4)} GB
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* COMPARISON BREAKDOWN TABLE */}
      {seriesData.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
              {language === 'vi'
                ? `Bảng so sánh hiệu suất (${seriesData.length} thiết bị được chọn)`
                : `Performance Breakdown (${seriesData.length} devices selected)`}
            </h3>
            <span className="text-[11px] font-mono text-slate-400">
              {language === 'vi' ? 'Tổng cộng:' : 'Total:'}{' '}
              <strong className="text-emerald-400">{totalCombinedGB.toFixed(3)} GB</strong>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-sans font-medium">
                  <th className="py-2.5 px-3">{language === 'vi' ? 'Thiết bị' : 'Device'}</th>
                  <th className="py-2.5 px-3">{language === 'vi' ? 'Mã ID' : 'Device ID'}</th>
                  <th className="py-2.5 px-3">{language === 'vi' ? 'Tổng lưu lượng (GB)' : 'Total Traffic (GB)'}</th>
                  <th className="py-2.5 px-3">{language === 'vi' ? 'Trung bình / Ngày' : 'Avg / Day'}</th>
                  <th className="py-2.5 px-3">{language === 'vi' ? 'Ngày cao điểm' : 'Peak Day'}</th>
                  <th className="py-2.5 px-3">{language === 'vi' ? 'Đóng góp %' : 'Share %'}</th>
                  <th className="py-2.5 px-3 text-right">{language === 'vi' ? 'Ước tính thu nhập' : 'Est. Earnings'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {seriesData.map((s) => {
                  const percent = totalCombinedGB > 0 ? (s.totalGB / totalCombinedGB) * 100 : 0;
                  const estUsd = s.totalGB * 0.3;

                  const { start, end } = getDateRange(preset);
                  const cacheKey = getCacheKey(s.deviceId, start, end);
                  const cached = bandwidthCache[cacheKey];
                  const isCached = cached && (nowTs - cached.cachedAt < CACHE_TTL_MS);
                  const remainingSec = isCached ? Math.max(0, Math.ceil((CACHE_TTL_MS - (nowTs - cached.cachedAt)) / 1000)) : 0;
                  const cachedTimeStr = cached ? new Date(cached.cachedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

                  return (
                    <tr key={s.deviceId} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: s.color }}
                          />
                          <div>
                            <span className="text-slate-100 font-semibold font-sans">{s.deviceName}</span>
                            {isCached ? (
                              <div
                                className="text-[10px] text-cyan-400 font-mono flex items-center gap-1 mt-0.5"
                                title={
                                  language === 'vi'
                                    ? `Đã lưu đệm lúc ${cachedTimeStr}. Sẽ cho phép tải mới sau 5 phút.`
                                    : `Cached at ${cachedTimeStr}. Fresh reload allowed after 5 min.`
                                }
                              >
                                <Zap className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                                <span>
                                  {language === 'vi' ? 'Đệm' : 'Cached'} {cachedTimeStr} ({language === 'vi' ? 'còn' : 'left'} {formatRemaining(remainingSec)})
                                </span>
                              </div>
                            ) : (
                              <div className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 mt-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                                <span>{language === 'vi' ? 'Mới nạp' : 'Fresh'}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 truncate max-w-[140px]">
                        {s.deviceId}
                      </td>
                      <td className="py-2.5 px-3 text-white font-bold">{s.totalGB.toFixed(3)} GB</td>
                      <td className="py-2.5 px-3 text-slate-400">{s.avgGB.toFixed(3)} GB</td>
                      <td className="py-2.5 px-3 text-slate-300">{s.maxGB.toFixed(3)} GB</td>
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
                      <td className="py-2.5 px-3 text-right text-emerald-400 font-semibold">
                        +${estUsd.toFixed(3)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
