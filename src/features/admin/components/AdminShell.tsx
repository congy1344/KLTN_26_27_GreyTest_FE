import { IconButton } from '../../../shared/components/IconButton';
import { BrandMark } from '../../../shared/components/BrandMark';
import { Tag } from '../../../shared/components/Tag';
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Cpu,
  Gauge,
  HeartPulse,
  Layers,
  LogOut,
  Menu,
  MessageSquareText,
  Users,
  X,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useCurrentUser, useLogout } from '../../auth/hooks/useAuth';
import { useServiceHealth } from '../hooks/useAdmin';
import { useLanguage } from '../../../shared/i18n/language';
import { LanguageToggle } from '../../../shared/components/LanguageToggle';
import { ThemeToggle } from '../../../shared/components/ThemeToggle';

interface AdminShellProps {
  children: ReactNode;
}

interface AdminNavItem {
  to: string;
  end?: boolean;
  icon: typeof Gauge;
  labelVi: string;
  labelEn: string;
  showHealthDot?: boolean;
}

const ADMIN_NAV_GROUPS: ReadonlyArray<{ titleVi: string; titleEn: string; items: readonly AdminNavItem[] }> = [
  {
    titleVi: 'Tổng quan',
    titleEn: 'Overview',
    items: [
      { to: '/admin', end: true, icon: Gauge, labelVi: 'Dashboard tổng quan', labelEn: 'Dashboard Overview' },
    ],
  },
  {
    titleVi: 'Vận hành kiểm thử AI',
    titleEn: 'AI & Test Operations',
    items: [
      { to: '/admin/jobs', icon: Layers, labelVi: 'Hàng đợi sinh test', labelEn: 'Test Gen Jobs' },
      { to: '/admin/ai-providers', icon: Cpu, labelVi: 'Cổng AI & Model key', labelEn: 'AI Providers & Keys' },
      { to: '/admin/quotas', icon: BarChart3, labelVi: 'Hạn ngạch & quota', labelEn: 'Usage & Quotas' },
    ],
  },
  {
    titleVi: 'Quản trị người dùng',
    titleEn: 'Administration',
    items: [
      { to: '/admin/users', icon: Users, labelVi: 'Danh sách người dùng', labelEn: 'User Accounts' },
      { to: '/admin/feedback', icon: MessageSquareText, labelVi: 'Phản hồi người dùng', labelEn: 'User Feedbacks' },
      { to: '/admin/activity', icon: Activity, labelVi: 'Nhật ký hoạt động', labelEn: 'Audit Activity Logs' },
    ],
  },
  {
    titleVi: 'Hệ thống',
    titleEn: 'System',
    items: [
      { to: '/admin/health', icon: HeartPulse, labelVi: 'Trạng thái dịch vụ', labelEn: 'Service Health', showHealthDot: true },
    ],
  },
];

