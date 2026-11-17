import { Tag } from '../../../shared/components/Tag';
import { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, XCircle, Loader2, ArrowRight, ShieldCheck } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { AppShell } from '../../../shared/components/AppShell';
import { verifyVnpayCallback } from '../api/payment-api';
import type { PaymentCallbackResponse } from '../api/payment-api';
import { useLanguage } from '../../../shared/i18n/language';

export function VnpayReturnPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<PaymentCallbackResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const rawParams = Object.fromEntries(searchParams.entries());
    if (Object.keys(rawParams).length === 0) {
      setLoading(false);
      setError('Không tìm thấy thông tin giao dịch');
      return;
    }

    let isMounted = true;
    verifyVnpayCallback(rawParams)
      .then((data) => {
        if (!isMounted) return;
        setResult(data);
        if (data.status === 'SUCCESS') {
          // Làm mới toàn bộ cache liên quan đến tài khoản và quota
          queryClient.invalidateQueries();
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'Lỗi kết nối tới máy chủ khi xác thực thanh toán');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [searchParams, queryClient]);

  const formatCurrency = (val?: number) => {
    if (!val) return '0đ';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  return (
    <AppShell maxWidth="default">
      <div className="flex min-h-[60vh] items-center justify-center py-10 font-sans">
        <div className="w-full max-w-md rounded-base border border-border-default bg-neutral-primary-soft p-6 text-center animate-fade-in relative overflow-hidden">

          {loading ? (
            <div className="py-12 space-y-4">
              <Loader2 size={40} className="mx-auto animate-spin text-brand" />
              <h2 className="font-semibold text-heading text-lg font-display">
                {t('Đang xác thực kết quả thanh toán với VNPay...', 'Verifying VNPay payment result...')}
              </h2>
              <p className="text-xs text-body-subtle">
                {t('Vui lòng đợi giây lát, hệ thống đang cập nhật hạn mức tài khoản của bạn.', 'Please wait a moment while your account is being updated.')}
              </p>
            </div>
          ) : result?.status === 'SUCCESS' ? (
            <div className="py-4 space-y-5">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-base bg-success-soft text-fg-success-strong dark:text-fg-success-strong">
                <CheckCircle2 size={36} strokeWidth={2.2} />
              </div>

              <div>
                <Tag variant="status" tone={'success'} icon={ShieldCheck}>
                   Giao dịch thành công
                </Tag>
                <h1 className="mt-2 font-semibold text-heading text-[28px] font-display">
                  {t('Nâng Cấp Gói Dịch Vụ Thành Công!', 'Subscription Upgraded Successfully!')}
                </h1>
                <p className="mt-1 text-xs text-body-subtle">
                  {t('Chúc mừng bạn đã nâng cấp thành công lên gói', 'Congratulations! You upgraded to')}{' '}
                  <strong className="text-brand font-semibold">{result.tier}</strong>
                </p>
              </div>

              {/* Chi tiết đơn hàng */}
              <div className="border-t border-t-border-default p-4 text-xs space-y-2 text-left">
                <div className="flex justify-between items-center">
                  <span className="text-body-subtle">Gói dịch vụ:</span>
                  <span className="font-semibold text-heading">{result.tier}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-body-subtle">Số tiền thanh toán:</span>
                  <span className="font-semibold text-fg-success-strong dark:text-fg-success-strong">{formatCurrency(result.amount)}</span>
                </div>
                {result.orderId && (
                  <div className="flex justify-between items-center">
                    <span className="text-body-subtle">Mã đơn hàng:</span>
                    <span className="font-mono text-body">{result.orderId}</span>
                  </div>
                )}
                {result.transactionNo && (
                  <div className="flex justify-between items-center">
                    <span className="text-body-subtle">Mã giao dịch VNPay:</span>
                    <span className="font-mono text-body">{result.transactionNo}</span>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/profile')}
                  className="btn btn-primary w-full py-2.5 text-xs font-semibold flex items-center justify-center gap-2"
                >
                  {t('Xem hồ sơ & Quota mới', 'View Profile & New Quota')} <ArrowRight size={15} />
                </button>
              </div>
            </div>
          ) : (
            <div className="py-4 space-y-5">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-base bg-danger-soft text-fg-danger-strong dark:text-fg-danger-strong">
                <XCircle size={36} strokeWidth={2.2} />
              </div>

              <div>
                <Tag variant="status" tone={'danger'} icon={AlertCircle}>
                   Giao dịch chưa hoàn tất
                </Tag>
                <h1 className="mt-2 font-semibold text-heading text-[28px] font-display">
                  {t('Thanh Toán Không Thành Công', 'Payment Failed')}
                </h1>
                <p className="mt-1 text-xs text-body-subtle leading-relaxed">
                  {result?.message || error || t('Giao dịch đã bị hủy hoặc có lỗi xảy ra trong quá trình thanh toán.', 'The transaction was cancelled or an error occurred.')}
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/profile')}
                  className="btn btn-primary w-full py-2.5 text-xs font-semibold"
                >
                  {t('Thử lại gói khác', 'Try another plan')}
                </button>
                <Link
                  to="/projects"
                  className="btn btn-secondary w-full py-2.5 text-xs"
                >
                  {t('Quay lại trang dự án', 'Back to projects')}
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
