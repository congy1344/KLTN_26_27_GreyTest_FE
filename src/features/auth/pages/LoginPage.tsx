import { FormEvent, useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Beaker,
  CheckCircle2,
  ExternalLink,
  KeyRound,
  Loader2,
  LogIn,
  MailCheck,
  ShieldAlert,
  UserPlus,
} from 'lucide-react';
import { getErrorMessage } from '../../../shared/api/api-client';
import { useForgotPassword, useLogin, useRegister } from '../hooks/useAuth';
import { useLanguage } from '../../../shared/i18n/language';
import { LanguageToggle } from '../../../shared/components/LanguageToggle';
import { ThemeToggle } from '../../../shared/components/ThemeToggle';

/**
 * Regex & giới hạn độ dài đồng bộ 100% giữa Frontend và Backend (LoginRequest / RegisterRequest / AuthService).
 */
export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
export const PASSWORD_REGEX = /^(?=.*[A-Za-z0-9])\S{6,72}$/;
export const MAX_EMAIL_LENGTH = 254;
export const MIN_PASSWORD_LENGTH = 6;
export const MAX_PASSWORD_LENGTH = 72;
export const MIN_FULL_NAME_LENGTH = 2;
export const MAX_FULL_NAME_LENGTH = 100;

export function validateEmailInput(
  rawEmail: string,
  t: (vi: string, en: string) => string
): string | null {
  if (!rawEmail || rawEmail.trim().length === 0) {
    return t('Email không được để trống', 'Email is required');
  }
  const trimmed = rawEmail.trim();
  if (trimmed.length > MAX_EMAIL_LENGTH) {
    return t(
      `Email không được vượt quá ${MAX_EMAIL_LENGTH} ký tự`,
      `Email must not exceed ${MAX_EMAIL_LENGTH} characters`
    );
  }
  if (/\s/.test(trimmed) || !EMAIL_REGEX.test(trimmed)) {
    return t(
      'Email không đúng định dạng (ví dụ: user@domain.com)',
      'Invalid email format (e.g. user@domain.com)'
    );
  }
  return null;
}

export function validatePasswordInput(
  rawPassword: string,
  t: (vi: string, en: string) => string
): string | null {
  if (!rawPassword || rawPassword.length === 0) {
    return t('Mật khẩu không được để trống', 'Password is required');
  }
  if (/\s/.test(rawPassword)) {
    return t(
      'Mật khẩu không được chứa khoảng trắng',
      'Password must not contain whitespace'
    );
  }
  if (rawPassword.length < MIN_PASSWORD_LENGTH || rawPassword.length > MAX_PASSWORD_LENGTH) {
    return t(
      `Mật khẩu phải từ ${MIN_PASSWORD_LENGTH} đến ${MAX_PASSWORD_LENGTH} ký tự`,
      `Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters`
    );
  }
  if (!PASSWORD_REGEX.test(rawPassword)) {
    return t(
      'Mật khẩu phải từ 6 đến 72 ký tự, có ít nhất 1 chữ cái hoặc chữ số và không chứa khoảng trắng',
      'Password must be 6–72 characters, contain at least one letter or digit, and have no spaces'
    );
  }
  return null;
}

