// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminQuotasPage } from './AdminQuotasPage';
import { LanguageProvider } from '../../../shared/i18n/language';
import { ThemeProvider } from '../../../shared/theme/theme';

vi.mock('../../auth/hooks/useAuth', () => ({
  useCurrentUser: () => ({ data: { id: 1, email: 'admin@greytest.dev', fullName: 'Admin User', role: 'ADMIN' } }),
  useLogout: () => vi.fn(),
}));

const mockCreateMutate = vi.fn();
const mockUpdateMutate = vi.fn();
const mockDeleteMutate = vi.fn();

const mockTierPackages = [
  {
    code: 'FREE',
    name: 'Gói Cơ Bản (Free)',
    price: 0,
    cycle: 'MONTHLY',
    quotaLimit: 100,
    batchConcurrency: 2,
    features: ['Sinh Test Plan', 'Sinh Test Case'],
    description: 'Dành cho sinh viên và dự án thử nghiệm cơ bản',
    active: true,
    activeUsersCount: 10,
  },
  {
    code: 'PLUS',
    name: 'Gói Nâng Cao (Plus)',
    price: 99000,
    cycle: 'WEEKLY',
    quotaLimit: 200,
    batchConcurrency: 3,
    features: ['3 batch song song'],
    description: 'Dành cho nhóm phát triển mở rộng',
    active: true,
    activeUsersCount: 2,
  },
  {
    code: 'PRO',
    name: 'Gói Chuyên Nghiệp (Pro)',
    price: 299000,
    cycle: 'MONTHLY',
    quotaLimit: 300,
    batchConcurrency: 4,
    features: ['Toàn bộ tính năng phân tích sâu', 'JaCoCo Coverage Refinement'],
    description: 'Toàn bộ tính năng phân tích sâu & JaCoCo Refinement',
    active: true,
    activeUsersCount: 2,
  },
  {
    code: 'ENTERPRISE',
    name: 'Gói Tùy Chỉnh Doanh Nghiệp',
    price: 999000,
    cycle: 'MONTHLY',
    quotaLimit: 1000,
    batchConcurrency: 8,
    features: ['Cụm server riêng', 'Dedicated SLA'],
    description: 'Dành cho đối tác doanh nghiệp lớn',
    active: true,
    activeUsersCount: 1,
  },
];

