import { UserAccount, DeviceItem, EarnAppInfo } from '../types';

export const SUPPORTED_EARN_APPS: EarnAppInfo[] = [
  {
    id: 'proxyrack',
    name: 'Proxyrack Peer',
    category: 'Bandwidth Sharing / Residential Proxy',
    categoryEn: 'Bandwidth Sharing / Residential Proxy',
    description: 'Chia sẻ băng thông nhàn rỗi nhận thu nhập thụ động qua mạng lưới proxy toàn cầu Proxyrack.',
    descriptionEn: 'Share idle bandwidth to earn passive income via Proxyrack’s global residential proxy network.',
    status: 'active',
    payoutMinimum: '$5.00',
    payoutMethods: ['PayPal', 'Crypto (BTC, LTC)', 'Bank Wire'],
    earningsRate: '~$0.20 - $0.50 / GB',
    authType: 'api_key',
    website: 'https://peer.proxyrack.com',
    referralUrl: 'https://peer.proxyrack.com/ref/52q2pwpn7cvfthv8qbt0goiahml1xrew7uhiuz1l',
    bonusAmount: 'Đối tác chính thức',
    bonusAmountEn: 'Official Partner',
    bonusHighlight: 'Link đối tác xác thực - Hỗ trợ API Key kết nối trực tiếp app này',
    bonusHighlightEn: 'Verified Partner Link - Direct API Key integration supported in EarnHub',
    bonusDetails: 'Đăng ký qua link đối tác chính thức để kích hoạt tài khoản chia sẻ Proxy Residential, cấp quyền API Key không giới hạn và nhận hỗ trợ kỹ thuật tối ưu hóa thiết bị VPS/Docker.',
    bonusDetailsEn: 'Register via the official partner link to activate your residential proxy account, obtain full API Key privileges, and receive free VPS/Docker node optimization support.',
    tags: ['Residential Proxy', 'Đã tích hợp API', 'Docker/Linux/VPS', 'PayPal & Crypto'],
    tagsEn: ['Residential Proxy', 'API Integrated', 'Docker/Linux/VPS', 'PayPal & Crypto'],
    platforms: ['Linux', 'Docker', 'Windows'],
  },
  {
    id: 'earnapp',
    name: 'EarnApp',
    category: 'Bandwidth Sharing / BrightData',
    categoryEn: 'Bandwidth Sharing / BrightData',
    description: 'Nền tảng chia sẻ băng thông uy tín thuộc tập đoàn BrightData, trả thưởng tự động.',
    descriptionEn: 'Trusted bandwidth monetization platform operated by BrightData with automatic payouts.',
    status: 'coming_soon',
    payoutMinimum: '$2.50',
    payoutMethods: ['PayPal', 'Amazon Giftcard', 'Wise'],
    earningsRate: '~$0.25 - $0.40 / GB',
    authType: 'oauth',
    website: 'https://earnapp.com',
    referralUrl: 'https://earnapp.com/i/622el9k',
    bonusAmount: '+$2.00 USD',
    bonusAmountEn: '+$2.00 USD',
    bonusHighlight: 'Tặng ngay $2.00 USD Bonus vào tài khoản khi đăng ký qua link',
    bonusHighlightEn: 'Get $2.00 USD instant bonus credited to your starting balance',
    bonusDetails: 'Ưu đãi độc quyền đăng ký qua link: nhận ngay $2.00 USD tiền thưởng trực tiếp vào số dư ban đầu, giúp bạn nhanh chóng đạt mốc rút tiền cực thấp ($2.50) chỉ sau ít giờ chạy!',
    bonusDetailsEn: 'Exclusive partner promotion: receive $2.00 USD startup cash directly into your account, helping you reach the low $2.50 payout threshold in just a few hours!',
    tags: ['BrightData', 'Tặng $2.00 Bonus', 'Min rút $2.50', 'PayPal tự động'],
    tagsEn: ['BrightData', '$2.00 Bonus', 'Min Payout $2.50', 'Auto PayPal'],
    platforms: ['Windows', 'Linux', 'Docker', 'Android', 'macOS'],
  },
  {
    id: 'honeygain',
    name: 'Honeygain',
    category: 'Residential Proxy & Content Delivery',
    categoryEn: 'Residential Proxy & Content Delivery',
    description: 'Ứng dụng kiếm tiền thụ động phổ biến toàn cầu với tính năng Content Delivery (CD).',
    descriptionEn: 'World-renowned passive income application with Content Delivery (CD) feature.',
    status: 'coming_soon',
    payoutMinimum: '$20.00',
    payoutMethods: ['PayPal', 'JMPT (JumpToken)'],
    earningsRate: '3 credit / 10 MB (~$0.30 / GB)',
    authType: 'bearer_token',
    website: 'https://honeygain.com',
    referralUrl: 'https://join.honeygain.com/NJKHA6710A',
    bonusAmount: '+$3.00 USD',
    bonusAmountEn: '+$3.00 USD',
    bonusHighlight: 'Nhận ngay $3.00 USD (3,000 Credits) vào ví khi đăng ký qua link',
    bonusHighlightEn: 'Get $3.00 USD (3,000 Credits) instantly upon registration',
    bonusDetails: 'Đăng ký tài khoản qua liên kết đăng ký đối tác để được cộng ngay $3.00 USD tiền mặt vào tài khoản Honeygain khởi đầu. Kết hợp chia sẻ băng thông & tính năng Content Delivery (CD) tăng tốc độ thu nhập gấp đôi.',
    bonusDetailsEn: 'Sign up via partner link to receive $3.00 USD credited instantly. Combine bandwidth sharing with Content Delivery (CD) to double your earning speed.',
    tags: ['Thưởng $3.00 khởi đầu', 'Content Delivery (CD)', 'JumpToken (JMPT)', 'Đa nền tảng'],
    tagsEn: ['$3.00 Startup Bonus', 'Content Delivery (CD)', 'JumpToken (JMPT)', 'Multi-Platform'],
    platforms: ['Windows', 'Android', 'macOS', 'Linux', 'Docker'],
  },
  {
    id: 'grass',
    name: 'GetGrass (Wynd Network)',
    category: 'DePIN / AI Web Scraping Data Layer',
    categoryEn: 'DePIN / AI Web Scraping Data Layer',
    description: 'Mạng lưới phi tập trung cung cấp dữ liệu huấn luyện cho các mô hình AI lớn.',
    descriptionEn: 'Decentralized data layer providing web data to train major AI foundation models.',
    status: 'coming_soon',
    payoutMinimum: 'Points / Token claim',
    payoutMethods: ['Solana / Crypto Claim'],
    earningsRate: 'Điểm tích luỹ theo uptime & epoch',
    earningsRateEn: 'Points based on uptime & epoch',
    authType: 'api_key',
    website: 'https://getgrass.io',
    referralUrl: 'https://app.grass.io/register?referralCode=7RyLKCgQv0G2Cru',
    bonusAmount: '+5,000 Points',
    bonusAmountEn: '+5,000 Points',
    bonusHighlight: 'Thưởng 5,000 Điểm sau 100h Uptime & Ưu tiên Airdrop AI Token',
    bonusHighlightEn: '5,000 Bonus Points after 100h uptime & Priority AI Token Airdrop',
    bonusDetails: 'Bấm vào liên kết đăng ký đối tác để tạo tài khoản mạng lưới DePIN AI Wynd Network, nhận ngay 5,000 điểm tích lũy sau 100 giờ chạy, tăng thứ hạng Epoch và đủ điều kiện nhận phân bổ Token Grass trên mạng Solana.',
    bonusDetailsEn: 'Register via partner link to join Wynd DePIN network, claim 5,000 points after 100h uptime, rank up Epoch tiers, and qualify for Solana Grass token distribution.',
    tags: ['DePIN AI Layer', 'Airdrop Token Grass', 'Liên kết độc quyền', 'Browser/Node'],
    tagsEn: ['DePIN AI Layer', 'Grass Token Airdrop', 'Exclusive Link', 'Browser/Node'],
    platforms: ['Browser', 'Linux', 'Windows', 'Docker'],
  },
  {
    id: 'pawns',
    name: 'Pawns.app (IPRoyal)',
    category: 'Bandwidth Sharing & Surveys',
    categoryEn: 'Bandwidth Sharing & Surveys',
    description: 'Chia sẻ kết nối internet và khảo sát kiếm tiền, hỗ trợ thanh toán siêu nhanh.',
    descriptionEn: 'Share internet bandwidth and take surveys to earn, with super-fast payouts.',
    status: 'coming_soon',
    payoutMinimum: '$5.00',
    payoutMethods: ['PayPal', 'Bitcoin', 'Virtual Visa'],
    earningsRate: '$0.20 / GB',
    authType: 'bearer_token',
    website: 'https://pawns.app',
    referralUrl: 'https://pawns.app/?r=177303',
    bonusAmount: '+$3.00 USD',
    bonusAmountEn: '+$3.00 USD',
    bonusHighlight: 'Gói thưởng $3.00 USD: $1 ngay khi bắt đầu + $2 ở 2 lần rút tiền đầu',
    bonusHighlightEn: '$3.00 Bonus Bundle: $1 instant + $2 across first 2 payouts',
    bonusDetails: 'Your friend gets $3: Bạn nhận ngay $1.00 USD bonus khi bắt đầu sử dụng Pawns.app qua link đăng ký. Thêm vào đó, nhận tiếp $1.00 bonus ở lần rút tiền đầu tiên và $1.00 ở lần rút tiền thứ hai, tổng cộng nhận đủ $3.00 USD tiền mặt!',
    bonusDetailsEn: 'Get $1.00 USD starting bonus when signing up with our link, plus $1.00 bonus on your first payout and $1.00 on your second payout, totaling $3.00 USD cash!',
    tags: ['Thưởng gói $3.00', 'Min rút $5.00', 'Bitcoin & PayPal', 'Khảo sát + Băng thông'],
    tagsEn: ['$3.00 Bonus Bundle', 'Min Payout $5.00', 'Bitcoin & PayPal', 'Surveys + Bandwidth'],
    platforms: ['Windows', 'Android', 'macOS', 'Linux', 'Docker'],
  },
  {
    id: 'packetstream',
    name: 'PacketStream',
    category: 'P2P Proxy Network',
    categoryEn: 'P2P Proxy Network',
    description: 'Mạng lưới proxy ngang hàng phân tán, tính phí theo dung lượng thực tế.',
    descriptionEn: 'Distributed peer-to-peer proxy network with transparent per-GB earnings.',
    status: 'coming_soon',
    payoutMinimum: '$5.00',
    payoutMethods: ['PayPal'],
    earningsRate: '$0.10 / GB',
    authType: 'api_key',
    website: 'https://packetstream.io',
    referralUrl: 'https://packetstream.io/?psr=a7w',
    bonusAmount: 'Kích hoạt VIP',
    bonusAmountEn: 'VIP Activation',
    bonusHighlight: 'Kích hoạt gói Packeter - Nhận thanh toán $0.10/GB qua PayPal',
    bonusHighlightEn: 'Activate Packeter tier - Earn $0.10/GB with fast PayPal payouts',
    bonusDetails: 'Đăng ký qua liên kết đối tác để kích hoạt ngay chế độ chia sẻ Packeter với tỷ lệ ổn định $0.10/GB, thanh toán nhanh qua PayPal với ngưỡng rút chỉ từ $5.00 USD.',
    bonusDetailsEn: 'Register via partner link to enable Packeter sharing mode at $0.10/GB, paid directly to PayPal with minimum threshold of just $5.00 USD.',
    tags: ['P2P Proxy', 'Min rút $5.00', 'PayPal nhanh', 'Nhẹ máy & Ổn định'],
    tagsEn: ['P2P Proxy', 'Min Payout $5.00', 'Fast PayPal', 'Lightweight & Stable'],
    platforms: ['Windows', 'Linux', 'Docker', 'macOS'],
  },
];

