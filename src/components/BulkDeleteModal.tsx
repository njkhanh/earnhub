import { useState } from 'react';
import { 
  X, 
  Trash2, 
  AlertTriangle, 
  HardDrive, 
  CloudOff, 
  CheckCircle2, 
  Loader2,
  AlertCircle
} from 'lucide-react';
import { DeviceItem } from '../types';
import { proxyrackApi } from '../services/proxyrackApi';
import { useLanguage } from '../contexts/LanguageContext';

interface BulkDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDevices: DeviceItem[];
  apiKey: string;
  onBulkDeleted: (deletedIds: string[]) => void;
}

export function BulkDeleteModal({
  isOpen,
  onClose,
  selectedDevices,
  apiKey,
  onBulkDeleted,
}: BulkDeleteModalProps) {
  const { language } = useLanguage();
  const [deleteMode, setDeleteMode] = useState<'storage_only' | 'api_and_storage'>('storage_only');
  const [hasConfirmed, setHasConfirmed] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressText, setProgressText] = useState<string | null>(null);
  const [resultsLog, setResultsLog] = useState<{ id: string; name: string; success: boolean; msg: string }[] | null>(null);

  if (!isOpen || selectedDevices.length === 0) return null;

  const handleExecuteDelete = async () => {
    setIsProcessing(true);
    setProgressText(language === 'vi' ? 'Đang bắt đầu xử lý...' : 'Starting process...');
    const logs: { id: string; name: string; success: boolean; msg: string }[] = [];
    const successfulIds: string[] = [];

    if (deleteMode === 'storage_only') {
      // Storage only deletion
      selectedDevices.forEach((d) => {
        successfulIds.push(d.device_id);
        logs.push({
          id: d.device_id,
          name: d.device_name,
          success: true,
          msg: language === 'vi' ? 'Đã xóa khỏi bộ nhớ lưu trữ (Storage)' : 'Removed from local storage',
        });
      });
    } else {
      // Call API delete for each device
      for (let i = 0; i < selectedDevices.length; i++) {
        const d = selectedDevices[i];
        setProgressText(
          language === 'vi'
            ? `Đang gọi API xóa thiết bị (${i + 1}/${selectedDevices.length}): ${d.device_name}...`
            : `Calling API to delete device (${i + 1}/${selectedDevices.length}): ${d.device_name}...`
        );

        try {
          const res = await proxyrackApi.deleteDevice(apiKey, d.device_id);
          successfulIds.push(d.device_id);
          logs.push({
            id: d.device_id,
            name: d.device_name,
            success: true,
            msg: res?.message || (language === 'vi' ? 'Đã xóa thành công trên API Proxyrack & Storage' : 'Successfully deleted on Proxyrack API & Storage'),
          });
        } catch (err: any) {
          console.warn(`Error deleting device ${d.device_id}:`, err);
          successfulIds.push(d.device_id);
          logs.push({
            id: d.device_id,
            name: d.device_name,
            success: false,
            msg: language === 'vi'
              ? `API Proxyrack: ${err.message || 'Lỗi API'} (đã gỡ khỏi Storage)`
              : `Proxyrack API: ${err.message || 'API error'} (removed from Storage)`,
          });
        }

        if (i < selectedDevices.length - 1) {
          await new Promise((r) => setTimeout(r, 300));
        }
      }
    }

    setResultsLog(logs);
    setIsProcessing(false);
    setProgressText(null);

    onBulkDeleted(successfulIds);
  };

  const handleClose = () => {
    if (isProcessing) return;
    setResultsLog(null);
    setHasConfirmed(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-950/80 border border-rose-800/80 flex items-center justify-center text-rose-400">
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">
                {language === 'vi'
                  ? `Xác nhận xóa đồng loạt (${selectedDevices.length} thiết bị)`
                  : `Confirm Bulk Deletion (${selectedDevices.length} devices)`}
              </h2>
              <p className="text-xs text-slate-400">
                {language === 'vi' ? 'Thao tác xóa hàng loạt thiết bị đã chọn' : 'Batch delete selected devices'}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isProcessing}
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {resultsLog ? (
            /* Results Screen */
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {language === 'vi'
                    ? `Đã xử lý xong ${resultsLog.length} thiết bị`
                    : `Finished processing ${resultsLog.length} devices`}
                </span>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-800/60">
                {resultsLog.map((log, idx) => (
                  <div key={idx} className="pt-1.5 flex items-start justify-between text-xs font-mono">
                    <div>
                      <div className="text-slate-200 font-semibold">{log.name}</div>
                      <div className="text-slate-500 text-[10px]">{log.id}</div>
                    </div>
                    <span className={`text-[11px] text-right font-sans ${log.success ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {log.msg}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Confirm Screen */
            <>
              {/* Option Cards */}
              <div className="space-y-2.5">
                <label className="text-xs font-semibold text-slate-300">
                  {language === 'vi' ? 'Chọn hình thức xóa:' : 'Select deletion mode:'}
                </label>

                {/* Option 1: Storage Only */}
                <div
                  onClick={() => !isProcessing && setDeleteMode('storage_only')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                    deleteMode === 'storage_only'
                      ? 'bg-slate-800/90 border-emerald-500 ring-1 ring-emerald-500/50'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 opacity-70'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                    <HardDrive className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-100">
                        {language === 'vi' ? 'Chỉ xóa khỏi bộ nhớ (Storage)' : 'Storage Only'}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-800/60">
                        {language === 'vi' ? 'Khuyên dùng' : 'Recommended'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {language === 'vi'
                        ? `Chỉ gỡ bỏ ${selectedDevices.length} thiết bị khỏi bộ nhớ lưu trữ nội bộ của ứng dụng. Không gửi lệnh xóa lên máy chủ Proxyrack.`
                        : `Only removes ${selectedDevices.length} devices from local app storage. Does not delete from Proxyrack servers.`}
                    </p>
                  </div>
                </div>

                {/* Option 2: API & Storage */}
                <div
                  onClick={() => !isProcessing && setDeleteMode('api_and_storage')}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                    deleteMode === 'api_and_storage'
                      ? 'bg-slate-800/90 border-rose-500 ring-1 ring-rose-500/50'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 opacity-70'
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-rose-950/60 border border-rose-800/60 flex items-center justify-center text-rose-400 shrink-0 mt-0.5">
                    <CloudOff className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-100">
                        {language === 'vi' ? 'Xóa cả tại API Proxyrack & Storage' : 'API & Storage Deletion'}
                      </span>
                      <span className="text-[10px] font-mono text-rose-400 bg-rose-950/80 px-1.5 py-0.2 rounded border border-rose-800/60">
                        {language === 'vi' ? 'Trực tiếp' : 'Live'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {language === 'vi' ? (
                        <>Gửi lệnh <code>POST /api/device/delete</code> lên máy chủ Proxyrack để xóa thiết bị trên hệ thống, đồng thời xóa khỏi bộ nhớ Storage.</>
                      ) : (
                        <>Sends <code>POST /api/device/delete</code> to Proxyrack servers to unregister nodes from network, and removes them from Storage.</>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Warning Banner if API mode */}
              {deleteMode === 'api_and_storage' && (
                <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl flex items-start gap-2.5 text-xs text-amber-300">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>{language === 'vi' ? 'Cảnh báo:' : 'Warning:'}</strong>{' '}
                    {language === 'vi'
                      ? 'Thao tác xóa trên API Proxyrack sẽ hủy đăng ký thiết bị trên tài khoản mạng lưới của bạn và không thể hoàn tác.'
                      : 'Deleting via Proxyrack API will unregister the device from your network account and cannot be undone.'}
                  </span>
                </div>
              )}

              {/* List of devices to delete */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-medium text-slate-400">
                  {language === 'vi'
                    ? `Danh sách ${selectedDevices.length} thiết bị sẽ bị xóa:`
                    : `List of ${selectedDevices.length} devices to be deleted:`}
                </span>
                <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl max-h-36 overflow-y-auto space-y-1 divide-y divide-slate-800/60">
                  {[...selectedDevices]
                    .sort((a, b) =>
                      (a.device_name || '').localeCompare(b.device_name || '', undefined, { numeric: true, sensitivity: 'base' })
                    )
                    .map((d) => (
                    <div key={d.device_id} className="pt-1 flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-200 font-semibold truncate mr-2">{d.device_name}</span>
                      <span className="text-slate-500 truncate max-w-[180px]">{d.device_id}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Confirmation Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer pt-1 text-xs text-slate-300 select-none">
                <input
                  type="checkbox"
                  checked={hasConfirmed}
                  onChange={(e) => setHasConfirmed(e.target.checked)}
                  disabled={isProcessing}
                  className="rounded border-slate-700 text-rose-600 focus:ring-rose-500 bg-slate-950"
                />
                <span>
                  {language === 'vi'
                    ? `Tôi xác nhận đồng ý xóa ${selectedDevices.length} thiết bị này.`
                    : `I confirm and agree to delete these ${selectedDevices.length} devices.`}
                </span>
              </label>

              {/* Processing Progress */}
              {isProcessing && (
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center gap-2.5 text-xs text-emerald-400 font-mono">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>{progressText}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/50 flex items-center justify-end gap-2">
          {resultsLog ? (
            <button
              type="button"
              onClick={handleClose}
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors shadow-sm"
            >
              {language === 'vi' ? 'Hoàn tất & Đóng' : 'Done & Close'}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleClose}
                disabled={isProcessing}
                className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors disabled:opacity-50"
              >
                {language === 'vi' ? 'Hủy bỏ' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleExecuteDelete}
                disabled={!hasConfirmed || isProcessing}
                className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
              >
                {isProcessing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>
                  {isProcessing
                    ? (language === 'vi' ? 'Đang xóa...' : 'Deleting...')
                    : deleteMode === 'storage_only'
                    ? (language === 'vi' ? `Xóa ${selectedDevices.length} thiết bị khỏi Storage` : `Delete ${selectedDevices.length} from Storage`)
                    : (language === 'vi' ? `Xóa ${selectedDevices.length} thiết bị (API & Storage)` : `Delete ${selectedDevices.length} (API & Storage)`)}
                </span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
