import { 
  ProxyrackBalanceResponse, 
  ProxyrackBandwidthResponse, 
  DeviceStatusResponse,
  ApiLogEntry 
} from '../types';

type ApiLogListener = (entry: ApiLogEntry) => void;
const listeners: Set<ApiLogListener> = new Set();
const recentLogs: ApiLogEntry[] = [];

export function subscribeToApiLogs(listener: ApiLogListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getRecentApiLogs(): ApiLogEntry[] {
  return [...recentLogs];
}

function recordLog(entry: ApiLogEntry) {
  recentLogs.unshift(entry);
  if (recentLogs.length > 50) recentLogs.pop();
  listeners.forEach((fn) => {
    try {
      fn(entry);
    } catch (e) {
      console.error('Log listener error:', e);
    }
  });
}

export const proxyrackApi = {
  /**
   * Lấy số dư khả dụng (available for payout balance)
   * POST https://peer.proxyrack.com/api/balance
   */
  async getBalance(apiKey: string): Promise<ProxyrackBalanceResponse> {
    const start = performance.now();
    const endpoint = 'balance';
    const targetUrl = 'https://peer.proxyrack.com/api/balance';
    const payload = {};
    const reqHeaders = {
      'Api-Key': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    const curl = `curl -X POST https://peer.proxyrack.com/api/balance \\
  -H 'Api-Key: ${apiKey}' \\
  -H 'Content-Type: application/json' \\
  -H 'Accept: application/json' \\
  -d '{}'`;

    let res: Response;
    let resData: any = null;

    try {
      res = await fetch('/api/proxyrack/balance', {
        method: 'POST',
        headers: reqHeaders,
        body: JSON.stringify(payload),
      });

      resData = await res.json().catch(() => ({}));
      const latencyMs = Math.round(performance.now() - start);

      recordLog({
        id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toLocaleTimeString('vi-VN'),
        endpoint,
        targetUrl,
        method: 'POST',
        requestHeaders: reqHeaders,
        requestPayload: payload,
        responseStatus: res.status,
        responseStatusText: res.statusText || (res.ok ? 'OK' : 'Error'),
        responseBody: resData,
        latencyMs,
        curlCommand: curl,
      });

      if (!res.ok) {
        throw new Error(resData.error || `HTTP ${res.status}: Failed to get balance from Proxyrack`);
      }

      return resData;
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - start);
      if (!resData) {
        recordLog({
          id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          timestamp: new Date().toLocaleTimeString('vi-VN'),
          endpoint,
          targetUrl,
          method: 'POST',
          requestHeaders: reqHeaders,
          requestPayload: payload,
          responseStatus: 502,
          responseStatusText: 'Network Error',
          responseBody: { status: 'error', error: err.message },
          latencyMs,
          curlCommand: curl,
        });
      }
      throw err;
    }
  },

  /**
   * Lấy dữ liệu băng thông theo thiết bị hoặc tất cả thiết bị
   * POST https://peer.proxyrack.com/api/bandwidth
   */
  async getBandwidth(
    apiKey: string,
    deviceId?: string,
    dateStart?: string,
    dateEnd?: string
  ): Promise<ProxyrackBandwidthResponse> {
    const start = performance.now();
    const endpoint = 'bandwidth';
    const payload: Record<string, string> = {};

    // Device ID rule: omit if empty or ALL
    if (deviceId && deviceId.trim() !== '' && deviceId.trim() !== 'ALL') {
      payload.device_id = deviceId.trim();
    }

    // Date range rules: Both must be provided together and date_start < date_end
    let cleanStart = dateStart?.trim() || undefined;
    let cleanEnd = dateEnd?.trim() || undefined;

    if (cleanStart || cleanEnd) {
      if (cleanStart && !cleanEnd) {
        const d = new Date(cleanStart);
        d.setDate(d.getDate() + 1);
        cleanEnd = d.toISOString().split('T')[0];
      } else if (cleanEnd && !cleanStart) {
        const d = new Date(cleanEnd);
        d.setDate(d.getDate() - 6);
        cleanStart = d.toISOString().split('T')[0];
      }

      // Guarantee date_start is strictly before date_end
      if (cleanStart && cleanEnd && cleanStart >= cleanEnd) {
        const d = new Date(cleanStart);
        d.setDate(d.getDate() + 1);
        cleanEnd = d.toISOString().split('T')[0];
      }

      if (cleanStart && cleanEnd) {
        payload.date_start = cleanStart;
        payload.date_end = cleanEnd;
      }
    }

    const queryParams = new URLSearchParams();
    if (payload.device_id) queryParams.set('device_id', payload.device_id);
    if (payload.date_start) queryParams.set('date_start', payload.date_start);
    if (payload.date_end) queryParams.set('date_end', payload.date_end);

    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    const targetUrl = `https://peer.proxyrack.com/api/bandwidth${queryString}`;

    const reqHeaders = {
      'Api-Key': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    const curl = `curl -X POST '${targetUrl}' \\
  -H 'Api-Key: ${apiKey}' \\
  -H 'Content-Type: application/json' \\
  -H 'Accept: application/json' \\
  -d '${JSON.stringify(payload)}'`;

    let res: Response;
    let resData: any = null;

    try {
      res = await fetch(`/api/proxyrack/bandwidth${queryString}`, {
        method: 'POST',
        headers: reqHeaders,
        body: JSON.stringify(payload),
      });

      resData = await res.json().catch(() => ({}));
      const latencyMs = Math.round(performance.now() - start);

      recordLog({
        id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toLocaleTimeString('vi-VN'),
        endpoint,
        targetUrl,
        method: 'POST',
        requestHeaders: reqHeaders,
        requestPayload: payload,
        responseStatus: res.status,
        responseStatusText: res.statusText || (res.ok ? 'OK' : 'Error'),
        responseBody: resData,
        latencyMs,
        curlCommand: curl,
      });

      if (!res.ok) {
        throw new Error(resData.error || `HTTP ${res.status}: Lỗi lấy băng thông từ Proxyrack`);
      }

      return resData;
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - start);
      if (!resData) {
        recordLog({
          id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          timestamp: new Date().toLocaleTimeString('vi-VN'),
          endpoint,
          targetUrl,
          method: 'POST',
          requestHeaders: reqHeaders,
          requestPayload: payload,
          responseStatus: 502,
          responseStatusText: 'Network Error',
          responseBody: { status: 'error', error: err.message },
          latencyMs,
          curlCommand: curl,
        });
      }
      throw err;
    }
  },

  /**
   * Gán thiết bị mới vào tài khoản Proxyrack
   * POST https://peer.proxyrack.com/api/device/add
   */
  async addDevice(
    apiKey: string,
    deviceId: string,
    deviceName: string
  ): Promise<{ status: string; message?: string; error?: string; details?: any }> {
    const start = performance.now();
    const endpoint = 'device/add';
    const targetUrl = 'https://peer.proxyrack.com/api/device/add';
    const payload = {
      device_id: deviceId.trim(),
      device_name: deviceName.trim(),
    };

    const reqHeaders = {
      'Api-Key': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    const curl = `curl -X POST https://peer.proxyrack.com/api/device/add \\
  -H 'Api-Key: ${apiKey}' \\
  -H 'Content-Type: application/json' \\
  -H 'Accept: application/json' \\
  -d '${JSON.stringify(payload)}'`;

    let res: Response;
    let resData: any = null;

    try {
      res = await fetch('/api/proxyrack/device/add', {
        method: 'POST',
        headers: reqHeaders,
        body: JSON.stringify(payload),
      });

      resData = await res.json().catch(() => ({}));
      const latencyMs = Math.round(performance.now() - start);

      recordLog({
        id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toLocaleTimeString('vi-VN'),
        endpoint,
        targetUrl,
        method: 'POST',
        requestHeaders: reqHeaders,
        requestPayload: payload,
        responseStatus: res.status,
        responseStatusText: res.statusText || (res.ok ? 'OK' : 'Error'),
        responseBody: resData,
        latencyMs,
        curlCommand: curl,
      });

      if (!res.ok || resData.status === 'error') {
        const detailMsg = resData.details
          ? Object.values(resData.details).join(', ')
          : resData.error || `Lỗi khi thêm thiết bị (${res.status})`;
        throw new Error(detailMsg);
      }

      return resData;
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - start);
      if (!resData) {
        recordLog({
          id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          timestamp: new Date().toLocaleTimeString('vi-VN'),
          endpoint,
          targetUrl,
          method: 'POST',
          requestHeaders: reqHeaders,
          requestPayload: payload,
          responseStatus: 502,
          responseStatusText: 'Network Error',
          responseBody: { status: 'error', error: err.message },
          latencyMs,
          curlCommand: curl,
        });
      }
      throw err;
    }
  },

  async deleteDevice(apiKey: string, deviceId: string): Promise<any> {
    const start = performance.now();
    const endpoint = 'device/delete';
    const targetUrl = 'https://peer.proxyrack.com/api/device/delete';
    const payload = { device_id: deviceId };

    const reqHeaders = {
      'Api-Key': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    const curl = `curl -X POST https://peer.proxyrack.com/api/device/delete \\
  -H 'Api-Key: ${apiKey}' \\
  -H 'Content-Type: application/json' \\
  -H 'Accept: application/json' \\
  -d '${JSON.stringify(payload)}'`;

    let res: Response;
    let resData: any = null;

    try {
      res = await fetch('/api/proxyrack/device/delete', {
        method: 'POST',
        headers: reqHeaders,
        body: JSON.stringify(payload),
      });

      resData = await res.json().catch(() => ({}));
      const latencyMs = Math.round(performance.now() - start);

      recordLog({
        id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toLocaleTimeString('vi-VN'),
        endpoint,
        targetUrl,
        method: 'POST',
        requestHeaders: reqHeaders,
        requestPayload: payload,
        responseStatus: res.status,
        responseStatusText: res.statusText || (res.ok ? 'OK' : 'Error'),
        responseBody: resData,
        latencyMs,
        curlCommand: curl,
      });

      if (!res.ok || resData.status === 'error') {
        const detailMsg = resData.details
          ? Object.values(resData.details).join(', ')
          : resData.error || `Lỗi khi xóa thiết bị (${res.status})`;
        throw new Error(detailMsg);
      }

      return resData;
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - start);
      if (!resData) {
        recordLog({
          id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          timestamp: new Date().toLocaleTimeString('vi-VN'),
          endpoint,
          targetUrl,
          method: 'POST',
          requestHeaders: reqHeaders,
          requestPayload: payload,
          responseStatus: 502,
          responseStatusText: 'Network Error',
          responseBody: { status: 'error', error: err.message },
          latencyMs,
          curlCommand: curl,
        });
      }
      throw err;
    }
  },

  /**
   * Kiểm tra trạng thái của một thiết bị cụ thể
   * POST https://peer.proxyrack.com/api/device/status
   */
  async checkDeviceStatus(apiKey: string, deviceId: string): Promise<DeviceStatusResponse> {
    const start = performance.now();
    const endpoint = 'device/status';
    const targetUrl = 'https://peer.proxyrack.com/api/device/status';
    const payload = { device_id: deviceId.trim() };

    const reqHeaders = {
      'Api-Key': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    const curl = `curl -X POST https://peer.proxyrack.com/api/device/status \\
  -H 'Api-Key: ${apiKey}' \\
  -H 'Content-Type: application/json' \\
  -H 'Accept: application/json' \\
  -d '${JSON.stringify(payload)}'`;

    let res: Response;
    let resData: any = null;

    try {
      res = await fetch('/api/proxyrack/device/status', {
        method: 'POST',
        headers: reqHeaders,
        body: JSON.stringify(payload),
      });

      resData = await res.json().catch(() => ({}));
      const latencyMs = Math.round(performance.now() - start);

      recordLog({
        id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toLocaleTimeString('vi-VN'),
        endpoint,
        targetUrl,
        method: 'POST',
        requestHeaders: reqHeaders,
        requestPayload: payload,
        responseStatus: res.status,
        responseStatusText: res.statusText || (res.ok ? 'OK' : 'Error'),
        responseBody: resData,
        latencyMs,
        curlCommand: curl,
      });

      return resData;
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - start);
      recordLog({
        id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toLocaleTimeString('vi-VN'),
        endpoint,
        targetUrl,
        method: 'POST',
        requestHeaders: reqHeaders,
        requestPayload: payload,
        responseStatus: 502,
        responseStatusText: 'Network Error',
        responseBody: { status: 'error', error: err.message },
        latencyMs,
        curlCommand: curl,
      });
      return { status: 'error', error: err.message };
    }
  },

  /**
   * Kiểm tra tính hợp lệ của API Key bằng cách gọi balance
   */
  async testApiKey(apiKey: string): Promise<{ valid: boolean; balance?: string; latencyMs: number; error?: string }> {
    const start = performance.now();
    try {
      const res = await this.getBalance(apiKey);
      const latencyMs = Math.round(performance.now() - start);
      if (res.status === 'success' && res.data) {
        return {
          valid: true,
          balance: res.data.balance,
          latencyMs,
        };
      }
      return {
        valid: false,
        latencyMs,
        error: res.error || 'Phản hồi không hợp lệ từ máy chủ',
      };
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - start);
      return {
        valid: false,
        latencyMs,
        error: err.message || 'Lỗi kết nối API Key',
      };
    }
  },
};
