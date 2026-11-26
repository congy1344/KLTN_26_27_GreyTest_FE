import { FormEvent, useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  KeyRound,
  Loader2,
  LogIn,
  MailCheck,
  RefreshCw,
  ShieldAlert,
  UserPlus,
} from 'lucide-react';
import { getErrorMessage } from '../../../shared/api/api-client';
import { buildGithubAuthorizeUrl } from '../api/auth-api';
import {
  useForgotPassword,
  useGithubConfig,
  useGoogleConfig,
  useGoogleLogin,
  useLogin,
  useRegister,
  useResetPassword,
} from '../hooks/useAuth';
import { useLanguage } from '../../../shared/i18n/language';
import { BrandMark } from '../../../shared/components/BrandMark';
import { LanguageToggle } from '../../../shared/components/LanguageToggle';
import { ThemeToggle } from '../../../shared/components/ThemeToggle';

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              width?: number;
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              shape?: 'rectangular' | 'pill';
            }
          ) => void;
        };
      };
    };
  }
}

/**
 * Regex & giới hạn độ dài đồng bộ 100% giữa Frontend và Backend (LoginRequest / RegisterRequest / AuthService).
 */
export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
export const PASSWORD_REGEX = /^(?=.*[A-Za-z0-9])\S{6,72}$/;
export const OTP_REGEX = /^\d{6}$/;
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

export function validateOtpInput(
  rawOtp: string,
  t: (vi: string, en: string) => string
): string | null {
  const trimmed = rawOtp.trim();
  if (!trimmed) {
    return t('Mã OTP không được để trống', 'OTP code is required');
  }
  if (!OTP_REGEX.test(trimmed)) {
    return t('Mã OTP phải gồm đúng 6 chữ số', 'OTP must be exactly 6 digits');
  }
  return null;
}

type AuthMode = 'login' | 'register' | 'forgot';

