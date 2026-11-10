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
    if (!cycle) return '/tuần';
    const c = cycle.toUpperCase();
    if (c === 'WEEKLY') return '/tuần';
    if (c === 'YEARLY') return '/năm';
    return '/tháng';
  };

  const plusPrice = plusPkg ? `${plusPkg.price.toLocaleString('vi-VN')}đ` : '10.000đ';
  const plusCycle = formatCycle(plusPkg?.cycle ?? 'WEEKLY');
  const plusLimit = plusPkg ? `${plusPkg.quotaLimit} lượt gọi AI` : '200 lượt gọi AI';
  const plusConcurrency = plusPkg ? `Sinh tối đa ${plusPkg.batchConcurrency} batch đồng thời` : 'Sinh tối đa 3 batch đồng thời';
  const plusExtraFeatures = (plusPkg?.features ?? ['Hồi lại hàng tuần']).filter(
    (f) => !f.toLowerCase().includes('lượt gọi') && !f.toLowerCase().includes('batch')
  );

  const proPrice = proPkg ? `${proPkg.price.toLocaleString('vi-VN')}đ` : '20.000đ';
  const proCycle = formatCycle(proPkg?.cycle ?? 'WEEKLY');
  const proLimit = proPkg ? `${proPkg.quotaLimit} lượt gọi AI` : '300 lượt gọi AI';
  const proConcurrency = proPkg ? `Sinh tối đa ${proPkg.batchConcurrency} batch đồng thời` : 'Sinh tối đa 4 batch đồng thời';
  const proExtraFeatures = (proPkg?.features ?? ['Hồi lại hàng tuần']).filter(
    (f) => !f.toLowerCase().includes('lượt gọi') && !f.toLowerCase().includes('batch')
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-3 sm:p-4 backdrop-blur-md animate-in fade-in duration-200"
      onMouseDown={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-purple-500/25 bg-neutral-primary-soft p-5 sm:p-6 shadow-2xl transition-all">
        {/* Glow trang trí nền */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
          <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-purple-500/15 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-indigo-500/15 blur-3xl" />
        </div>

        {/* Modal Header */}
        <div className="relative flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/15 border border-purple-500/25 px-2.5 py-0.5 text-[11px] font-bold text-purple-600 dark:text-purple-400">
                <ShieldCheck size={12} />
                NÂNG CẤP & GIA HẠN GÓI DỊCH VỤ
              </span>
              <h2 id="upgrade-modal-title" className="text-xl font-bold text-heading mt-1.5">
                Chọn gói mở rộng hạn mức AI
              </h2>
            </div>
          </div>
          <button
            type="button"
            aria-label="Đóng"
            disabled={isRedirecting}
            onClick={handleClose}
            className="rounded-lg p-1.5 text-body-subtle hover:bg-neutral-secondary hover:text-heading transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <p className="mt-1.5 text-xs text-body-subtle leading-relaxed">
          Nâng cấp hoặc gia hạn gói tài khoản để tăng lượt gọi AI sinh Test Plan, Test Case và Unit Test liên tục không bị gián đoạn. Thanh toán trực tuyến an toàn qua <strong>VNPay</strong>.
        </p>

        {/* Thanh trạng thái gói hiện tại của người dùng */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border-default/80 bg-neutral-secondary-soft/60 px-3.5 py-2.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-body-subtle">Gói hiện tại:</span>
            {effectiveCurrentTier === 'PRO' ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/20 border border-purple-500/40 px-2.5 py-0.5 text-xs font-bold text-purple-600 dark:text-purple-400">
                <ShieldCheck size={12} /> {t('Gói Chuyên Nghiệp (PRO)', 'Professional plan (PRO)')}
              </span>
            ) : effectiveCurrentTier === 'PLUS' ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 px-2.5 py-0.5 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                <Zap size={12} /> {t('Gói Tiêu Chuẩn (PLUS)', 'Standard plan (PLUS)')}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-neutral-secondary border border-border-default px-2.5 py-0.5 text-xs font-semibold text-body">
                <ShieldCheck size={12} /> {t('Gói Miễn Phí (FREE)', 'Free plan (FREE)')}
              </span>
            )}
          </div>
          {quota && (
            <div className="text-[11px] text-body-subtle">
              Lượt AI còn lại:{' '}
              <strong className="text-heading font-bold">
                {remainingQuota != null ? remainingQuota : quota.limit ? quota.limit - quota.used : '--'}/{quota.limit ?? 100}
              </strong>
            </div>
          )}
        </div>

        {/* Danh sách các gói đang kích hoạt (PLUS và PRO) */}
        {!isPlusActive && !isProActive ? (
          <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-center">
            <ShieldCheck size={28} className="mx-auto text-amber-500 mb-2" />
            <h3 className="text-sm font-bold text-heading">Các gói nâng cấp đang tạm dừng</h3>
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
            className={`cursor-pointer relative flex flex-col justify-between rounded-xl border-2 p-4 transition-all duration-200 ${
              selectedTier === 'PLUS'
                ? 'border-indigo-500 bg-indigo-500/10 shadow-lg ring-2 ring-indigo-500/20'
                : 'border-border-default bg-neutral-secondary-soft/40 hover:border-indigo-400/50 hover:bg-neutral-secondary-soft/70'
            }`}
          >
            {/* Huy hiệu nhận biết gói đang dùng */}
            {effectiveCurrentTier === 'PLUS' && (
              <span className="absolute -top-2.5 left-3 inline-flex items-center gap-1 rounded-full bg-emerald-600 text-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider shadow-sm">
                <CheckCircle2 size={10} strokeWidth={3} /> {t('Đang sử dụng', 'Current plan')}
              </span>
            )}

            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Gói PLUS
                </span>
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full transition-colors ${
                    selectedTier === 'PLUS'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'border border-border-default-strong text-transparent'
                  }`}
                >
                  <Check size={12} strokeWidth={3} />
                </span>
              </div>

              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-bold tracking-tight text-heading font-sans tabular-nums">{plusPrice}</span>
                <span className="text-[11px] text-body-subtle">{plusCycle}</span>
              </div>

              {effectiveCurrentTier === 'PLUS' ? (
                <p className="mt-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  Gói hiện tại • Gia hạn thêm 1 {plusCycle.replace('/', '')}
                </p>
              ) : effectiveCurrentTier === 'PRO' ? (
                <p className="mt-1 text-[11px] text-body-subtle">
                  Gói thấp hơn gói PRO hiện tại
                </p>
              ) : (
                <p className="mt-1 text-[11px] text-body-subtle">
                  {plusPkg?.description || 'Phù hợp nhu cầu cơ bản hàng tuần'}
                </p>
              )}

              <div className="my-2.5 border-t border-border-default-subtle" />

              <ul className="space-y-1.5 text-xs text-heading">
                <li className="flex items-center gap-1.5 font-medium">
                  <Check size={13} className="shrink-0 text-indigo-500" />
                  <span><strong>{plusLimit}</strong> {plusCycle}</span>
                </li>
                {plusExtraFeatures.map((feat, idx) => (
                  <li key={idx} className="flex items-center gap-1.5 text-body-subtle">
                    <Check size={13} className="shrink-0 text-indigo-500" />
                    <span>{feat}</span>
                  </li>
                ))}
                <li className="flex items-center gap-1.5 text-body-subtle">
                  <Check size={13} className="shrink-0 text-indigo-500" />
                  <span>{plusConcurrency}</span>
                </li>
              </ul>
            </div>

            <div className="mt-3 pt-2 text-center text-[11px] font-medium">
              {selectedTier === 'PLUS' ? (
                <span className="text-indigo-600 dark:text-indigo-400 font-bold">
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
            className={`cursor-pointer relative flex flex-col justify-between rounded-xl border-2 p-4 transition-all duration-200 ${
              selectedTier === 'PRO'
                ? 'border-purple-500 bg-purple-500/10 shadow-lg ring-2 ring-purple-500/20'
                : 'border-border-default bg-neutral-secondary-soft/40 hover:border-purple-400/50 hover:bg-neutral-secondary-soft/70'
            }`}
          >
            {/* Huy hiệu nhận biết gói đang dùng hoặc khuyên dùng */}
            {effectiveCurrentTier === 'PRO' ? (
              <span className="absolute -top-2.5 left-3 inline-flex items-center gap-1 rounded-full bg-emerald-600 text-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider shadow-sm">
                <CheckCircle2 size={10} strokeWidth={3} /> {t('Đang sử dụng', 'Current plan')}
              </span>
            ) : (
              <span className="absolute -top-2.5 right-3 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 px-2.5 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider shadow-sm">
                {t('KHUYÊN DÙNG', 'RECOMMENDED')}
              </span>
            )}

            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                  Gói PRO
                </span>
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full transition-colors ${
                    selectedTier === 'PRO'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'border border-border-default-strong text-transparent'
                  }`}
                >
                  <Check size={12} strokeWidth={3} />
                </span>
              </div>

              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-bold tracking-tight text-heading font-sans tabular-nums">{proPrice}</span>
                <span className="text-[11px] text-body-subtle">{proCycle}</span>
              </div>

              {effectiveCurrentTier === 'PRO' ? (
                <p className="mt-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  Gói hiện tại • Gia hạn thêm 1 {proCycle.replace('/', '')}
                </p>
              ) : (
                <p className="mt-1 text-[11px] text-purple-600 dark:text-purple-400 font-medium">
                  {proPkg?.description || 'Tối đa công suất kiểm thử AI'}
                </p>
              )}

              <div className="my-2.5 border-t border-border-default-subtle" />

              <ul className="space-y-1.5 text-xs text-heading">
                <li className="flex items-center gap-1.5 font-medium">
                  <Check size={13} className="shrink-0 text-purple-500" />
                  <span><strong>{proLimit}</strong> {proCycle}</span>
                </li>
                {proExtraFeatures.map((feat, idx) => (
                  <li key={idx} className="flex items-center gap-1.5 text-body-subtle">
                    <Check size={13} className="shrink-0 text-purple-500" />
                    <span>{feat}</span>
                  </li>
                ))}
                <li className="flex items-center gap-1.5 text-body-subtle">
                  <Check size={13} className="shrink-0 text-purple-500" />
                  <span>{proConcurrency}</span>
                </li>
              </ul>
            </div>

            <div className="mt-3 pt-2 text-center text-[11px] font-medium">
              {selectedTier === 'PRO' ? (
                <span className="text-purple-600 dark:text-purple-400 font-bold">
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
          <p role="alert" className="mt-4 rounded-lg bg-danger-soft p-3 text-xs font-medium text-fg-danger-strong">
            {error}
          </p>
        )}

        {/* Khối tóm tắt giao dịch thanh toán */}
        {(isPlusActive || isProActive) && (
          <div className="mt-4 rounded-xl border border-border-default/80 bg-neutral-secondary-soft/50 p-3 sm:p-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <CreditCard size={15} className="text-purple-600 dark:text-purple-400 shrink-0" />
                <div className="text-body-subtle text-[11px] sm:text-xs min-w-0">
                  <span>Dự kiến thực hiện: </span>
                  <strong className="text-heading font-bold text-foreground">
                    {actionText}
                  </strong>
                  <span className="text-body-subtle"> (Cổng thanh toán VNPay)</span>
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-1.5 shrink-0 whitespace-nowrap pt-1 sm:pt-0 border-t sm:border-t-0 border-border-default-subtle">
                <span className="text-xs text-body-subtle">Số tiền: </span>
                <span className="text-base font-extrabold text-heading text-purple-600 dark:text-purple-400 font-sans tabular-nums whitespace-nowrap">
                  {selectedPriceText}
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
            className="btn text-xs px-5 py-2.5 font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isRedirecting || (!isPlusActive && !isProActive)}
            onClick={handlePayVnpay}
          >
            {isRedirecting ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Đang chuyển sang VNPay...
              </>
            ) : !isPlusActive && !isProActive ? (
              <span>Dịch vụ đang tạm dừng</span>
            ) : (
              <>
                {isCurrentTierSelected ? <RefreshCw size={14} /> : <CreditCard size={14} />}
                <span>
                  Thanh toán qua VNPay ({selectedPriceText})
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

