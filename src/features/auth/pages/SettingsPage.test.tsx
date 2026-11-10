// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SettingsPage } from './SettingsPage';
import * as authHooks from '../hooks/useAuth';
import * as paymentApi from '../../payment/api/payment-api';
import * as feedbackApi from '../../feedback/api/user-feedback-api';
import { ThemeProvider } from '../../../shared/theme/theme';
import { LanguageProvider } from '../../../shared/i18n/language';

const cancelPlanMock = vi.hoisted(() => ({
  isPending: false,
  isError: false,
  isSuccess: false,
  reset: vi.fn(),
  mutate: vi.fn(),
}));

vi.mock('../hooks/useAuth', () => ({
  useCurrentUser: vi.fn(),
  useUserQuota: vi.fn(),
  useLogout: vi.fn(() => vi.fn()),
  useCancelSubscription: vi.fn(() => cancelPlanMock),
}));

vi.mock('../../payment/api/payment-api', () => ({
  fetchPublicTierPackages: vi.fn(),
  fetchPaymentHistory: vi.fn(() => Promise.resolve([])),
}));

vi.mock('../../feedback/api/user-feedback-api', () => ({
  fetchMyFeedbacks: vi.fn(() => Promise.resolve([])),
  submitFeedback: vi.fn(() => Promise.resolve({ id: 1 })),
}));

describe('SettingsPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
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
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders general settings with theme and language toggles, quota progress, and opens upgrade modal', async () => {
    vi.mocked(authHooks.useCurrentUser).mockReturnValue({
      data: {
        id: 1,
        email: 'khaitien@example.com',
        fullName: 'Nguyen Van Khai Tien',
        role: 'USER',
        tier: 'FREE',
      },
      isLoading: false,
    } as any);

    vi.mocked(authHooks.useUserQuota).mockReturnValue({
      data: {
        tier: 'FREE',
        limit: 100,
        used: 30,
        remaining: 70,
        periodStart: '2026-11-01',
        resetDate: '2026-11-08',
      },
      isLoading: false,
    } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <LanguageProvider>
            <MemoryRouter initialEntries={['/settings?tab=general']}>
              <SettingsPage />
            </MemoryRouter>
          </LanguageProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );

    expect(screen.getByText('Cài đặt & Gói dịch vụ')).toBeInTheDocument();
    expect(screen.getAllByText('Nguyen Van Khai Tien').length).toBeGreaterThan(0);
    expect(screen.getByText('khaitien@example.com')).toBeInTheDocument();

    // Verify theme and language setting controls exist
    expect(screen.getByTestId('theme-light-btn')).toBeInTheDocument();
    expect(screen.getByTestId('theme-dark-btn')).toBeInTheDocument();
    expect(screen.getByTestId('lang-vi-btn')).toBeInTheDocument();
    expect(screen.getByTestId('lang-en-btn')).toBeInTheDocument();

    // Verify upgrade button exists and opens upgrade modal
    const upgradeProBtn = screen.getByRole('button', { name: /Nâng cấp gói/i });
    expect(upgradeProBtn).toBeInTheDocument();
    fireEvent.click(upgradeProBtn);

    // Modal dialog should open
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('renders subscription tab with packages and allows paid user to cancel plan in payment history section', async () => {
    vi.mocked(authHooks.useCurrentUser).mockReturnValue({
      data: {
        id: 1,
        email: 'khaitien@example.com',
        fullName: 'Nguyen Van Khai Tien',
        role: 'USER',
        tier: 'PRO',
      },
      isLoading: false,
    } as any);

    vi.mocked(authHooks.useUserQuota).mockReturnValue({
      data: {
        tier: 'PRO',
        limit: 300,
        used: 50,
        remaining: 250,
      },
      isLoading: false,
    } as any);

    vi.mocked(paymentApi.fetchPublicTierPackages).mockResolvedValue([
      {
        code: 'FREE',
        name: 'Gói Miễn phí',
        price: 0,
        cycle: 'MONTHLY',
        quotaLimit: 100,
        batchConcurrency: 1,
        features: ['100 lượt gọi AI'],
        description: 'Dành cho sinh viên',
        active: true,
      },
      {
        code: 'PLUS',
        name: 'Gói Tiêu chuẩn (PLUS)',
        price: 10000,
        cycle: 'WEEKLY',
        quotaLimit: 200,
        batchConcurrency: 2,
        features: ['200 lượt gọi AI / tuần'],
        description: 'Dành cho nhóm phát triển',
        active: true,
      },
      {
        code: 'PRO',
        name: 'Gói Chuyên nghiệp (PRO)',
        price: 20000,
        cycle: 'WEEKLY',
        quotaLimit: 300,
        batchConcurrency: 4,
        features: ['300 lượt gọi AI / tuần'],
        description: 'Toàn bộ tính năng phân tích sâu',
        active: true,
      },
    ]);

    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <LanguageProvider>
            <MemoryRouter initialEntries={['/settings?tab=subscription']}>
              <SettingsPage />
            </MemoryRouter>
          </LanguageProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );

    expect(screen.getByText('Các gói dịch vụ GreyTest')).toBeInTheDocument();
    expect(screen.getByText('Lịch sử thanh toán & Hóa đơn')).toBeInTheDocument();

    const cancelBtn = screen.getByRole('button', { name: 'Hủy gói' });
    expect(cancelBtn).toBeInTheDocument();
    fireEvent.click(cancelBtn);

    // Confirmation dialog opens
    expect(screen.getByText('Xác nhận hủy gói dịch vụ?')).toBeInTheDocument();
    const confirmBtn = screen.getByRole('button', { name: 'Xác nhận hủy' });
    fireEvent.click(confirmBtn);

    expect(cancelPlanMock.mutate).toHaveBeenCalled();
  });

  it('renders feedback tab and allows submitting user feedback to admin', async () => {
    vi.mocked(authHooks.useCurrentUser).mockReturnValue({
      data: {
        id: 1,
        email: 'khaitien@example.com',
        fullName: 'Nguyen Van Khai Tien',
        role: 'USER',
        tier: 'PRO',
      },
      isLoading: false,
    } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <LanguageProvider>
            <MemoryRouter initialEntries={['/settings?tab=feedback']}>
              <SettingsPage />
            </MemoryRouter>
          </LanguageProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );

    expect(screen.getByText('Gửi phản hồi cho Quản trị viên')).toBeInTheDocument();
    expect(screen.getByText('Lịch sử phản hồi đã gửi')).toBeInTheDocument();

    // Fill form and submit
    fireEvent.change(screen.getByTestId('feedback-title-input'), {
      target: { value: 'Lỗi sinh Test Case cho Service' },
    });
    fireEvent.change(screen.getByTestId('feedback-content-input'), {
      target: { value: 'Khi chọn batch 2 thì hệ thống bị timeout' },
    });

    const submitBtn = screen.getByTestId('submit-feedback-btn');
    expect(submitBtn).not.toBeDisabled();
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(feedbackApi.submitFeedback).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Lỗi sinh Test Case cho Service',
          content: 'Khi chọn batch 2 thì hệ thống bị timeout',
        })
      );
    });
  });
});
