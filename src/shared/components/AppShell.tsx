import { Beaker, ShieldCheck } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useCurrentUser } from '../../features/auth/hooks/useAuth';
import { useLanguage } from '../i18n/language';
import { UserDropdownMenu } from './UserDropdownMenu';
import { NotificationDropdown } from './NotificationDropdown';

interface AppShellProps {
  children: React.ReactNode;
  maxWidth?: 'default' | 'wide' | 'full';
  homeTo?: string;
  logoutTo?: string;
  showAdminShortcut?: boolean;
}

export function AppShell({
  children,
  maxWidth = 'default',
  homeTo = '/projects',
  logoutTo = '/',
  showAdminShortcut = true,
}: AppShellProps) {
  const widthClass =
    maxWidth === 'full'
      ? 'w-full max-w-[98%]'
      : maxWidth === 'wide'
        ? 'w-full max-w-[96%]'
        : 'max-w-5xl';
  const location = useLocation();
  const { data: user } = useCurrentUser();
  const { t } = useLanguage();

  return (
    <div className="min-h-[100dvh] text-body">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-px w-[94vw] -translate-x-1/2 bg-gradient-to-r from-transparent via-border-brand-subtle to-transparent" />
        <div className="absolute right-[8%] top-[-18rem] h-[34rem] w-[34rem] rounded-full bg-brand/[0.08] blur-[110px]" />
      </div>

      <nav className="sticky top-0 z-40 border-b border-border-default-subtle bg-neutral-primary-soft/88 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-[96%] items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-5 sm:gap-6">
            <Link to={homeTo} className="group flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-default border border-border-brand-subtle bg-brand-softer text-fg-brand-strong shadow-xs transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-y-0.5">
                <Beaker size={16} strokeWidth={1.8} />
              </span>
              <span className="text-sm font-semibold tracking-tight text-heading">
                GreyTest
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Mục Dự án chuyển sang góc phải dạng menu header và bỏ icon theo yêu cầu */}
            <Link
              to="/projects"
              data-testid="nav-projects-link"
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                location.pathname.startsWith('/projects')
                  ? 'bg-neutral-secondary-soft text-heading font-bold shadow-xs'
                  : 'text-body-subtle hover:text-heading hover:bg-neutral-secondary-soft/60'
              }`}
            >
              {t('Dự án', 'Projects')}
            </Link>

            {/* Thông báo đặt ở bên phải mục Dự án bao gồm admin, thanh toán và tác vụ hệ thống */}
            <NotificationDropdown />

            {showAdminShortcut && user?.role === 'ADMIN' && (
              <Link to="/admin" className="btn btn-secondary px-3 py-1.5 text-[12px]">
                <ShieldCheck size={14} /> Admin
              </Link>
            )}
            <UserDropdownMenu logoutTo={logoutTo} />
          </div>
        </div>
      </nav>

      <main className={`relative mx-auto ${widthClass} px-4 py-8 sm:px-6 sm:py-10 min-h-[calc(100dvh-12rem)]`}>
        {children}
      </main>

      <footer className="mt-16 border-t border-border-default-subtle bg-neutral-primary-soft/80">
        <div className={`mx-auto flex ${widthClass} flex-col gap-2 px-4 py-6 text-[12px] text-body-subtle sm:flex-row sm:items-center sm:justify-between sm:px-6`}>
          <span>{t('GreyTest · Đồ án tốt nghiệp KTPM', 'GreyTest · Software Engineering capstone')}</span>
          <span className="font-mono">Grey-box AI QA System</span>
        </div>
      </footer>
    </div>
  );
}