export function validateFullNameInput(
  rawFullName: string,
  t: (vi: string, en: string) => string
): string | null {
  if (!rawFullName || rawFullName.trim().length === 0) {
    return t('Họ tên không được để trống', 'Full name is required');
  }
  const trimmed = rawFullName.trim();
  if (trimmed.length < MIN_FULL_NAME_LENGTH || trimmed.length > MAX_FULL_NAME_LENGTH) {
    return t(
      `Họ tên phải từ ${MIN_FULL_NAME_LENGTH} đến ${MAX_FULL_NAME_LENGTH} ký tự`,
      `Full name must be between ${MIN_FULL_NAME_LENGTH} and ${MAX_FULL_NAME_LENGTH} characters`
    );
  }
  return null;
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const wasDisabled = searchParams.get('disabled') === 'true';
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [fullNameTouched, setFullNameTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const forgotPasswordMutation = useForgotPassword();
  const isPending =
    loginMutation.isPending || registerMutation.isPending || forgotPasswordMutation.isPending;
  const error =
    mode === 'forgot'
      ? forgotPasswordMutation.error
      : (loginMutation.error ?? registerMutation.error);
  const { t } = useLanguage();

  // Tự động bỏ đuôi /login trên thanh địa chỉ trình duyệt về đường dẫn gốc '/'
  useEffect(() => {
    if (location.pathname === '/login') {
      navigate({ pathname: '/', search: location.search }, { replace: true });
    }
  }, [location.pathname, location.search, navigate]);

  if (localStorage.getItem('greytest.token')) {
    return <Navigate to="/projects" replace />;
  }

  // Kiểm tra Regex & độ dài trực tiếp theo thời gian thực (live realtime) khi người dùng nhập
  const emailError = validateEmailInput(email, t);
  const passwordError = validatePasswordInput(password, t);
  const fullNameError = mode === 'register' ? validateFullNameInput(fullName, t) : null;

  const showEmailError = (emailTouched || email.length > 0 || submitted) && Boolean(emailError);
  const showEmailValid = (emailTouched || email.length > 0) && !emailError;
  const showPasswordError =
    mode !== 'forgot' && (passwordTouched || password.length > 0 || submitted) && Boolean(passwordError);
  const showPasswordValid = mode !== 'forgot' && (passwordTouched || password.length > 0) && !passwordError;
  const showFullNameError =
    mode === 'register' && (fullNameTouched || fullName.length > 0 || submitted) && Boolean(fullNameError);
  const showFullNameValid =
    mode === 'register' && (fullNameTouched || fullName.length > 0) && !fullNameError;

  const switchMode = (nextMode: 'login' | 'register' | 'forgot') => {
    setMode(nextMode);
    setSubmitted(false);
    if (!email) setEmailTouched(false);
    if (!password) setPasswordTouched(false);
    if (!fullName) setFullNameTouched(false);
    loginMutation.reset();
    registerMutation.reset();
    forgotPasswordMutation.reset();
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    setEmailTouched(true);

    if (mode === 'forgot') {
      if (emailError) return;
      forgotPasswordMutation.mutate({ email: email.trim() });
      return;
    }

    setPasswordTouched(true);
    if (mode === 'register') {
      setFullNameTouched(true);
    }

    if (emailError || passwordError || (mode === 'register' && fullNameError)) {
      return;
    }

    const normalizedEmail = email.trim();
    const onSuccess = () => navigate('/projects', { replace: true });
    if (mode === 'login') {
      loginMutation.mutate({ email: normalizedEmail, password }, { onSuccess });
    } else {
      registerMutation.mutate({ email: normalizedEmail, password, fullName: fullName.trim() }, { onSuccess });
    }
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
            <h1 className="text-xl font-bold text-heading">GreyTest</h1>
            <p className="text-xs text-body-subtle">
              {mode === 'forgot'
                ? t(
                    'Nhập email đã đăng ký để nhận đường dẫn đặt lại mật khẩu mới.',
                    'Enter your registered email to receive a password reset link.'
                  )
                : t(
                    'Đăng nhập để quản lý project và workflow AI QA.',
                    'Sign in to manage projects and the AI QA workflow.'
                  )}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <LanguageToggle />
          </div>
        </div>

        <div className="mb-5 grid grid-cols-2 rounded-default border border-border-default bg-neutral-secondary-soft p-1">
          <button
            type="button"
            aria-pressed={mode === 'login'}
            onClick={() => switchMode('login')}
            className={`rounded-sm px-3 py-2 text-sm font-semibold transition-colors duration-200 ${mode === 'login' ? 'bg-neutral-primary-soft text-heading shadow-xs' : 'text-body-subtle hover:text-body'}`}
          >
            {t('Đăng nhập', 'Sign in')}
          </button>
          <button
            type="button"
            aria-pressed={mode === 'register'}
            onClick={() => switchMode('register')}
            className={`rounded-sm px-3 py-2 text-sm font-semibold transition-colors duration-200 ${mode === 'register' ? 'bg-neutral-primary-soft text-heading shadow-xs' : 'text-body-subtle hover:text-body'}`}
          >
            {t('Đăng ký', 'Register')}
          </button>
        </div>

        {wasDisabled && !error && (
          <div role="alert" className="mb-4 flex items-center gap-2.5 rounded-default border border-border-danger-subtle bg-danger-soft p-3 text-sm font-medium text-fg-danger-strong animate-fade-in">
            <ShieldAlert size={18} className="shrink-0" />
            <span>{t('Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên.', 'Your account has been disabled. Please contact an administrator.')}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {mode === 'register' && (
            <label className="block">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-semibold text-heading">{t('Họ tên', 'Full name')}</span>
                <span className="text-[11px] font-mono text-body-subtle">
                  {fullName.trim().length}/{MAX_FULL_NAME_LENGTH}
                </span>
              </div>
              <input
                aria-label={t('Họ tên', 'Full name')}
                aria-invalid={showFullNameError}
                className={`form-input ${showFullNameError ? 'border-red-500 focus:border-red-500' : showFullNameValid ? 'border-emerald-500/70' : ''}`}
                autoComplete="name"
                maxLength={MAX_FULL_NAME_LENGTH}
                value={fullName}
                onChange={(event) => {
                  setFullName(event.target.value);
                  if (!fullNameTouched) setFullNameTouched(true);
                }}
                required
              />
              {showFullNameError && (
                <p data-testid="fullname-validation-error" className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-fg-danger-strong">
                  <AlertCircle size={13} className="shrink-0" />
                  <span>{fullNameError}</span>
                </p>
              )}
            </label>
          )}

          <label className="block">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-semibold text-heading">Email</span>
              <span className="text-[11px] font-mono text-body-subtle">
                {email.trim().length}/{MAX_EMAIL_LENGTH}
              </span>
            </div>
            <input
              aria-label="Email"
              aria-invalid={showEmailError}
              className={`form-input ${showEmailError ? 'border-red-500 focus:border-red-500' : showEmailValid ? 'border-emerald-500/70' : ''}`}
              type="email"
              autoComplete="email"
              autoFocus
              maxLength={MAX_EMAIL_LENGTH}
              placeholder="name@gmail.com"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (!emailTouched) setEmailTouched(true);
              }}
              required
            />
            {showEmailError && (
              <p data-testid="email-validation-error" className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-fg-danger-strong">
                <AlertCircle size={13} className="shrink-0" />
                <span>{emailError}</span>
              </p>
            )}
            {showEmailValid && (
              <p data-testid="email-validation-valid" className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={13} className="shrink-0" />
                <span>{t('Định dạng Email hợp lệ', 'Valid email format')}</span>
              </p>
            )}
          </label>

          {mode !== 'forgot' && (
            <label className="block">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-semibold text-heading">{t('Mật khẩu', 'Password')}</span>
                <span className="text-[11px] font-mono text-body-subtle">
                  {password.length}/{MAX_PASSWORD_LENGTH}
                </span>
              </div>
              <input
                aria-label={t('Mật khẩu', 'Password')}
                aria-invalid={showPasswordError}
                className={`form-input ${showPasswordError ? 'border-red-500 focus:border-red-500' : showPasswordValid ? 'border-emerald-500/70' : ''}`}
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                minLength={MIN_PASSWORD_LENGTH}
                maxLength={MAX_PASSWORD_LENGTH}
                placeholder={t('Từ 6–72 ký tự, không chứa khoảng trắng', '6–72 characters, no spaces')}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (!passwordTouched) setPasswordTouched(true);
                }}
                required
              />
              {showPasswordError && (
                <p data-testid="password-validation-error" className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-fg-danger-strong">
                  <AlertCircle size={13} className="shrink-0" />
                  <span>{passwordError}</span>
                </p>
              )}
            </label>
          )}

          {mode === 'forgot' && forgotPasswordMutation.data && (
            <div
              role="status"
              data-testid="forgot-password-success"
              className="space-y-2.5 rounded-default border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-700 dark:text-emerald-300 animate-fade-in"
            >
              <div className="flex items-start gap-2 font-medium">
                <MailCheck size={16} className="mt-0.5 shrink-0" />
                <span>{forgotPasswordMutation.data.message}</span>
              </div>
              {forgotPasswordMutation.data.resetUrl && (
                <div className="pt-1">
                  <a
                    href={forgotPasswordMutation.data.resetUrl}
                    data-testid="forgot-password-reset-link"
                    className="inline-flex items-center gap-1.5 rounded-sm bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    <ExternalLink size={13} />
                    {t('Mở đường dẫn nhập mật khẩu mới', 'Open password reset link')}
                  </a>
                </div>
              )}
            </div>
          )}

          {error && (
            <div role="alert" className="rounded-default border border-border-danger-subtle bg-danger-soft p-3 text-sm font-medium text-fg-danger-strong animate-fade-in">
              {getErrorMessage(error)}
            </div>
          )}

          <button className="btn btn-brand w-full" disabled={isPending}>
            {isPending ? (
              <Loader2 size={15} className="animate-spin" />
            ) : mode === 'login' ? (
              <LogIn size={15} />
            ) : mode === 'register' ? (
              <UserPlus size={15} />
            ) : (
              <KeyRound size={15} />
            )}
            {isPending
              ? t('Đang xử lý...', 'Processing...')
              : mode === 'login'
                ? t('Đăng nhập', 'Sign in')
                : mode === 'register'
                  ? t('Tạo tài khoản', 'Create account')
                  : t('Gửi đường dẫn đặt lại mật khẩu', 'Send password reset link')}
          </button>

          {mode === 'forgot' ? (
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="mt-2 flex w-full items-center justify-center gap-1.5 text-xs font-semibold text-body-subtle hover:text-heading"
            >
              <ArrowLeft size={13} />
              {t('Quay lại đăng nhập', 'Back to sign in')}
            </button>
          ) : (
            <button
              type="button"
              data-testid="forgot-password-trigger"
              onClick={() => switchMode('forgot')}
              className="mt-2 flex w-full items-center justify-center text-xs font-semibold text-fg-brand hover:underline"
            >
              {t('Quên mật khẩu?', 'Forgot password?')}
            </button>
          )}
        </form>

        <p className="mt-5 text-center text-[11px] text-body-subtle">
          {t('GreyTest · Hệ thống AI QA Agent hướng Grey-box', 'GreyTest · Grey-box AI QA Agent system')}
        </p>
      </section>
    </div>
  );
}
