import { X, Printer, CheckCircle2, ShieldCheck, Beaker } from 'lucide-react';
import { useLanguage } from '../../../shared/i18n/language';
import type { PaymentTransactionDto } from '../api/payment-api';
import type { AuthUser } from '../../auth/types';

interface InvoiceModalProps {
  open: boolean;
  transaction: PaymentTransactionDto | null;
  user?: AuthUser | null;
  onClose: () => void;
}

export function InvoiceModal({ open, transaction, user, onClose }: InvoiceModalProps) {
  const { t, language } = useLanguage();

  if (!open || !transaction) return null;

  const isPro = transaction.tier === 'PRO';
  const packageName = isPro
    ? t('Gói Chuyên Nghiệp (PRO)', 'Professional Package (PRO)')
    : t('Gói Tiêu Chuẩn (PLUS)', 'Standard Package (PLUS)');

  const formattedDate = transaction.createdAt
    ? new Date(transaction.createdAt).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

  const formattedAmount = new Intl.NumberFormat(language === 'vi' ? 'vi-VN' : 'en-US', {
    style: 'currency',
    currency: 'VND',
  }).format(transaction.amount);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="invoice-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 print:p-0"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-fade-in print:hidden"
        onClick={onClose}
      />

      {/* Invoice Card */}
      <div className="relative w-full max-w-xl rounded-2xl border border-border-default bg-neutral-primary-soft p-6 sm:p-8 shadow-2xl animate-scale-in z-10 max-h-[92vh] overflow-y-auto print:max-h-none print:shadow-none print:border-none print:p-0">
        {/* Close & Print Action Bar (hidden when printing) */}
        <div className="mb-6 flex items-center justify-between border-b border-border-default-subtle pb-4 print:hidden">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-softer text-fg-brand">
              <Beaker size={15} />
            </span>
            <span className="text-xs font-bold text-heading">GreyTest Invoice</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="btn btn-secondary px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5"
            >
              <Printer size={13} />
              <span>{t('In hóa đơn', 'Print Invoice')}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-body-subtle hover:bg-neutral-secondary hover:text-heading transition-colors"
              title={t('Đóng', 'Close')}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Invoice Printable Content */}
        <div className="space-y-6 text-xs text-body print:text-black">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-border-default-subtle pb-5">
            <div>
              <h2 id="invoice-modal-title" className="text-lg font-bold text-heading uppercase tracking-wide">
                {t('HÓA ĐƠN DỊCH VỤ ĐIỆN TỬ', 'ELECTRONIC SERVICE INVOICE')}
              </h2>
              <p className="mt-1 font-mono text-body-subtle text-[11px]">
                {t('Mã hóa đơn:', 'Invoice ID:')} <strong className="text-heading">INV-{transaction.orderId}</strong>
              </p>
              <p className="text-body-subtle text-[11px]">
                {t('Ngày lập:', 'Issue Date:')} {formattedDate}
              </p>
            </div>
            <div className="text-right">
              <div className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 size={13} />
                <span>{t('ĐÃ THANH TOÁN', 'PAID')}</span>
              </div>
            </div>
          </div>

          {/* Seller & Customer Info */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <p className="font-semibold text-heading mb-1 uppercase text-[11px] tracking-wider text-body-subtle">
                {t('Đơn vị cung cấp', 'Provider')}
              </p>
              <p className="font-bold text-heading">Hệ thống AI QA Agent GreyTest</p>
              <p className="text-body-subtle text-[11px]">Đồ án Tốt nghiệp Kỹ thuật Phần mềm</p>
              <p className="text-body-subtle text-[11px]">Cổng thanh toán: VNPay</p>
            </div>
            <div>
              <p className="font-semibold text-heading mb-1 uppercase text-[11px] tracking-wider text-body-subtle">
                {t('Thông tin khách hàng', 'Customer')}
              </p>
              <p className="font-bold text-heading">{user?.fullName ?? t('Khách hàng', 'Customer')}</p>
              <p className="text-body-subtle text-[11px]">{user?.email ?? '—'}</p>
              {user?.phoneNumber && (
                <p className="text-body-subtle text-[11px]">
                  {t('SĐT:', 'Phone:')} {user.phoneNumber}
                </p>
              )}
            </div>
          </div>

          {/* Line Items Table */}
          <div className="overflow-hidden rounded-lg border border-border-default">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-secondary-soft text-body-subtle">
                <tr>
                  <th className="px-3.5 py-2.5 font-semibold">{t('Mô tả dịch vụ', 'Description')}</th>
                  <th className="px-3 py-2.5 font-semibold text-center">{t('Chu kỳ', 'Cycle')}</th>
                  <th className="px-3.5 py-2.5 font-semibold text-right">{t('Thành tiền', 'Amount')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default-subtle">
                <tr>
                  <td className="px-3.5 py-3">
                    <p className="font-semibold text-heading">{packageName}</p>
                    <p className="text-[11px] text-body-subtle">
                      {isPro
                        ? t('300 lượt gọi AI, JaCoCo Coverage Refinement & AST Deep Analysis', '300 AI credits, JaCoCo refinement & AST deep analysis')
                        : t('200 lượt gọi AI, sinh test và phân tích cú pháp', '200 AI credits, test generation and syntax analysis')}
                    </p>
                  </td>
                  <td className="px-3 py-3 text-center text-body-subtle">
                    {t('1 tuần', '1 week')}
                  </td>
                  <td className="px-3.5 py-3 text-right font-semibold text-heading">
                    {formattedAmount}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Pricing Breakdown */}
          <div className="space-y-1.5 border-t border-border-default-subtle pt-3 text-right">
            <div className="flex justify-between text-xs text-body-subtle">
              <span>{t('Tạm tính:', 'Subtotal:')}</span>
              <span>{formattedAmount}</span>
            </div>
            <div className="flex justify-between text-xs text-body-subtle">
              <span>{t('Thuế GTGT (VAT 0%):', 'VAT (0%):')}</span>
              <span>0 đ</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-heading pt-1 border-t border-border-default-subtle">
              <span>{t('Tổng thanh toán:', 'Total:')}</span>
              <span className="text-brand text-base">{formattedAmount}</span>
            </div>
          </div>

          {/* Payment Method Details */}
          <div className="rounded-lg bg-neutral-secondary-soft p-3 text-[11px] text-body-subtle space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-heading">
              <ShieldCheck size={14} className="text-emerald-500" />
              <span>{t('Chi tiết giao dịch qua VNPay', 'VNPay Transaction Details')}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <span>{t('Ngân hàng:', 'Bank:')} </span>
                <strong className="text-heading font-medium">{transaction.vnpBankCode || 'VNPay'}</strong>
              </div>
              <div>
                <span>{t('Mã GD VNPay:', 'VNPay Txn:')} </span>
                <strong className="text-heading font-mono">{transaction.vnpTransactionNo || transaction.orderId}</strong>
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <p className="text-center text-[10px] text-body-subtle pt-2">
            {t(
              'Hóa đơn điện tử này được tạo tự động bởi hệ thống GreyTest và có giá trị xác thực giao dịch trực tuyến.',
              'This electronic invoice was generated automatically by GreyTest and serves as proof of online transaction.'
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

