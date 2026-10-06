import { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  Download, 
  FileText, 
  Copy, 
  Check, 
  AlertCircle, 
  CheckCircle2, 
  FileSpreadsheet, 
  Layers
} from 'lucide-react';
import { DeviceItem, UserAccount } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  devices: DeviceItem[];
  activeAccount: UserAccount | undefined;
  onImportDevices: (imported: DeviceItem[], overwrite: boolean) => void;
}

export function ImportExportModal({
  isOpen,
  onClose,
  devices,
  activeAccount,
  onImportDevices,
}: ImportExportModalProps) {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [copied, setCopied] = useState(false);

  // Import state
  const [importText, setImportText] = useState('');
  const [overwriteDuplicates, setOverwriteDuplicates] = useState(true);
  const [parsedDevices, setParsedDevices] = useState<{ id: string; name: string }[] | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);
  const [autoPrefix, setAutoPrefix] = useState('da');
  const [autoStartNum, setAutoStartNum] = useState(1);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  // Export data
  const exportDevicesList = devices.map((d) => ({
    device_id: d.device_id,
    device_name: d.device_name,
    accountId: activeAccount?.id || d.accountId,
    addedAt: d.addedAt,
    notes: d.notes,
  }));

  const jsonString = JSON.stringify(exportDevicesList, null, 2);

  const handleDownloadJSON = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeAccountName = (activeAccount?.name || 'account').replace(/[^a-zA-Z0-9_-]/g, '_');
    link.href = url;
    link.download = `proxyrack_devices_${safeAccountName}_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadCSV = () => {
    const headers = ['device_id', 'device_name', 'account_name', 'added_at'];
    const rows = devices.map((d) => [
      `"${d.device_id.replace(/"/g, '""')}"`,
      `"${d.device_name.replace(/"/g, '""')}"`,
      `"${(activeAccount?.name || '').replace(/"/g, '""')}"`,
      `"${d.addedAt || ''}"`,
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeAccountName = (activeAccount?.name || 'account').replace(/[^a-zA-Z0-9_-]/g, '_');
    link.href = url;
    link.download = `proxyrack_devices_${safeAccountName}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyJSON = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Parse text (JSON or CSV/lines)
  const handleParseInput = (
    raw: string,
    prefixOverride?: string,
    startNumOverride?: number
  ) => {
    setParseError(null);
    setParsedDevices(null);
    setImportSuccessMsg(null);

    const trimmed = raw.trim();
    if (!trimmed) {
      return;
    }

    const effectivePrefix = (prefixOverride !== undefined ? prefixOverride : autoPrefix).trim() || 'da';
    let counter = Math.max(1, Number(startNumOverride !== undefined ? startNumOverride : autoStartNum) || 1);

    try {
      // 1. Try parsing JSON
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        const json = JSON.parse(trimmed);
        const arr = Array.isArray(json) ? json : [json];
        const valid: { id: string; name: string }[] = [];
        for (const item of arr) {
          const id = item.device_id || item.deviceId || item.id;
          let name = item.device_name || item.deviceName || item.name;
          if (id && String(id).trim()) {
            const cleanId = String(id).trim();
            let cleanName = String(name || '').trim();
            if (!cleanName) {
              if (/^[a-zA-Z]+[0-9]+$/.test(cleanId)) {
                cleanName = cleanId;
              } else {
                cleanName = `${effectivePrefix}${counter++}`;
              }
            }
            valid.push({ id: cleanId, name: cleanName });
          }
        }
        if (valid.length === 0) {
          setParseError(language === 'vi' ? 'Không tìm thấy trường device_id hợp lệ trong file JSON.' : 'No valid device_id field found in JSON.');
          return;
        }
        setParsedDevices(valid);
        return;
      }
    } catch {
      // Not JSON, continue to CSV/line parser
    }

    // 2. Parse CSV or line-by-line format:
    // Format: device_id,device_name OR device_id only
    const lines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const valid: { id: string; name: string }[] = [];

    for (const line of lines) {
      const lower = line.toLowerCase();
      // Skip header line if present
      if (
        (lower.includes('device_id') && lower.includes('device_name')) ||
        lower === 'device_id' ||
        lower === 'device_id,name'
      ) {
        continue;
      }

      // Split by comma, semicolon, tab, or pipe
      const parts = line.split(/[,;\t|]/).map((p) => p.trim().replace(/^["']|["']$/g, ''));
      const id = parts[0] ? parts[0].trim() : '';
      let name = parts.length >= 2 && parts[1] ? parts[1].trim() : '';

      if (id) {
        if (!name) {
          // If the ID itself already matches pattern [az]*[0-9] (e.g. da1, da10, da20, baz10)
          if (/^[a-zA-Z]+[0-9]+$/.test(id)) {
            name = id;
          } else {
            name = `${effectivePrefix}${counter++}`;
          }
        }
        valid.push({ id, name });
      }
    }

    if (valid.length === 0) {
      setParseError(
        language === 'vi'
          ? 'Không tìm thấy dữ liệu hợp lệ. Nhập mỗi dòng: device_id,device_name hoặc chỉ cần device_id.'
          : 'Could not parse data. Please enter valid JSON or CSV: device_id,device_name or device_id only.'
      );
      return;
    }

    setParsedDevices(valid);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setImportText(content);
      handleParseInput(content);
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleConfirmImport = () => {
    if (!parsedDevices || parsedDevices.length === 0) return;
    if (!activeAccount) {
      setParseError(language === 'vi' ? 'Vui lòng chọn tài khoản Proxyrack.' : 'Please select a Proxyrack account.');
      return;
    }

    const newDevices: DeviceItem[] = parsedDevices.map((p) => ({
      device_id: p.id,
      device_name: p.name,
      accountId: activeAccount.id,
      addedAt: new Date().toISOString(),
      systemType: 'Linux/VPS',
      lastPingStatus: 'unknown',
      notes: `Import -> ${activeAccount.name}`,
    }));

    onImportDevices(newDevices, overwriteDuplicates);
    setImportSuccessMsg(
      language === 'vi'
        ? `Đã import thành công ${newDevices.length} thiết bị vào tài khoản ${activeAccount.name}!`
        : `Successfully imported ${newDevices.length} devices into ${activeAccount.name}!`
    );
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">
                {language === 'vi' ? 'Xuất & Nhập Danh sách Thiết bị' : 'Export & Import Device List'}
              </h2>
              <p className="text-xs text-slate-400">
                {language === 'vi' ? 'Tài khoản:' : 'Account:'}{' '}
                <strong className="text-emerald-400">{activeAccount?.name}</strong> · {devices.length}{' '}
                {language === 'vi' ? 'thiết bị hiện có' : 'current devices'}
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

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-6 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('export')}
            className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'export'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>{language === 'vi' ? 'Xuất dữ liệu (Export)' : 'Export Devices'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'import'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>{language === 'vi' ? 'Nhập dữ liệu (Import)' : 'Import Devices'}</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'export' ? (
            /* EXPORT TAB */
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-slate-400">
                  {language === 'vi'
                    ? `Xuất danh sách ${devices.length} thiết bị đã nhập dưới dạng file hoặc copy mã JSON:`
                    : `Export ${devices.length} devices as JSON/CSV file or copy raw JSON:`}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadJSON}
                    disabled={devices.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                  >
                    <FileText className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{language === 'vi' ? 'Tải file .JSON' : 'Download .JSON'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadCSV}
                    disabled={devices.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{language === 'vi' ? 'Tải file .CSV' : 'Download .CSV'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyJSON}
                    disabled={devices.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? (language === 'vi' ? 'Đã copy' : 'Copied!') : 'Copy JSON'}</span>
                  </button>
                </div>
              </div>

              {devices.length === 0 ? (
                <div className="p-8 text-center bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-400">
                  {language === 'vi'
                    ? 'Chưa có thiết bị nào trong danh sách tài khoản hiện tại để xuất.'
                    : 'No devices found in current account to export.'}
                </div>
              ) : (
                <div className="relative">
                  <pre className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-[11px] font-mono text-emerald-300 max-h-60 overflow-y-auto leading-relaxed select-all">
                    {jsonString}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            /* IMPORT TAB */
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-xs text-slate-400">
                  {language === 'vi'
                    ? 'Nhập danh sách thiết bị bằng cách tải file JSON/CSV hoặc dán trực tiếp:'
                    : 'Import devices by uploading JSON/CSV or pasting raw text:'}
                </p>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,.csv,.txt"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="import-file-input"
                  />
                  <label
                    htmlFor="import-file-input"
                    className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{language === 'vi' ? 'Chọn file từ máy' : 'Upload file'}</span>
                  </label>
                </div>
              </div>

              {/* Auto Prefix Configuration when device_name is omitted */}
              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span>
                      {language === 'vi'
                        ? 'Quy tắc đặt tên khi hàng chỉ có device_id:'
                        : 'Auto-naming rule when row only has device_id:'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-[11px] text-slate-400">
                      <span>{language === 'vi' ? 'Tiền tố (Prefix):' : 'Prefix:'}</span>
                      <input
                        type="text"
                        value={autoPrefix}
                        onChange={(e) => {
                          const val = e.target.value;
                          setAutoPrefix(val);
                          handleParseInput(importText, val, autoStartNum);
                        }}
                        placeholder="da"
                        className="w-20 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs font-mono text-emerald-400 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-slate-400">
                      <span>{language === 'vi' ? 'Số bắt đầu:' : 'Start #:'}</span>
                      <input
                        type="number"
                        min={1}
                        value={autoStartNum}
                        onChange={(e) => {
                          const val = Math.max(1, parseInt(e.target.value) || 1);
                          setAutoStartNum(val);
                          handleParseInput(importText, autoPrefix, val);
                        }}
                        className="w-16 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs font-mono text-emerald-400 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-800/80 text-[11px] text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <span>{language === 'vi' ? 'Mẫu nhanh:' : 'Quick presets:'}</span>
                    {['da', 'baz', 'vb', 'node'].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setAutoPrefix(preset);
                          handleParseInput(importText, preset, autoStartNum);
                        }}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                          autoPrefix === preset
                            ? 'bg-emerald-950 border-emerald-700 text-emerald-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                  <div className="text-[11px] text-emerald-400/90 font-mono">
                    {language === 'vi'
                      ? `Ví dụ tạo: ${autoPrefix || 'da'}${autoStartNum}, ${autoPrefix || 'da'}${autoStartNum + 1}... ${autoPrefix || 'da'}10, ${autoPrefix || 'da'}20`
                      : `Generates: ${autoPrefix || 'da'}${autoStartNum}, ${autoPrefix || 'da'}${autoStartNum + 1}... ${autoPrefix || 'da'}10, ${autoPrefix || 'da'}20`}
                  </div>
                </div>
              </div>

              {/* Textarea */}
              <div className="space-y-1">
                <textarea
                  rows={5}
                  value={importText}
                  onChange={(e) => {
                    setImportText(e.target.value);
                    handleParseInput(e.target.value);
                  }}
                  placeholder={
                    language === 'vi'
                      ? 'Nhập mỗi dòng 1 thiết bị:\ndevice_id,device_name\nhoặc chỉ nhập mỗi dòng 1 mã device_id (tên sẽ tự động đặt theo prefix: da1, da2, ... da10, da20, baz10)'
                      : 'Enter 1 device per line:\ndevice_id,device_name\nor device_id only (name will be auto-assigned with prefix: da1, da2, ... da10, da20, baz10)'
                  }
                  className="w-full p-3 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Overwrite option */}
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400 select-none">
                <input
                  type="checkbox"
                  checked={overwriteDuplicates}
                  onChange={(e) => setOverwriteDuplicates(e.target.checked)}
                  className="rounded border-slate-700 text-emerald-600 focus:ring-emerald-500 bg-slate-950"
                />
                <span>
                  {language === 'vi'
                    ? 'Cập nhật/ghi đè nếu thiết bị đã trùng device_id'
                    : 'Update/overwrite existing devices with matching device_id'}
                </span>
              </label>

              {/* Feedback messages */}
              {parseError && (
                <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl flex items-start gap-2 text-xs text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <span>{parseError}</span>
                </div>
              )}

              {importSuccessMsg && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl flex items-center gap-2 text-xs text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{importSuccessMsg}</span>
                </div>
              )}

              {/* Preview Parsed */}
              {parsedDevices && parsedDevices.length > 0 && (
                <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-emerald-400">
                      {language === 'vi'
                        ? `Tìm thấy ${parsedDevices.length} thiết bị hợp lệ:`
                        : `Found ${parsedDevices.length} valid devices:`}
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      {language === 'vi' ? 'Sẵn sàng nạp vào storage' : 'Ready to save to storage'}
                    </span>
                  </div>
                  <div className="max-h-44 overflow-y-auto space-y-1 pr-1 divide-y divide-slate-800/50">
                    {[...parsedDevices]
                      .sort((a, b) =>
                        (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' })
                      )
                      .map((p, idx) => (
                      <div key={idx} className="pt-1 flex items-center justify-between text-xs font-mono">
                        <span className="text-emerald-300 font-semibold truncate mr-2">{p.name}</span>
                        <span className="text-slate-400 truncate max-w-[200px]">{p.id}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/50 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
          >
            {language === 'vi' ? 'Đóng' : 'Close'}
          </button>
          {activeTab === 'import' && (
            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={!parsedDevices || parsedDevices.length === 0}
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>
                {language === 'vi'
                  ? `Nạp ${parsedDevices?.length || 0} thiết bị vào Storage`
                  : `Save ${parsedDevices?.length || 0} devices to Storage`}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