const DEFAULT_ACCOUNTS: UserAccount[] = [];

const DEFAULT_DEVICES: DeviceItem[] = [];

const STORAGE_KEYS = {
  ACCOUNTS: 'earnhub_accounts_v2',
  ACTIVE_ACCOUNT_ID: 'earnhub_active_account_id_v2',
  DEVICES: 'earnhub_devices_v2',
  PAYOUT_THRESHOLD: 'earnhub_payout_threshold_v1',
};

// Memory fallback cache in case localStorage is restricted in iframe/private browsing
const memoryCache: Record<string, string> = {};

function safeGetItem(key: string): string | null {
  try {
    const val = localStorage.getItem(key);
    if (val !== null) {
      memoryCache[key] = val;
      return val;
    }
  } catch (e) {
    // localStorage may throw in restricted iframes
  }
  return memoryCache[key] ?? null;
}

function safeSetItem(key: string, val: string): void {
  memoryCache[key] = val;
  try {
    localStorage.setItem(key, val);
  } catch (e) {
    console.warn(`localStorage.setItem failed for key "${key}":`, e);
  }
}

// Background sync to backend server disk
async function syncToServerBackground() {
  try {
    const accounts = storage.getAccounts();
    const activeAccountId = storage.getActiveAccountId();
    const devices = storage.getDevices();
    const payoutThreshold = storage.getPayoutThreshold();

    await fetch('/api/storage/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accounts,
        activeAccountId,
        devices,
        payoutThreshold,
        syncedAt: new Date().toISOString(),
      }),
    });
  } catch (e) {
    // Non-blocking background sync
  }
}

