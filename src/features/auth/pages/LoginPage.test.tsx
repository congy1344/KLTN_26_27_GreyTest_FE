// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginPage } from './LoginPage';
import { ThemeProvider } from '../../../shared/theme/theme';

const loginMutationMock = vi.hoisted(() => ({
  mutate: vi.fn(),
  isPending: false,
  error: null as any,
}));

vi.mock('../hooks/useAuth', () => ({
  useLogin: () => loginMutationMock,
  useRegister: () => ({ mutate: vi.fn(), isPending: false, error: null }),
}));

function renderLoginPage(initialEntries: string[]) {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={initialEntries}>
        <LoginPage />
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    localStorage.clear();
    loginMutationMock.error = null;
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders disabled banner when redirected with disabled=true query param', () => {
    renderLoginPage(['/login?disabled=true']);

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

    renderLoginPage(['/login']);

    expect(screen.getByText('Tài khoản của bạn đã bị vô hiệu hóa')).toBeInTheDocument();
  });
});
