import { QuotaMeter } from './QuotaMeter';
import { BrandMark } from './BrandMark';
import { Link } from 'react-router-dom';
import { UserDropdownMenu } from './UserDropdownMenu';
import { NotificationDropdown } from './NotificationDropdown';

interface AppShellProps {
  children: React.ReactNode;
  maxWidth?: 'default' | 'wide' | 'full' | 'bleed';
  homeTo?: string;
  logoutTo?: string;
  showAdminShortcut?: boolean;
}

export function AppShell({
  children,
  maxWidth = 'default',
  logoutTo = '/',
}: AppShellProps) {
  const widthClass =
    maxWidth === 'full'
      ? 'w-full max-w-[98%]'
      : maxWidth === 'wide'
        ? 'w-full max-w-[96%]'
        : 'max-w-5xl';

  return (
    <div className="min-h-[100dvh] text-body">
      <nav className="sticky top-0 z-40 border-b border-border-default-subtle bg-neutral-primary-soft">
        <div className="mx-auto flex min-h-16 w-full max-w-[96%] flex-wrap items-center gap-x-5 gap-y-2 py-2 lg:flex-nowrap sm:py-0 px-4 sm:px-6">
          <div className="flex items-center gap-5 sm:gap-6">
            <Link to="/projects" className="flex items-center rounded-control">
              <BrandMark size={28} withWordmark />
            </Link>
          </div>

          <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-2 sm:gap-2.5 lg:flex-nowrap">
            <QuotaMeter />
            <NotificationDropdown />
            <UserDropdownMenu logoutTo={logoutTo} />
          </div>
        </div>
      </nav>

      <main className={`relative ${maxWidth === 'bleed' ? 'w-full' : `mx-auto ${widthClass} px-4 py-8 sm:px-6 sm:py-10`} min-h-[calc(100dvh-12rem)]`}>
        {children}
      </main>

    </div>
  );
}
