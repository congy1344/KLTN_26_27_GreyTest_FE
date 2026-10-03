import { useState, useEffect } from 'react';
import { Crown, Check, Zap, Sparkles, X, Loader2, ArrowRight } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient, getErrorMessage } from '../api/api-client';

interface UpgradeToProModalProps {
  open?: boolean;
  onClose?: () => void;
}

export function UpgradeToProModal({ open: controlledOpen, onClose }: UpgradeToProModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const queryClient = useQueryClient();

  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;

  const handleClose = () => {
    if (isUpgrading) return;
    setSuccess(false);
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
      setSuccess(false);
      setInternalOpen(true);
    };

    window.addEventListener('quota-exceeded', handleQuotaExceeded);
    return () => {
      window.removeEventListener('quota-exceeded', handleQuotaExceeded);
    };
  }, []);

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    setError(null);
    try {
      await apiClient.post('/user/upgrade-pro');
      setSuccess(true);
      // Invalidate toàn bộ query liên quan đến auth, quota và projects để cập nhật UI
      queryClient.invalidateQueries();
      setTimeout(() => {
        setIsUpgrading(false);
        handleClose();
      }, 2000);
    } catch (err) {
      setError(getErrorMessage(err));
      setIsUpgrading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm animate-in fade-in duration-200"
      onMouseDown={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-purple-500/20 bg-neutral-primary-soft p-6 shadow-2xl transition-all">
        {/* Decorative background glow */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-purple-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-amber-500/10 blur-3xl" />

        <div className="relative flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 shadow-md shadow-purple-500/30 text-white">
              <Crown size={24} className="text-amber-300" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/15 px-2.5 py-0.5 text-xs font-bold text-purple-600 dark:text-purple-400">
                <Sparkles size={12} /> NÂNG CẤP GÓI
              </span>
              <h2 id="upgrade-modal-title" className="text-xl font-bold text-heading mt-1">
                Nâng cấp lên gói PRO
              </h2>
            </div>
          </div>
          <button
            type="button"
            aria-label="Đóng"
            disabled={isUpgrading}
            onClick={handleClose}
            className="rounded-lg p-1.5 text-body-subtle hover:bg-neutral-secondary hover:text-heading transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {success ? (
          <div className="my-8 text-center animate-in zoom-in-95 duration-200">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 mb-4">
              <Check size={32} />
            </div>
            <h3 className="text-lg font-bold text-heading">Nâng cấp thành công!</h3>
            <p className="mt-1 text-sm text-body-subtle">
              Tài khoản của bạn đã được chuyển sang gói <strong>PRO</strong> với <strong>1.000 lượt gọi AI</strong> mỗi tháng.
            </p>
          </div>
        ) : (
          <>
            <p className="mt-4 text-sm text-body-subtle leading-relaxed">
              Bạn đã sử dụng hết <strong>100 lượt gọi AI</strong> trong tháng của gói Free. Nâng cấp lên gói <strong>PRO</strong> để tiếp tục sinh Test Plan, Test Case và Unit Test chất lượng cao không gián đoạn!
            </p>

            {/* Comparison Cards */}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border-default bg-neutral-secondary-soft/50 p-4">
                <div className="text-xs font-semibold text-body-subtle uppercase tracking-wider">Gói FREE</div>
                <div className="mt-2 text-2xl font-bold text-heading">100 <span className="text-xs font-normal text-body-subtle">lượt/tháng</span></div>
                <ul className="mt-3 space-y-2 text-xs text-body-subtle">
                  <li className="flex items-center gap-1.5 text-fg-danger-strong font-medium">
                    <X size={14} className="shrink-0 text-danger" /> Đã dùng hết 100/100
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check size={14} className="shrink-0 text-success" /> Sinh kiểm thử cơ bản
                  </li>
                </ul>
              </div>

              <div className="relative rounded-xl border-2 border-purple-500/40 bg-gradient-to-b from-purple-500/10 to-indigo-500/5 p-4 shadow-sm">
                <span className="absolute -top-2.5 right-3 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider shadow">
                  KHUYÊN DÙNG
                </span>
                <div className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider flex items-center gap-1">
                  <Zap size={13} /> Gói PRO
                </div>
                <div className="mt-2 text-2xl font-bold text-heading text-purple-600 dark:text-purple-400">
                  1.000 <span className="text-xs font-normal text-body-subtle">lượt/tháng</span></div>
                <ul className="mt-3 space-y-2 text-xs text-heading font-medium">
                  <li className="flex items-center gap-1.5">
                    <Check size={14} className="shrink-0 text-purple-500" /> Tăng gấp 10 lần lượt gọi
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check size={14} className="shrink-0 text-purple-500" /> Ưu tiên tài nguyên & tốc độ
                  </li>
                </ul>
              </div>
            </div>

            {error && (
              <p role="alert" className="mt-4 rounded-lg bg-danger-soft p-3 text-xs font-medium text-fg-danger-strong">
                {error}
              </p>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                className="btn btn-secondary text-xs px-4 py-2.5"
                disabled={isUpgrading}
                onClick={handleClose}
              >
                Để sau
              </button>
              <button
                type="button"
                className="btn text-xs px-5 py-2.5 font-bold text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-700 hover:to-indigo-700 shadow-md shadow-purple-500/25 flex items-center gap-2"
                disabled={isUpgrading}
                onClick={handleUpgrade}
              >
                {isUpgrading ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Đang kích hoạt...
                  </>
                ) : (
                  <>
                    Nâng cấp lên PRO ngay <ArrowRight size={15} />
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
