import { ActiveTab } from '../types';

export interface RouteInfo {
  tab: ActiveTab;
  deviceId?: string;
}

/**
 * Extracts route from window.location.pathname or window.location.hash
 */
export function getRouteFromLocation(): RouteInfo {
  if (typeof window === 'undefined') {
    return { tab: 'dashboard' };
  }

  let rawPath = window.location.pathname;
  const hash = window.location.hash.replace(/^#\/?/, '');

  // Support hash fallback (#/devices or #devices)
  if (hash) {
    const cleanHash = hash.toLowerCase();
    if (
      cleanHash.startsWith('device') ||
      cleanHash.startsWith('dashboard') ||
      cleanHash.startsWith('overview') ||
      cleanHash.startsWith('analytics') ||
      cleanHash.startsWith('api-console') ||
      cleanHash.startsWith('console') ||
      cleanHash.startsWith('accounts') ||
      cleanHash.startsWith('apps')
    ) {
      rawPath = '/' + hash;
    }
  }

  const clean = rawPath.toLowerCase().replace(/\/$/, '') || '/';

  if (clean === '' || clean === '/' || clean === '/dashboard') {
    return { tab: 'dashboard' };
  }
  if (clean === '/overview') {
    return { tab: 'overview' };
  }
  if (clean === '/analytics' || clean === '/charts') {
    return { tab: 'analytics' };
  }
  if (clean === '/devices') {
    return { tab: 'devices' };
  }
  if (clean.startsWith('/device/')) {
    const rawId = rawPath.slice('/device/'.length);
    const deviceId = decodeURIComponent(rawId);
    return { tab: 'device-detail', deviceId };
  }
  if (clean === '/device-detail') {
    return { tab: 'device-detail' };
  }
  if (clean === '/api-console' || clean === '/console') {
    return { tab: 'api-console' };
  }
  if (clean === '/accounts') {
    return { tab: 'accounts' };
  }
  if (clean === '/apps') {
    return { tab: 'apps' };
  }

  return { tab: 'dashboard' };
}

/**
 * Generates canonical URL path for a given tab and optional device ID
 */
export function getUrlForTab(tab: ActiveTab, deviceId?: string): string {
  switch (tab) {
    case 'dashboard':
      return '/dashboard';
    case 'overview':
      return '/overview';
    case 'analytics':
      return '/analytics';
    case 'devices':
      return '/devices';
    case 'device-detail':
      return deviceId ? `/device/${encodeURIComponent(deviceId)}` : '/devices';
    case 'api-console':
      return '/api-console';
    case 'accounts':
      return '/accounts';
    case 'apps':
      return '/apps';
    default:
      return '/dashboard';
  }
}
