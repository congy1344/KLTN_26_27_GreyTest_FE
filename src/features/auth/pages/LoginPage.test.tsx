// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginPage } from './LoginPage';
import { ThemeProvider } from '../../../shared/theme/theme';

const loginMutationMock = vi.hoisted(() => ({
  mutate: vi.fn(),
  reset: vi.fn(),
  isPending: false,
  error: null as any,
}));

const registerMutationMock = vi.hoisted(() => ({
  mutate: vi.fn(),
  reset: vi.fn(),
  isPending: false,
  error: null as any,
}));

const forgotPasswordMutationMock = vi.hoisted(() => ({
  mutate: vi.fn(),
  reset: vi.fn(),
  isPending: false,
  error: null as any,
  data: null as any,
}));

const resetPasswordMutationMock = vi.hoisted(() => ({
  mutate: vi.fn(),
  reset: vi.fn(),
  isPending: false,
  error: null as any,
}));

const googleLoginMutationMock = vi.hoisted(() => ({
  mutate: vi.fn(),
  reset: vi.fn(),
  isPending: false,
  error: null as any,
}));

vi.mock('../hooks/useAuth', () => ({
  useLogin: () => loginMutationMock,
  useRegister: () => registerMutationMock,
  useForgotPassword: () => forgotPasswordMutationMock,
  useResetPassword: () => resetPasswordMutationMock,
  useGoogleLogin: () => googleLoginMutationMock,
  useGoogleConfig: () => ({ data: { enabled: false, clientId: '' }, isLoading: false }),
  useGithubConfig: () => ({ data: { enabled: true, clientId: 'mock-github-client-id', redirectUri: 'http://localhost:5173/auth/callback/github' }, isLoading: false }),
}));

function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="current-pathname">{location.pathname}</div>;
}