export const storage = {
  getAccounts(): UserAccount[] {
    try {
      const stored = safeGetItem(STORAGE_KEYS.ACCOUNTS);
      if (!stored) {
        return [];
      }
      const parsed: UserAccount[] = JSON.parse(stored);
      return parsed.filter((a) => a.id !== 'acc_proxyrack_default' && Boolean(a.apiKey && a.apiKey.trim()));
    } catch {
      return [];
    }
  },

  saveAccounts(accounts: UserAccount[]): void {
    const valid = accounts.filter((a) => Boolean(a.apiKey && a.apiKey.trim()));
    safeSetItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(valid));
    syncToServerBackground();
  },

  addAccount(account: UserAccount): void {
    if (!account.apiKey || !account.apiKey.trim()) return;
    const current = this.getAccounts();
    const index = current.findIndex((a) => a.id === account.id);
    let updated: UserAccount[];
    if (index >= 0) {
      updated = [...current];
      updated[index] = { ...updated[index], ...account };
    } else {
      updated = [...current, account];
    }
    this.saveAccounts(updated);
  },

  updateAccount(accountId: string, updates: Partial<UserAccount>): void {
    const current = this.getAccounts();
    const index = current.findIndex((a) => a.id === accountId);
    if (index >= 0) {
      const updated = [...current];
      updated[index] = { ...updated[index], ...updates };
      this.saveAccounts(updated);
    }
  },

  deleteAccount(accountId: string): void {
    const current = this.getAccounts();
    const filtered = current.filter((a) => a.id !== accountId);
    this.saveAccounts(filtered);
    if (this.getActiveAccountId() === accountId) {
      const newActive = filtered[0]?.id || '';
      this.setActiveAccountId(newActive);
    }
  },

  getActiveAccountId(): string {
    const accounts = this.getAccounts();
    if (accounts.length === 0) return '';
    const stored = safeGetItem(STORAGE_KEYS.ACTIVE_ACCOUNT_ID);
    if (stored && accounts.some((a) => a.id === stored)) return stored;
    const defaultAcc = accounts.find((a) => a.isDefault) || accounts[0];
    const id = defaultAcc ? defaultAcc.id : '';
    if (id) safeSetItem(STORAGE_KEYS.ACTIVE_ACCOUNT_ID, id);
    return id;
  },

  setActiveAccountId(id: string): void {
    safeSetItem(STORAGE_KEYS.ACTIVE_ACCOUNT_ID, id);
    syncToServerBackground();
  },

  getActiveAccount(): UserAccount | undefined {
    const id = this.getActiveAccountId();
    const accounts = this.getAccounts();
    return accounts.find((a) => a.id === id);
  },

  getDevices(accountId?: string): DeviceItem[] {
    try {
      const stored = safeGetItem(STORAGE_KEYS.DEVICES);
      let devices: DeviceItem[] = stored ? JSON.parse(stored) : DEFAULT_DEVICES;

      // Ensure unchecked devices are properly marked as 'unknown' rather than defaulting to online/offline
      const MIGRATION_KEY = 'earnhub_status_unchecked_v3';
      if (!safeGetItem(MIGRATION_KEY)) {
        devices = devices.map((d) => {
          if (!d.lastPingTime || d.lastPingTime === 'Vừa xong' || d.lastPingTime === 'Vừa cập nhật' || d.lastPingTime === 'Chưa kiểm tra') {
            return {
              ...d,
              lastPingStatus: 'unknown',
              lastPingTime: undefined,
            };
          }
          return d;
        });
        safeSetItem(STORAGE_KEYS.DEVICES, JSON.stringify(devices));
        safeSetItem(MIGRATION_KEY, 'true');
        syncToServerBackground();
      }

      if (!stored) {
        safeSetItem(STORAGE_KEYS.DEVICES, JSON.stringify(DEFAULT_DEVICES));
      }
      if (accountId) {
        return devices.filter((d) => d.accountId === accountId);
      }
      return devices;
    } catch {
      return DEFAULT_DEVICES;
    }
  },

  saveDevices(devices: DeviceItem[]): void {
    safeSetItem(STORAGE_KEYS.DEVICES, JSON.stringify(devices));
    syncToServerBackground();
  },

  addDevice(device: DeviceItem): void {
    const devices = this.getDevices();
    const existingIndex = devices.findIndex((d) => d.device_id === device.device_id);
    if (existingIndex >= 0) {
      devices[existingIndex] = { ...devices[existingIndex], ...device };
    } else {
      devices.unshift(device);
    }
    this.saveDevices(devices);
  },

  updateDevice(deviceId: string, updates: Partial<DeviceItem>): void {
    const devices = this.getDevices();
    const index = devices.findIndex((d) => d.device_id === deviceId);
    if (index >= 0) {
      devices[index] = { ...devices[index], ...updates };
      this.saveDevices(devices);
    }
  },

  deleteDevice(deviceId: string): void {
    const devices = this.getDevices();
    const filtered = devices.filter((d) => d.device_id !== deviceId);
    this.saveDevices(filtered);
  },

  deleteDevices(deviceIds: string[]): void {
    const set = new Set(deviceIds);
    const devices = this.getDevices();
    const filtered = devices.filter((d) => !set.has(d.device_id));
    this.saveDevices(filtered);
  },

  getPayoutThreshold(): number {
    const val = safeGetItem(STORAGE_KEYS.PAYOUT_THRESHOLD);
    return val ? parseFloat(val) : 20.0;
  },

  setPayoutThreshold(val: number): void {
    safeSetItem(STORAGE_KEYS.PAYOUT_THRESHOLD, val.toString());
    syncToServerBackground();
  },

  // Sync with server on initial application startup
  async syncWithServer(
    onSyncComplete?: (data: {
      accounts: UserAccount[];
      activeAccountId: string;
      devices: DeviceItem[];
    }) => void
  ): Promise<void> {
    try {
      const res = await fetch('/api/storage/state');
      if (!res.ok) return;
      const serverData = await res.json();
      const localAccounts = this.getAccounts();
      const localDevices = this.getDevices();

      // If local storage has 0 accounts but server has accounts, restore from server!
      if (localAccounts.length === 0 && Array.isArray(serverData.accounts) && serverData.accounts.length > 0) {
        console.log('[Storage] Restoring accounts from server storage...', serverData.accounts.length);
        this.saveAccounts(serverData.accounts);
        if (serverData.activeAccountId) {
          this.setActiveAccountId(serverData.activeAccountId);
        }
        if (Array.isArray(serverData.devices) && serverData.devices.length > 0) {
          this.saveDevices(serverData.devices);
        }
        onSyncComplete?.({
          accounts: serverData.accounts,
          activeAccountId: serverData.activeAccountId || serverData.accounts[0]?.id || '',
          devices: serverData.devices || [],
        });
        return;
      }

      // If local has accounts, ensure server file is kept up to date
      if (localAccounts.length > 0) {
        // If server also had devices or accounts not present in local, merge them
        if (Array.isArray(serverData.accounts)) {
          const merged = [...localAccounts];
          serverData.accounts.forEach((sa: UserAccount) => {
            if (!merged.some((la) => la.id === sa.id) && sa.apiKey) {
              merged.push(sa);
            }
          });
          if (merged.length !== localAccounts.length) {
            this.saveAccounts(merged);
          }
        }

        if (Array.isArray(serverData.devices) && localDevices.length === 0 && serverData.devices.length > 0) {
          this.saveDevices(serverData.devices);
        }

        syncToServerBackground();
      }
    } catch (e) {
      console.warn('Storage sync error:', e);
    }
  },
};
