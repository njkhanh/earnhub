import { useState, useEffect } from 'react';
import { 
  Terminal, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  Clock, 
  Trash2, 
  Code2, 
  RefreshCw,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { ApiLogEntry, UserAccount } from '../types';
import { proxyrackApi, getRecentApiLogs, subscribeToApiLogs } from '../services/proxyrackApi';
import { useLanguage } from '../contexts/LanguageContext';

interface ApiConsoleViewProps {
  activeAccount: UserAccount | undefined;
}

export function ApiConsoleView({ activeAccount }: ApiConsoleViewProps) {
  const { language } = useLanguage();
  const [selectedEndpoint, setSelectedEndpoint] = useState<'balance' | 'bandwidth' | 'device/status' | 'device/add'>('balance');
  const [deviceIdInput, setDeviceIdInput] = useState('');
  const [deviceNameInput, setDeviceNameInput] = useState('');
  const [dateStartInput, setDateStartInput] = useState('');
  const [dateEndInput, setDateEndInput] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [copiedCurlId, setCopiedCurlId] = useState<string | null>(null);

  const [logs, setLogs] = useState<ApiLogEntry[]>(() => getRecentApiLogs());
  const [selectedLog, setSelectedLog] = useState<ApiLogEntry | null>(null);

  useEffect(() => {
    const unsub = subscribeToApiLogs((newEntry) => {
      setLogs((prev) => [newEntry, ...prev.filter((l) => l.id !== newEntry.id)]);
      setSelectedLog(newEntry);
    });
    return unsub;
  }, []);

  const handleCopyCurl = (id: string, curl: string) => {
    navigator.clipboard.writeText(curl);
    setCopiedCurlId(id);
    setTimeout(() => setCopiedCurlId(null), 1500);
  };

  const handleExecuteCall = async () => {
    if (!activeAccount?.apiKey) {
      alert(language === 'vi' ? 'Vui lòng chọn tài khoản có API Key để thực thi.' : 'Please select an account with an API Key to execute.');
      return;
    }

    setIsExecuting(true);
    try {
      if (selectedEndpoint === 'balance') {
        await proxyrackApi.getBalance(activeAccount.apiKey);
      } else if (selectedEndpoint === 'bandwidth') {
        await proxyrackApi.getBandwidth(
          activeAccount.apiKey,
          deviceIdInput.trim() || undefined,
          dateStartInput || undefined,
          dateEndInput || undefined
        );
      } else if (selectedEndpoint === 'device/status') {
        if (!deviceIdInput.trim()) {
          alert(language === 'vi' ? 'Endpoint device/status yêu cầu device_id.' : 'Endpoint device/status requires device_id.');
          setIsExecuting(false);
          return;
        }
        await proxyrackApi.checkDeviceStatus(activeAccount.apiKey, deviceIdInput.trim());
      } else if (selectedEndpoint === 'device/add') {
        if (!deviceIdInput.trim() || !deviceNameInput.trim()) {
          alert(language === 'vi' ? 'Endpoint device/add yêu cầu cả device_id và device_name.' : 'Endpoint device/add requires both device_id and device_name.');
          setIsExecuting(false);
          return;
        }
        await proxyrackApi.addDevice(activeAccount.apiKey, deviceIdInput.trim(), deviceNameInput.trim());
      }
    } catch (err: any) {
      console.warn('API Execution finished with note:', err);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-white tracking-tight">
            {language === 'vi' ? 'Trình gọi API Thực tế (API Console)' : 'Live API Console'}
          </h1>
          <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 border border-emerald-800/80 px-2 py-0.5 rounded">
            Live Network
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          {language === 'vi'
            ? 'Gọi trực tiếp các endpoint của Proxyrack Peer server (https://peer.proxyrack.com/api/*), kiểm tra headers, payload và phản hồi thực tế từ máy chủ.'
            : 'Directly invoke Proxyrack Peer server endpoints (https://peer.proxyrack.com/api/*), inspect request headers, payload, and live server responses.'}
        </p>
      </div>

      {/* Interactive Request Builder */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-semibold text-slate-100">
              {language === 'vi' ? 'Gửi Request Trực tiếp tới Proxyrack' : 'Send Live Request to Proxyrack'}
            </span>
          </div>

          <div className="text-xs text-slate-400 font-mono">
            API Key: <code className="text-emerald-400">{activeAccount?.apiKey ? `${activeAccount.apiKey.slice(0, 8)}...` : (language === 'vi' ? 'Chưa cấu hình' : 'Not configured')}</code>
          </div>
        </div>

        {/* Endpoint Selector Tabs */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">
            {language === 'vi' ? 'Chọn phương thức API:' : 'Select API Endpoint:'}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'balance', label: '1. POST /api/balance', desc: language === 'vi' ? 'Số dư khả dụng' : 'Available balance' },
              { id: 'bandwidth', label: '2. POST /api/bandwidth', desc: language === 'vi' ? 'Dữ liệu băng thông' : 'Bandwidth data' },
              { id: 'device/status', label: '3. POST /api/device/status', desc: language === 'vi' ? 'Trạng thái node' : 'Node status' },
              { id: 'device/add', label: '4. POST /api/device/add', desc: language === 'vi' ? 'Gán node mới' : 'Add new node' },
            ].map((ep) => (
              <button
                key={ep.id}
                type="button"
                onClick={() => setSelectedEndpoint(ep.id as any)}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  selectedEndpoint === ep.id
                    ? 'bg-emerald-950/50 border-emerald-500/80 text-white shadow-sm'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div className="text-xs font-mono font-medium">{ep.label}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{ep.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Inputs depending on selected endpoint */}
        <div className="p-4 bg-slate-950 border border-slate-800/80 rounded-xl space-y-3">
          <div className="text-xs font-medium text-slate-300">
            {language === 'vi' ? 'Tham số gửi lên (JSON payload trong body của request):' : 'Request Parameters (JSON body payload):'}
          </div>

          {selectedEndpoint === 'balance' && (
            <div className="text-xs text-slate-500 italic">
              {language === 'vi'
                ? 'Endpoint /api/balance không yêu cầu tham số. Payload gửi lên: {}'
                : 'Endpoint /api/balance requires no parameters. Empty JSON payload sent: {}'}
            </div>
          )}

          {selectedEndpoint === 'bandwidth' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  device_id ({language === 'vi' ? 'Tùy chọn' : 'Optional'}):
                </label>
                <input
                  type="text"
                  value={deviceIdInput}
                  onChange={(e) => setDeviceIdInput(e.target.value)}
                  placeholder={language === 'vi' ? 'Để trống nếu lấy ALL' : 'Leave empty for ALL'}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs font-mono text-slate-200"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  date_start (Y-m-d, {language === 'vi' ? 'tùy chọn' : 'optional'}):
                </label>
                <input
                  type="date"
                  value={dateStartInput}
                  onChange={(e) => setDateStartInput(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs font-mono text-slate-200"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  date_end (Y-m-d, {language === 'vi' ? 'tùy chọn' : 'optional'}):
                </label>
                <input
                  type="date"
                  value={dateEndInput}
                  onChange={(e) => setDateEndInput(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs font-mono text-slate-200"
                />
              </div>
            </div>
          )}

          {selectedEndpoint === 'device/status' && (
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                device_id ({language === 'vi' ? 'Bắt buộc' : 'Required'}) <span className="text-rose-400">*</span>:
              </label>
              <input
                type="text"
                value={deviceIdInput}
                onChange={(e) => setDeviceIdInput(e.target.value)}
                placeholder={language === 'vi' ? 'Nhập ID thiết bị để kiểm tra trạng thái' : 'Enter device ID to check status'}
                className="w-full max-w-md px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs font-mono text-slate-200"
              />
            </div>
          )}

          {selectedEndpoint === 'device/add' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  device_id ({language === 'vi' ? 'Bắt buộc' : 'Required'}) <span className="text-rose-400">*</span>:
                </label>
                <input
                  type="text"
                  value={deviceIdInput}
                  onChange={(e) => setDeviceIdInput(e.target.value)}
                  placeholder={language === 'vi' ? 'Nhập device_id từ peer client' : 'Enter device_id from peer client'}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs font-mono text-slate-200"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  device_name ({language === 'vi' ? 'Bắt buộc' : 'Required'}) <span className="text-rose-400">*</span>:
                </label>
                <input
                  type="text"
                  value={deviceNameInput}
                  onChange={(e) => setDeviceNameInput(e.target.value)}
                  placeholder={language === 'vi' ? 'Ví dụ: Node Singapore VPS #01' : 'E.g., Node Singapore VPS #01'}
                  className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200"
                />
              </div>
            </div>
          )}
        </div>

        {/* Submit Execution Button */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-[11px] text-slate-500 font-mono">
            Target: <code>https://peer.proxyrack.com/api/{selectedEndpoint}</code>
          </div>

          <button
            type="button"
            onClick={handleExecuteCall}
            disabled={isExecuting}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
          >
            <Send className={`w-3.5 h-3.5 ${isExecuting ? 'animate-pulse' : ''}`} />
            <span>
              {isExecuting
                ? (language === 'vi' ? 'Đang gửi Request thật...' : 'Sending live request...')
                : (language === 'vi' ? 'GỬI REQUEST THỰC TẾ' : 'EXECUTE LIVE REQUEST')}
            </span>
          </button>
        </div>
      </div>

      {/* Two Column: Left: Real-Time Call History / Right: Selected Response Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Call History List */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-slate-200">
                {language === 'vi' ? 'Nhật ký Gọi API Thực tế' : 'Live API Call Logs'} ({logs.length})
              </span>
            </div>
            {logs.length > 0 && (
              <button
                type="button"
                onClick={() => setLogs([])}
                className="text-[11px] text-slate-500 hover:text-rose-400 transition-colors"
              >
                {language === 'vi' ? 'Xoá log' : 'Clear logs'}
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {logs.length === 0 ? (
              <div className="text-xs text-slate-500 text-center py-8">
                {language === 'vi'
                  ? 'Chưa có cuộc gọi API nào được ghi nhận. Hãy bấm "GỬI REQUEST THỰC TẾ" ở trên.'
                  : 'No API calls recorded yet. Click "EXECUTE LIVE REQUEST" above.'}
              </div>
            ) : (
              logs.map((log) => {
                const isSelected = selectedLog?.id === log.id;
                const isOk = log.responseStatus >= 200 && log.responseStatus < 300;
                return (
                  <div
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-slate-800 border-emerald-500/80 text-white shadow-sm'
                        : 'bg-slate-950/70 border-slate-800/80 text-slate-300 hover:bg-slate-950'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 font-mono text-[11px]">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <span className={isOk ? 'text-emerald-400' : 'text-amber-400'}>
                          {log.method}
                        </span>
                        <span>/{log.endpoint}</span>
                      </div>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] ${
                          isOk
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : 'bg-rose-950 text-rose-400 border border-rose-800'
                        }`}
                      >
                        {log.responseStatus} {log.responseStatusText}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2 font-mono">
                      <span>{log.timestamp}</span>
                      <span>{log.latencyMs}ms</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Detailed Request & Response Inspector */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-slate-200">
                {language === 'vi' ? 'Chi tiết Request & Phản hồi Thực tế' : 'Request & Live Response Inspector'}
              </span>
            </div>
            {selectedLog && (
              <button
                type="button"
                onClick={() => handleCopyCurl(selectedLog.id, selectedLog.curlCommand)}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-emerald-400 transition-colors"
                title={language === 'vi' ? 'Sao chép cURL để chạy thử trên terminal' : 'Copy cURL command for terminal testing'}
              >
                {copiedCurlId === selectedLog.id ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>Copy cURL</span>
              </button>
            )}
          </div>

          {selectedLog ? (
            <div className="space-y-4 text-xs font-mono">
              {/* Target & Status Banner */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase">Target Endpoint</div>
                  <div className="text-slate-200 font-semibold">{selectedLog.targetUrl}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-slate-500 uppercase">Response Latency</div>
                  <div className="text-emerald-400 font-semibold">{selectedLog.latencyMs} ms</div>
                </div>
              </div>

              {/* Request Headers */}
              <div>
                <div className="text-[11px] text-slate-400 mb-1 font-sans font-semibold">
                  {language === 'vi' ? 'Request Headers đã gửi:' : 'Sent Request Headers:'}
                </div>
                <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-[11px] text-slate-300 space-y-1">
                  <div>Api-Key: {selectedLog.requestHeaders['Api-Key']}</div>
                  <div>Content-Type: application/json</div>
                  <div>Accept: application/json</div>
                </div>
              </div>

              {/* Request Payload */}
              <div>
                <div className="text-[11px] text-slate-400 mb-1 font-sans font-semibold">
                  {language === 'vi' ? 'Request Payload (Body JSON):' : 'Request Payload (JSON Body):'}
                </div>
                <pre className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-[11px] text-slate-300 overflow-x-auto">
                  {JSON.stringify(selectedLog.requestPayload, null, 2)}
                </pre>
              </div>

              {/* Response Body */}
              <div>
                <div className="text-[11px] text-slate-400 mb-1 font-sans font-semibold flex items-center justify-between">
                  <span>
                    {language === 'vi' ? 'Remote Response Body (Máy chủ trả về):' : 'Remote Response Body (From server):'}
                  </span>
                  <span
                    className={
                      selectedLog.responseStatus === 200 ? 'text-emerald-400' : 'text-amber-400'
                    }
                  >
                    HTTP {selectedLog.responseStatus}
                  </span>
                </div>
                <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-[11px] text-emerald-400 overflow-x-auto max-h-72">
                  {JSON.stringify(selectedLog.responseBody, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-xs text-slate-500 space-y-2">
              <Terminal className="w-8 h-8 text-slate-700" />
              <span>
                {language === 'vi'
                  ? 'Chọn một cuộc gọi API ở danh sách bên trái hoặc bấm "GỬI REQUEST THỰC TẾ" để xem chi tiết.'
                  : 'Select an API call on the left or click "EXECUTE LIVE REQUEST" to inspect details.'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
