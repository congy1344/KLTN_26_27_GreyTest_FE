import { FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Beaker, CheckCircle2, KeyRound, Loader2 } from 'lucide-react';
import { getErrorMessage } from '../../../shared/api/api-client';
import { LanguageToggle } from '../../../shared/components/LanguageToggle';
import { ThemeToggle } from '../../../shared/components/ThemeToggle';
import { useLanguage } from '../../../shared/i18n/language';
import { useResetPassword } from '../hooks/useAuth';
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  validatePasswordInput,
} from './LoginPage';

/**
 * Trang đặt lại mật khẩu mới khi người dùng nhấn vào đường dẫn xác thực trong email Gmail.
 */
export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = (searchParams.get('token') ?? '').trim();
  const { t } = useLanguage();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPasswordTouched, setNewPasswordTouched] = useState(false);
  const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const resetPasswordMutation = useResetPassword();

  const newPasswordError = validatePasswordInput(newPassword, t);
  const confirmPasswordError = !confirmPassword
    ? t('Xác nhận mật khẩu mới không được để trống', 'Confirm password is required')
    : confirmPassword !== newPassword
      ? t('Xác nhận mật khẩu mới không khớp', 'Passwords do not match')
      : null;

  const showNewPasswordError =
    (newPasswordTouched || newPassword.length > 0 || submitted) && Boolean(newPasswordError);
  const showNewPasswordValid =
    (newPasswordTouched || newPassword.length > 0) && !newPasswordError;
  const showConfirmError =
    (confirmPasswordTouched || confirmPassword.length > 0 || submitted) && Boolean(confirmPasswordError);
  const showConfirmValid =
    (confirmPasswordTouched || confirmPassword.length > 0) && !confirmPasswordError;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    setNewPasswordTouched(true);
    setConfirmPasswordTouched(true);

    if (!token || newPasswordError || confirmPasswordError) {
      return;
    }

    resetPasswordMutation.mutate(
      { token, newPassword, confirmPassword },
      {
        onSuccess: (res) => {
          setSuccessMessage(
            res.message ||
              t(
                'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.',
                'Password reset successfully. You can now sign in with your new password.'
              )
          );
        },
      }
    );
  };

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center bg-neutral-primary px-4 py-10 text-body">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-px w-[82vw] -translate-x-1/2 bg-gradient-to-r from-transparent via-border-brand-subtle to-transparent" />
        <div className="absolute right-[8%] top-[-18rem] h-[34rem] w-[34rem] rounded-full bg-brand/[0.08] blur-[110px]" />
        <div className="absolute left-[4%] bottom-[-16rem] h-[28rem] w-[28rem] rounded-full bg-brand/[0.05] blur-[100px]" />
      </div>

      <section className="relative w-full max-w-md rounded-base border border-border-default bg-neutral-primary-soft p-6 shadow-md animate-fade-in-up">
        <div className="mb-6 flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-default border border-border-brand-subtle bg-brand-softer text-fg-brand-strong">
            <Beaker size={18} strokeWidth={1.8} />
          </span>
          <div>
            <h1 className="text-xl font-bold text-heading">
              {t('Đặt lại mật khẩu mới', 'Reset Password')}
            </h1>
            <p className="text-xs text-body-subtle">
              {t(
                'Nhập mật khẩu mới cho tài khoản GreyTest của bạn.',
                'Enter a new password for your GreyTest account.'
              )}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <LanguageToggle />
          </div>
        </div>

        {!token ? (
          <div className="space-y-4">
            <div
              role="alert"
              className="rounded-default border border-border-danger-subtle bg-danger-soft p-3.5 text-sm font-medium text-fg-danger-strong"
            >
              {t(
                'Đường dẫn đặt lại mật khẩu không hợp lệ hoặc thiếu mã xác thực. Vui lòng gửi lại yêu cầu quên mật khẩu.',
                'Invalid password reset link or missing token. Please request a new password reset link.'
              )}
            </div>
            <Link to="/" className="btn btn-brand w-full justify-center">
              <ArrowLeft size={15} />
              {t('Quay về trang đăng nhập', 'Back to sign in')}
            </Link>
          </div>
        ) : successMessage ? (
          <div className="space-y-4" data-testid="reset-password-success">
            <div
              role="status"
              className="flex items-start gap-2.5 rounded-default border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-sm font-medium text-emerald-600 dark:text-emerald-400"
            >
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => navigate('/', { replace: true })}
              className="btn btn-brand w-full justify-center"
            >
              {t('Đăng nhập ngay', 'Sign in now')}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <label className="block">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-semibold text-heading">
                  {t('Mật khẩu mới', 'New password')}
                </span>
                <span className="text-[11px] font-mono text-body-subtle">
                  {newPassword.length}/{MAX_PASSWORD_LENGTH}
                </span>
              </div>
              <input
                aria-label={t('Mật khẩu mới', 'New password')}
                aria-invalid={showNewPasswordError}
                className={`form-input ${
                  showNewPasswordError
                    ? 'border-red-500 focus:border-red-500'
                    : showNewPasswordValid
                      ? 'border-emerald-500/70'
                      : ''
                }`}
                type="password"
                autoComplete="new-password"
                autoFocus
                minLength={MIN_PASSWORD_LENGTH}
                maxLength={MAX_PASSWORD_LENGTH}
                placeholder={t('Từ 6–72 ký tự, không chứa khoảng trắng', '6–72 characters, no spaces')}
                value={newPassword}
                onChange={(event) => {
                  setNewPassword(event.target.value);
                  if (!newPasswordTouched) setNewPasswordTouched(true);
                }}
                required
              />
              {showNewPasswordError && (
                <p
                  data-testid="new-password-error"
                  className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-fg-danger-strong"
                >
                  <AlertCircle size={13} className="shrink-0" />
                  <span>{newPasswordError}</span>
                </p>
              )}
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-heading">
                {t('Xác nhận mật khẩu mới', 'Confirm new password')}
              </span>
              <input
                aria-label={t('Xác nhận mật khẩu mới', 'Confirm new password')}
                aria-invalid={showConfirmError}
                className={`form-input ${
                  showConfirmError
                    ? 'border-red-500 focus:border-red-500'
                    : showConfirmValid
                      ? 'border-emerald-500/70'
                      : ''
                }`}
                type="password"
                autoComplete="new-password"
                maxLength={MAX_PASSWORD_LENGTH}
                placeholder={t('Nhập lại mật khẩu mới', 'Re-enter new password')}
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value);
                  if (!confirmPasswordTouched) setConfirmPasswordTouched(true);
                }}
                required
              />
              {showConfirmError && (
                <p
                  data-testid="confirm-password-error"
                  className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-fg-danger-strong"
                >
                  <AlertCircle size={13} className="shrink-0" />
                  <span>{confirmPasswordError}</span>
                </p>
              )}
              {showConfirmValid && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={13} className="shrink-0" />
                  <span>{t('Mật khẩu xác nhận khớp', 'Passwords match')}</span>
                </p>
              )}
            </label>

            {resetPasswordMutation.error && (
              <div
                role="alert"
                className="rounded-default border border-border-danger-subtle bg-danger-soft p-3 text-sm font-medium text-fg-danger-strong"
              >
                {getErrorMessage(resetPasswordMutation.error)}
              </div>
            )}

            <button className="btn btn-brand w-full" disabled={resetPasswordMutation.isPending}>
              {resetPasswordMutation.isPending ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <KeyRound size={15} />
              )}
              {resetPasswordMutation.isPending
                ? t('Đang cập nhật...', 'Updating...')
                : t('Cập nhật mật khẩu mới', 'Update password')}
            </button>

            <Link
              to="/"
              className="mt-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-body-subtle hover:text-heading"
            >
              <ArrowLeft size={13} />
              {t('Quay lại trang đăng nhập', 'Back to sign in')}
            </Link>
          </form>
        )}
      </section>
    </div>
  );
}

