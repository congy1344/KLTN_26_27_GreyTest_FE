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
  Search,
  ShieldCheck,
  Sliders,
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
    `flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-semibold transition-all duration-150 ${
      isActive
        ? 'bg-brand-softer text-fg-brand-strong font-bold shadow-2xs'
        : 'text-body hover:bg-neutral-secondary-soft hover:text-heading'
    }`;

  const mobileNavItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-semibold transition-colors duration-150 ${
      isActive
        ? 'bg-brand-softer text-fg-brand-strong font-bold'
        : 'text-body hover:bg-neutral-secondary-soft hover:text-heading'
    }`;

  return (
    <div className="min-h-screen bg-neutral-primary/30 text-body flex flex-col">
      {/* Top Navigation Bar - 64px comfortable header */}
      <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-border-default bg-neutral-primary-soft px-4 sm:px-8 shadow-2xs">
        <div className="flex items-center gap-4 sm:gap-8">
          {/* Mobile menu trigger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden rounded-lg p-2 text-body-subtle hover:bg-neutral-secondary hover:text-heading"
            aria-label={mobileMenuOpen ? 'Đóng menu quản trị' : 'Mở menu quản trị'}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          <Link to="/admin" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand text-white shadow-xs">
              <ShieldCheck size={22} strokeWidth={2.4} />
            </span>
            <div className="flex flex-col">
              <span className="font-sans text-base font-extrabold tracking-tight text-heading">
                GREYTEST
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-body-subtle -mt-0.5">
                Enterprise Admin
              </span>
            </div>
          </Link>

          {/* Quick search input */}
          <div className="relative hidden md:block">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-body-subtle" />
            <input
              type="text"
              readOnly
              placeholder={language === 'vi' ? 'Tìm nhanh dự án, tác vụ, user... (Ctrl+K)' : 'Quick search... (Ctrl+K)'}
              className="h-10 w-72 rounded-lg border border-border-default bg-neutral-secondary-soft pl-9 pr-9 text-xs sm:text-sm text-heading placeholder:text-body-subtle focus:border-brand focus:outline-hidden"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-border-default bg-neutral-primary-soft px-2 py-0.5 text-xs font-sans font-semibold text-body-subtle">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Live System Health indicator pill */}
          <Link
            to="/admin/health"
            className={`hidden sm:flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold transition-transform hover:scale-105 ${
              isHealthy
                ? 'bg-success-soft text-fg-success-strong border border-border-success-subtle'
                : 'bg-warning-soft text-fg-warning border border-border-warning-subtle'
            }`}
            title={language === 'vi' ? 'Xem trạng thái kết nối hệ thống' : 'View system connectivity & health'}
          >
            <span className={`h-2 w-2 rounded-full ${isHealthy ? 'bg-success animate-pulse' : 'bg-warning'}`} />
            <span>{isHealthy ? (language === 'vi' ? 'Hệ thống: UP' : 'Systems: UP') : 'DEGRADED'}</span>
          </Link>

          {/* Return to user app */}
          <Link
            to="/projects"
            className="hidden sm:inline-flex items-center gap-2 rounded-lg border border-border-default bg-neutral-secondary-soft px-3.5 py-2 text-xs font-bold text-body hover:bg-neutral-secondary hover:text-heading shadow-2xs"
          >
            <ArrowLeft size={14} />
            <span>{language === 'vi' ? 'Giao diện người dùng' : 'User App'}</span>
          </Link>

          <div className="h-5 w-px bg-border-default mx-1" />

          <ThemeToggle />
          <LanguageToggle />

          {/* Administrator profile & logout */}
          <div className="flex items-center gap-2.5 pl-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-softer font-sans text-sm font-extrabold text-fg-brand">
              {avatarInitial}
            </div>
            <div className="hidden lg:flex flex-col text-left">
              <span className="max-w-[150px] truncate text-xs font-bold text-heading leading-tight" title={displayName}>
                {displayName}
              </span>
              <span className="text-[10px] font-extrabold text-fg-brand uppercase tracking-wider">
                ADMIN
              </span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg p-2 text-body-subtle hover:bg-neutral-secondary hover:text-danger"
              title={language === 'vi' ? 'Đăng xuất khỏi trang quản trị' : 'Log out from admin'}
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border-default bg-neutral-primary-soft p-5 shadow-md z-30">
          <nav className="space-y-1.5">
            <NavLink end to="/admin" onClick={() => setMobileMenuOpen(false)} className={mobileNavItemClass}>
              <Gauge size={18} />
              <span>{language === 'vi' ? 'Dashboard Tổng quan' : 'Dashboard Overview'}</span>
            </NavLink>
            <NavLink to="/admin/jobs" onClick={() => setMobileMenuOpen(false)} className={mobileNavItemClass}>
              <Layers size={18} />
              <span>{language === 'vi' ? 'Hàng đợi Sinh Test' : 'Test Gen Jobs'}</span>
            </NavLink>
            <NavLink to="/admin/ai-providers" onClick={() => setMobileMenuOpen(false)} className={mobileNavItemClass}>
              <Cpu size={18} />
              <span>{language === 'vi' ? 'Cổng AI & Model Key' : 'AI Providers & Keys'}</span>
            </NavLink>
            <NavLink to="/admin/quotas" onClick={() => setMobileMenuOpen(false)} className={mobileNavItemClass}>
              <BarChart3 size={18} />
              <span>{language === 'vi' ? 'Hạn ngạch & Quota' : 'Usage & Quotas'}</span>
            </NavLink>
            <NavLink to="/admin/users" onClick={() => setMobileMenuOpen(false)} className={mobileNavItemClass}>
              <Users size={18} />
              <span>{language === 'vi' ? 'Danh sách Người dùng' : 'User Accounts'}</span>
            </NavLink>
            <NavLink to="/admin/feedback" onClick={() => setMobileMenuOpen(false)} className={mobileNavItemClass}>
              <MessageSquareText size={18} />
              <span>{language === 'vi' ? 'Phản hồi Người dùng' : 'User Feedbacks'}</span>
            </NavLink>
            <NavLink to="/admin/activity" onClick={() => setMobileMenuOpen(false)} className={mobileNavItemClass}>
              <Activity size={18} />
              <span>{language === 'vi' ? 'Nhật ký Hoạt động' : 'Audit Activity Logs'}</span>
            </NavLink>
            <NavLink to="/admin/health" onClick={() => setMobileMenuOpen(false)} className={mobileNavItemClass}>
              <HeartPulse size={18} />
              <span>{language === 'vi' ? 'Trạng thái Dịch vụ' : 'Service Health'}</span>
            </NavLink>
            <NavLink to="/admin/settings" onClick={() => setMobileMenuOpen(false)} className={mobileNavItemClass}>
              <Sliders size={18} />
              <span>{language === 'vi' ? 'Cấu hình Tham số' : 'System Settings'}</span>
            </NavLink>
          </nav>
          <div className="mt-5 pt-4 border-t border-border-default-subtle">
            <Link
              to="/projects"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 text-sm font-bold text-fg-brand"
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
            {/* Group 1: OVERVIEW */}
            <div>
              <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-body-subtle pb-1 pt-1">
                {language === 'vi' ? 'Tổng quan' : 'Overview'}
              </p>
              <nav className="space-y-1">
                <NavLink end to="/admin" className={navItemClass}>
                  <Gauge size={17} />
                  <span>{language === 'vi' ? 'Dashboard Tổng quan' : 'Dashboard Overview'}</span>
                </NavLink>
              </nav>
            </div>

            {/* Group 2: AI & TEST OPS */}
            <div>
              <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-body-subtle pb-1 pt-1">
                {language === 'vi' ? 'Vận hành Kiểm thử AI' : 'AI & Test Operations'}
              </p>
              <nav className="space-y-1">
                <NavLink to="/admin/jobs" className={navItemClass}>
                  <Layers size={17} />
                  <span>{language === 'vi' ? 'Hàng đợi Sinh Test' : 'Test Gen Jobs'}</span>
                </NavLink>
                <NavLink to="/admin/ai-providers" className={navItemClass}>
                  <Cpu size={17} />
                  <span>{language === 'vi' ? 'Cổng AI & Model Key' : 'AI Providers & Keys'}</span>
                </NavLink>
                <NavLink to="/admin/quotas" className={navItemClass}>
                  <BarChart3 size={17} />
                  <span>{language === 'vi' ? 'Hạn ngạch & Quota' : 'Usage & Quotas'}</span>
                </NavLink>
              </nav>
            </div>

            {/* Group 3: ADMINISTRATION */}
            <div>
              <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-body-subtle pb-1 pt-1">
                {language === 'vi' ? 'Quản trị Người dùng' : 'Administration'}
              </p>
              <nav className="space-y-1">
                <NavLink to="/admin/users" className={navItemClass}>
                  <Users size={17} />
                  <span>{language === 'vi' ? 'Danh sách Người dùng' : 'User Accounts'}</span>
                </NavLink>
                <NavLink to="/admin/feedback" className={navItemClass}>
                  <MessageSquareText size={17} />
                  <span>{language === 'vi' ? 'Phản hồi Người dùng' : 'User Feedbacks'}</span>
                </NavLink>
                <NavLink to="/admin/activity" className={navItemClass}>
                  <Activity size={17} />
                  <span>{language === 'vi' ? 'Nhật ký Hoạt động' : 'Audit Activity Logs'}</span>
                </NavLink>
              </nav>
            </div>

            {/* Group 4: SYSTEM */}
            <div>
              <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-body-subtle pb-1 pt-1">
                {language === 'vi' ? 'Hệ thống' : 'System'}
              </p>
              <nav className="space-y-1">
                <NavLink to="/admin/health" className={navItemClass}>
                  <HeartPulse size={17} />
                  <span>{language === 'vi' ? 'Trạng thái Dịch vụ' : 'Service Health'}</span>
                  <span
                    className={`ml-auto h-2 w-2 rounded-full ${isHealthy ? 'bg-success' : 'bg-warning'}`}
                    title={isHealthy ? 'Tất cả dịch vụ hoạt động tốt' : 'Có cảnh báo'}
                  />
                </NavLink>
                <NavLink to="/admin/settings" className={navItemClass}>
                  <Sliders size={17} />
                  <span>{language === 'vi' ? 'Cấu hình Tham số' : 'System Settings'}</span>
                </NavLink>
              </nav>
            </div>
          </div>

          {/* Compact Single-line Sidebar Footer */}
          <div className="rounded-lg border border-border-default bg-neutral-secondary-soft/60 px-3 py-2 text-xs text-body-subtle flex items-center justify-between">
            <span>GreyTest Ops</span>
            <span className="font-sans tabular-nums text-fg-brand font-bold">v1.2</span>
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