export function AdminShell({ children }: AdminShellProps) {
  const { data: user } = useCurrentUser();
  const health = useServiceHealth();
  const logout = useLogout();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/admin/login', { replace: true });
  };

  const isHealthy =
    health.data?.application === 'UP' &&
    health.data?.database !== 'DOWN' &&
    health.data?.llmGateway !== 'KEY_MISSING';

  const avatarInitial = (user?.fullName?.trim()?.charAt(0) || user?.email?.charAt(0) || 'A').toUpperCase();
  const displayName = user?.fullName?.trim() || user?.email || 'Admin';

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-control px-3 py-2.5 text-sm font-semibold transition-colors duration-150 ${
      isActive
        ? 'bg-brand-softer text-fg-brand-strong'
        : 'text-body hover:bg-neutral-secondary-soft hover:text-heading'
    }`;

  const mobileNavItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-control px-3.5 py-2.5 text-sm font-semibold transition-colors duration-150 ${
      isActive
        ? 'bg-brand-softer text-fg-brand-strong font-bold'
        : 'text-body hover:bg-neutral-secondary-soft hover:text-heading'
    }`;

  return (
    <div className="min-h-[100dvh] bg-neutral-primary text-body flex flex-col">
      {/* Top Navigation Bar - 64px comfortable header */}
      <header className="sticky top-0 z-40 flex min-h-16 w-full flex-wrap items-center justify-between gap-2 border-b border-border-default-subtle bg-neutral-primary-soft px-4 py-2 sm:px-6 lg:flex-nowrap">
        <div className="flex items-center gap-3 sm:gap-6">
          {/* Mobile menu trigger */}
          <IconButton onClick={() => setMobileMenuOpen(!mobileMenuOpen)} label={mobileMenuOpen ? 'Đóng menu quản trị' : 'Mở menu quản trị'} icon={mobileMenuOpen ? X : Menu} className="md:hidden hover:bg-neutral-secondary hover:text-heading" />

          <Link to="/admin" className="flex items-center gap-3 rounded-control">
            <BrandMark size={28} decorative />
            <div className="flex flex-col">
              <span className="font-display text-lg font-semibold text-heading">
                GreyTest
              </span>
              <span className="text-xs text-body-subtle -mt-0.5">
                {language === 'vi' ? 'Quản trị' : 'Administration'}
              </span>
            </div>
          </Link>
        </div>

        {/* Right side controls */}
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2.5">
          {/* Live System Health indicator pill */}
          <Link
            to="/admin/health"
            className="hidden lg:inline-flex rounded-control transition-colors hover:bg-brand-softer"
            title={language === 'vi' ? 'Xem trạng thái kết nối hệ thống' : 'View system connectivity & health'}
          >
            <Tag variant="status" tone={isHealthy ? 'success' : 'warning'} icon={HeartPulse}>
              {isHealthy ? (language === 'vi' ? 'Hệ thống: UP' : 'Systems: UP') : 'DEGRADED'}
            </Tag>
          </Link>

          {/* Return to user app */}
          <Link
            to="/projects"
            className="btn btn-secondary hidden sm:inline-flex text-xs"
          >
            <ArrowLeft size={14} />
            <span>{language === 'vi' ? 'Giao diện người dùng' : 'User App'}</span>
          </Link>

          <div className="h-5 w-px bg-border-default mx-1" />

          <ThemeToggle />
          <LanguageToggle />

          {/* Administrator profile & logout */}
          <div className="flex items-center gap-2.5 pl-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-softer font-sans text-sm font-extrabold text-fg-brand-strong">
              {avatarInitial}
            </div>
            <div className="hidden lg:flex flex-col text-left">
              <span className="max-w-[150px] truncate text-xs font-bold text-heading leading-tight" title={displayName}>
                {displayName}
              </span>
              <span className="text-xs font-extrabold text-fg-brand-strong">
                ADMIN
              </span>
            </div>
            <IconButton onClick={handleLogout}
              title={language === 'vi' ? 'Đăng xuất khỏi trang quản trị' : 'Log out from admin'} label={language === 'vi' ? 'Đăng xuất khỏi trang quản trị' : 'Log out from admin'} icon={LogOut} className="hover:bg-neutral-secondary hover:text-fg-danger-strong" />
          </div>
        </div>
      </header>

      {/* Mobile drawer navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border-default bg-neutral-primary-soft p-5 shadow-md z-30">
          <nav className="space-y-1.5">
            {ADMIN_NAV_GROUPS.flatMap((g) => g.items).map((item) => {
              const Icon = item.icon;
              return (
                <NavLink key={item.to} end={'end' in item ? item.end : undefined} to={item.to} onClick={() => setMobileMenuOpen(false)} className={mobileNavItemClass}>
                  <Icon size={18} />
                  <span>{language === 'vi' ? item.labelVi : item.labelEn}</span>
                </NavLink>
              );
            })}
          </nav>
          <div className="mt-5 pt-4 border-t border-border-default-subtle">
            <Link
              to="/projects"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 text-sm font-bold text-fg-brand-strong"
            >
              <ArrowLeft size={16} />
              <span>{language === 'vi' ? 'Quay lại Giao diện người dùng' : 'Back to User App'}</span>
            </Link>
          </div>
        </div>
      )}

      {/* Main Container: Sidebar + Content */}
      <div className="flex flex-1">
        {/* Left Fixed Sidebar - 256px wide, comfortable typography and fits neatly within screen */}
        <aside
          className="sticky top-16 hidden h-[calc(100vh-64px)] w-64 shrink-0 flex-col justify-between border-r border-border-default bg-neutral-primary-soft p-3.5 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden md:flex"
          aria-label="Admin Navigation"
        >
          <div className="space-y-4">
            {ADMIN_NAV_GROUPS.map((group) => (
              <div key={group.titleEn}>
                <p className="px-3 text-xs font-semibold text-body-subtle pb-1 pt-1">
                  {language === 'vi' ? group.titleVi : group.titleEn}
                </p>
                <nav className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink key={item.to} end={'end' in item ? item.end : undefined} to={item.to} className={navItemClass}>
                        <Icon size={17} />
                        <span>{language === 'vi' ? item.labelVi : item.labelEn}</span>
                        {'showHealthDot' in item && item.showHealthDot && (
                          <span
                            className={`ml-auto h-2 w-2 rounded-full ${isHealthy ? 'bg-success' : 'bg-warning'}`}
                            title={isHealthy ? 'Tất cả dịch vụ hoạt động tốt' : 'Có cảnh báo'}
                          />
                        )}
                      </NavLink>
                    );
                  })}
                </nav>
              </div>
            ))}
          </div>

          {/* Compact Single-line Sidebar Footer */}
          <div className="rounded-base border border-border-default bg-neutral-secondary-soft/60 px-3 py-2 text-xs text-body-subtle flex items-center justify-between">
            <span>GreyTest Ops</span>
            <span className="font-sans tabular-nums text-fg-brand-strong font-bold">v1.2</span>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 p-5 sm:p-8 lg:p-10">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
