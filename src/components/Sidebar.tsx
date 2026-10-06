import { 
  LayoutDashboard, 
  Cpu, 
  LineChart, 
  KeyRound, 
  Layers, 
  Terminal,
  TrendingUp,
  Globe,
  Radio
} from 'lucide-react';
import { ActiveTab, UserAccount } from '../types';
import { useLanguage } from '../contexts/LanguageContext';

interface SidebarProps {
  currentTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  activeAccount: UserAccount | undefined;
  deviceCount: number;
  accountCount?: number;
}

export function Sidebar({
  currentTab,
  onSelectTab,
  activeAccount,
  deviceCount,
  accountCount = 1,
}: SidebarProps) {
  const { language, t } = useLanguage();

  const navItems = [
    {
      id: 'dashboard' as ActiveTab,
      path: '/dashboard',
      label: language === 'vi' ? 'Bảng điều khiển' : 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'overview' as ActiveTab,
      path: '/overview',
      label: language === 'vi' ? 'Tổng quan Tất cả TK' : 'All Accounts Overview',
      icon: Globe,
      badge: `${accountCount} ${language === 'vi' ? 'TK' : 'acc'}`,
    },
    {
      id: 'analytics' as ActiveTab,
      path: '/analytics',
      label: language === 'vi' ? 'Thống kê Băng thông' : 'Bandwidth Analytics',
      icon: TrendingUp,
      badge: language === 'vi' ? 'Theo ngày' : 'Daily',
    },
    {
      id: 'devices' as ActiveTab,
      path: '/devices',
      label: language === 'vi' ? 'Danh sách thiết bị' : 'Device Management',
      icon: Cpu,
      badge: `${deviceCount} ${language === 'vi' ? 'node' : 'nodes'}`,
    },
    {
      id: 'device-detail' as ActiveTab,
      path: '/device-detail',
      label: language === 'vi' ? 'Chi tiết thiết bị' : 'Device Details',
      icon: LineChart,
      badge: language === 'vi' ? 'Thống kê' : 'Stats',
    },
    {
      id: 'api-console' as ActiveTab,
      path: '/api-console',
      label: language === 'vi' ? 'Gọi API Thật (Console)' : 'Live API Console',
      icon: Terminal,
      badge: 'Live API',
    },
    {
      id: 'accounts' as ActiveTab,
      path: '/accounts',
      label: language === 'vi' ? 'Cấu hình API Key' : 'API Keys & Accounts',
      icon: KeyRound,
      badge: null,
    },
    {
      id: 'apps' as ActiveTab,
      path: '/apps',
      label: language === 'vi' ? '6 App Kiếm Tiền' : '6 Earn Apps',
      icon: Layers,
      badge: 'Bonus $8+',
    },
  ];

  return (
    <aside className="w-full md:w-64 bg-slate-950 md:min-h-[calc(100vh-4rem)] border-r border-slate-800 p-4 flex flex-col justify-between shrink-0">
      <div className="space-y-6">
        {/* Active Account Overview Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3">
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span className="font-medium text-slate-300">
              {language === 'vi' ? 'Tài khoản đang xem:' : 'Active Account:'}
            </span>
          </div>
          <div className="font-semibold text-sm text-slate-100 truncate">
            {activeAccount ? activeAccount.name : (language === 'vi' ? 'Chưa cấu hình' : 'Not configured')}
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>App: Proxyrack</span>
            <span className="text-emerald-400">
              {language === 'vi' ? 'Đã kết nối' : 'Connected'}
            </span>
          </div>
        </div>

        {/* Navigation Menu */}
        <div>
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">
            {language === 'vi' ? 'Quản trị hệ thống' : 'System Navigation'}
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <a
                  key={item.id}
                  href={item.path}
                  onClick={(e) => {
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
                      return; // allow browser default for open in new tab/window
                    }
                    e.preventDefault();
                    onSelectTab(item.id);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-emerald-600/15 text-emerald-400 border border-emerald-500/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        item.id === 'apps'
                          ? 'bg-amber-950/90 text-amber-300 border border-amber-800/80 font-bold animate-pulse'
                          : isActive
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/50'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </a>
              );
            })}
          </nav>
        </div>
      </div>
    </aside>
  );
}
