import { useState } from 'react';
import { X, Cpu, Info, CheckCircle2, AlertCircle } from 'lucide-react';
import { proxyrackApi } from '../services/proxyrackApi';
import { DeviceItem } from '../types';

interface AddDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  accountId: string;
  onDeviceAdded: (newDevice: DeviceItem) => void;
}

export function AddDeviceModal({
  isOpen,
  onClose,
  apiKey,
  accountId,
  onDeviceAdded,
}: AddDeviceModalProps) {
  const [deviceId, setDeviceId] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [systemType, setSystemType] = useState<DeviceItem['systemType']>('Linux/VPS');
  const [ipAddress, setIpAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceId.trim() || !deviceName.trim()) {
      setErrorMsg('Vui lòng điền đầy đủ Device ID và Tên thiết bị.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // Gọi API Add device của Proxyrack: POST /api/device/add
      let apiResult: any = null;
      try {
        apiResult = await proxyrackApi.addDevice(apiKey, deviceId.trim(), deviceName.trim());
      } catch (err: any) {
        // If the peer client isn't registered on proxyrack's hardware network yet, inform user
        // but still allow saving into the dashboard registry so they can track it once connected
        console.warn('Proxyrack direct add notice:', err.message);
        setErrorMsg(
          `Ghi chú API Proxyrack: ${err.message}. Bạn vẫn có thể lưu thiết bị vào hệ thống để tiếp tục theo dõi khi node online.`
        );
      }

      // Tạo object device
      const newDevice: DeviceItem = {
        device_id: deviceId.trim(),
        device_name: deviceName.trim(),
        accountId,
        addedAt: new Date().toISOString(),
        systemType,
        ip: ipAddress.trim() || undefined,
        location: 'Tự động phát hiện',
        lastPingStatus: 'online',
        lastPingTime: 'Vừa thêm',
        notes: notes.trim() || undefined,
      };

      onDeviceAdded(newDevice);
      setSuccessMsg(
        apiResult?.message || 'Đã thêm thiết bị vào danh sách quản lý thành công!'
      );

      setTimeout(() => {
        onClose();
        setDeviceId('');
        setDeviceName('');
        setIpAddress('');
        setNotes('');
        setErrorMsg(null);
        setSuccessMsg(null);
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi gửi yêu cầu thêm thiết bị.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">Gán thiết bị mới vào Proxyrack</h3>
              <p className="text-[11px] text-slate-400">POST /api/device/add</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Device ID */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Device ID (Mã định danh thiết bị) <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              placeholder="Ví dụ: pr-sg-vps-992 hoặc UUID thiết bị"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500 transition-colors"
            />
            <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-500">
              <Info className="w-3 h-3 text-slate-400 shrink-0" />
              <span>Device ID lấy từ Proxyrack peer client hoặc câu lệnh chạy daemon peer.</span>
            </div>
          </div>

          {/* Device Name */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Tên thiết bị gợi nhớ <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder="Ví dụ: Node Singapore VPS #04"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* System Type & IP */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Loại môi trường chạy
              </label>
              <select
                value={systemType}
                onChange={(e) => setSystemType(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="Linux/VPS">Linux / VPS Ubuntu</option>
                <option value="Docker">Docker Container</option>
                <option value="Windows">Windows Desktop</option>
                <option value="Android">Android Device</option>
                <option value="macOS">macOS</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Địa chỉ IP (Tùy chọn)
              </label>
              <input
                type="text"
                value={ipAddress}
                onChange={(e) => setIpAddress(e.target.value)}
                placeholder="103.xxx.xxx.xxx"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Ghi chú cấu hình
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Băng thông 1Gbps, Datacenter OVH, Home Lab..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              Huỷ
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {isLoading ? 'Đang gửi...' : 'Gán thiết bị'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
