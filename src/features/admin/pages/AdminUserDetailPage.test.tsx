// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminUserDetailPage } from './AdminUserDetailPage';
import { LanguageProvider } from '../../../shared/i18n/language';
import { ThemeProvider } from '../../../shared/theme/theme';

const mockTierMutate = vi.fn();
const mockQuotaMutate = vi.fn();
const mockResetMutate = vi.fn();
const mockStatusMutate = vi.fn();
const mockUpdateMutate = vi.fn();

const mockUserDetail = {
  user: {
    id: 10,
    email: 'developer@greytest.dev',
    fullName: 'Dev Lead',
    role: 'USER' as const,
    tier: 'PLUS' as const,
    enabled: true,
    createdAt: '2026-08-01T00:00:00Z',
    totalGenerationRequests: 85,
    lastActivityAt: '2026-10-27T22:21:27Z',
    quota: {
      limit: 10000,
      used: 0,
      remaining: 10000,
      periodStart: '2026-11-01',
      resetDate: '2026-12-03',
      exceeded: false,
    },
  },
  projects: [
    { id: 1, name: 'PaymentService', status: 'ACTIVE' },
  ],
  generatedUnitTests: 120,
  recentActivities: [
    {
      id: 1,
      actionType: 'GENERATE_TEST_PLAN',
      createdAt: '2026-10-27T22:21:27Z',
      projectId: 1,
      metadata: { items: 5 },
    },
  ],
  lastLoginAt: '2026-11-07T12:00:00Z',
  loginHistory: [
    {
      id: 101,
      timestamp: '2026-11-07T12:00:00Z',
      ip: '192.168.1.50',
      userAgent: 'Mozilla/5.0 Chrome/120',
      portal: 'WEB',
      status: 'SUCCESS',
      device: 'Windows (Chrome)',
    },
  ],
};

let currentUserDetail = mockUserDetail;

vi.mock('../../auth/hooks/useAuth', () => ({
  useCurrentUser: () => ({ data: { id: 1, email: 'admin@greytest.dev', fullName: 'Admin', role: 'ADMIN' } }),
  useLogout: () => vi.fn(),
}));

