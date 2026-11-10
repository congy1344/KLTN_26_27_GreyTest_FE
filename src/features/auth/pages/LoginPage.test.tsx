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

vi.mock('../hooks/useAuth', () => ({
  useLogin: () => loginMutationMock,
  useRegister: () => registerMutationMock,
  useForgotPassword: () => forgotPasswordMutationMock,
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
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('strips /login suffix and normalizes user sign-in URL to root /', () => {
    renderLoginPage(['/login?disabled=true']);

    expect(screen.getByTestId('current-pathname')).toHaveTextContent('/');
    expect(
      screen.getByText(/Tài khoản của bạn đã bị vô hiệu hóa\. Vui lòng liên hệ quản trị viên\./i)
    ).toBeInTheDocument();
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
});
