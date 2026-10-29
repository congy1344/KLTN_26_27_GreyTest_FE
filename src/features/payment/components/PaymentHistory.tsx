import { useQuery } from '@tanstack/react-query';
import { History, RefreshCw } from 'lucide-react';
import { useLanguage } from '../../../shared/i18n/language';
import { fetchPaymentHistory } from '../api/payment-api';

/** Hiển thị giao dịch đã có kết quả thanh toán của tài khoản hiện tại. */
export function PaymentHistory({ userId }: { userId: number }) {
  const { t, language } = useLanguage();
  const history = useQuery({
    queryKey: ['payment', 'history', userId],
    queryFn: fetchPaymentHistory,
    enabled: Boolean(localStorage.getItem('greytest.token')),
    retry: false,
  });
  const statuses = {
    SUCCESS: { label: t('Thành công', 'Successful'), color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
    FAILED: { label: t('Không thành công', 'Unsuccessful'), color: 'bg-red-500/10 text-red-600 dark:text-red-400' },
  };
  const transactions = (history.data ?? []).filter(transaction => transaction.status === 'SUCCESS' || transaction.status === 'FAILED');

  return (
    <section aria-labelledby="payment-history-title" className="rounded-xl border border-border-default bg-neutral-primary-soft p-5 shadow-xs">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 id="payment-history-title" className="flex items-center gap-2 text-base font-bold text-heading">
          <History size={18} /> {t('Lịch sử thanh toán', 'Payment history')}
        </h3>
        <button type="button" disabled={history.isFetching} onClick={() => void history.refetch()}
          className="btn btn-secondary gap-1.5 text-xs disabled:opacity-50">
          <RefreshCw size={13} className={history.isFetching ? 'animate-spin' : ''} />
          {t('Làm mới', 'Refresh')}
        </button>
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
            <table className="w-full min-w-[680px] text-left text-xs">
              <thead className="border-b border-border-default text-body-subtle">
                <tr>
                  {[t('Ngày tạo', 'Created'), t('Mã đơn hàng', 'Order ID'), t('Gói', 'Plan'), t('Số tiền', 'Amount'), t('Ngân hàng', 'Bank'), t('Trạng thái', 'Status')].map(label => (
                    <th key={label} scope="col" className="px-3 py-3 font-semibold">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default-subtle">
                {transactions.map(transaction => (
                  <tr key={transaction.id} className="text-heading">
                    <td className="whitespace-nowrap px-3 py-3">
                      <time dateTime={transaction.createdAt}>{transaction.createdAt.split('T')[0].split('-').reverse().join('/')}</time>
                    </td>
                    <td className="px-3 py-3 font-mono">{transaction.orderId}</td>
                    <td className="px-3 py-3 font-semibold">{transaction.tier}</td>
                    <td className="whitespace-nowrap px-3 py-3 font-semibold">
                      {new Intl.NumberFormat(language === 'vi' ? 'vi-VN' : 'en-US', { style: 'currency', currency: 'VND' }).format(transaction.amount)}
                    </td>
                    <td className="px-3 py-3">{transaction.vnpBankCode || '—'}</td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-1 font-medium ${transaction.status === 'SUCCESS' ? statuses.SUCCESS.color : statuses.FAILED.color}`}>
                        {transaction.status === 'SUCCESS' ? statuses.SUCCESS.label : statuses.FAILED.label}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      )}
    </section>
  );
}
