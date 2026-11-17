import { FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, CheckCircle2, Loader2, LockKeyhole, ShieldCheck } from 'lucide-react';
import { getErrorMessage } from '../../../shared/api/api-client';
import { LanguageToggle } from '../../../shared/components/LanguageToggle';
import { ThemeToggle } from '../../../shared/components/ThemeToggle';
import { BrandMark } from '../../../shared/components/BrandMark';
import { useLanguage } from '../../../shared/i18n/language';
import { useAdminLogin, useCurrentUser } from '../../auth/hooks/useAuth';
import {
  MAX_EMAIL_LENGTH,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  validateEmailInput,
  validatePasswordInput,
} from '../../auth/pages/LoginPage';

/** Màn hình đăng nhập tách biệt, chỉ chấp nhận tài khoản có role ADMIN. */
export function AdminLoginPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const loginMutation = useAdminLogin();
  const { data: currentUser, isLoading } = useCurrentUser();

  if (!isLoading && currentUser?.role === 'ADMIN') {
    return <Navigate to="/admin" replace />;
  }

  const emailError = validateEmailInput(email, t);
  const passwordError = validatePasswordInput(password, t);
  const showEmailError = (emailTouched || email.length > 0 || submitted) && Boolean(emailError);
  const showEmailValid = (emailTouched || email.length > 0) && !emailError;
  const showPasswordError = (passwordTouched || password.length > 0 || submitted) && Boolean(passwordError);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    setEmailTouched(true);
    setPasswordTouched(true);
    if (emailError || passwordError) {
      return;
    }
    loginMutation.mutate(
      { email: email.trim(), password },
      { onSuccess: () => navigate('/admin', { replace: true }) }
    );
  };

  return (
    <main className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-neutral-primary px-4 py-10 text-body">
      <section className="relative w-full max-w-md rounded-base border border-border-default bg-neutral-primary-soft p-6 sm:p-8">
        <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <BrandMark size={28} withWordmark />
            <h1 className="mt-4 text-xl font-semibold text-heading">Đăng nhập quản trị</h1>
          </div>
          <div className="flex gap-2"><ThemeToggle /><LanguageToggle /></div>
        </div>

        <p className="mb-6 rounded-base border border-border-brand-subtle bg-brand-softer p-3 text-sm leading-relaxed text-body">
          Khu vực dành riêng cho quản trị viên. Tài khoản người dùng thông thường không thể đăng nhập tại đây.
        </p>

        {currentUser?.role === 'USER' && (
          <p className="mb-4 text-xs text-body-subtle">Bạn đang có phiên người dùng. Đăng nhập bên dưới sẽ chuyển sang phiên quản trị.</p>
        )}

        <form className="space-y-4" noValidate onSubmit={handleSubmit}>
          <label className="block">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-semibold text-heading">Email quản trị</span>
              <span className="text-xs font-mono text-body-subtle">
                {email.trim().length}/{MAX_EMAIL_LENGTH}
              </span>
            </div>
            <input
              aria-label="Email quản trị"
              aria-invalid={showEmailError}
              className={`form-input ${showEmailError ? 'border-border-danger-subtle focus:border-border-danger-subtle' : showEmailValid ? 'border-border-success-subtle' : ''}`}
              type="email"
              autoComplete="username"
              autoFocus
              maxLength={MAX_EMAIL_LENGTH}
              required
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (!emailTouched) setEmailTouched(true);
              }}
            />
            {showEmailError && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-fg-danger-strong">
                <AlertCircle size={13} className="shrink-0" />
                <span>{emailError}</span>
              </p>
            )}
            {showEmailValid && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-fg-success-strong">
                <CheckCircle2 size={13} className="shrink-0" />
                <span>Định dạng Email hợp lệ</span>
              </p>
            )}
          </label>
          <label className="block">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-semibold text-heading">Mật khẩu</span>
              <span className="text-xs font-mono text-body-subtle">
                {password.length}/{MAX_PASSWORD_LENGTH}
              </span>
            </div>
            <div className="relative">
              <LockKeyhole className="pointer-events-none absolute left-3 top-3 text-body-subtle" size={16} />
              <input
                aria-label="Mật khẩu"
                aria-invalid={showPasswordError}
                className={`form-input pl-9 ${showPasswordError ? 'border-border-danger-subtle focus:border-border-danger-subtle' : ''}`}
                type="password"
                autoComplete="current-password"
                minLength={MIN_PASSWORD_LENGTH}
                maxLength={MAX_PASSWORD_LENGTH}
                required
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (!passwordTouched) setPasswordTouched(true);
                }}
              />
            </div>
            {showPasswordError && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-fg-danger-strong">
                <AlertCircle size={13} className="shrink-0" />
                <span>{passwordError}</span>
              </p>
            )}
          </label>

          {loginMutation.error && (
            <div role="alert" className="rounded-base border border-border-danger-subtle bg-danger-soft p-3 text-sm font-medium text-fg-danger-strong">
              {getErrorMessage(loginMutation.error)}
            </div>
          )}

          <button className="btn btn-brand w-full" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
            {loginMutation.isPending ? 'Đang xác thực...' : 'Vào trang quản trị'}
            {!loginMutation.isPending && <ArrowRight className="ml-auto" size={16} />}
          </button>
        </form>

        <Link to="/" className="mt-6 block text-center text-xs font-semibold text-fg-brand-strong hover:underline">
          Quay lại đăng nhập người dùng
        </Link>
      </section>
    </main>
  );
}
