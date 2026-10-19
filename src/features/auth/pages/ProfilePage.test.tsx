// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ProfilePage } from './ProfilePage';
import * as authHooks from '../hooks/useAuth';
import { ThemeProvider } from '../../../shared/theme/theme';
import { LanguageProvider } from '../../../shared/i18n/language';

vi.mock('../hooks/useAuth', () => ({
  useCurrentUser: vi.fn(),
  useUserQuota: vi.fn(),
  useLogout: vi.fn(() => vi.fn()),
}));

describe('ProfilePage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    queryClient = new QueryClient();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders FREE user information, quota progress, and allows opening upgrade modal', () => {
    vi.mocked(authHooks.useCurrentUser).mockReturnValue({
      data: {
        id: 1,
        email: 'chuti@example.com',
        fullName: 'Nguyen ChuTi_Store Tien',
        role: 'USER',
        tier: 'FREE',
      },
      isLoading: false,
    } as any);

    vi.mocked(authHooks.useUserQuota).mockReturnValue({
      data: {
        tier: 'FREE',
        limit: 100,
        used: 25,
        remaining: 75,
        periodStart: '2026-10-01',
        resetDate: '2026-11-01',
        exceeded: false,
      },
      isLoading: false,
    } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <LanguageProvider>
            <MemoryRouter>
              <ProfilePage />
            </MemoryRouter>
          </LanguageProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );

    // Kiểm tra thông tin người dùng
    expect(screen.getAllByText('Nguyen ChuTi_Store Tien').length).toBeGreaterThan(0);
    expect(screen.getByText('chuti@example.com')).toBeInTheDocument();
    expect(screen.getAllByText('Tài khoản FREE').length).toBeGreaterThan(0);

    // Kiểm tra thông tin Quota
    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText('25%')).toBeInTheDocument();
    expect(screen.getByText('75')).toBeInTheDocument();

    // Kiểm tra hiển thị ngày chu kỳ
    expect(screen.getByText('1/10/2026')).toBeInTheDocument();
    expect(screen.getByText('1/11/2026')).toBeInTheDocument();

    // Kiểm tra hiển thị nút Nâng cấp
    const upgradeBtns = screen.getAllByRole('button', { name: /Nâng cấp/i });
    expect(upgradeBtns.length).toBeGreaterThan(0);

    // Ban đầu chưa có tiêu đề modal trong DOM
    expect(screen.queryByText('Chọn gói mở rộng hạn mức AI')).not.toBeInTheDocument();

    // Click nút nâng cấp -> mở modal
    fireEvent.click(upgradeBtns[0]);
    expect(screen.getByText('Chọn gói mở rộng hạn mức AI')).toBeInTheDocument();
  });

  it('renders PRO user information with PRO badge and no upgrade button', () => {
    vi.mocked(authHooks.useCurrentUser).mockReturnValue({
      data: {
        id: 2,
        email: 'pro_user@example.com',
        fullName: 'Nguyen Van Pro',
        role: 'ADMIN',
        tier: 'PRO',
      },
      isLoading: false,
    } as any);

    vi.mocked(authHooks.useUserQuota).mockReturnValue({
      data: {
        tier: 'PRO',
        limit: 300,
        used: 120,
        remaining: 180,
        periodStart: '2026-10-01',
        resetDate: '2026-10-08',
        exceeded: false,
      },
      isLoading: false,
    } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <LanguageProvider>
            <MemoryRouter>
              <ProfilePage />
            </MemoryRouter>
          </LanguageProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );

    expect(screen.getAllByText('Nguyen Van Pro').length).toBeGreaterThan(0);
    expect(screen.getByText('pro_user@example.com')).toBeInTheDocument();
    expect(screen.getAllByText('Tài khoản PRO').length).toBeGreaterThan(0);
    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.getByText('180')).toBeInTheDocument();
    expect(screen.getByText('40%')).toBeInTheDocument();

    // Kiểm tra hiển thị Ngày kích hoạt và Ngày kết thúc chu kỳ cho gói PRO
    expect(screen.getAllByText('1/10/2026').length).toBeGreaterThan(0);
    expect(screen.getAllByText('8/10/2026').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Ngày kích hoạt:/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Ngày kết thúc:/i).length).toBeGreaterThan(0);

    // Đối với Pro, không có nút kêu gọi nâng cấp
    expect(screen.queryByRole('button', { name: /^Nâng cấp gói$/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Gói PRO cao cấp nhất đang hoạt động/i)).toBeInTheDocument();
  });
});
