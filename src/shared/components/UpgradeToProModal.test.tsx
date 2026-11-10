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

    // Verify unnecessary helper texts and Sandbox text are removed
    expect(screen.queryByText(/Mỗi batch xử lý một nhóm dữ liệu/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Sandbox/i)).not.toBeInTheDocument();
    expect(screen.getByText('(Cổng thanh toán VNPay)')).toBeInTheDocument();
    expect(screen.getByText('20.000 VNĐ')).toHaveClass('whitespace-nowrap');

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

  it('hides PLUS card and auto-selects PRO when PLUS is paused by admin', () => {
    queryClient.setQueryData(['public-tier-packages'], [
      { code: 'PRO', name: 'Gói Chuyên Nghiệp (PRO)', price: 20000, cycle: 'MONTHLY', quotaLimit: 300, batchConcurrency: 4, features: [], description: '', active: true },
    ]);

    render(
      <QueryClientProvider client={queryClient}>
        <UpgradeToProModal open={true} defaultTier="PLUS" />
      </QueryClientProvider>
    );

    // PLUS must be hidden
    expect(screen.queryByText('Gói PLUS')).not.toBeInTheDocument();
    // PRO must be present and selected
    expect(screen.getByText('Gói PRO')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Thanh toán qua VNPay/i })).not.toBeDisabled();
  });

  it('shows maintenance alert and disables payment button when all packages are paused', () => {
    queryClient.setQueryData(['public-tier-packages'], []);

    render(
      <QueryClientProvider client={queryClient}>
        <UpgradeToProModal open={true} />
      </QueryClientProvider>
    );

    expect(screen.getByText('Các gói nâng cấp đang tạm dừng')).toBeInTheDocument();
    expect(screen.queryByText('Gói PLUS')).not.toBeInTheDocument();
    expect(screen.queryByText('Gói PRO')).not.toBeInTheDocument();

    const payBtn = screen.getByRole('button', { name: /Dịch vụ đang tạm dừng/i });
    expect(payBtn).toBeDisabled();
  });

  it('closes on Escape key press when not redirecting', () => {
    const handleClose = vi.fn();
    render(
      <QueryClientProvider client={queryClient}>
        <UpgradeToProModal open={true} onClose={handleClose} />
      </QueryClientProvider>
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
