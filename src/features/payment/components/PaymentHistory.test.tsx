// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../../../shared/i18n/language';
import { fetchPaymentHistory, type PaymentTransactionDto } from '../api/payment-api';
import { PaymentHistory } from './PaymentHistory';

vi.mock('../api/payment-api', () => ({ fetchPaymentHistory: vi.fn() }));

const transaction: PaymentTransactionDto = {
  id: 1, userId: 42, orderId: 'GT_PAID', tier: 'PRO', amount: 20000,
  status: 'SUCCESS', vnpBankCode: 'NCB', vnpTransactionNo: '123456', createdAt: '2026-10-24T00:30:00',
};

describe('PaymentHistory', () => {
  let client: QueryClient;
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.setItem('greytest.token', 'session');
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });
  afterEach(() => { cleanup(); client.clear(); localStorage.clear(); });

  function showHistory(userId = 42) {
    return render(<QueryClientProvider client={client}><LanguageProvider>
      <PaymentHistory userId={userId} />
    </LanguageProvider></QueryClientProvider>);
  }

  it('shows loading until history arrives', () => {
    vi.mocked(fetchPaymentHistory).mockReturnValue(new Promise(() => {}));
    showHistory();
    expect(screen.getByText('Đang tải lịch sử thanh toán...')).toBeInTheDocument();
  });

  it('shows an empty state', async () => {
    vi.mocked(fetchPaymentHistory).mockResolvedValue([]);
    showHistory();
    expect(await screen.findByText('Chưa có giao dịch có kết quả thanh toán.')).toBeInTheDocument();
  });

  it('shows persisted amounts for successful and failed transactions while hiding pending ones', async () => {
    vi.mocked(fetchPaymentHistory).mockResolvedValue([
      transaction,
      { ...transaction, id: 2, orderId: 'GT_OLD', amount: 1000, tier: 'PLUS', status: 'FAILED' },
      { ...transaction, id: 3, orderId: 'GT_WAIT', status: 'PENDING', vnpBankCode: undefined },
    ]);
    showHistory();
    const paidRow = (await screen.findByText('GT_PAID')).closest('tr')!;
    expect(within(paidRow).getByText(/20\.000/)).toBeInTheDocument();
    expect(within(paidRow).getByText('Thành công')).toBeInTheDocument();
    expect(within(paidRow).getByText('NCB')).toBeInTheDocument();
    expect(within(paidRow).getByText('24/10/2026')).toBeInTheDocument();
    const oldRow = screen.getByText('GT_OLD').closest('tr')!;
    expect(within(oldRow).getByText(/1\.000/)).toBeInTheDocument();
    expect(within(oldRow).getByText('Không thành công')).toBeInTheDocument();
    expect(screen.queryByText('GT_WAIT')).not.toBeInTheDocument();
    expect(screen.queryByText(/Chờ xác nhận/)).not.toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(3);
  });

  it('allows retrying a failed request', async () => {
    vi.mocked(fetchPaymentHistory).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([]);
    showHistory();
    expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được lịch sử thanh toán.');
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByText('Chưa có giao dịch có kết quả thanh toán.')).toBeInTheDocument();
  });

  it('keeps cached history separate for each account', async () => {
    client.setQueryData(['payment', 'history', 99], [transaction]);
    vi.mocked(fetchPaymentHistory).mockResolvedValue([]);
    showHistory(42);
    await waitFor(() => expect(fetchPaymentHistory).toHaveBeenCalled());
    expect(screen.queryByText('GT_PAID')).not.toBeInTheDocument();
    expect(await screen.findByText('Chưa có giao dịch có kết quả thanh toán.')).toBeInTheDocument();
  });

  it('refreshes pending transactions without treating them as paid', async () => {
    vi.mocked(fetchPaymentHistory).mockResolvedValueOnce([{ ...transaction, status: 'PENDING' }])
      .mockResolvedValueOnce([transaction]);
    showHistory();
    expect(await screen.findByText('Chưa có giao dịch có kết quả thanh toán.')).toBeInTheDocument();
    expect(screen.queryByText('GT_PAID')).not.toBeInTheDocument();
    expect(screen.queryByText('Thành công')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Làm mới' }));
    expect(await screen.findByText('Thành công')).toBeInTheDocument();
    expect(screen.queryByText('Chờ xác nhận')).not.toBeInTheDocument();
  });
});