vi.mock('../hooks/useAdmin', () => ({
  useAdminUser: () => ({
    data: currentUserDetail,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useAdminUserMutations: () => ({
    tier: { mutate: mockTierMutate, isPending: false, error: null },
    quota: { mutate: mockQuotaMutate, isPending: false, error: null },
    resetQuota: { mutate: mockResetMutate, isPending: false, error: null },
    status: { mutate: mockStatusMutate, isPending: false, error: null },
    update: { mutate: mockUpdateMutate, isPending: false, error: null },
  }),
  useServiceHealth: () => ({ data: { application: 'UP' }, isFetching: false }),
}));

afterEach(() => {
  cleanup();
  currentUserDetail = mockUserDetail;
  vi.clearAllMocks();
});

describe('AdminUserDetailPage', () => {
  it('renders complete user profile metrics pushed from user list', () => {
    render(
      <MemoryRouter initialEntries={['/admin/users/10']}>
        <ThemeProvider>
          <LanguageProvider>
            <Routes>
              <Route path="/admin/users/:id" element={<AdminUserDetailPage />} />
            </Routes>
          </LanguageProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText('Dev Lead')).toBeInTheDocument();
    expect(screen.getByText('developer@greytest.dev')).toBeInTheDocument();
    expect(screen.getByText('Gói PLUS')).toBeInTheDocument();
    expect(screen.getByText('85')).toBeInTheDocument(); // Tổng lượt sinh test
    expect(screen.getByText('120')).toBeInTheDocument(); // Unit test đã sinh
    expect(screen.getByText(/\/10000 lượt/)).toBeInTheDocument();
    expect(screen.getByText('PaymentService')).toBeInTheDocument();
    expect(screen.getByText('Lịch Sử Đăng Nhập')).toBeInTheDocument();
    expect(screen.getByText('192.168.1.50')).toBeInTheDocument();
    expect(screen.getByText('Windows (Chrome)')).toBeInTheDocument();
  });

  it('opens tier modal and updates user subscription tier', () => {
    render(
      <MemoryRouter initialEntries={['/admin/users/10']}>
        <ThemeProvider>
          <LanguageProvider>
            <Routes>
              <Route path="/admin/users/:id" element={<AdminUserDetailPage />} />
            </Routes>
          </LanguageProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByTitle('Nhấn để nâng cấp hoặc đổi gói Tier'));
    expect(screen.getByText('Cập Nhật Gói Tier Dịch Vụ')).toBeInTheDocument();

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'PRO' } });

    fireEvent.click(screen.getByRole('button', { name: 'Lưu gói Tier' }));
    expect(screen.getByText('Xác nhận thay đổi gói Tier?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận đổi gói' }));
    expect(mockTierMutate).toHaveBeenCalledWith(
      { id: 10, tier: 'PRO' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('opens quota modal and saves adjusted monthly limit', () => {
    render(
      <MemoryRouter initialEntries={['/admin/users/10']}>
        <ThemeProvider>
          <LanguageProvider>
            <Routes>
              <Route path="/admin/users/:id" element={<AdminUserDetailPage />} />
            </Routes>
          </LanguageProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByTitle('Chỉnh sửa hạn mức quota'));
    expect(screen.getByText('Điều Chỉnh Hạn Mức Quota')).toBeInTheDocument();

    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '25000' } });

    fireEvent.click(screen.getByRole('button', { name: 'Lưu hạn mức' }));
    expect(screen.getByText('Xác nhận điều chỉnh hạn mức Quota?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận lưu' }));
    expect(mockQuotaMutate).toHaveBeenCalledWith(
      { id: 10, limit: 25000 },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('confirms and resets user quota used counter', () => {
    render(
      <MemoryRouter initialEntries={['/admin/users/10']}>
        <ThemeProvider>
          <LanguageProvider>
            <Routes>
              <Route path="/admin/users/:id" element={<AdminUserDetailPage />} />
            </Routes>
          </LanguageProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByTitle('Đặt lại số lượt gọi về 0'));
    expect(screen.getByText('Đặt lại số lượt gọi đã dùng?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Đặt lại về 0' }));
    expect(mockResetMutate).toHaveBeenCalledWith(
      10,
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('opens lock modal, enters reason, and submits lock request', () => {
    render(
      <MemoryRouter initialEntries={['/admin/users/10']}>
        <ThemeProvider>
          <LanguageProvider>
            <Routes>
              <Route path="/admin/users/:id" element={<AdminUserDetailPage />} />
            </Routes>
          </LanguageProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByTitle('Nhấn để khóa tài khoản'));
    expect(screen.getByText('Khóa tài khoản người dùng?')).toBeInTheDocument();

    const reasonInput = screen.getByPlaceholderText('Nhập lý do khóa tài khoản...');
    fireEvent.change(reasonInput, { target: { value: 'Vi phạm chính sách bảo mật' } });

    fireEvent.click(screen.getByRole('button', { name: 'Khóa tài khoản' }));
    expect(mockStatusMutate).toHaveBeenCalledWith(
      { id: 10, enabled: false, reason: 'Vi phạm chính sách bảo mật' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('opens edit modal and updates user details', () => {
    render(
      <MemoryRouter initialEntries={['/admin/users/10']}>
        <ThemeProvider>
          <LanguageProvider>
            <Routes>
              <Route path="/admin/users/:id" element={<AdminUserDetailPage />} />
            </Routes>
          </LanguageProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Chỉnh sửa/i }));
    expect(screen.getByText('Chỉnh Sửa Tài Khoản')).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText('Cập nhật họ tên...');
    fireEvent.change(nameInput, { target: { value: 'Dev Lead Senior' } });

    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(screen.getByText('Xác nhận lưu thay đổi tài khoản?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận lưu' }));
    expect(mockUpdateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 10,
        data: expect.objectContaining({
          fullName: 'Dev Lead Senior',
        }),
      }),
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('disables lock/unlock button when viewing self profile', () => {
    // Override user id to 1 so isSelf = true
    currentUserDetail = {
      ...mockUserDetail,
      user: { ...mockUserDetail.user, id: 1 },
    };
    render(
      <MemoryRouter initialEntries={['/admin/users/1']}>
        <ThemeProvider>
          <LanguageProvider>
            <Routes>
              <Route path="/admin/users/:id" element={<AdminUserDetailPage />} />
            </Routes>
          </LanguageProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    const lockBtn = screen.getByTitle('Không thể tự khóa tài khoản của chính mình');
    expect(lockBtn).toBeInTheDocument();
    expect(lockBtn).toBeDisabled();
  });
});
