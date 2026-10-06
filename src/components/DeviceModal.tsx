import { useState, useEffect, useMemo } from 'react';
import { X, Cpu, Info, CheckCircle2, AlertCircle, Save, Plus, Sparkles } from 'lucide-react';
import { DeviceItem, UserAccount } from '../types';
import { proxyrackApi } from '../services/proxyrackApi';
import { storage } from '../services/storage';
import { useLanguage } from '../contexts/LanguageContext';

interface DeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeAccount: UserAccount | undefined;
  deviceToEdit?: DeviceItem | null;
  existingDevices?: DeviceItem[];
  onSaveDevice: (device: DeviceItem, isEdit: boolean) => void;
}

export function DeviceModal({
  isOpen,
  onClose,
  activeAccount,
  deviceToEdit,
  existingDevices,
  onSaveDevice,
}: DeviceModalProps) {
  const { language } = useLanguage();
  const [deviceId, setDeviceId] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [autoPrefix, setAutoPrefix] = useState('da');
  const [callApiOnAdd, setCallApiOnAdd] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const isEdit = Boolean(deviceToEdit);

  // Retrieve current devices for this account to compute next auto-number
  const currentDevices = useMemo(() => {
    if (existingDevices && existingDevices.length > 0) return existingDevices;
    if (activeAccount) return storage.getDevices(activeAccount.id);
    return [];
  }, [existingDevices, activeAccount]);

  useEffect(() => {
    if (deviceToEdit) {
      setDeviceId(deviceToEdit.device_id);
      setDeviceName(deviceToEdit.device_name);
    } else {
      setDeviceId('');
      setDeviceName('');
      setCallApiOnAdd(false);

      // Auto-detect dominant prefix from existing devices if available (e.g. vb, da, baz)
      let vbCount = 0;
      let daCount = 0;
      let bazCount = 0;
      for (const d of currentDevices) {
        if (/^vb\d+/i.test(d.device_name)) vbCount++;
        else if (/^da\d+/i.test(d.device_name)) daCount++;
        else if (/^baz\d+/i.test(d.device_name)) bazCount++;
      }
      if (vbCount > daCount && vbCount > bazCount) {
        setAutoPrefix('vb');
      } else if (bazCount > daCount && bazCount > vbCount) {
        setAutoPrefix('baz');
      } else {
        setAutoPrefix('da');
      }
    }
    setErrorMsg(null);
    setSuccessMsg(null);
  }, [deviceToEdit, isOpen, currentDevices]);

  // Compute default name if user leaves deviceName empty (same rule as import)
  const computedDefaultName = useMemo(() => {
    const cleanId = deviceId.trim();
    // 1. If device_id itself already matches [az]*[0-9] (e.g. da1, da10, da20, baz10, vb9)
    if (/^[a-zA-Z]+[0-9]+$/.test(cleanId)) {
      return cleanId;
    }

    // 2. Otherwise generate prefix + counter (e.g. da1, da2... da10, da20)
    const prefix = (autoPrefix || 'da').trim().toLowerCase() || 'da';
    const prefixRegex = new RegExp(`^${prefix}(\\d+)$`, 'i');
    let maxNum = 0;

    for (const d of currentDevices) {
      if (isEdit && d.device_id === deviceToEdit?.device_id) continue;
      const match = (d.device_name || '').match(prefixRegex);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }

    return `${prefix}${maxNum + 1}`;
  }, [deviceId, autoPrefix, currentDevices, isEdit, deviceToEdit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceId.trim()) {
      setErrorMsg(language === 'vi' ? 'Vui lòng nhập mã Device ID.' : 'Please enter Device ID.');
      return;
    }

    if (isEdit && !deviceName.trim()) {
      setErrorMsg(language === 'vi' ? 'Vui lòng nhập Tên thiết bị.' : 'Please enter Device Name.');
      return;
    }

    if (!activeAccount) {
      setErrorMsg(language === 'vi' ? 'Vui lòng chọn hoặc cấu hình tài khoản Proxyrack trước.' : 'Please select or configure a Proxyrack account first.');
      return;
    }

    // If deviceName is left empty when adding, fallback to computed default name
    const finalDeviceName = deviceName.trim() || computedDefaultName;

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (callApiOnAdd && !isEdit && activeAccount.apiKey) {
        try {
          await proxyrackApi.addDevice(activeAccount.apiKey, deviceId.trim(), finalDeviceName);
        } catch (apiErr: any) {
          console.warn('Proxyrack API notice:', apiErr.message);
        }
      }

      const savedDevice: DeviceItem = {
        device_id: deviceId.trim(),
        device_name: finalDeviceName,
        accountId: activeAccount.id,
        addedAt: deviceToEdit?.addedAt || new Date().toISOString(),
        systemType: deviceToEdit?.systemType || 'Linux/VPS',
        ip: deviceToEdit?.ip,
        location: deviceToEdit?.location || (language === 'vi' ? 'Tự động' : 'Automatic'),
        lastPingStatus: deviceToEdit?.lastPingStatus || 'unknown',
        lastPingTime: deviceToEdit?.lastPingTime || (language === 'vi' ? 'Chưa kiểm tra' : 'Not checked'),
        notes: deviceToEdit?.notes || `${language === 'vi' ? 'Tài khoản:' : 'Account:'} ${activeAccount.name}`,
      };

      onSaveDevice(savedDevice, isEdit);
      setSuccessMsg(
        isEdit
          ? (language === 'vi' ? 'Đã cập nhật thiết bị thành công!' : 'Device updated successfully!')
          : (language === 'vi' ? `Đã lưu thiết bị "${finalDeviceName}" vào danh sách!` : `Device "${finalDeviceName}" added to list!`)
      );

      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMsg(err.message || (language === 'vi' ? 'Lỗi khi lưu thông tin thiết bị.' : 'Error saving device information.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">
                {isEdit
                  ? (language === 'vi' ? 'Chỉnh sửa thiết bị' : 'Edit Device')
                  : (language === 'vi' ? 'Thêm thiết bị tùy chỉnh' : 'Add Custom Device')}
              </h2>
              <p className="text-xs text-slate-400">
                {language === 'vi' ? 'Lưu vào bộ nhớ quản lý của tài khoản Proxyrack' : 'Save to Proxyrack account storage'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Active Account Info (Auto-assigned) */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
            <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">
              {language === 'vi' ? 'Tài khoản Proxyrack gán tự động' : 'Assigned Proxyrack Account'}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-400">
                {activeAccount?.name || (language === 'vi' ? 'Chưa chọn tài khoản' : 'No account selected')}
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                Key: {activeAccount?.apiKey ? `${activeAccount.apiKey.slice(0, 6)}...${activeAccount.apiKey.slice(-4)}` : 'N/A'}
              </span>
            </div>
          </div>

          {/* Feedback messages */}
          {errorMsg && (
            <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl flex items-start gap-2 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl flex items-center gap-2 text-xs text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Input 1: Device ID */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-200 flex items-center justify-between">
              <span>{language === 'vi' ? 'Mã Device ID' : 'Device ID'} <span className="text-rose-400">*</span></span>
              <span className="text-[10px] text-slate-500 font-normal">
                {language === 'vi' ? 'UUID do Proxyrack cấp' : 'UUID provided by Proxyrack'}
              </span>
            </label>
            <input
              type="text"
              required
              disabled={isEdit}
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              placeholder="Ví dụ: b3f2a1c0-4e78-4a1d-93cb-8c76543210ab..."
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500 disabled:opacity-60"
            />
            {isEdit && (
              <p className="text-[10px] text-slate-500 italic">
                {language === 'vi' ? 'Mã Device ID không đổi khi chỉnh sửa tên gợi nhớ.' : 'Device ID cannot be changed when editing name.'}
              </p>
            )}
          </div>

          {/* Input 2: Device Name */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-200">
                {language === 'vi' ? 'Tên thiết bị (Gợi nhớ)' : 'Device Name (Friendly label)'}{' '}
                {isEdit ? (
                  <span className="text-rose-400">*</span>
                ) : (
                  <span className="text-slate-500 font-normal">({language === 'vi' ? 'Tùy chọn' : 'Optional'})</span>
                )}
              </label>
              {!isEdit && (
                <span className="text-[11px] font-mono text-emerald-400">
                  {language === 'vi' ? 'Mặc định:' : 'Default:'}{' '}
                  <strong className="text-emerald-300 font-bold">{computedDefaultName}</strong>
                </span>
              )}
            </div>
            <input
              type="text"
              required={isEdit}
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder={
                isEdit
                  ? (language === 'vi' ? 'Ví dụ: VPS-Singapore-01, Docker-Node-US...' : 'E.g., VPS-Singapore-01, Docker-Node-US...')
                  : (language === 'vi' ? `Để trống sẽ tự động đặt: ${computedDefaultName}` : `Leave empty for default: ${computedDefaultName}`)
              }
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />

            {/* Quick prefix presets & rule info when adding new device (same as Import) */}
            {!isEdit && (
              <div className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2 mt-1">
                <div className="flex flex-wrap items-center justify-between gap-1.5 text-[11px]">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{language === 'vi' ? 'Tên tự động sinh:' : 'Auto generated:'}</span>
                    <strong className="text-emerald-400 font-mono font-bold bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800/80">
                      {computedDefaultName}
                    </strong>
                    {/^[a-zA-Z]+[0-9]+$/.test(deviceId.trim()) && (
                      <span className="text-cyan-400 text-[10px] font-medium">
                        ({language === 'vi' ? 'Theo mã ID' : 'Matches ID pattern'})
                      </span>
                    )}
                  </span>

                  {/* Prefix presets (only shown if device_id is not already [az]*[0-9]) */}
                  {!/^[a-zA-Z]+[0-9]+$/.test(deviceId.trim()) && (
                    <div className="flex items-center gap-1">
                      <span className="text-slate-500 text-[10px]">{language === 'vi' ? 'Tiền tố:' : 'Prefix:'}</span>
                      {['da', 'baz', 'vb', 'node'].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setAutoPrefix(preset)}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                            autoPrefix === preset
                              ? 'bg-emerald-950 border-emerald-700 text-emerald-300 font-bold'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <p className="text-[10.5px] text-slate-500 leading-relaxed">
                  {language === 'vi'
                    ? 'Tương tự như phần Import: nếu không nhập tên, tên sẽ tự động tạo theo prefix [az]*[0-9] (da1, da2... baz10) hoặc lấy theo mã ID nếu mã có dạng chữ + số.'
                    : 'Similar to Import: if left empty, the name is auto-generated using prefix [az]*[0-9] (da1, da2... baz10) or uses the device_id if it is alphanumeric.'}
                </p>
              </div>
            )}
          </div>

          {/* Optional API call on add */}
          {!isEdit && (
            <label className="flex items-center gap-2 cursor-pointer pt-1 text-xs text-slate-400 select-none">
              <input
                type="checkbox"
                checked={callApiOnAdd}
                onChange={(e) => setCallApiOnAdd(e.target.checked)}
                className="rounded border-slate-700 text-emerald-600 focus:ring-emerald-500 bg-slate-950"
              />
              <span>
                {language === 'vi'
                  ? 'Gửi lệnh đăng ký lên máy chủ Proxyrack (POST /api/device/add)'
                  : 'Send registration request to Proxyrack server (POST /api/device/add)'}
              </span>
            </label>
          )}

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
            >
              {language === 'vi' ? 'Hủy' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isLoading || !deviceId.trim() || (isEdit && !deviceName.trim())}
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
            >
              {isEdit ? <Save className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
              <span>
                {isLoading
                  ? (language === 'vi' ? 'Đang lưu...' : 'Saving...')
                  : isEdit
                  ? (language === 'vi' ? 'Lưu thay đổi' : 'Save Changes')
                  : (language === 'vi' ? 'Thêm thiết bị' : 'Add Device')}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
