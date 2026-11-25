import { IconButton } from './IconButton';
import { Tag } from './Tag';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Check,
  X,
  Loader2,
  ArrowRight,
  CreditCard,
  Zap,
  CheckCircle2,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import {
  createVnpayPaymentUrl,
  fetchPublicTierPackages,
  type PublicTierPackage,
} from '../../features/payment/api/payment-api';
import { getErrorMessage } from '../api/api-client';
import { useCurrentUser, useUserQuota } from '../../features/auth/hooks/useAuth';
import type { UserTier } from '../../features/auth/types';
import { useLanguage } from '../i18n/language';

export interface UpgradeToProModalProps {
  open?: boolean;
  onClose?: () => void;
  defaultTier?: 'PLUS' | 'PRO';
  initialTier?: 'PLUS' | 'PRO';
  currentTier?: UserTier;
}

export function UpgradeToProModal({
  open: controlledOpen,
  onClose,
  defaultTier = 'PRO',
  initialTier,
  currentTier: explicitCurrentTier,
}: UpgradeToProModalProps) {
  const { t } = useLanguage();
  const { data: user } = useCurrentUser();
  const { data: quota } = useUserQuota();

  const effectiveCurrentTier: UserTier =
    explicitCurrentTier ?? user?.tier ?? quota?.tier ?? 'FREE';

  const preferredTier: 'PLUS' | 'PRO' =
    initialTier ?? defaultTier ?? (effectiveCurrentTier === 'PLUS' ? 'PLUS' : 'PRO');

  const { data: publicPackages } = useQuery<PublicTierPackage[]>({
    queryKey: ['public-tier-packages'],
    queryFn: fetchPublicTierPackages,
    staleTime: 30_000,
  });

  const hasPackages = Boolean(publicPackages && Array.isArray(publicPackages));
  const plusPkg = publicPackages?.find((p) => p.code?.toUpperCase() === 'PLUS');
  const proPkg = publicPackages?.find((p) => p.code?.toUpperCase() === 'PRO');
  const isPlusActive = !hasPackages || Boolean(plusPkg);
  const isProActive = !hasPackages || Boolean(proPkg);

  const formatCycle = (cycle?: string) => {
    if (!cycle) return '/tháng';
    const c = cycle.toUpperCase();
    if (c === 'WEEKLY') return '/tuần';
    if (c === 'YEARLY') return '/năm';
    return '/tháng';
  };

  const formatResetCycleText = (resetCycle?: string) => {
    const r = (resetCycle || 'WEEKLY').toUpperCase();
    if (r === 'DAILY') return t('hồi lại hàng ngày', 'resets daily');
    if (r === 'MONTHLY') return t('hồi lại hàng tháng', 'resets monthly');
    return t('hồi lại hàng tuần', 'resets weekly');
  };

  const plusPrice = plusPkg ? `${plusPkg.price.toLocaleString('vi-VN')}đ` : '10.000đ';
  const plusCycle = formatCycle(plusPkg?.cycle ?? 'MONTHLY');
  const plusLimit = plusPkg ? `${plusPkg.quotaLimit} lượt gọi AI` : '200 lượt gọi AI';
  const plusConcurrency = plusPkg ? `Sinh tối đa ${plusPkg.batchConcurrency} batch đồng thời` : 'Sinh tối đa 3 batch đồng thời';
  const plusExtraFeatures = (plusPkg?.features ?? ['Ưu tiên xử lý hàng đợi tác vụ']).filter(
    (f) => !f.toLowerCase().includes('lượt gọi') && !f.toLowerCase().includes('batch') && !f.toLowerCase().includes('hồi lại')
  );

  const proPrice = proPkg ? `${proPkg.price.toLocaleString('vi-VN')}đ` : '20.000đ';
  const proCycle = formatCycle(proPkg?.cycle ?? 'MONTHLY');
  const proLimit = proPkg ? `${proPkg.quotaLimit} lượt gọi AI` : '300 lượt gọi AI';
  const proConcurrency = proPkg ? `Sinh tối đa ${proPkg.batchConcurrency} batch đồng thời` : 'Sinh tối đa 4 batch đồng thời';
  const proExtraFeatures = (proPkg?.features ?? ['Vòng lặp JaCoCo Refinement tự cải thiện độ bao phủ']).filter(
    (f) => !f.toLowerCase().includes('lượt gọi') && !f.toLowerCase().includes('batch') && !f.toLowerCase().includes('hồi lại')
  );

  const [internalOpen, setInternalOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<'PLUS' | 'PRO'>(preferredTier);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPkg = selectedTier === 'PLUS' ? plusPkg : proPkg;
  const selectedPriceText = selectedPkg
    ? `${selectedPkg.price.toLocaleString('vi-VN')} VNĐ`
    : selectedTier === 'PLUS'
    ? '10.000 VNĐ'
    : '20.000 VNĐ';

  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;

  useEffect(() => {
    if (isOpen) {
      const tierToSet = initialTier ?? defaultTier;
      if (tierToSet) setSelectedTier(tierToSet);
    }
  }, [isOpen, defaultTier, initialTier]);

  useEffect(() => {
    if (hasPackages) {
      if (!isPlusActive && isProActive && selectedTier === 'PLUS') {
        setSelectedTier('PRO');
      } else if (!isProActive && isPlusActive && selectedTier === 'PRO') {
        setSelectedTier('PLUS');
      }
    }
  }, [hasPackages, isPlusActive, isProActive, selectedTier]);

  const handleClose = () => {
    if (isRedirecting) return;
    setError(null);
    if (onClose) {
      onClose();
    } else {
      setInternalOpen(false);
    }
  };

  useEffect(() => {
    const handleQuotaExceeded = () => {
      setError(null);
      setInternalOpen(true);
    };

    window.addEventListener('quota-exceeded', handleQuotaExceeded);
    return () => {
      window.removeEventListener('quota-exceeded', handleQuotaExceeded);
    };
  }, []);

  // Đóng modal khi bấm Escape nếu không trong tiến trình chuyển hướng
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isRedirecting) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isRedirecting]);

  const handlePayVnpay = async () => {
    setIsRedirecting(true);
    setError(null);
    try {
      const response = await createVnpayPaymentUrl(selectedTier);
      if (response?.paymentUrl) {
        window.location.href = response.paymentUrl;
      } else {
        throw new Error('Không nhận được đường dẫn thanh toán từ cổng VNPay');
      }
    } catch (err) {
      setError(getErrorMessage(err));
      setIsRedirecting(false);
    }
  };

  if (!isOpen) return null;

  const isCurrentTierSelected = selectedTier === effectiveCurrentTier;
  const isUpgrading =
    effectiveCurrentTier === 'FREE' ||
    (effectiveCurrentTier === 'PLUS' && selectedTier === 'PRO');
  const isDowngrading =
    effectiveCurrentTier === 'PRO' && selectedTier === 'PLUS';

  const actionText = isCurrentTierSelected
    ? `Gia hạn gói ${selectedTier}`
    : isUpgrading
    ? `Nâng cấp lên gói ${selectedTier}`
    : isDowngrading
    ? `Chuyển sang gói ${selectedTier}`
    : `Đổi sang gói ${selectedTier}`;

  const remainingQuota =
    quota?.remaining ??
    (quota?.limit != null ? Math.max(0, quota.limit - quota.used) : null);

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-dark/65 p-3 sm:p-4 backdrop-blur-md animate-in fade-in duration-200"
      onMouseDown={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-base border border-border-brand-subtle bg-neutral-primary-soft p-5 sm:p-6 shadow-2xl transition-colors">
        {/* Glow trang trí nền */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-base">
        </div>

        {/* Modal Header */}
        <div className="relative flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div>
              <Tag>
                <ShieldCheck size={12} aria-hidden="true"  />
                Nâng cấp & gia hạn gói dịch vụ
              </Tag>
              <h2 id="upgrade-modal-title" className="font-semibold text-heading mt-1.5 text-lg font-display">
                Chọn gói mở rộng hạn mức AI
              </h2>
            </div>
          </div>
          <IconButton icon={X} label={t('Đóng', 'Close')} disabled={isRedirecting} onClick={handleClose} />
        </div>

        <p className="mt-1.5 text-xs text-body-subtle leading-relaxed">
          Nâng cấp hoặc gia hạn gói tài khoản để tăng lượt gọi AI sinh Test Plan, Test Case và Unit Test liên tục không bị gián đoạn. Thanh toán trực tuyến an toàn qua <strong>VNPay</strong>.
        </p>

        {/* Thanh trạng thái gói hiện tại của người dùng */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-t-border-default px-3.5 py-2.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-body-subtle">Gói hiện tại:</span>
            {effectiveCurrentTier === 'PRO' ? (
              <Tag>
                <ShieldCheck size={12} aria-hidden="true"  /> {t('Gói chuyên nghiệp (PRO)', 'Professional plan (PRO)')}
              </Tag>
            ) : effectiveCurrentTier === 'PLUS' ? (
              <Tag>
                <Zap size={12} aria-hidden="true"  /> {t('Gói tiêu chuẩn (PLUS)', 'Standard plan (PLUS)')}
              </Tag>
            ) : (
              <Tag>
                <ShieldCheck size={12} aria-hidden="true"  /> {t('Gói miễn phí (FREE)', 'Free plan (FREE)')}
              </Tag>
            )}
          </div>
          {quota && (
            <div className="text-xs text-body-subtle">
              {quota.limit === null ? <>
                {t(`Đã dùng ${quota.used} lượt`, `Used ${quota.used} credits`)} <strong className="text-heading font-semibold">{t('Không giới hạn', 'Unlimited')}</strong>
              </> : <>
                {t('Lượt AI còn lại:', 'AI credits remaining:')}{' '}
                <strong className="text-heading font-semibold">{remainingQuota}/{quota.limit}</strong>
              </>}
            </div>
          )}
        </div>

        {/* Danh sách các gói đang kích hoạt (PLUS và PRO) */}
        {!isPlusActive && !isProActive ? (
          <div className="mt-4 rounded-base border border-border-warning-subtle bg-warning-soft p-5 text-center">
            <ShieldCheck size={28} className="mx-auto text-fg-warning mb-2" />
            <h2 className="text-base font-semibold text-heading font-display">Các gói nâng cấp đang tạm dừng</h2>
            <p className="mt-1 text-xs text-body-subtle leading-relaxed">
              Hệ thống đang tạm ngừng mở đăng ký hoặc nâng cấp các gói trực tuyến để bảo trì cấu hình. Vui lòng quay lại sau!
            </p>
          </div>
        ) : (
          <div className={`mt-4 grid gap-3.5 ${isPlusActive && isProActive ? 'grid-cols-2' : 'grid-cols-1 max-w-sm mx-auto'}`}>
            {/* Card Gói PLUS */}
            {isPlusActive && (
              <div
                onClick={() => !isRedirecting && setSelectedTier('PLUS')}
            className={`cursor-pointer relative flex flex-col justify-between rounded-base border-2 p-4 transition-colors duration-200 ${
              selectedTier === 'PLUS'
                ? 'border-border-brand bg-brand-softer  ring-2 ring-border-brand-subtle'
                : 'border-border-default bg-neutral-secondary-soft hover:border-border-brand-subtle hover:bg-neutral-secondary-soft'
            }`}
          >
            {/* Huy hiệu nhận biết gói đang dùng */}
            {effectiveCurrentTier === 'PLUS' && (
              <Tag variant="status" tone={'success'} icon={CheckCircle2} className="absolute -top-2.5 left-3">
                 {t('Đang sử dụng', 'Current plan')}
              </Tag>
            )}

            <div>
              <div className="flex items-center justify-between">
                <Tag>Gói PLUS</Tag>
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-control transition-colors ${
                    selectedTier === 'PLUS'
                      ? 'bg-brand text-on-brand '
                      : 'border border-border-default-strong text-transparent'
                  }`}
                >
                  <Check size={12} strokeWidth={3} />
                </span>
              </div>

              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-[22px] font-semibold text-heading font-sans tabular-nums">{plusPkg ? plusPrice : t('Chưa có dữ liệu', 'Data unavailable')}</span>
                <span className="text-xs text-body-subtle">{plusPkg ? plusCycle : ''}</span>
              </div>

              {effectiveCurrentTier === 'PLUS' ? (
                <p className="mt-1 text-xs font-semibold text-fg-success-strong dark:text-fg-success-strong">
                  Gói hiện tại, Gia hạn thêm 1 {plusCycle.replace('/', '')}
                </p>
              ) : effectiveCurrentTier === 'PRO' ? (
                <p className="mt-1 text-xs text-body-subtle">
                  Gói thấp hơn gói PRO hiện tại
                </p>
              ) : (
                <p className="mt-1 text-xs text-body-subtle">
                  {plusPkg?.description || 'Phù hợp nhu cầu cơ bản hàng tuần'}
                </p>
              )}

              <div className="my-2.5 border-t border-border-default-subtle" />

              <ul className="space-y-1.5 text-xs text-heading">
                <li className="flex items-center gap-1.5 font-medium">
                  <Check size={13} className="shrink-0 text-fg-brand-strong" />
                  <span><strong>{plusPkg ? plusLimit : t('Chưa có dữ liệu', 'Data unavailable')}</strong> ({formatResetCycleText(plusPkg?.resetCycle)})</span>
                </li>
                {plusExtraFeatures.map((feat, idx) => (
                  <li key={idx} className="flex items-center gap-1.5 text-body-subtle">
                    <Check size={13} className="shrink-0 text-fg-brand-strong" />
                    <span>{feat}</span>
                  </li>
                ))}
                <li className="flex items-center gap-1.5 text-body-subtle">
                  <Check size={13} className="shrink-0 text-fg-brand-strong" />
                  <span>{plusPkg ? plusConcurrency : t('Chưa có dữ liệu', 'Data unavailable')}</span>
                </li>
              </ul>
            </div>

            <div className="mt-3 pt-2 text-center text-xs font-medium">
              {selectedTier === 'PLUS' ? (
                <span className="text-fg-brand-strong dark:text-fg-brand-strong font-semibold">
                  {effectiveCurrentTier === 'PLUS' ? '✓ Đang chọn để gia hạn' : '✓ Đã chọn gói này'}
                </span>
              ) : (
                <span className="text-body-subtle">Nhấp để chọn</span>
              )}
            </div>
          </div>
            )}

            {/* Card Gói PRO */}
            {isProActive && (
              <div
                onClick={() => !isRedirecting && setSelectedTier('PRO')}
            className={`cursor-pointer relative flex flex-col justify-between rounded-base border-2 p-4 transition-colors duration-200 ${
              selectedTier === 'PRO'
                ? 'border-border-brand bg-brand-softer  ring-2 ring-border-brand-subtle'
                : 'border-border-default bg-neutral-secondary-soft hover:border-border-brand-subtle hover:bg-neutral-secondary-soft'
            }`}
          >
            {/* Huy hiệu nhận biết gói đang dùng hoặc khuyên dùng */}
            {effectiveCurrentTier === 'PRO' ? (
              <Tag variant="status" tone={'success'} icon={CheckCircle2} className="absolute -top-2.5 left-3">
                 {t('Đang sử dụng', 'Current plan')}
              </Tag>
            ) : (
              <Tag className="absolute -top-2.5 right-3">
                {t('Khuyên dùng', 'Recommended')}
              </Tag>
            )}

            <div>
              <div className="flex items-center justify-between">
                <Tag>Gói PRO</Tag>
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-control transition-colors ${
                    selectedTier === 'PRO'
                      ? 'bg-brand text-on-brand '
                      : 'border border-border-default-strong text-transparent'
                  }`}
                >
                  <Check size={12} strokeWidth={3} />
                </span>
              </div>

              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-[22px] font-semibold text-heading font-sans tabular-nums">{proPkg ? proPrice : t('Chưa có dữ liệu', 'Data unavailable')}</span>
                <span className="text-xs text-body-subtle">{proPkg ? proCycle : ''}</span>
              </div>

              {effectiveCurrentTier === 'PRO' ? (
                <p className="mt-1 text-xs font-semibold text-fg-success-strong dark:text-fg-success-strong">
                  Gói hiện tại, Gia hạn thêm 1 {proCycle.replace('/', '')}
                </p>
              ) : (
                <p className="mt-1 text-xs text-fg-brand-strong dark:text-fg-brand-strong font-medium">
                  {proPkg?.description || 'Tối đa công suất kiểm thử AI'}
                </p>
              )}

              <div className="my-2.5 border-t border-border-default-subtle" />

              <ul className="space-y-1.5 text-xs text-heading">
                <li className="flex items-center gap-1.5 font-medium">
                  <Check size={13} className="shrink-0 text-fg-brand-strong" />
                  <span><strong>{proPkg ? proLimit : t('Chưa có dữ liệu', 'Data unavailable')}</strong> ({formatResetCycleText(proPkg?.resetCycle)})</span>
                </li>
                {proExtraFeatures.map((feat, idx) => (
                  <li key={idx} className="flex items-center gap-1.5 text-body-subtle">
                    <Check size={13} className="shrink-0 text-fg-brand-strong" />
                    <span>{feat}</span>
                  </li>
                ))}
                <li className="flex items-center gap-1.5 text-body-subtle">
                  <Check size={13} className="shrink-0 text-fg-brand-strong" />
                  <span>{proPkg ? proConcurrency : t('Chưa có dữ liệu', 'Data unavailable')}</span>
                </li>
              </ul>
            </div>

            <div className="mt-3 pt-2 text-center text-xs font-medium">
              {selectedTier === 'PRO' ? (
                <span className="text-fg-brand-strong dark:text-fg-brand-strong font-semibold">
                  {effectiveCurrentTier === 'PRO' ? '✓ Đang chọn để gia hạn' : '✓ Đã chọn gói này'}
                </span>
              ) : (
                <span className="text-body-subtle">Nhấp để chọn</span>
              )}
            </div>
          </div>
            )}
          </div>
        )}

        {error && (
          <p role="alert" className="mt-4 rounded-base bg-danger-soft p-3 text-xs font-medium text-fg-danger-strong">
            {error}
          </p>
        )}

        {/* Khối tóm tắt giao dịch thanh toán */}
        {(isPlusActive || isProActive) && (
          <div className="mt-4 border-t border-t-border-default p-3 sm:p-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <CreditCard size={15} className="text-fg-brand-strong dark:text-fg-brand-strong shrink-0" />
                <div className="text-body-subtle text-xs sm:text-xs min-w-0">
                  <span>Dự kiến thực hiện: </span>
                  <strong className="text-heading font-semibold">
                    {actionText}
                  </strong>
                  <span className="text-body-subtle"> (Cổng thanh toán VNPay)</span>
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-1.5 shrink-0 whitespace-nowrap pt-1 sm:pt-0 border-t sm:border-t-0 border-border-default-subtle">
                <span className="text-xs text-body-subtle">Số tiền: </span>
                <span className="text-base font-semibold text-heading text-fg-brand-strong dark:text-fg-brand-strong font-sans tabular-nums whitespace-nowrap">
                  {selectedPkg ? selectedPriceText : t('Chưa có dữ liệu', 'Data unavailable')}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Thanh toán footer */}
        <div className="mt-4 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border-default-subtle">
          <button
            type="button"
            className="btn btn-secondary text-xs px-4 py-2 w-full sm:w-auto"
            disabled={isRedirecting}
            onClick={handleClose}
          >
            Để sau
          </button>

          <button
            type="button"
            className="btn btn-brand text-xs px-5 py-2.5 font-semibold transition-colors flex items-center justify-center gap-2 w-full sm:w-auto disabled:cursor-not-allowed"
            disabled={isRedirecting || (!isPlusActive && !isProActive)}
            onClick={handlePayVnpay}
          >
            {isRedirecting ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Đang chuyển sang VNPay…
              </>
            ) : !isPlusActive && !isProActive ? (
              <span>Dịch vụ đang tạm dừng</span>
            ) : (
              <>
                {isCurrentTierSelected ? <RefreshCw size={14} /> : <CreditCard size={14} />}
                <span>
                  Thanh toán qua VNPay ({selectedPkg ? selectedPriceText : t('Chưa có dữ liệu', 'Data unavailable')})
                </span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
}
