// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UpgradeToProModal } from './UpgradeToProModal';
import { apiClient } from '../api/api-client';

vi.mock('../api/api-client', () => ({
  apiClient: {
    post: vi.fn(),
  },
  getErrorMessage: (err: unknown) => (err instanceof Error ? err.message : 'Error'),
}));

describe('UpgradeToProModal', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('opens when quota-exceeded event is dispatched and allows selecting tier and paying via VNPay', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: {
        paymentUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?token=123',
        orderId: 'VNP_TEST_123',
        amount: 20000,
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <UpgradeToProModal />
      </QueryClientProvider>
    );

    // Initial state: modal is closed
    expect(screen.queryByText('Chọn gói mở rộng hạn mức AI')).not.toBeInTheDocument();

    // Trigger event
    act(() => {
      window.dispatchEvent(new CustomEvent('quota-exceeded'));
    });

    // Modal is now open
    expect(screen.getByText('Chọn gói mở rộng hạn mức AI')).toBeInTheDocument();
    expect(screen.getByText('Gói PLUS')).toBeInTheDocument();
    expect(screen.getByText('Gói PRO')).toBeInTheDocument();
    expect(screen.getByText('200 lượt gọi AI')).toBeInTheDocument();
    expect(screen.getByText('300 lượt gọi AI')).toBeInTheDocument();
    expect(screen.getByText('Sinh tối đa 3 batch đồng thời')).toBeInTheDocument();
    expect(screen.getByText('Sinh tối đa 4 batch đồng thời')).toBeInTheDocument();

    // Select PRO tier (default is PRO)
    const payButton = screen.getByRole('button', { name: 'Thanh toán qua VNPay (20.000 VNĐ)' });
    expect(payButton).toBeInTheDocument();

    fireEvent.click(payButton);

    expect(apiClient.post).toHaveBeenCalledWith('/payment/create-vnpay-url', {
      tier: 'PRO',
    });
  });

  it('allows selecting PLUS tier and initiating payment', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: {
        paymentUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?token=456',
        orderId: 'VNP_TEST_456',
        amount: 10000,
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <UpgradeToProModal initialTier="PLUS" />
      </QueryClientProvider>
    );

    act(() => {
      window.dispatchEvent(new CustomEvent('quota-exceeded'));
    });

    // Click PLUS tier card
    const plusOption = screen.getByText('Gói PLUS');
    fireEvent.click(plusOption);

    const payButton = screen.getByRole('button', { name: 'Thanh toán qua VNPay (10.000 VNĐ)' });
    expect(payButton).toBeInTheDocument();

    fireEvent.click(payButton);

    expect(apiClient.post).toHaveBeenCalledWith('/payment/create-vnpay-url', {
      tier: 'PLUS',
    });
  });

  it('displays clear active plan indicator when user is currently on PRO tier', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <UpgradeToProModal open={true} currentTier="PRO" />
      </QueryClientProvider>
    );

    // Kiểm tra hiển thị gói hiện tại
    expect(screen.getByText('Gói Chuyên Nghiệp (PRO)')).toBeInTheDocument();
    expect(screen.getByText('Gói thấp hơn gói PRO hiện tại')).toBeInTheDocument();
    expect(screen.getByText('Đang sử dụng')).toBeInTheDocument();
    expect(screen.getByText(/Gói hiện tại • Gia hạn thêm 1 tuần/i)).toBeInTheDocument();
  });

  it('displays clear active plan indicator when user is currently on PLUS tier', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <UpgradeToProModal open={true} currentTier="PLUS" />
      </QueryClientProvider>
    );

    // Kiểm tra hiển thị gói hiện tại
    expect(screen.getByText('Gói Tiêu Chuẩn (PLUS)')).toBeInTheDocument();
    expect(screen.getByText('Đang sử dụng')).toBeInTheDocument();
    expect(screen.getByText(/Gói hiện tại • Gia hạn thêm 1 tuần/i)).toBeInTheDocument();
  });
});
