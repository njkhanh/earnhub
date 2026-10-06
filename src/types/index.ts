export type EarnAppId = 'proxyrack' | 'earnapp' | 'honeygain' | 'grass' | 'pawns' | 'packetstream';

export interface EarnAppInfo {
  id: EarnAppId;
  name: string;
  category: string;
  description: string;
  status: 'active' | 'coming_soon';
  payoutMinimum: string;
  payoutMethods: string[];
  earningsRate: string;
  authType: 'api_key' | 'bearer_token' | 'oauth';
  website: string;
  referralUrl: string;
  bonusAmount?: string;
  bonusHighlight?: string;
  bonusDetails?: string;
  tags?: string[];
  platforms?: ('Linux' | 'Windows' | 'Docker' | 'Android' | 'macOS' | 'Browser')[];
  categoryEn?: string;
  descriptionEn?: string;
  bonusAmountEn?: string;
  bonusHighlightEn?: string;
  bonusDetailsEn?: string;
  tagsEn?: string[];
  earningsRateEn?: string;
}

export interface UserAccount {
  id: string;
  name: string;
  earnAppId: EarnAppId;
  apiKey: string;
  notes?: string;
  createdAt: string;
  isDefault?: boolean;
  lastTestedAt?: string;
  testStatus?: 'valid' | 'invalid' | 'untested';
  cachedBalance?: string;
}

export interface ProxyrackBalanceResponse {
  status: 'success' | 'error';
  data?: {
    state: string;
    balance: string;
  };
  error?: string;
}

export interface ProxyrackBandwidthResponse {
  status: 'success' | 'error';
  data?: {
    state: string;
    device: string;
    bandwidth: Record<string, number>;
  };
  error?: string;
}

export type DeviceStatusType = 'online' | 'offline' | 'error' | 'unknown';

export interface DeviceItem {
  device_id: string;
  device_name: string;
  accountId: string;
  addedAt: string;
  ip?: string;
  location?: string;
  systemType?: 'Linux/VPS' | 'Docker' | 'Windows' | 'Android' | 'macOS';
  lastPingStatus?: DeviceStatusType;
  lastPingTime?: string;
  notes?: string;
}

export interface DeviceStatusResponse {
  status: 'success' | 'error';
  data?: any;
  error?: string;
  details?: Record<string, any>;
}

export interface ApiLogEntry {
  id: string;
  timestamp: string;
  endpoint: string;
  targetUrl: string;
  method: string;
  requestHeaders: Record<string, string>;
  requestPayload: any;
  responseStatus: number;
  responseStatusText: string;
  responseBody: any;
  latencyMs: number;
  curlCommand: string;
}

export type ActiveTab = 'dashboard' | 'overview' | 'devices' | 'device-detail' | 'analytics' | 'api-console' | 'accounts' | 'apps';
