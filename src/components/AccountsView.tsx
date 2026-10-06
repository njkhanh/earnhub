import { useState } from 'react';
import { 
  Key, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Eye, 
  EyeOff, 
  Copy, 
  Check, 
  Zap, 
  Trash2, 
  ShieldAlert,
  Server,
  ExternalLink,
  Gift,
  Pencil,
  X,
  Save
} from 'lucide-react';
import { UserAccount } from '../types';
import { proxyrackApi } from '../services/proxyrackApi';
import { storage } from '../services/storage';
import { useLanguage } from '../contexts/LanguageContext';

interface AccountsViewProps {
  accounts: UserAccount[];
  activeAccountId: string;
  onSelectAccount: (id: string) => void;
  onSaveAccounts: (accounts: UserAccount[]) => void;
  onRefreshData: () => void;
}

export function AccountsView({
  accounts,
  activeAccountId,
  onSelectAccount,
  onSaveAccounts,
  onRefreshData,
}: AccountsViewProps) {
  const { language, t } = useLanguage();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAccName, setNewAccName] = useState('');
  const [newAccKey, setNewAccKey] = useState('');
  const [newAccNotes, setNewAccNotes] = useState('');
  const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; msg: string; latency?: number }>>({});

  // Editing state for full modal edit
  const [editingAccount, setEditingAccount] = useState<UserAccount | null>(null);
  const [editName, setEditName] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Quick inline edit state
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [inlineName, setInlineName] = useState('');

  const toggleReveal = (id: string) => {
    setRevealedKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleTestConnection = async (account: UserAccount) => {
    setTestingId(account.id);
    try {
      const res = await proxyrackApi.testApiKey(account.apiKey);
      if (res.valid) {
        setTestResults((prev) => ({
          ...prev,
          [account.id]: {
            success: true,
            msg: `API Key hợp lệ! Số dư: ${res.balance || 'N/A'}`,
            latency: res.latencyMs,
          },
        }));

        // Safely update specific account in storage
        storage.updateAccount(account.id, {
          lastTestedAt: new Date().toISOString(),
          testStatus: 'valid' as const,
          cachedBalance: res.balance,
        });
        onSaveAccounts(storage.getAccounts());
      } else {
        setTestResults((prev) => ({
          ...prev,
          [account.id]: {
            success: false,
            msg: res.error || 'API Key không hợp lệ hoặc máy chủ từ chối',
            latency: res.latencyMs,
          },
        }));

        storage.updateAccount(account.id, {
          lastTestedAt: new Date().toISOString(),
          testStatus: 'invalid' as const,
        });
        onSaveAccounts(storage.getAccounts());
      }
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [account.id]: {
          success: false,
          msg: err.message || 'Lỗi kiểm tra API Key',
        },
      }));
    } finally {
      setTestingId(null);
    }
  };

  const handleAddAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccName.trim() || !newAccKey.trim()) return;

    const currentAccounts = storage.getAccounts();
    const newAccount: UserAccount = {
      id: `acc_${Date.now()}`,
      name: newAccName.trim(),
      earnAppId: 'proxyrack',
      apiKey: newAccKey.trim(),
      notes: newAccNotes.trim() || undefined,
      createdAt: new Date().toISOString(),
      isDefault: currentAccounts.length === 0,
      testStatus: 'untested',
    };

    // 1. Persist directly to storage and set active
    storage.addAccount(newAccount);
    storage.setActiveAccountId(newAccount.id);

    // 2. Notify parent state with refreshed list
    const updated = storage.getAccounts();
    onSaveAccounts(updated);
    onSelectAccount(newAccount.id);

    // 3. Close modal & reset fields
    setShowAddModal(false);
    setNewAccName('');
    setNewAccKey('');
    setNewAccNotes('');

    // 4. Test connection safely
    handleTestConnection(newAccount);
  };

  const handleDeleteAccount = (id: string) => {
    const current = storage.getAccounts();
    if (current.length <= 1) {
      alert('Hệ thống cần ít nhất 1 tài khoản đang hoạt động.');
      return;
    }
    if (confirm('Bạn có chắc chắn muốn xoá cấu hình tài khoản này khỏi danh sách quản lý?')) {
      storage.deleteAccount(id);
      const remaining = storage.getAccounts();
      onSaveAccounts(remaining);
      if (activeAccountId === id && remaining.length > 0) {
        onSelectAccount(remaining[0].id);
      }
    }
  };

  const handleStartInlineEdit = (account: UserAccount) => {
    setInlineEditingId(account.id);
    setInlineName(account.name);
  };

  const handleSaveInlineEdit = (id: string) => {
    const trimmed = inlineName.trim();
    if (!trimmed) return;
    storage.updateAccount(id, { name: trimmed });
    const updated = storage.getAccounts();
    onSaveAccounts(updated);
    setInlineEditingId(null);
  };

  const handleOpenEditModal = (account: UserAccount) => {
    setEditingAccount(account);
    setEditName(account.name);
    setEditNotes(account.notes || '');
  };

  const handleSaveEditModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;
    const trimmed = editName.trim();
    if (!trimmed) return;

    storage.updateAccount(editingAccount.id, {
      name: trimmed,
      notes: editNotes.trim() || undefined,
    });
    const updated = storage.getAccounts();
    onSaveAccounts(updated);
    setEditingAccount(null);
  };

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">{t('accounts.title')}</h1>
          <p className="text-xs text-slate-400 mt-1">
            {t('accounts.subtitle')}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-sm transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{t('accounts.addNew')}</span>
        </button>
      </div>

      {/* Security Info Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400 shrink-0">
            <Key className="w-4 h-4" />
          </div>
          <div>
            <div className="font-medium text-slate-200">{t('accounts.authFormatTitle')}</div>
            <div className="text-slate-400 text-[11px] mt-0.5">
              Header: <code className="text-slate-300">Api-Key: &lt;KEY&gt;</code> · Content-Type:{' '}
              <code className="text-slate-300">application/json</code> · Query body format
            </div>
          </div>
        </div>
      </div>

      {/* Account Cards List or Empty State */}
      {accounts.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
            <Gift className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-100">{t('accounts.emptyTitle')}</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              {t('accounts.emptyDesc')}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <a
              href="https://peer.proxyrack.com/ref/52q2pwpn7cvfthv8qbt0goiahml1xrew7uhiuz1l"
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-amber-500 hover:to-emerald-500 text-white rounded-lg text-xs font-bold inline-flex items-center gap-2 transition-all shadow-md"
            >
              <Gift className="w-4 h-4" />
              <span>{t('accounts.emptyRegisterBtn')}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold inline-flex items-center gap-2 transition-colors border border-slate-700"
            >
              <Plus className="w-4 h-4" />
              <span>{t('accounts.emptyAddBtn')}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
        {accounts.map((acc) => {
          const isActive = acc.id === activeAccountId;
          const isRevealed = revealedKeys[acc.id] || false;
          const isTesting = testingId === acc.id;
          const testRes = testResults[acc.id];

          return (
            <div
              key={acc.id}
              className={`bg-slate-900 border rounded-xl p-5 transition-all ${
                isActive ? 'border-emerald-500/60 shadow-lg shadow-emerald-950/20' : 'border-slate-800'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Account info */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {inlineEditingId === acc.id ? (
                      <div className="flex items-center gap-1.5 animate-fade-in">
                        <input
                          type="text"
                          autoFocus
                          value={inlineName}
                          onChange={(e) => setInlineName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveInlineEdit(acc.id);
                            if (e.key === 'Escape') setInlineEditingId(null);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold bg-slate-950 border border-emerald-500 rounded-lg text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          placeholder={language === 'vi' ? 'Nhập tên gợi nhớ...' : 'Enter friendly name...'}
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveInlineEdit(acc.id)}
                          className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors shadow-sm"
                          title={language === 'vi' ? 'Lưu tên' : 'Save name'}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setInlineEditingId(null)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                          title={language === 'vi' ? 'Hủy' : 'Cancel'}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 group/title">
                        <span className="font-semibold text-sm text-slate-100">{acc.name}</span>
                        <button
                          type="button"
                          onClick={() => handleStartInlineEdit(acc)}
                          className="text-slate-500 hover:text-emerald-400 p-0.5 rounded transition-colors"
                          title={language === 'vi' ? 'Nhấp để sửa nhanh tên gợi nhớ' : 'Click to quickly rename'}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {isActive ? (
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 border border-emerald-800/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Check className="w-3 h-3" /> Đang sử dụng
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onSelectAccount(acc.id)}
                        className="text-[10px] font-mono text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 px-2 py-0.5 rounded-full transition-colors"
                      >
                        Chọn tài khoản này
                      </button>
                    )}
                  </div>

                  {acc.notes && <p className="text-xs text-slate-400">{acc.notes}</p>}

                  {/* API Key Box */}
                  <div className="flex items-center gap-2 max-w-xl">
                    <div className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 font-mono text-xs text-slate-300 flex items-center justify-between overflow-hidden">
                      <span className="truncate">
                        {isRevealed
                          ? acc.apiKey
                          : `${acc.apiKey.slice(0, 8)}••••••••••••••••••••${acc.apiKey.slice(-4)}`}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <button
                          type="button"
                          onClick={() => toggleReveal(acc.id)}
                          className="text-slate-500 hover:text-slate-300 transition-colors p-1"
                          title={isRevealed ? 'Ẩn API Key' : 'Hiện API Key'}
                        >
                          {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopy(acc.id, acc.apiKey)}
                          className="text-slate-500 hover:text-slate-300 transition-colors p-1"
                          title="Sao chép API Key"
                        >
                          {copiedId === acc.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right actions: Test connection, edit, delete */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 self-start lg:self-auto">
                  <button
                    type="button"
                    onClick={() => handleTestConnection(acc)}
                    disabled={isTesting}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Zap className={`w-3.5 h-3.5 ${isTesting ? 'animate-pulse text-amber-400' : 'text-emerald-400'}`} />
                    <span>{isTesting ? 'Đang test...' : 'Kiểm tra kết nối'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(acc)}
                    title={language === 'vi' ? 'Chỉnh sửa tên gợi nhớ & ghi chú' : 'Edit friendly name & notes'}
                    className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-800/80 rounded-lg transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteAccount(acc.id)}
                    title="Xoá tài khoản này khỏi danh sách quản lý"
                    className="p-2 text-slate-500 hover:text-rose-400 hover:bg-slate-800/80 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Test results banner */}
              {testRes && (
                <div
                  className={`mt-3 p-2.5 rounded-lg text-xs flex items-center justify-between gap-2 ${
                    testRes.success
                      ? 'bg-emerald-950/40 border border-emerald-800/50 text-emerald-300'
                      : 'bg-rose-950/40 border border-rose-800/50 text-rose-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {testRes.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span>{testRes.msg}</span>
                  </div>
                  {testRes.latency !== undefined && (
                    <span className="text-[11px] font-mono text-slate-400">
                      Độ trễ: {testRes.latency}ms
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      )}

      {/* Add Account Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-semibold text-slate-100">{t('accounts.modalTitle')}</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            {/* Guide to register via link for users without API key */}
            <div className="bg-gradient-to-r from-amber-950/60 to-emerald-950/60 border border-amber-500/40 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-300 flex items-center gap-1.5">
                  <Gift className="w-3.5 h-3.5 text-amber-400" />
                  <span>{t('accounts.guideModalTitle')}</span>
                </span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 border border-emerald-800 px-1.5 py-0.2 rounded font-bold">
                  {language === 'vi' ? 'Ưu đãi đối tác' : 'Partner Benefit'}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                {t('accounts.guideModalDesc')}
              </p>
              <a
                href="https://peer.proxyrack.com/ref/52q2pwpn7cvfthv8qbt0goiahml1xrew7uhiuz1l"
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-amber-500 hover:to-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
              >
                <Gift className="w-3.5 h-3.5" />
                <span>{t('accounts.guideModalBtn')}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <form onSubmit={handleAddAccount} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {t('accounts.modalNameLabel')} <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newAccName}
                  onChange={(e) => setNewAccName(e.target.value)}
                  placeholder={language === 'vi' ? 'Ví dụ: Proxyrack - Cụm Server OVH' : 'e.g. Proxyrack - OVH Server Cluster'}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {t('accounts.modalKeyLabel')} <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newAccKey}
                  onChange={(e) => setNewAccKey(e.target.value)}
                  placeholder={language === 'vi' ? 'Nhập chuỗi API Key từ peer.proxyrack.com' : 'Paste API Key from peer.proxyrack.com'}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-mono text-slate-100 focus:outline-none focus:border-emerald-500"
                />
                <div className="flex items-center justify-end mt-1">
                  <a
                    href="https://peer.proxyrack.com/ref/52q2pwpn7cvfthv8qbt0goiahml1xrew7uhiuz1l"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-amber-300 hover:underline inline-flex items-center gap-1 font-semibold"
                  >
                    <Gift className="w-3 h-3 text-amber-400" />
                    <span>{language === 'vi' ? 'Chưa có? Đăng ký nhận ref' : 'No key? Register partner link'}</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {t('accounts.modalNotesLabel')}
                </label>
                <textarea
                  rows={2}
                  value={newAccNotes}
                  onChange={(e) => setNewAccNotes(e.target.value)}
                  placeholder={language === 'vi' ? 'Ghi chú người dùng hoặc mục đích triển khai...' : 'Notes or deployment purpose...'}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 rounded-lg"
                >
                  {t('accounts.modalCancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg font-bold"
                >
                  {t('accounts.modalSave')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Account Modal (Chỉnh sửa tên gợi nhớ & ghi chú) */}
      {editingAccount && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">
                    {t('accounts.editModalTitle')}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {language === 'vi' ? 'Cập nhật tên gợi nhớ và ghi chú cho tài khoản' : 'Update friendly name and notes for account'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingAccount(null)}
                className="text-slate-400 hover:text-slate-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditModal} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {t('accounts.modalNameLabel')} <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder={language === 'vi' ? 'Nhập tên gợi nhớ tài khoản...' : 'Enter friendly name...'}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {t('accounts.modalKeyLabel')}
                </label>
                <div className="w-full px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-lg text-xs font-mono text-slate-400 truncate select-all">
                  {editingAccount.apiKey.slice(0, 8)}••••••••••••••••••••{editingAccount.apiKey.slice(-4)}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {t('accounts.modalNotesLabel')}
                </label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder={language === 'vi' ? 'Ghi chú người dùng hoặc mục đích triển khai...' : 'Notes or deployment purpose...'}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingAccount(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 rounded-lg transition-colors"
                >
                  {t('accounts.modalCancel')}
                </button>
                <button
                  type="submit"
                  disabled={!editName.trim()}
                  className="px-4 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg font-bold transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{t('accounts.saveChanges')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
