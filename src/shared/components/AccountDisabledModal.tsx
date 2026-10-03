import { useEffect, useState } from 'react';
import { ShieldAlert, LogOut } from 'lucide-react';
import { useLanguage } from '../i18n/language';

/**
 * Modal cảnh báo tài khoản bị khóa / vô hiệu hóa.
 * Khi nhận được sự kiện 'account-disabled' từ api-client interceptor:
 * - Hiển thị popup cảnh báo toàn màn hình
 * - Lập tức xóa token trong localStorage
 * - Cho phép người dùng bấm "Về trang đăng nhập" hoặc tự động chuyển trang sau vài giây
 */
export function AccountDisabledModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState<string>('');
  const { t } = useLanguage();

  useEffect(() => {
    const handleAccountDisabled = (event: Event) => {
      const customEvent = event as CustomEvent<{ message?: string }>;
      // Xóa phiên làm việc ngay lập tức
      localStorage.removeItem('greytest.token');
      setMessage(
        customEvent.detail?.message ||
          t('Tài khoản của bạn đã bị vô hiệu hóa.', 'Your account has been disabled.')
      );
      setIsOpen(true);
    };

    window.addEventListener('account-disabled', handleAccountDisabled);
    return () => {
      window.removeEventListener('account-disabled', handleAccountDisabled);
    };
  }, [t]);

  const handleLogout = () => {
    setIsOpen(false);
    localStorage.removeItem('greytest.token');
    window.location.href = '/login?disabled=true';
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-disabled-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-primary/80 p-4 backdrop-blur-md animate-fade-in"
    >
      <div className="w-full max-w-md rounded-base border border-border-danger-subtle bg-neutral-primary-soft p-6 text-center shadow-2xl animate-fade-in-up">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-danger-soft text-fg-danger-strong shadow-xs">
          <ShieldAlert size={28} strokeWidth={2} />
        </div>

        <h2 id="account-disabled-title" className="mt-4 text-xl font-bold text-heading">
          {t('Tài khoản đã bị vô hiệu hóa', 'Account Disabled')}
        </h2>

        <p className="mt-2 text-sm leading-relaxed text-body-subtle">
          {message || t('Tài khoản của bạn đã bị quản trị viên khóa hoặc vô hiệu hóa. Phiên làm việc đã kết thúc.', 'Your account has been locked or disabled by an administrator. Your session has ended.')}
        </p>

        <p className="mt-2 text-xs text-body-subtle/80">
          {t(
            'Vui lòng liên hệ với quản trị viên nếu bạn cho rằng đây là một sự nhầm lẫn.',
            'Please contact the administrator if you believe this is a mistake.'
          )}
        </p>

        <div className="mt-6">
          <button
            type="button"
            onClick={handleLogout}
            className="btn btn-ghost-danger w-full justify-center gap-2 border border-border-danger-subtle py-2.5 text-sm font-semibold"
          >
            <LogOut size={16} />
            {t('Đăng xuất về trang đăng nhập', 'Log out to sign in')}
          </button>
        </div>
      </div>
    </div>
  );
}