vi.mock('../hooks/useAdmin', () => ({
  useAdminOverview: () => ({ data: { quotaAlerts: 1 }, isLoading: false }),
  useTopUsers: () => ({ data: [{ userId: 10, email: 'developer@greytest.dev', totalLlmCalls: 120 }], isLoading: false }),
  useTierPackages: () => ({
    data: mockTierPackages,
    isLoading: false,
  }),
  useTierPackageMutations: () => ({
    create: { mutate: mockCreateMutate, isPending: false, error: null },
    update: { mutate: mockUpdateMutate, isPending: false, error: null },
    deletePackage: { mutate: mockDeleteMutate, isPending: false, error: null },
  }),
  useServiceHealth: () => ({ data: { application: 'UP' }, isFetching: false }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('AdminQuotasPage', () => {
  it('renders quota tiers cards, top consumers, and tier packages table', () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <LanguageProvider>
            <AdminQuotasPage />
          </LanguageProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText('Quản Lý Hạn Ngạch & Gói Dịch Vụ Tier')).toBeInTheDocument();
    expect(screen.getByText('FREE TIER')).toBeInTheDocument();
    expect(screen.getByText('PLUS TIER')).toBeInTheDocument();
    expect(screen.getByText('PRO TIER')).toBeInTheDocument();
    expect(screen.getByText('Quản Lý Danh Mục Gói Dịch Vụ & Hạn Mức Tier')).toBeInTheDocument();
    expect(screen.getByText('Thêm Gói Mới')).toBeInTheDocument();
    expect(screen.getAllByText('10 tài khoản').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Quay lại Dashboard/i)).toBeInTheDocument();
  });

  it('opens tier edit modal and saves updated package configuration', () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <LanguageProvider>
            <AdminQuotasPage />
          </LanguageProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    const editButtons = screen.getAllByRole('button', { name: /Sửa/i });
    expect(editButtons.length).toBeGreaterThan(0);
    fireEvent.click(editButtons[0]);

    expect(screen.getByText('Chỉnh Sửa Gói FREE')).toBeInTheDocument();
    const quotaInput = screen.getByDisplayValue('100');
    fireEvent.change(quotaInput, { target: { value: '150' } });

    fireEvent.click(screen.getByRole('button', { name: 'Lưu Gói Dịch Vụ' }));
    expect(screen.getByText('Xác nhận lưu thay đổi gói dịch vụ?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận lưu' }));

    expect(mockUpdateMutate).toHaveBeenCalledWith(
      {
        code: 'FREE',
        data: expect.objectContaining({
          code: 'FREE',
          quotaLimit: 150,
        }),
      },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('opens create new tier modal and submits new package', () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <LanguageProvider>
            <AdminQuotasPage />
          </LanguageProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Thêm Gói Mới' }));
    expect(screen.getByText('Thêm Gói Dịch Vụ Mới')).toBeInTheDocument();

    const codeInput = screen.getByPlaceholderText('VD: VIP_ENTERPRISE');
    fireEvent.change(codeInput, { target: { value: 'VIP' } });

    const nameInput = screen.getByPlaceholderText('VD: Gói Doanh Nghiệp');
    fireEvent.change(nameInput, { target: { value: 'Gói VIP Doanh Nghiệp' } });

    fireEvent.click(screen.getByRole('button', { name: 'Lưu Gói Dịch Vụ' }));
    expect(screen.getByText('Xác nhận tạo gói dịch vụ mới?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận lưu' }));

    expect(mockCreateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'VIP',
        name: 'Gói VIP Doanh Nghiệp',
      }),
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('confirms and deletes custom tier package', () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <LanguageProvider>
            <AdminQuotasPage />
          </LanguageProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    const deleteBtns = screen.getAllByRole('button', { name: /Xóa/i });
    expect(deleteBtns.length).toBeGreaterThan(0);
    fireEvent.click(deleteBtns[deleteBtns.length - 1]);

    expect(screen.getByText('Xác nhận xóa gói dịch vụ')).toBeInTheDocument();
    const confirmBtn = screen.getByRole('button', { name: 'Xóa gói' });
    fireEvent.click(confirmBtn);

    expect(mockDeleteMutate).toHaveBeenCalledWith(
      'ENTERPRISE',
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('opens confirmation and toggles package status via status badge', () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <LanguageProvider>
            <AdminQuotasPage />
          </LanguageProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    const statusBadgeBtns = screen.getAllByRole('button', { name: /KÍCH HOẠT.*Đổi/i });
    expect(statusBadgeBtns.length).toBeGreaterThan(0);
    fireEvent.click(statusBadgeBtns[0]);

    expect(screen.getByText('Xác nhận tạm dừng gói dịch vụ')).toBeInTheDocument();
    const confirmBtn = screen.getByRole('button', { name: 'Tạm dừng gói' });
    fireEvent.click(confirmBtn);

    expect(mockUpdateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'FREE',
        data: { active: false },
      }),
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('toggles package status via the explicit pause action button', () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <LanguageProvider>
            <AdminQuotasPage />
          </LanguageProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    const pauseButtons = screen.getAllByRole('button', { name: /^Tạm dừng$/i });
    expect(pauseButtons.length).toBeGreaterThan(0);
    fireEvent.click(pauseButtons[0]);

    expect(screen.getByText('Xác nhận tạm dừng gói dịch vụ')).toBeInTheDocument();
    const confirmBtn = screen.getByRole('button', { name: 'Tạm dừng gói' });
    fireEvent.click(confirmBtn);

    expect(mockUpdateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'FREE',
        data: { active: false },
      }),
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });
});
