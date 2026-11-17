import { IconButton } from './IconButton';
import { Tag } from './Tag';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  ChevronRight,
  HelpCircle,
  LogOut,
  Settings,
  User,
  X,
  BookOpen,
  CheckCircle2,
} from 'lucide-react';
import { useCurrentUser, useLogout } from '../../features/auth/hooks/useAuth';
import { useLanguage } from '../i18n/language';

interface UserDropdownMenuProps {
  logoutTo?: string;
}

export function UserDropdownMenu({ logoutTo = '/' }: UserDropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { data: user } = useCurrentUser();
  const logout = useLogout();
  const navigate = useNavigate();
  const { t } = useLanguage();

  // Đóng menu khi click ra ngoài
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Đóng modal Help khi bấm Escape
  useEffect(() => {
    if (!showHelpModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowHelpModal(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showHelpModal]);

  const handleLogout = () => {
    setIsOpen(false);
    logout();
    navigate(logoutTo, { replace: true });
  };

  const initial = user?.fullName ? user.fullName.trim().charAt(0).toUpperCase() : 'U';
  const isPro = user?.tier === 'PRO';
  const isPlus = user?.tier === 'PLUS';

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        data-testid="user-menu-trigger"
        onClick={() => setIsOpen((prev) => !prev)}
        className="group flex items-center gap-2 rounded-control border border-border-default bg-neutral-primary-soft py-1 pl-1.5 pr-2.5 text-[12px] font-medium text-heading transition-colors duration-200 hover:border-border-default-strong hover:bg-neutral-secondary-soft"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-heading  ${
            isPro
              ? 'bg-neutral-secondary-medium text-heading '
              : isPlus
                ? 'bg-neutral-secondary-medium text-heading '
                : 'bg-neutral-secondary-medium text-heading'
          }`}
        >
          {initial}
        </span>
        <span className="hidden whitespace-nowrap sm:inline-block">
          {user?.fullName ?? t('Người dùng', 'User')}
        </span>
        {isPro ? (
          <Tag>
            PRO
          </Tag>
        ) : isPlus ? (
          <Tag>
            PLUS
          </Tag>
        ) : (
          <Tag>
            FREE
          </Tag>
        )}
        <ChevronDown
          size={13}
          className={`text-body-subtle transition-transform duration-200 ${isOpen ? 'rotate-180 text-heading' : ''}`}
        />
      </button>

      {/* Dropdown Menu Popup - Thiết kế kỹ thuật theo mẫu hình ảnh */}
      {isOpen && (
        <div
          role="menu"
          data-testid="user-dropdown-menu"
          className="absolute right-0 mt-2 w-56 origin-top-right rounded-base border border-border-default bg-neutral-primary-soft p-1.5 text-body shadow-xl animate-fade-in z-50"
        >
          {/* Header tóm tắt người dùng */}
          <div className="mb-1 border-b border-border-default-subtle px-3 py-2">
            <p className="truncate text-xs font-semibold text-heading">{user?.fullName ?? 'Người dùng'}</p>
            <p className="truncate text-xs text-body-subtle">{user?.email ?? ''}</p>
          </div>

          <div className="space-y-0.5">
            {/* Item 1: Profile */}
            <Link
              to="/profile"
              role="menuitem"
              data-testid="user-menu-profile"
              onClick={() => setIsOpen(false)}
              className="flex w-full items-center gap-2.5 rounded-control px-3 py-2 text-xs font-medium text-heading transition-colors hover:bg-neutral-secondary-soft"
            >
              <User size={16} className="text-body-subtle" />
              <span>{t('Hồ sơ cá nhân', 'Profile')}</span>
            </Link>

            {/* Item 2: Settings */}
            <Link
              to="/settings"
              role="menuitem"
              data-testid="user-menu-settings"
              onClick={() => setIsOpen(false)}
              className="flex w-full items-center gap-2.5 rounded-control px-3 py-2 text-xs font-medium text-heading transition-colors hover:bg-neutral-secondary-soft"
            >
              <Settings size={16} className="text-body-subtle" />
              <span>{t('Cài đặt', 'Settings')}</span>
            </Link>

            {/* Divider */}
            <div className="my-1 border-t border-border-default-subtle" />

            {/* Item 3: Help */}
            <button
              type="button"
              role="menuitem"
              data-testid="user-menu-help"
              onClick={() => {
                setIsOpen(false);
                setShowHelpModal(true);
              }}
              className="flex w-full items-center justify-between rounded-control px-3 py-2 text-xs font-medium text-heading transition-colors hover:bg-neutral-secondary-soft"
            >
              <div className="flex items-center gap-2.5">
                <HelpCircle size={16} className="text-body-subtle" />
                <span>{t('Trợ giúp', 'Help')}</span>
              </div>
              <ChevronRight size={14} className="text-body-subtle" />
            </button>

            {/* Item 4: Log out */}
            <button
              type="button"
              role="menuitem"
              data-testid="user-menu-logout"
              onClick={handleLogout}
              className="flex w-full items-center justify-between rounded-control px-3 py-2 text-xs font-medium text-fg-danger-strong transition-colors hover:bg-danger-soft"
            >
              <div className="flex items-center gap-2.5">
                <LogOut size={16} className="text-fg-danger-strong" />
                <span>{t('Đăng xuất', 'Log out')}</span>
              </div>
              <ChevronRight size={14} className="text-fg-danger-strong" />
            </button>
          </div>
        </div>
      )}

      {/* Help Modal - dùng createPortal để thoát khỏi container nav có , căn giữa chính xác viewport */}
      {showHelpModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-dark/50 p-4 backdrop-blur-xs animate-fade-in"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowHelpModal(false);
            }}
          >
            <div className="relative w-full max-w-lg rounded-base border border-border-default bg-neutral-primary-soft p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-control border border-border-brand-subtle bg-brand-softer text-fg-brand-strong">
                    <BookOpen size={18} />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-heading font-display">
                      {t('Hướng dẫn & Trợ giúp GreyTest', 'GreyTest Guide & Help')}
                    </h2>
                    <p className="text-xs text-body-subtle">
                      {t('Quy trình kiểm thử Grey-box AI cho Java Spring Boot', 'Grey-box AI QA workflow for Java Spring Boot')}
                    </p>
                  </div>
                </div>
                <IconButton icon={X} label={t('Đóng', 'Close')} onClick={() => setShowHelpModal(false)} />
              </div>

              <div className="space-y-3.5 text-xs text-body">
                <div className="border-t border-t-border-default-subtle p-3">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 size={15} className="mt-0.5 text-fg-brand shrink-0" />
                    <div>
                      <strong className="text-heading font-semibold">
                        {t('1. Thêm & Tải lên Dự án:', '1. Add & Upload Project:')}
                      </strong>
                      <p className="mt-0.5 text-body-subtle">
                        {t(
                          'Tải lên file ZIP source code Spring Boot (hoặc nhập link GitHub public) để bắt đầu.',
                          'Upload a Spring Boot ZIP file (or public GitHub URL) to start.'
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-t-border-default-subtle p-3">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 size={15} className="mt-0.5 text-fg-brand shrink-0" />
                    <div>
                      <strong className="text-heading font-semibold">
                        {t('2. Phân tích Cấu trúc (Static Analysis):', '2. Structural Analysis:')}
                      </strong>
                      <p className="mt-0.5 text-body-subtle">
                        {t(
                          'Hệ thống tự động quét Controllers, Services, Repositories, Entities và test hiện có.',
                          'System automatically inspects controllers, services, repositories, and entities.'
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-t-border-default-subtle p-3">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 size={15} className="mt-0.5 text-fg-brand shrink-0" />
                    <div>
                      <strong className="text-heading font-semibold">
                        {t('3. Pipeline AI Sinh Test Grey-box:', '3. Grey-box AI Test Pipeline:')}
                      </strong>
                      <p className="mt-0.5 text-body-subtle">
                        {t(
                          'Sinh Test Plan, Test Cases, Unit Test (JUnit 5 / Mockito) và JaCoCo Coverage Refinement.',
                          'Generate Test Plans, Test Cases, Unit Tests (JUnit 5 / Mockito), and JaCoCo coverage refinement.'
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-t-border-default-subtle p-3">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 size={15} className="mt-0.5 text-fg-brand shrink-0" />
                    <div>
                      <strong className="text-heading font-semibold">
                        {t('4. Quản lý Hạn mức & Gói dịch vụ:', '4. Subscription & Quota:')}
                      </strong>
                      <p className="mt-0.5 text-body-subtle">
                        {t(
                          'Truy cập mục Cài đặt để theo dõi lượt gọi AI trong tuần và nâng cấp gói PRO qua VNPay.',
                          'Access Settings to monitor your weekly AI quota and upgrade to PRO via VNPay.'
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowHelpModal(false)}
                  className="btn btn-brand px-4 py-2 text-xs font-semibold"
                >
                  {t('Đã hiểu', 'Got it')}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
