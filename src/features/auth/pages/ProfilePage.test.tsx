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

const changePasswordMutationMock = vi.hoisted(() => ({
  isPending: false,
  isError: false,
  isSuccess: false,
  error: null as any,
  reset: vi.fn(),
  mutate: vi.fn(),
}));

const updateProfileMutationMock = vi.hoisted(() => ({
  isPending: false,
  error: null as any,
  reset: vi.fn(),
  mutate: vi.fn(),
}));

vi.mock('../hooks/useAuth', () => ({
  useCurrentUser: vi.fn(),
  useUserQuota: vi.fn(),
  useLogout: vi.fn(() => vi.fn()),
  useCancelSubscription: vi.fn(() => ({ isPending: false, isError: false, isSuccess: false, reset: vi.fn(), mutate: vi.fn() })),
  useChangePassword: vi.fn(() => changePasswordMutationMock),
  useUpdateProfile: vi.fn(() => updateProfileMutationMock),
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
    expect(screen.getByText('10.000đ')).toBeInTheDocument();
    expect(screen.getByText('20.000đ')).toBeInTheDocument();
    expect(screen.getByText('Sinh tối đa 2 batch đồng thời')).toBeInTheDocument();
    expect(screen.getByText('Sinh tối đa 3 batch đồng thời')).toBeInTheDocument();
    expect(screen.getByText('Sinh tối đa 4 batch đồng thời')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Lịch sử thanh toán/i })).toBeInTheDocument();
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

  it('hides deactivated tier packages when admin pauses them', () => {
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
        used: 20,
        remaining: 80,
      },
      isLoading: false,
    } as any);

    // Seed query cache with only FREE and PRO (PLUS is deactivated by admin)
    queryClient.setQueryData(['public-tier-packages'], [
      { code: 'FREE', name: 'Gói Miễn Phí (FREE)', price: 0, cycle: 'MONTHLY', quotaLimit: 100, batchConcurrency: 2, features: [], description: '', active: true },
      { code: 'PRO', name: 'Gói Chuyên Nghiệp (PRO)', price: 20000, cycle: 'MONTHLY', quotaLimit: 300, batchConcurrency: 4, features: [], description: '', active: true },
    ]);

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

    // FREE and PRO should be present
    expect(screen.getByText(/Gói Miễn Phí/i)).toBeInTheDocument();
    expect(screen.getByText(/Gói Chuyên Nghiệp/i)).toBeInTheDocument();

    // PLUS was deactivated/paused by Admin -> MUST NOT be in the document
    expect(screen.queryByText(/Gói Tiêu Chuẩn/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Nâng cấp PLUS/i)).not.toBeInTheDocument();
  });

  it('keeps current FREE package visible when FREE is paused by admin', () => {
    vi.mocked(authHooks.useCurrentUser).mockReturnValue({
      data: {
        id: 1,
        email: 'admin@gmail.com',
        fullName: 'GreyTest Administrator',
        role: 'ADMIN',
        tier: 'FREE',
      },
      isLoading: false,
    } as any);

    vi.mocked(authHooks.useUserQuota).mockReturnValue({
      data: {
        tier: 'FREE',
        limit: 50,
        used: 0,
        remaining: 50,
      },
      isLoading: false,
    } as any);

    // Only PLUS and PRO are active in public packages (FREE is paused by admin)
    queryClient.setQueryData(['public-tier-packages'], [
      { code: 'PLUS', name: 'Gói Tiêu Chuẩn (PLUS)', price: 10000, cycle: 'WEEKLY', quotaLimit: 200, batchConcurrency: 3, features: [], description: '', active: true },
      { code: 'PRO', name: 'Gói Chuyên Nghiệp (PRO)', price: 20000, cycle: 'MONTHLY', quotaLimit: 300, batchConcurrency: 4, features: [], description: '', active: true },
    ]);

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

    // FREE MUST STILL BE VISIBLE because the user is currently on FREE tier!
    expect(screen.getByText(/GÓI MIỄN PHÍ/i)).toBeInTheDocument();
    expect(screen.getByText('Gói hiện tại')).toBeInTheDocument();
    expect(screen.getByText(/Đang sử dụng/i)).toBeInTheDocument();
    expect(screen.getByText(/Đang tạm dừng áp dụng cho người dùng mới/i)).toBeInTheDocument();

    // The other active packages must also be visible
    expect(screen.getByText(/Gói Tiêu Chuẩn/i)).toBeInTheDocument();
    expect(screen.getByText(/Gói Chuyên Nghiệp/i)).toBeInTheDocument();
  });

  it('keeps current PLUS package visible and disables renewal when PLUS is paused by admin', () => {
    vi.mocked(authHooks.useCurrentUser).mockReturnValue({
      data: {
        id: 2,
        email: 'plus_user@example.com',
        fullName: 'Plus Member',
        role: 'USER',
        tier: 'PLUS',
      },
      isLoading: false,
    } as any);

    vi.mocked(authHooks.useUserQuota).mockReturnValue({
      data: {
        tier: 'PLUS',
        limit: 200,
        used: 50,
        remaining: 150,
      },
      isLoading: false,
    } as any);

    // Only FREE and PRO are active in public packages (PLUS is paused by admin)
    queryClient.setQueryData(['public-tier-packages'], [
      { code: 'FREE', name: 'Gói Miễn Phí (FREE)', price: 0, cycle: 'MONTHLY', quotaLimit: 100, batchConcurrency: 2, features: [], description: '', active: true },
      { code: 'PRO', name: 'Gói Chuyên Nghiệp (PRO)', price: 20000, cycle: 'MONTHLY', quotaLimit: 300, batchConcurrency: 4, features: [], description: '', active: true },
    ]);

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

    // PLUS MUST STILL BE VISIBLE for the PLUS user!
    expect(screen.getByText(/Gói Tiêu Chuẩn \(PLUS\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Gói PLUS đang hoạt động/i)).toBeInTheDocument();
    expect(screen.getByText(/Gói này đang tạm dừng đăng ký mới\/gia hạn/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Gia hạn thêm gói PLUS/i })).not.toBeInTheDocument();
  });

  it('keeps current PRO package visible and disables renewal when PRO is paused by admin', () => {
    vi.mocked(authHooks.useCurrentUser).mockReturnValue({
      data: {
        id: 3,
        email: 'pro-user@example.com',
        fullName: 'Pro User',
        role: 'USER',
        tier: 'PRO',
      },
      isLoading: false,
    } as any);

    vi.mocked(authHooks.useUserQuota).mockReturnValue({
      data: {
        tier: 'PRO',
        limit: 300,
        used: 12,
        remaining: 288,
      },
      isLoading: false,
    } as any);

    // Only FREE and PLUS are active in public packages (PRO is paused by admin)
    queryClient.setQueryData(['public-tier-packages'], [
      { code: 'FREE', name: 'Gói Miễn Phí (FREE)', price: 0, cycle: 'MONTHLY', quotaLimit: 100, batchConcurrency: 2, features: [], description: '', active: true },
      { code: 'PLUS', name: 'Gói Tiêu Chuẩn (PLUS)', price: 10000, cycle: 'WEEKLY', quotaLimit: 200, batchConcurrency: 3, features: [], description: '', active: true },
    ]);

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

    // PRO MUST STILL BE VISIBLE for the PRO user!
    expect(screen.getByText(/Gói Chuyên Nghiệp \(PRO\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Gói PRO cao cấp nhất đang hoạt động/i)).toBeInTheDocument();
    expect(screen.getByText(/Gói này đang tạm dừng đăng ký mới\/gia hạn/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Gia hạn thêm gói PRO/i })).not.toBeInTheDocument();
  });

  it('allows user to open change password form, validates live regex, and submits new password', () => {
    vi.mocked(authHooks.useCurrentUser).mockReturnValue({
      data: {
        id: 1,
        email: 'user@gmail.com',
        fullName: 'Nguyen Van A',
        role: 'USER',
        tier: 'FREE',
      },
      isLoading: false,
    } as any);

    vi.mocked(authHooks.useUserQuota).mockReturnValue({
      data: {
        tier: 'FREE',
        limit: 100,
        used: 10,
        remaining: 90,
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

    fireEvent.click(screen.getByTestId('toggle-change-password-btn'));
    expect(screen.getByTestId('change-password-form')).toBeInTheDocument();

    const currentPwdInput = screen.getByLabelText('Mật khẩu hiện tại');
    const newPwdInput = screen.getByLabelText('Mật khẩu mới');
    const confirmPwdInput = screen.getByLabelText('Xác nhận mật khẩu mới');

    fireEvent.change(currentPwdInput, { target: { value: 'OldPass123' } });
    fireEvent.change(newPwdInput, { target: { value: 'bad pass' } });
    expect(screen.getByTestId('new-password-error')).toHaveTextContent(/không được chứa khoảng trắng/i);

    fireEvent.change(newPwdInput, { target: { value: 'NewPass456' } });
    fireEvent.change(confirmPwdInput, { target: { value: 'Mismatch456' } });
    expect(screen.getByTestId('confirm-password-error')).toHaveTextContent(/không khớp/i);

    fireEvent.change(confirmPwdInput, { target: { value: 'NewPass456' } });
    fireEvent.submit(screen.getByTestId('change-password-form'));

    expect(changePasswordMutationMock.mutate).toHaveBeenCalledWith(
      {
        currentPassword: 'OldPass123',
        newPassword: 'NewPass456',
        confirmPassword: 'NewPass456',
      },
      expect.any(Object)
    );
  });

  it('allows editing user full name and saves changes via useUpdateProfile', () => {
    vi.mocked(authHooks.useCurrentUser).mockReturnValue({
      data: {
        id: 1,
        email: 'khaitien600@gmail.com',
        fullName: 'Khai Tien Nguyen',
        role: 'USER',
        tier: 'PRO',
      },
      isLoading: false,
    } as any);

    vi.mocked(authHooks.useUserQuota).mockReturnValue({
      data: {
        tier: 'PRO',
        limit: 300,
        used: 10,
        remaining: 290,
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

    const nameInput = screen.getByLabelText('Họ và tên');
    expect(nameInput).toHaveValue('Khai Tien Nguyen');

    // Chỉnh sửa họ tên
    fireEvent.change(nameInput, { target: { value: 'Nguyen Van Khai Tien' } });
    expect(nameInput).toHaveValue('Nguyen Van Khai Tien');

    const saveBtn = screen.getByTestId('save-profile-btn');
    expect(saveBtn).not.toBeDisabled();

    fireEvent.click(saveBtn);
    expect(updateProfileMutationMock.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ fullName: 'Nguyen Van Khai Tien' }),
      expect.any(Object)
    );
  });

  it('allows editing additional profile fields (phone, gender, dateOfBirth) and saves changes', () => {
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

    const phoneInput = screen.getByLabelText('Số điện thoại');
    const genderSelect = screen.getByLabelText('Giới tính');
    const dobInput = screen.getByLabelText('Ngày sinh');

    fireEvent.change(phoneInput, { target: { value: '0912345678' } });
    fireEvent.change(genderSelect, { target: { value: 'MALE' } });
    fireEvent.change(dobInput, { target: { value: '2002-05-15' } });

    const saveBtn = screen.getByTestId('save-profile-btn');
    expect(saveBtn).not.toBeDisabled();

    fireEvent.click(saveBtn);
    expect(updateProfileMutationMock.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: 'Khai Tien Nguyen',
        phoneNumber: '0912345678',
        gender: 'MALE',
        dateOfBirth: '2002-05-15',
      }),
      expect.any(Object)
    );
  });
});