function renderLoginPage(initialEntries: string[]) {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={initialEntries}>
        <LocationDisplay />
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<LoginPage />} />
          <Route path="/forgot-password" element={<LoginPage />} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    localStorage.clear();
    loginMutationMock.error = null;
    registerMutationMock.error = null;
    forgotPasswordMutationMock.error = null;
    forgotPasswordMutationMock.data = null;
    resetPasswordMutationMock.error = null;
    googleLoginMutationMock.error = null;
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('stays on /login now that / is the landing page', () => {
    renderLoginPage(['/login?disabled=true']);

    expect(screen.getByTestId('current-pathname')).toHaveTextContent(/^\/login$/);
    expect(
      screen.getByText(/Tài khoản của bạn đã bị vô hiệu hóa\. Vui lòng liên hệ quản trị viên\./i)
    ).toBeInTheDocument();
  });

  it('gives sign-in, sign-up and forgot-password their own URLs', () => {
    renderLoginPage(['/register']);
    expect(screen.getByRole('button', { name: 'Đăng ký', pressed: true })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập', pressed: false }));
    expect(screen.getByTestId('current-pathname')).toHaveTextContent(/^\/login$/);

    fireEvent.click(screen.getByRole('button', { name: /Quên mật khẩu/ }));
    expect(screen.getByTestId('current-pathname')).toHaveTextContent(/^\/forgot-password$/);
  });

  it('renders account disabled error returned from backend on login attempt', () => {
    loginMutationMock.error = {
      isAxiosError: true,
      response: {
        status: 403,
        data: {
          code: 'ACCOUNT_DISABLED',
          message: 'Tài khoản của bạn đã bị vô hiệu hóa',
        },
      },
    };

    renderLoginPage(['/']);

    expect(screen.getByText('Tài khoản của bạn đã bị vô hiệu hóa')).toBeInTheDocument();
  });

  it('validates email and password live in real-time using regex and blocks invalid submission', () => {
    renderLoginPage(['/']);

    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Mật khẩu');

    // 0. Mới mở trang hoặc blur khi chưa nhập thì KHÔNG được báo lỗi sớm
    expect(screen.queryByTestId('email-validation-error')).not.toBeInTheDocument();
    expect(screen.queryByTestId('password-validation-error')).not.toBeInTheDocument();
    fireEvent.blur(emailInput);
    fireEvent.blur(passwordInput);
    expect(screen.queryByTestId('email-validation-error')).not.toBeInTheDocument();
    expect(screen.queryByTestId('password-validation-error')).not.toBeInTheDocument();

    // 1. Live email regex validation khi đang nhập
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    expect(screen.getByTestId('email-validation-error')).toHaveTextContent(
      /Email không đúng định dạng/i
    );

    fireEvent.change(emailInput, { target: { value: 'student@greytest.dev' } });
    expect(screen.queryByTestId('email-validation-error')).not.toBeInTheDocument();
    expect(screen.getByTestId('email-validation-valid')).toBeInTheDocument();

    // 2. Live password regex validation (ngắn hơn 6 ký tự hoặc chứa khoảng trắng)
    fireEvent.change(passwordInput, { target: { value: '123' } });
    expect(screen.getByTestId('password-validation-error')).toHaveTextContent(
      /Mật khẩu phải từ 6 đến 72 ký tự/i
    );

    fireEvent.change(passwordInput, { target: { value: 'abc 1234' } });
    expect(screen.getByTestId('password-validation-error')).toHaveTextContent(
      /Mật khẩu không được chứa khoảng trắng/i
    );

    // Chặn gọi API khi dữ liệu chưa hợp lệ
    fireEvent.submit(emailInput.closest('form')!);
    expect(loginMutationMock.mutate).not.toHaveBeenCalled();

    // 3. Khi mật khẩu hợp lệ với regex, cho phép gửi lên Backend
    fireEvent.change(passwordInput, { target: { value: 'ValidPass123' } });
    expect(screen.queryByTestId('password-validation-error')).not.toBeInTheDocument();

    fireEvent.submit(emailInput.closest('form')!);
    expect(loginMutationMock.mutate).toHaveBeenCalledWith(
      { email: 'student@greytest.dev', password: 'ValidPass123' },
      expect.any(Object)
    );
  });

  it('switches to forgot password mode and sends password reset link to registered Gmail', () => {
    renderLoginPage(['/']);

    fireEvent.click(screen.getByTestId('forgot-password-trigger'));
    const emailInput = screen.getByLabelText('Email');

    fireEvent.change(emailInput, { target: { value: 'student@gmail.com' } });
    fireEvent.submit(emailInput.closest('form')!);

    expect(forgotPasswordMutationMock.mutate).toHaveBeenCalledWith({
      email: 'student@gmail.com',
    });
  });

  it('verifies 6-digit OTP and resets password on forgot password step 2', () => {
    const { rerender } = render(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/forgot-password']}>
          <LocationDisplay />
          <Routes>
            <Route path="/forgot-password" element={<LoginPage />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    );

    const emailInput = screen.getByLabelText('Email');
    fireEvent.change(emailInput, { target: { value: 'student@gmail.com' } });
    fireEvent.submit(emailInput.closest('form')!);
    expect(forgotPasswordMutationMock.mutate).toHaveBeenCalledWith({ email: 'student@gmail.com' });

    forgotPasswordMutationMock.data = {
      message: 'Đã gửi mã OTP 6 chữ số tới student@gmail.com',
      mailSent: false,
      devOtp: '654321',
    };

    rerender(
      <ThemeProvider>
        <MemoryRouter initialEntries={['/forgot-password']}>
          <LocationDisplay />
          <Routes>
            <Route path="/forgot-password" element={<LoginPage />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    );

    expect(screen.getByTestId('forgot-password-dev-otp')).toHaveTextContent('654321');

    fireEvent.change(screen.getByTestId('otp-input'), { target: { value: '654321' } });
    fireEvent.change(screen.getByTestId('reset-new-password-input'), { target: { value: 'NewOtpPass123' } });
    fireEvent.change(screen.getByTestId('reset-confirm-password-input'), { target: { value: 'NewOtpPass123' } });
    fireEvent.submit(screen.getByTestId('verify-otp-submit').closest('form')!);

    expect(resetPasswordMutationMock.mutate).toHaveBeenCalledWith(
      {
        email: 'student@gmail.com',
        otp: '654321',
        newPassword: 'NewOtpPass123',
        confirmPassword: 'NewOtpPass123',
      },
      expect.any(Object)
    );
  });

  it('blocks invalid OTP / mismatched confirm password and surfaces resend OTP errors on step 2', () => {
    forgotPasswordMutationMock.data = {
      message: 'Đã gửi mã OTP 6 chữ số tới student@gmail.com',
      mailSent: true,
    };
    forgotPasswordMutationMock.error = {
      isAxiosError: true,
      response: {
        status: 429,
        data: { message: 'Vui lòng đợi 60 giây trước khi yêu cầu gửi lại mã OTP' },
      },
    };

    renderLoginPage(['/forgot-password']);

    // Lỗi khi resend OTP phải được hiển thị trên UI
    expect(screen.getByRole('alert')).toHaveTextContent(/Vui lòng đợi 60 giây/i);

    // OTP chưa đủ 6 số -> chặn submit
    fireEvent.change(screen.getByTestId('otp-input'), { target: { value: '123' } });
    fireEvent.change(screen.getByTestId('reset-new-password-input'), { target: { value: 'NewOtpPass123' } });
    fireEvent.change(screen.getByTestId('reset-confirm-password-input'), { target: { value: 'DifferentPass' } });
    fireEvent.submit(screen.getByTestId('verify-otp-submit').closest('form')!);

    expect(screen.getByTestId('otp-validation-error')).toHaveTextContent(/6 chữ số/i);
    expect(resetPasswordMutationMock.mutate).not.toHaveBeenCalled();
  });

  it('renders Google sign-in button and warns when GOOGLE_CLIENT_ID is missing', () => {
    renderLoginPage(['/login']);

    const googleBtn = screen.getByTestId('google-login-button');
    expect(googleBtn).toBeInTheDocument();
    fireEvent.click(googleBtn);
    expect(screen.getByTestId('google-config-warning')).toBeInTheDocument();
  });
});