// Mỗi chế độ có đường dẫn riêng để chia sẻ link và nút Back của trình duyệt hoạt động đúng.
const AUTH_PATHS: Record<AuthMode, string> = { login: '/login', register: '/register', forgot: '/forgot-password' };

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const wasDisabled = searchParams.get('disabled') === 'true';
  const { pathname } = useLocation();
  const mode: AuthMode = pathname === '/register' ? 'register' : pathname === '/forgot-password' ? 'forgot' : 'login';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [fullNameTouched, setFullNameTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Trạng thái bước 2 của Quên mật khẩu: nhập OTP + mật khẩu mới
  const [otp, setOtp] = useState('');
  const [otpTouched, setOtpTouched] = useState(false);
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetNewPasswordTouched, setResetNewPasswordTouched] = useState(false);
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [resetConfirmTouched, setResetConfirmTouched] = useState(false);
  const [otpSubmitted, setOtpSubmitted] = useState(false);
  const [otpResetSuccessMessage, setOtpResetSuccessMessage] = useState<string | null>(null);

  // Trạng thái Google Identity Services (GIS)
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const [gisReady, setGisReady] = useState(false);
  const [gisLoadError, setGisLoadError] = useState(false);
  const [googleConfigWarning, setGoogleConfigWarning] = useState(false);

  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const forgotPasswordMutation = useForgotPassword();
  const resetPasswordMutation = useResetPassword();
  const googleLoginMutation = useGoogleLogin();
  const googleConfigQuery = useGoogleConfig();
  const githubConfigQuery = useGithubConfig();

  const viteGoogleClientId = (import.meta as { env?: { VITE_GOOGLE_CLIENT_ID?: string } }).env
    ?.VITE_GOOGLE_CLIENT_ID;
  const googleClientId = (viteGoogleClientId || googleConfigQuery.data?.clientId || '').trim();

  const isPending =
    loginMutation.isPending ||
    registerMutation.isPending ||
    forgotPasswordMutation.isPending ||
    resetPasswordMutation.isPending ||
    googleLoginMutation.isPending;

  const error =
    mode === 'forgot'
      ? (resetPasswordMutation.error ?? forgotPasswordMutation.error)
      : (loginMutation.error ?? registerMutation.error ?? googleLoginMutation.error);

  const { t } = useLanguage();

  // Khởi tạo nút đăng nhập Google Identity Services khi có GOOGLE_CLIENT_ID
  useEffect(() => {
    if (mode === 'forgot' || !googleClientId || localStorage.getItem('greytest.token')) {
      setGisReady(false);
      setGisLoadError(false);
      return;
    }

    let cancelled = false;
    setGisLoadError(false);

    const renderGoogleButton = () => {
      const gis = window.google?.accounts?.id;
      const container = googleButtonRef.current;
      if (!gis || !container || cancelled) return false;

      const availableWidth = Math.min(400, Math.max(240, container.parentElement?.clientWidth || 400));
      gis.initialize({
        client_id: googleClientId,
        callback: (response) => {
          if (response.credential) {
            googleLoginMutation.mutate(
              { credential: response.credential },
              { onSuccess: () => navigate('/projects', { replace: true }) }
            );
          }
        },
      });
      container.innerHTML = '';
      gis.renderButton(container, {
        theme: 'outline',
        size: 'large',
        width: availableWidth,
        text: mode === 'register' ? 'signup_with' : 'signin_with',
        shape: 'pill',
      });
      setGisReady(true);
      setGisLoadError(false);
      setGoogleConfigWarning(false);
      return true;
    };

    if (renderGoogleButton()) {
      return () => {
        cancelled = true;
      };
    }

    const scriptId = 'greytest-google-gsi-script';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;
    const onLoad = () => {
      renderGoogleButton();
    };
    const onError = () => {
      script?.remove();
      if (!cancelled) {
        setGisLoadError(true);
        setGisReady(false);
      }
    };

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.addEventListener('load', onLoad);
      script.addEventListener('error', onError);
      document.head.appendChild(script);
    } else {
      script.addEventListener('load', onLoad);
      script.addEventListener('error', onError);
    }

    return () => {
      cancelled = true;
      script?.removeEventListener('load', onLoad);
      script?.removeEventListener('error', onError);
    };
  }, [mode, googleClientId]);

  if (localStorage.getItem('greytest.token')) {
    return <Navigate to="/projects" replace />;
  }

  // Kiểm tra Regex & độ dài trực tiếp theo thời gian thực (live realtime) khi người dùng nhập
  const emailError = validateEmailInput(email, t);
  const passwordError = validatePasswordInput(password, t);
  const fullNameError = mode === 'register' ? validateFullNameInput(fullName, t) : null;

  const otpError = validateOtpInput(otp, t);
  const resetNewPasswordError = validatePasswordInput(resetNewPassword, t);
  const resetConfirmError = !resetConfirmPassword
    ? t('Xác nhận mật khẩu mới không được để trống', 'Confirm password is required')
    : resetConfirmPassword !== resetNewPassword
      ? t('Xác nhận mật khẩu mới không khớp', 'Passwords do not match')
      : null;

  const showEmailError = (emailTouched || email.length > 0 || submitted) && Boolean(emailError);
  const showEmailValid = (emailTouched || email.length > 0) && !emailError;
  const showPasswordError =
    mode !== 'forgot' && (passwordTouched || password.length > 0 || submitted) && Boolean(passwordError);
  const showPasswordValid = mode !== 'forgot' && (passwordTouched || password.length > 0) && !passwordError;
  const showFullNameError =
    mode === 'register' && (fullNameTouched || fullName.length > 0 || submitted) && Boolean(fullNameError);
  const showFullNameValid =
    mode === 'register' && (fullNameTouched || fullName.length > 0) && !fullNameError;

  const showOtpError = (otpTouched || otp.length > 0 || otpSubmitted) && Boolean(otpError);
  const showResetNewPasswordError =
    (resetNewPasswordTouched || resetNewPassword.length > 0 || otpSubmitted) && Boolean(resetNewPasswordError);
  const showResetConfirmError =
    (resetConfirmTouched || resetConfirmPassword.length > 0 || otpSubmitted) && Boolean(resetConfirmError);

  const switchMode = (nextMode: AuthMode) => {
    navigate(AUTH_PATHS[nextMode], { replace: true });
    setSubmitted(false);
    setOtpSubmitted(false);
    setOtp('');
    setOtpTouched(false);
    setResetNewPassword('');
    setResetNewPasswordTouched(false);
    setResetConfirmPassword('');
    setResetConfirmTouched(false);
    setOtpResetSuccessMessage(null);
    setGoogleConfigWarning(false);
    if (!email) setEmailTouched(false);
    if (!password) setPasswordTouched(false);
    if (!fullName) setFullNameTouched(false);
    loginMutation.reset();
    registerMutation.reset();
    forgotPasswordMutation.reset();
    resetPasswordMutation.reset();
    googleLoginMutation.reset();
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    setEmailTouched(true);

    if (mode === 'forgot') {
      if (emailError) return;
      resetPasswordMutation.reset();
      setOtpResetSuccessMessage(null);
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

  const handleOtpResetSubmit = (event: FormEvent) => {
    event.preventDefault();
    setOtpSubmitted(true);
    setOtpTouched(true);
    setResetNewPasswordTouched(true);
    setResetConfirmTouched(true);

    if (emailError || otpError || resetNewPasswordError || resetConfirmError) {
      return;
    }

    resetPasswordMutation.mutate(
      {
        email: email.trim(),
        otp: otp.trim(),
        newPassword: resetNewPassword,
        confirmPassword: resetConfirmPassword,
      },
      {
        onSuccess: (res) => {
          setOtpResetSuccessMessage(
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

  const handleFallbackGoogleClick = () => {
    if (!googleClientId || gisLoadError) {
      setGoogleConfigWarning(true);
      return;
    }
    setGoogleConfigWarning(false);
  };

  const handleGithubClick = () => {
    const config = githubConfigQuery.data;
    if (!config?.enabled || !config.clientId) {
      alert(t('Chức năng đăng nhập GitHub chưa được cấu hình Client ID / Secret trên Backend.', 'GitHub sign-in is not configured on Backend.'));
      return;
    }
    buildGithubAuthorizeUrl(config, '/projects')
      .then((url) => { window.location.href = url; })
      .catch(() => alert(t('Không khởi tạo được phiên đăng nhập GitHub, vui lòng thử lại.', 'Could not start GitHub sign-in, please try again.')));
  };

  const isForgotOtpStep = mode === 'forgot' && Boolean(forgotPasswordMutation.data);

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center bg-neutral-primary px-4 py-10 text-body">
      <section className="relative w-full max-w-md rounded-base border border-border-default bg-neutral-primary-soft p-6 animate-fade-in-up">
        <div className="mb-6 flex items-start gap-3">
          <BrandMark size={40} decorative />
          <div>
            <h1 className="font-semibold text-heading text-[28px] font-display">GreyTest</h1>
            <p className="text-xs text-body-subtle">
              {mode === 'forgot'
                ? t(
                    'Nhập email đã đăng ký để nhận mã OTP 6 chữ số qua Gmail.',
                    'Enter your registered email to receive a 6-digit OTP via Gmail.'
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

        <div className="mb-5 grid grid-cols-2 gap-1 rounded-base border border-border-default bg-neutral-secondary-medium p-1">
          <button
            type="button"
            aria-pressed={mode === 'login'}
            onClick={() => switchMode('login')}
            className={`rounded-control px-3 py-2 text-sm font-semibold transition-colors duration-200 ${mode === 'login' ? 'bg-neutral-primary-soft text-heading ring-1 ring-border-default' : 'text-body-subtle hover:text-heading'}`}
          >
            {t('Đăng nhập', 'Sign in')}
          </button>
          <button
            type="button"
            aria-pressed={mode === 'register'}
            onClick={() => switchMode('register')}
            className={`rounded-control px-3 py-2 text-sm font-semibold transition-colors duration-200 ${mode === 'register' ? 'bg-neutral-primary-soft text-heading ring-1 ring-border-default' : 'text-body-subtle hover:text-heading'}`}
          >
            {t('Đăng ký', 'Register')}
          </button>
        </div>

        {wasDisabled && !error && (
          <div role="alert" className="mb-4 flex items-center gap-2.5 rounded-base border border-border-danger-subtle bg-danger-soft p-3 text-sm font-medium text-fg-danger-strong animate-fade-in">
            <ShieldAlert size={18} className="shrink-0" />
            <span>{t('Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên.', 'Your account has been disabled. Please contact an administrator.')}</span>
          </div>
        )}

        {mode === 'forgot' && otpResetSuccessMessage ? (
          <div className="space-y-4" data-testid="otp-reset-success">
            <div
              role="status"
              className="flex items-start gap-2.5 rounded-base border border-border-success-subtle bg-success-soft p-3.5 text-sm font-medium text-fg-success-strong dark:text-fg-success-strong"
            >
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
              <span>{otpResetSuccessMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="btn btn-brand w-full justify-center"
            >
              <LogIn size={15} />
              {t('Đăng nhập ngay', 'Sign in now')}
            </button>
          </div>
        ) : isForgotOtpStep && forgotPasswordMutation.data ? (
          <form onSubmit={handleOtpResetSubmit} noValidate className="space-y-4">
            <div
              role="status"
              data-testid="forgot-password-success"
              className="space-y-2 rounded-base border border-border-success-subtle bg-success-soft p-3.5 text-xs text-fg-success-strong dark:text-fg-success-strong animate-fade-in"
            >
              <div className="flex items-start gap-2 font-medium">
                <MailCheck size={16} className="mt-0.5 shrink-0" />
                <span>{forgotPasswordMutation.data.message}</span>
              </div>
              {forgotPasswordMutation.data.devOtp && (
                <div
                  data-testid="forgot-password-dev-otp"
                  className="mt-2 flex items-center justify-between rounded-control border border-border-success-subtle bg-neutral-primary-soft px-3 py-2 text-heading"
                >
                  <span className="text-[11px] font-medium text-body-subtle">
                    {t('Mã OTP dự phòng (Dev):', 'Dev Fallback OTP:')}
                  </span>
                  <span className="font-mono text-base font-bold tracking-widest text-fg-brand">
                    {forgotPasswordMutation.data.devOtp}
                  </span>
                </div>
              )}
              {forgotPasswordMutation.data.resetUrl && (
                <div className="pt-1">
                  <a
                    href={forgotPasswordMutation.data.resetUrl}
                    data-testid="forgot-password-reset-link"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-fg-brand hover:underline"
                  >
                    <ExternalLink size={12} />
                    {t('Hoặc mở đường dẫn đặt lại mật khẩu', 'Or open reset password link')}
                  </a>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between rounded-control border border-border-default bg-neutral-secondary-medium px-3 py-2 text-xs">
              <span className="truncate font-medium text-heading">{email.trim()}</span>
              <button
                type="button"
                data-testid="resend-otp-button"
                disabled={isPending}
                onClick={() => {
                  resetPasswordMutation.reset();
                  forgotPasswordMutation.mutate({ email: email.trim() });
                }}
                className="ml-2 inline-flex shrink-0 items-center gap-1 font-semibold text-fg-brand hover:underline disabled:opacity-50"
              >
                <RefreshCw size={12} className={forgotPasswordMutation.isPending ? 'animate-spin' : ''} />
                {t('Gửi lại OTP', 'Resend OTP')}
              </button>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-heading">
                {t('Mã OTP (6 chữ số)', 'OTP Code (6 digits)')}
              </span>
              <input
                aria-label={t('Mã OTP', 'OTP Code')}
                data-testid="otp-input"
                aria-invalid={showOtpError}
                className={`form-input font-mono tracking-widest ${showOtpError ? 'border-border-danger' : ''}`}
                inputMode="numeric"
                maxLength={6}
                autoFocus
                placeholder="000000"
                value={otp}
                onChange={(event) => {
                  setOtp(event.target.value.replace(/\D/g, '').slice(0, 6));
                  if (!otpTouched) setOtpTouched(true);
                }}
                required
              />
              {showOtpError && (
                <p data-testid="otp-validation-error" className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-fg-danger-strong">
                  <AlertCircle size={13} className="shrink-0" />
                  <span>{otpError}</span>
                </p>
              )}
            </label>

            <label className="block">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-semibold text-heading">{t('Mật khẩu mới', 'New password')}</span>
                <span className="text-xs font-mono text-body-subtle">
                  {resetNewPassword.length}/{MAX_PASSWORD_LENGTH}
                </span>
              </div>
              <input
                aria-label={t('Mật khẩu mới', 'New password')}
                data-testid="reset-new-password-input"
                aria-invalid={showResetNewPasswordError}
                className={`form-input ${showResetNewPasswordError ? 'border-border-danger' : ''}`}
                type="password"
                autoComplete="new-password"
                maxLength={MAX_PASSWORD_LENGTH}
                placeholder={t('Từ 6–72 ký tự, không chứa khoảng trắng', '6–72 characters, no spaces')}
                value={resetNewPassword}
                onChange={(event) => {
                  setResetNewPassword(event.target.value);
                  if (!resetNewPasswordTouched) setResetNewPasswordTouched(true);
                }}
                required
              />
              {showResetNewPasswordError && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-fg-danger-strong">
                  <AlertCircle size={13} className="shrink-0" />
                  <span>{resetNewPasswordError}</span>
                </p>
              )}
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-heading">
                {t('Xác nhận mật khẩu mới', 'Confirm new password')}
              </span>
              <input
                aria-label={t('Xác nhận mật khẩu mới', 'Confirm new password')}
                data-testid="reset-confirm-password-input"
                aria-invalid={showResetConfirmError}
                className={`form-input ${showResetConfirmError ? 'border-border-danger' : ''}`}
                type="password"
                autoComplete="new-password"
                maxLength={MAX_PASSWORD_LENGTH}
                placeholder={t('Nhập lại mật khẩu mới', 'Re-enter new password')}
                value={resetConfirmPassword}
                onChange={(event) => {
                  setResetConfirmPassword(event.target.value);
                  if (!resetConfirmTouched) setResetConfirmTouched(true);
                }}
                required
              />
              {showResetConfirmError && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-fg-danger-strong">
                  <AlertCircle size={13} className="shrink-0" />
                  <span>{resetConfirmError}</span>
                </p>
              )}
            </label>

            {error && (
              <div role="alert" className="rounded-base border border-border-danger-subtle bg-danger-soft p-3 text-sm font-medium text-fg-danger-strong animate-fade-in">
                {getErrorMessage(error)}
              </div>
            )}

            <button
              type="submit"
              data-testid="verify-otp-submit"
              className="btn btn-brand w-full"
              disabled={isPending}
            >
              {resetPasswordMutation.isPending ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <KeyRound size={15} />
              )}
              {resetPasswordMutation.isPending
                ? t('Đang xác thực...', 'Verifying...')
                : t('Xác nhận OTP & Đặt lại mật khẩu', 'Verify OTP & Reset password')}
            </button>

            <button
              type="button"
              onClick={() => switchMode('login')}
              className="btn btn-ghost h-9 py-0 mt-2"
            >
              <ArrowLeft size={13} />
              {t('Quay lại đăng nhập', 'Back to sign in')}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {mode === 'register' && (
              <label className="block">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-xs font-semibold text-heading">{t('Họ tên', 'Full name')}</span>
                  <span className="text-xs font-mono text-body-subtle">
                    {fullName.trim().length}/{MAX_FULL_NAME_LENGTH}
                  </span>
                </div>
                <input
                  aria-label={t('Họ tên', 'Full name')}
                  aria-invalid={showFullNameError}
                  className={`form-input ${showFullNameError ? 'border-border-danger ' : showFullNameValid ? 'border-border-success-subtle' : ''}`}
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
                <span className="text-xs font-mono text-body-subtle">
                  {email.trim().length}/{MAX_EMAIL_LENGTH}
                </span>
              </div>
              <input
                aria-label="Email"
                aria-invalid={showEmailError}
                className={`form-input ${showEmailError ? 'border-border-danger ' : showEmailValid ? 'border-border-success-subtle' : ''}`}
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
                <p data-testid="email-validation-valid" className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-fg-success-strong dark:text-fg-success-strong">
                  <CheckCircle2 size={13} className="shrink-0" />
                  <span>{t('Định dạng Email hợp lệ', 'Valid email format')}</span>
                </p>
              )}
            </label>

            {mode !== 'forgot' && (
              <label className="block">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-xs font-semibold text-heading">{t('Mật khẩu', 'Password')}</span>
                  <span className="text-xs font-mono text-body-subtle">
                    {password.length}/{MAX_PASSWORD_LENGTH}
                  </span>
                </div>
                <input
                  aria-label={t('Mật khẩu', 'Password')}
                  aria-invalid={showPasswordError}
                  className={`form-input ${showPasswordError ? 'border-border-danger ' : showPasswordValid ? 'border-border-success-subtle' : ''}`}
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

            {error && (
              <div role="alert" className="rounded-base border border-border-danger-subtle bg-danger-soft p-3 text-sm font-medium text-fg-danger-strong animate-fade-in">
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
                    : t('Gửi mã OTP qua Gmail', 'Send OTP via Gmail')}
            </button>

            {mode !== 'forgot' && (
              <div className="space-y-3 pt-1">
                <div className="relative flex items-center py-1">
                  <div className="flex-grow border-t border-border-default" />
                  <span className="mx-3 shrink text-xs text-body-subtle">
                    {t('hoặc tiếp tục với', 'or continue with')}
                  </span>
                  <div className="flex-grow border-t border-border-default" />
                </div>

                <div
                  ref={googleButtonRef}
                  className={gisReady ? 'flex w-full justify-center' : 'hidden'}
                />

                {!gisReady && (
                  <button
                    type="button"
                    data-testid="google-login-button"
                    disabled={googleLoginMutation.isPending || googleConfigQuery.isLoading || (Boolean(googleClientId) && !gisLoadError)}
                    onClick={handleFallbackGoogleClick}
                    className="btn btn-secondary h-10 w-full disabled:opacity-50"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                      />
                    </svg>
                    <span>
                      {googleConfigQuery.isLoading || (Boolean(googleClientId) && !gisLoadError)
                        ? t('Đang tải Google Sign-In...', 'Loading Google Sign-In...')
                        : t('Đăng nhập bằng Google', 'Sign in with Google')}
                    </span>
                  </button>
                )}

                {googleConfigWarning && (
                  <div
                    role="alert"
                    data-testid="google-config-warning"
                    className="rounded-base border border-border-warning-subtle bg-warning-soft p-2.5 text-xs font-medium text-fg-warning"
                  >
                    {gisLoadError
                      ? t(
                          'Không thể tải script đăng nhập Google. Vui lòng tắt trình chặn quảng cáo hoặc thử lại.',
                          'Could not load Google Sign-In script. Please disable ad-blockers or try again.'
                        )
                      : t(
                          'Chức năng Đăng nhập Google cần cấu hình GOOGLE_CLIENT_ID trong file .env của Backend.',
                          'Google Sign-In requires GOOGLE_CLIENT_ID configured in backend .env.'
                        )}
                  </div>
                )}

                <button
                  type="button"
                  data-testid="github-login-button"
                  onClick={handleGithubClick}
                  className="btn btn-secondary h-10 w-full"
                >
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                  <span>{t('Đăng nhập với GitHub', 'Sign in with GitHub')}</span>
                </button>
              </div>
            )}

            {mode === 'forgot' ? (
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="btn btn-ghost h-9 py-0 mt-3"
              >
                <ArrowLeft size={13} />
                {t('Quay lại đăng nhập', 'Back to sign in')}
              </button>
            ) : (
              <button
                type="button"
                data-testid="forgot-password-trigger"
                onClick={() => switchMode('forgot')}
                className="rounded-control mx-auto mt-2 flex w-fit items-center justify-center px-3 py-1 text-xs font-semibold text-fg-brand hover:underline"
              >
                {t('Quên mật khẩu?', 'Forgot password?')}
              </button>
            )}
          </form>
        )}
      </section>
    </div>
  );
}
