/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { DeviceListView } from './components/DeviceListView';
import { DeviceDetailView } from './components/DeviceDetailView';
import { AccountsView } from './components/AccountsView';
import { EarnAppsView } from './components/EarnAppsView';
import { ApiConsoleView } from './components/ApiConsoleView';
import { BandwidthAnalyticsView } from './components/BandwidthAnalyticsView';
import { AllAccountsOverviewView } from './components/AllAccountsOverviewView';
import { DeviceModal } from './components/DeviceModal';
import { OnboardingView } from './components/OnboardingView';
import { storage } from './services/storage';
import { proxyrackApi } from './services/proxyrackApi';
import { UserAccount, DeviceItem, ActiveTab, EarnAppId } from './types';
import { AlertCircle, X } from 'lucide-react';
import { getRouteFromLocation, getUrlForTab } from './utils/router';
import { useLanguage } from './contexts/LanguageContext';

export default function App() {
  const { language } = useLanguage();
  const initialRoute = getRouteFromLocation();

  const [accounts, setAccounts] = useState<UserAccount[]>(() => storage.getAccounts());
  const [activeAccountId, setActiveAccountId] = useState<string>(() => storage.getActiveAccountId());
  const [devices, setDevices] = useState<DeviceItem[]>(() => {
    const accId = storage.getActiveAccountId();
    return storage.getDevices(accId);
  });
  const [activeTab, setActiveTab] = useState<ActiveTab>(initialRoute.tab);
  const [selectedDevice, setSelectedDevice] = useState<DeviceItem | null>(() => {
    if (initialRoute.deviceId) {
      const accId = storage.getActiveAccountId();
      const allStored = storage.getDevices(accId);
      const match = allStored.find((d) => d.device_id === initialRoute.deviceId);
      if (match) return match;
      return {
        device_id: initialRoute.deviceId,
        device_name: `Device ${initialRoute.deviceId.slice(0, 10)}`,
        accountId: accId,
        addedAt: new Date().toISOString(),
        systemType: 'Linux/VPS',
      };
    }
    return null;
  });
  const [targetDeviceId, setTargetDeviceId] = useState<string | undefined>(initialRoute.deviceId);

  // Live Proxyrack Data State
  const [balanceStr, setBalanceStr] = useState<string | null>(null);
  const [balanceStateStr, setBalanceStateStr] = useState<string | null>(null);
  const [bandwidthData, setBandwidthData] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Device Modal (Add / Edit)
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);
  const [deviceToEdit, setDeviceToEdit] = useState<DeviceItem | null>(null);

  const activeAccount = accounts.find((a) => a.id === activeAccountId) || accounts[0];

  // Central client-side navigation with URL pushState
  const navigateTo = useCallback((tab: ActiveTab, device?: DeviceItem | null, replace = false) => {
    setActiveTab(tab);
    if (device !== undefined) {
      setSelectedDevice(device);
      setTargetDeviceId(device?.device_id);
    }
    const devId = device ? device.device_id : (tab === 'device-detail' ? selectedDevice?.device_id : undefined);
    const targetUrl = getUrlForTab(tab, devId);

    if (window.location.pathname !== targetUrl && !window.location.hash.includes(targetUrl.slice(1))) {
      if (replace) {
        window.history.replaceState({ tab, deviceId: devId }, '', targetUrl);
      } else {
        window.history.pushState({ tab, deviceId: devId }, '', targetUrl);
      }
    }
  }, [selectedDevice]);

  // Synchronize browser URL on popstate / hashchange (Back / Forward navigation)
  useEffect(() => {
    const handleLocationChange = () => {
      const route = getRouteFromLocation();
      setActiveTab(route.tab);
      if (route.deviceId) {
        setTargetDeviceId(route.deviceId);
        const allStored = storage.getDevices(activeAccountId);
        const match = allStored.find((d) => d.device_id === route.deviceId);
        if (match) {
          setSelectedDevice(match);
        } else {
          setSelectedDevice({
            device_id: route.deviceId,
            device_name: `Device ${route.deviceId.slice(0, 10)}`,
            accountId: activeAccountId,
            addedAt: new Date().toISOString(),
            systemType: 'Linux/VPS',
          });
        }
      }
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, [activeAccountId]);

  // Sync selected device when devices or targetDeviceId load
  useEffect(() => {
    if (targetDeviceId && devices.length > 0) {
      const match = devices.find((d) => d.device_id === targetDeviceId);
      if (match) {
        setSelectedDevice(match);
      }
    }
  }, [devices, targetDeviceId]);

  // Initial canonical URL redirect from "/" to "/dashboard"
  useEffect(() => {
    const route = getRouteFromLocation();
    const currentPath = window.location.pathname;
    if (currentPath === '/' && route.tab === 'dashboard' && !window.location.hash) {
      window.history.replaceState({ tab: 'dashboard' }, '', '/dashboard');
    }
  }, []);

  // Synchronize dynamic document.title per page/tab
  useEffect(() => {
    const titles: Record<ActiveTab, { vi: string; en: string }> = {
      dashboard: { vi: 'EarnHub - Bảng điều khiển', en: 'EarnHub - Dashboard' },
      overview: { vi: 'EarnHub - Tổng quan Tất cả TK', en: 'EarnHub - All Accounts Overview' },
      analytics: { vi: 'EarnHub - Thống kê Băng thông', en: 'EarnHub - Bandwidth Analytics' },
      devices: { vi: 'EarnHub - Danh sách Thiết bị', en: 'EarnHub - Device Management' },
      'device-detail': {
        vi: `EarnHub - Chi tiết: ${selectedDevice?.device_name || 'Thiết bị'}`,
        en: `EarnHub - Device: ${selectedDevice?.device_name || 'Device'}`
      },
      'api-console': { vi: 'EarnHub - Live API Console', en: 'EarnHub - Live API Console' },
      accounts: { vi: 'EarnHub - Cấu hình API Key & Tài khoản', en: 'EarnHub - Accounts & API Keys' },
      apps: { vi: 'EarnHub - 6 App Kiếm Tiền Thụ Động', en: 'EarnHub - Passive Income Apps' },
    };
    const titleObj = titles[activeTab] || titles.dashboard;
    document.title = language === 'vi' ? titleObj.vi : titleObj.en;
  }, [activeTab, selectedDevice, language]);

  // Refresh data from Proxyrack
  const refreshAccountData = useCallback(async () => {
    if (!activeAccount || !activeAccount.apiKey) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      // 1. Fetch balance: POST /api/proxyrack/balance
      try {
        const balRes = await proxyrackApi.getBalance(activeAccount.apiKey);
        if (balRes.status === 'success' && balRes.data) {
          setBalanceStr(balRes.data.balance);
          setBalanceStateStr(balRes.data.state);

          // Update cached balance on account
          storage.updateAccount(activeAccount.id, {
            cachedBalance: balRes.data?.balance,
            testStatus: 'valid' as const,
          });
          setAccounts(storage.getAccounts());
        }
      } catch (err: any) {
        console.error('Balance error:', err);
        setErrorMessage(`Lỗi lấy số dư: ${err.message}`);
      }

      // 2. Fetch 7-day bandwidth: POST /api/proxyrack/bandwidth
      try {
        const bwRes = await proxyrackApi.getBandwidth(activeAccount.apiKey);
        if (bwRes.status === 'success' && bwRes.data) {
          setBandwidthData(bwRes.data.bandwidth || {});
        }
      } catch (err: any) {
        console.error('Bandwidth error:', err);
      }

      setLastUpdated(new Date().toLocaleTimeString('vi-VN'));
    } catch (err: any) {
      console.error('General refresh error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeAccount]);

  // Synchronize with server-side persistent storage on mount
  useEffect(() => {
    storage.syncWithServer(({ accounts: syncedAccounts, activeAccountId: syncedActiveId, devices: syncedDevices }) => {
      if (syncedAccounts.length > 0) {
        setAccounts(syncedAccounts);
        setActiveAccountId(syncedActiveId);
        setDevices(syncedDevices.filter((d) => d.accountId === syncedActiveId));
      }
    });
  }, []);

  // Initial load or account switch
  useEffect(() => {
    const currentDevices = storage.getDevices(activeAccountId);
    setDevices(currentDevices);
    refreshAccountData();
  }, [activeAccountId]);

  const handleSelectAccount = (id: string) => {
    setActiveAccountId(id);
    storage.setActiveAccountId(id);
  };

  const handleSaveAccounts = (updatedAccounts: UserAccount[]) => {
    storage.saveAccounts(updatedAccounts);
    setAccounts(storage.getAccounts());
  };

  const handleOnboardingAccountCreated = (newAccount: UserAccount) => {
    storage.addAccount(newAccount);
    storage.setActiveAccountId(newAccount.id);
    const updated = storage.getAccounts();
    setAccounts(updated);
    setActiveAccountId(newAccount.id);
    setBalanceStr(newAccount.cachedBalance || '$0.00');
  };

  // Device Management Actions (Add, Edit, Delete)
  const handleOpenAddModal = () => {
    setDeviceToEdit(null);
    setIsDeviceModalOpen(true);
  };

  const handleOpenEditModal = (device: DeviceItem) => {
    setDeviceToEdit(device);
    setIsDeviceModalOpen(true);
  };

  const handleSaveDevice = (device: DeviceItem, isEdit: boolean) => {
    if (isEdit) {
      storage.updateDevice(device.device_id, device);
    } else {
      storage.addDevice(device);
    }
    const updated = storage.getDevices(activeAccountId);
    setDevices(updated);
    setIsDeviceModalOpen(false);
    setDeviceToEdit(null);
  };

  const handleDeleteDevice = (deviceId: string) => {
    storage.deleteDevice(deviceId);
    const updated = storage.getDevices(activeAccountId);
    setDevices(updated);
    if (selectedDevice?.device_id === deviceId) {
      setSelectedDevice(updated.length > 0 ? updated[0] : null);
    }
  };

  const handleBulkDeleteDevices = (deviceIds: string[]) => {
    storage.deleteDevices(deviceIds);
    const updated = storage.getDevices(activeAccountId);
    setDevices(updated);
    if (selectedDevice && deviceIds.includes(selectedDevice.device_id)) {
      setSelectedDevice(updated.length > 0 ? updated[0] : null);
    }
  };

  const handleImportDevices = (imported: DeviceItem[], overwrite: boolean) => {
    const current = storage.getDevices();
    const existingMap = new Map(current.map((d) => [d.device_id, d]));

    imported.forEach((device) => {
      if (existingMap.has(device.device_id)) {
        if (overwrite) {
          existingMap.set(device.device_id, {
            ...existingMap.get(device.device_id)!,
            ...device,
          });
        }
      } else {
        existingMap.set(device.device_id, device);
      }
    });

    const updatedAll = Array.from(existingMap.values());
    storage.saveDevices(updatedAll);
    setDevices(storage.getDevices(activeAccountId));
  };

  const handleSelectDevice = (device: DeviceItem) => {
    navigateTo('device-detail', device);
  };

  const handleUpdateDeviceNotes = (deviceId: string, notes: string) => {
    storage.updateDevice(deviceId, { notes });
    setDevices(storage.getDevices(activeAccountId));
  };

  const handleUpdateDeviceStatus = (deviceId: string, status: 'online' | 'offline' | 'error') => {
    storage.updateDevice(deviceId, {
      lastPingStatus: status,
      lastPingTime: new Date().toISOString(),
    });
    setDevices(storage.getDevices(activeAccountId));
  };

  if (accounts.length === 0) {
    return <OnboardingView onAccountCreated={handleOnboardingAccountCreated} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* Top Navbar */}
      <Navbar
        accounts={accounts}
        activeAccount={activeAccount}
        onSelectAccount={handleSelectAccount}
        onOpenAccountsModal={() => navigateTo('accounts')}
        onRefreshData={refreshAccountData}
        isRefreshing={isLoading}
        balanceStr={balanceStr || activeAccount?.cachedBalance || '$17.69'}
        lastUpdatedStr={lastUpdated}
        onNavigateHome={() => navigateTo('dashboard')}
      />

      {/* Error alert toast if any */}
      {errorMessage && (
        <div className="bg-rose-950/70 border-b border-rose-800/80 px-4 py-2.5 text-xs text-rose-200 flex items-center justify-between">
          <div className="flex items-center gap-2 max-w-5xl mx-auto w-full">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:text-white p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="flex-1 flex flex-col md:flex-row max-w-7xl w-full mx-auto">
        {/* Sidebar */}
        <Sidebar
          currentTab={activeTab}
          onSelectTab={(tab) => {
            if (tab === 'device-detail' && !selectedDevice && devices.length > 0) {
              navigateTo(tab, devices[0]);
            } else {
              navigateTo(tab);
            }
          }}
          activeAccount={activeAccount}
          deviceCount={devices.length}
          accountCount={accounts.length}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              activeAccount={activeAccount}
              balanceStr={balanceStr || activeAccount?.cachedBalance || '$17.69'}
              balanceStateStr={balanceStateStr}
              bandwidthData={bandwidthData}
              devices={devices}
              isLoading={isLoading}
              onRefresh={refreshAccountData}
              onNavigateTab={(tab) => navigateTo(tab)}
              onSelectDevice={handleSelectDevice}
              onOpenAddModal={handleOpenAddModal}
            />
          )}

          {activeTab === 'overview' && (
            <AllAccountsOverviewView
              accounts={accounts}
              activeAccountId={activeAccountId}
              onSelectAccount={handleSelectAccount}
              onNavigateTab={(tab) => navigateTo(tab)}
            />
          )}

          {activeTab === 'analytics' && (
            <BandwidthAnalyticsView activeAccount={activeAccount} devices={devices} />
          )}

          {activeTab === 'devices' && (
            <DeviceListView
              devices={devices}
              apiKey={activeAccount?.apiKey || ''}
              activeAccount={activeAccount}
              onSelectDevice={handleSelectDevice}
              onOpenAddModal={handleOpenAddModal}
              onEditDevice={handleOpenEditModal}
              onDeleteDevice={handleDeleteDevice}
              onBulkDeleteDevices={handleBulkDeleteDevices}
              onImportDevices={handleImportDevices}
              onUpdateDeviceStatus={handleUpdateDeviceStatus}
              onNavigateToConsole={() => navigateTo('api-console')}
            />
          )}

          {activeTab === 'device-detail' && (
            <DeviceDetailView
              device={selectedDevice || (devices.length > 0 ? devices[0] : null)}
              allDevices={devices}
              apiKey={activeAccount?.apiKey || ''}
              onBack={() => navigateTo('devices')}
              onSelectDevice={(dev) => dev && navigateTo('device-detail', dev)}
              onUpdateDeviceNotes={handleUpdateDeviceNotes}
              onOpenAddModal={handleOpenAddModal}
            />
          )}

          {activeTab === 'api-console' && (
            <ApiConsoleView activeAccount={activeAccount} />
          )}

          {activeTab === 'accounts' && (
            <AccountsView
              accounts={accounts}
              activeAccountId={activeAccountId}
              onSelectAccount={handleSelectAccount}
              onSaveAccounts={handleSaveAccounts}
              onRefreshData={refreshAccountData}
            />
          )}

          {activeTab === 'apps' && (
            <EarnAppsView
              activeAppId="proxyrack"
              onSelectApp={(appId) => {
                if (appId === 'proxyrack') navigateTo('dashboard');
              }}
            />
          )}
        </main>
      </div>

      {/* Device Modal (Add / Edit) */}
      <DeviceModal
        isOpen={isDeviceModalOpen}
        onClose={() => {
          setIsDeviceModalOpen(false);
          setDeviceToEdit(null);
        }}
        activeAccount={activeAccount}
        deviceToEdit={deviceToEdit}
        existingDevices={devices}
        onSaveDevice={handleSaveDevice}
      />
    </div>
  );
}
