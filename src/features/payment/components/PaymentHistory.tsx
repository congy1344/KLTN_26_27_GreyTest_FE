import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { History, RefreshCw, FileText } from 'lucide-react';
import { useLanguage } from '../../../shared/i18n/language';
import { fetchPaymentHistory, type PaymentTransactionDto } from '../api/payment-api';
import { InvoiceModal } from './InvoiceModal';
import { useCurrentUser } from '../../auth/hooks/useAuth';

export interface PaymentHistoryProps {
  userId: number;
  onCancelSubscription?: () => void;
  isCancelling?: boolean;
  canCancel?: boolean;
}

/** Hiển thị giao dịch đã có kết quả thanh toán của tài khoản hiện tại kèm hóa đơn điện tử. */
export function PaymentHistory({
  userId,
  onCancelSubscription,
  isCancelling = false,
  canCancel = false,
}: PaymentHistoryProps) {
  const { t, language } = useLanguage();
  const { data: user } = useCurrentUser();
  const [selectedInvoiceTxn, setSelectedInvoiceTxn] = useState<PaymentTransactionDto | null>(null);

  const history = useQuery({
    queryKey: ['payment', 'history', userId],
    queryFn: fetchPaymentHistory,
    enabled: Boolean(localStorage.getItem('greytest.token')),
    retry: false,
  });

  const statuses = {
    SUCCESS: { label: t('Thành công', 'Successful'), color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' },
    FAILED: { label: t('Không thành công', 'Unsuccessful'), color: 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20' },
  };

  const transactions = (history.data ?? []).filter(
    (transaction) => transaction.status === 'SUCCESS' || transaction.status === 'FAILED'
  );

  return (
    <section aria-labelledby="payment-history-title" className="rounded-xl border border-border-default bg-neutral-primary-soft p-5 shadow-xs">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 id="payment-history-title" className="flex items-center gap-2 text-base font-bold text-heading">
            <History size={18} /> {t('Lịch sử thanh toán & Hóa đơn', 'Payment History & Invoices')}
          </h3>
          <p className="text-xs text-body-subtle mt-0.5">
            {t('Tra cứu các giao dịch nâng cấp gói dịch vụ và xem/in hóa đơn điện tử.', 'Lookup subscription upgrade transactions and view/print electronic invoices.')}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {canCancel && onCancelSubscription && (
            <button
              type="button"
              disabled={isCancelling}
              onClick={onCancelSubscription}
              className="h-8 px-3 inline-flex items-center justify-center gap-1.5 rounded-lg border border-border-danger-subtle bg-danger-soft/20 text-xs font-semibold text-fg-danger-strong hover:bg-danger-soft hover:border-danger transition-colors disabled:opacity-50 shrink-0 cursor-pointer"
            >
              {t('Hủy gói', 'Cancel plan')}
            </button>
          )}
          <button
            type="button"
            disabled={history.isFetching}
            onClick={() => void history.refetch()}
            className="h-8 px-3 inline-flex items-center justify-center gap-1.5 rounded-lg border border-border-default bg-neutral-primary-soft text-xs font-semibold text-body hover:bg-neutral-secondary-soft hover:text-heading transition-colors shadow-2xs disabled:opacity-50 shrink-0 cursor-pointer"
          >
            <RefreshCw size={13} className={history.isFetching ? 'animate-spin text-brand' : ''} />
            <span>{t('Làm mới', 'Refresh')}</span>
          </button>
        </div>
      </div>

      {history.isPending ? (
        <p role="status" className="text-sm text-body-subtle">{t('Đang tải lịch sử thanh toán...', 'Loading payment history...')}</p>
      ) : history.isError ? (
        <div role="alert" className="flex items-center gap-3 text-sm text-fg-danger-strong">
          <span>{t('Không tải được lịch sử thanh toán.', 'Unable to load payment history.')}</span>
          <button type="button" disabled={history.isFetching} onClick={() => void history.refetch()} className="underline">
            {t('Thử lại', 'Retry')}
          </button>
        </div>
      ) : !transactions.length ? (
        <p className="py-4 text-sm text-body-subtle">{t('Chưa có giao dịch có kết quả thanh toán.', 'No transactions with a payment result yet.')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="border-b border-border-default text-body-subtle">
              <tr>
                {[
                  t('Ngày tạo', 'Created'),
                  t('Mã đơn hàng', 'Order ID'),
                  t('Gói', 'Plan'),
                  t('Số tiền', 'Amount'),
                  t('Ngân hàng', 'Bank'),
                  t('Trạng thái', 'Status'),
                  t('Hóa đơn', 'Invoice'),
                ].map((label) => (
                  <th key={label} scope="col" className="px-3 py-3 font-semibold">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default-subtle">
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="text-heading hover:bg-neutral-secondary-soft/50 transition-colors">
                  <td className="whitespace-nowrap px-3 py-3">
                    <time dateTime={transaction.createdAt || undefined}>
                      {transaction.createdAt ? transaction.createdAt.split('T')[0].split('-').reverse().join('/') : '—'}
                    </time>
                  </td>
                  <td className="px-3 py-3 font-mono font-medium">{transaction.orderId}</td>
                  <td className="px-3 py-3 font-semibold">
                    <span className="rounded px-1.5 py-0.5 text-[11px] font-bold bg-brand-softer text-fg-brand-strong border border-border-brand-subtle">
                      {transaction.tier}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 font-semibold">
                    {new Intl.NumberFormat(language === 'vi' ? 'vi-VN' : 'en-US', { style: 'currency', currency: 'VND' }).format(transaction.amount)}
                  </td>
                  <td className="px-3 py-3">{transaction.vnpBankCode || '—'}</td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 font-medium text-[11px] ${transaction.status === 'SUCCESS' ? statuses.SUCCESS.color : statuses.FAILED.color}`}>
                      {transaction.status === 'SUCCESS' ? statuses.SUCCESS.label : statuses.FAILED.label}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    {transaction.status === 'SUCCESS' ? (
                      <button
                        type="button"
                        onClick={() => setSelectedInvoiceTxn(transaction)}
                        className="btn btn-secondary px-2.5 py-1 text-[11px] font-semibold flex items-center gap-1 text-fg-brand hover:text-fg-brand-strong"
                        title={t('Xem hóa đơn điện tử', 'View electronic invoice')}
                      >
                        <FileText size={12} />
                        <span>{t('Xem hóa đơn', 'Invoice')}</span>
                      </button>
                    ) : (
                      <span className="text-body-subtle">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Hóa đơn điện tử */}
      <InvoiceModal
        open={Boolean(selectedInvoiceTxn)}
        transaction={selectedInvoiceTxn}
        user={user}
        onClose={() => setSelectedInvoiceTxn(null)}
      />
    </section>
  );
}
export default PaymentHistory;
