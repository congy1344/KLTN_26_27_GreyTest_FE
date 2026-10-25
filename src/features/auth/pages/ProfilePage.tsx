import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  Mail,
  Shield,
  User,
  Calendar,
  AlertTriangle,
  Layers,
  Sparkles,
  Zap,
} from 'lucide-react';
import { AppShell } from '../../../shared/components/AppShell';
import { useCancelSubscription, useCurrentUser, useUserQuota } from '../hooks/useAuth';
import { useLanguage } from '../../../shared/i18n/language';
import { UpgradeToProModal } from '../../../shared/components/UpgradeToProModal';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { getErrorMessage } from '../../../shared/api/api-client';
import { PaymentHistory } from '../../payment/components/PaymentHistory';

export function ProfilePage() {
  const { data: user, isLoading: isUserLoading } = useCurrentUser();
  const { data: quota } = useUserQuota();
  const { t } = useLanguage();
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [modalTier, setModalTier] = useState<'PLUS' | 'PRO'>('PRO');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const cancelPlan = useCancelSubscription();

  const tier = user?.tier ?? quota?.tier ?? 'FREE';
  const isPro = tier === 'PRO';
  const isPlus = tier === 'PLUS';
  const isWeekly = isPro || isPlus;

  // Tính toán hạn mức và tỷ lệ sử dụng
  const quotaLimit = quota?.limit ?? (isPro ? 300 : isPlus ? 200 : 100);
  const quotaUsed = quota?.used ?? 0;
  const remaining = quota?.remaining ?? Math.max(0, quotaLimit - quotaUsed);
  const percentage = Math.min(100, Math.round((quotaUsed / quotaLimit) * 100));

  // Định dạng ngày hiển thị dd/MM/yyyy ổn định độc lập timezone
  const formatDateVN = (dateStr?: string | null) => {
    if (!dateStr) return null;
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${parseInt(day, 10)}/${parseInt(month, 10)}/${year}`;
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d.toLocaleDateString('vi-VN');
  };

  const formattedPeriodStart = formatDateVN(quota?.periodStart);
  const formattedResetDate = formatDateVN(quota?.resetDate);

  const openUpgradeModal = (targetTier: 'PLUS' | 'PRO') => {
    if (cancelPlan.isPending) return;
    setModalTier(targetTier);
    setUpgradeModalOpen(true);
  };

  return (
    <AppShell maxWidth="wide">
      <div className="space-y-6 font-sans animate-fade-in">
        {/* Thanh tiêu đề & nút quay lại */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/projects"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border-default bg-neutral-primary-soft text-body-subtle transition-colors hover:border-border-default-strong hover:text-heading"
              title={t('Quay lại danh sách dự án', 'Back to projects')}
            >
              <ArrowLeft size={16} />
            </Link>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-heading">
                {t('Hồ sơ cá nhân & Gói dịch vụ', 'Profile & Subscription')}
              </h1>
              <p className="text-xs text-body-subtle">
                {t(
                  'Xem thông tin tài khoản, theo dõi lượt sử dụng AI và quản lý gói nâng cấp.',
                  'View account details, monitor AI usage quota, and manage tier upgrades.'
                )}
              </p>
            </div>
          </div>

          {/* Badge trạng thái gói trên header */}
          <div className="flex items-center gap-2">
            {isPro ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-600 dark:text-purple-400">
                <Sparkles size={13} /> {t('Tài khoản PRO', 'PRO Account')}
              </span>
            ) : isPlus ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                <Zap size={13} /> {t('Tài khoản PLUS', 'PLUS Account')}
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full border border-border-default bg-neutral-secondary-soft px-3 py-1 text-xs font-medium text-body-subtle">
                {t('Tài khoản FREE', 'FREE Account')}
              </span>
            )}
          </div>
        </div>

        {/* Khối 1: Thông tin người dùng */}
        <div className="rounded-xl border border-border-default bg-neutral-primary-soft p-5 shadow-xs">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div
                className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-lg font-bold ${
                  isPro
                    ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-xs'
                    : isPlus
                    ? 'bg-gradient-to-tr from-indigo-600 to-blue-600 text-white shadow-xs'
                    : 'bg-neutral-secondary text-heading border border-border-default'
                }`}
              >
                {user?.fullName ? user.fullName.charAt(0).toUpperCase() : <User size={24} />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-heading">
                    {user?.fullName ?? (isUserLoading ? '...' : 'Người dùng')}
                  </h2>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                      user?.role === 'ADMIN'
                        ? 'bg-danger-soft text-fg-danger-strong border border-border-danger-subtle'
                        : 'bg-neutral-secondary text-body-subtle'
                    }`}
                  >
                    {user?.role ?? 'USER'}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-4 text-xs text-body-subtle">
                  <span className="flex items-center gap-1.5">
                    <Mail size={13} className="text-body-subtle/80" />
                    {user?.email ?? '—'}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Shield size={13} className="text-body-subtle/80" />
                    {user?.role === 'ADMIN' ? t('Quản trị viên', 'Administrator') : t('Thành viên', 'Member')}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              {(isPro || isPlus) && (
                <button
                  type="button"
                  disabled={cancelPlan.isPending}
                  onClick={() => { cancelPlan.reset(); setCancelDialogOpen(true); }}
                  className="btn-ghost-danger border border-border-danger-subtle px-4 py-2 text-xs disabled:opacity-50"
                >
                  {t('Hủy gói', 'Cancel plan')}
                </button>
              )}
              {!isPro && (
                <button
                  type="button"
                  onClick={() => openUpgradeModal('PRO')}
                  className="btn text-xs px-4 py-2 font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-xs flex items-center gap-1.5"
                >
                  <Sparkles size={13} />
                  {t('Nâng cấp gói', 'Upgrade Tier')}
                </button>
              )}
            </div>
          </div>
        </div>

        {cancelPlan.isError && (
          <p role="alert" className="rounded-lg border border-border-danger-subtle bg-danger-soft p-3 text-sm text-fg-danger-strong">
            {t('Không thể hủy gói: ', 'Could not cancel plan: ')}{getErrorMessage(cancelPlan.error)}
          </p>
        )}
        {cancelPlan.isSuccess && (
          <p role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-600 dark:text-emerald-400">
            {t('Đã hủy gói. Tài khoản đã chuyển về Free.', 'Plan canceled. Your account is now on Free.')}
          </p>
        )}

        {/* Khối 2: Hạn mức sử dụng (Quota Usage) */}
        <div className="rounded-xl border border-border-default bg-neutral-primary-soft p-5 shadow-xs">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-heading">
                {isWeekly
                  ? t('Hạn mức gọi AI tuần này', 'Weekly AI Call Quota')
                  : t('Hạn mức gọi AI tháng này', 'Monthly AI Call Quota')}
              </h3>
              <p className="text-xs text-body-subtle mt-0.5">
                {t(
                  '1 lượt tương ứng với 2 Unit Test, 2 Test Case, 2 Test Plan hoặc 3 phương thức mã nguồn.',
                  '1 call equals 2 Unit Tests, 2 Test Cases, 2 Test Plans, or 3 source methods.'
                )}
              </p>
            </div>

            {/* Hiển thị ngày bắt đầu / nâng cấp và ngày kết thúc chu kỳ */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-body-subtle">
              {formattedPeriodStart && (
                <span className="flex items-center gap-1.5">
                  <Calendar size={13} className="text-body-subtle/80" />
                  <span>{isWeekly ? t('Ngày kích hoạt:', 'Activated on:') : t('Bắt đầu:', 'Started on:')}</span>{' '}
                  <strong className="font-medium text-heading">{formattedPeriodStart}</strong>
                </span>
              )}
              {formattedResetDate && (
                <span className="flex items-center gap-1.5">
                  <Calendar size={13} className="text-body-subtle/80" />
                  <span>{t('Ngày kết thúc:', 'Ends on:')}</span>{' '}
                  <strong className="font-medium text-heading">{formattedResetDate}</strong>
                </span>
              )}
            </div>
          </div>

          {/* Chỉ số & Thanh tiến độ */}
          <div className="space-y-2.5">
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-body-subtle">
                {t('Đã sử dụng:', 'Used:')}{' '}
                <strong className="text-sm font-semibold text-heading tabular-nums">{quotaUsed}</strong> / <span className="tabular-nums">{quotaLimit}</span> {t('lượt', 'calls')}
              </span>
              <span
                className={`font-semibold tabular-nums ${
                  percentage >= 90
                    ? 'text-fg-danger-strong'
                    : percentage >= 75
                      ? 'text-fg-warning'
                      : 'text-fg-brand-strong'
                }`}
              >
                {percentage}%
              </span>
            </div>

            <div className="relative h-2 w-full overflow-hidden rounded-full bg-neutral-secondary">
              <div
                className={`h-full transition-all duration-500 ease-out ${
                  percentage >= 90
                    ? 'bg-rose-500'
                    : percentage >= 75
                      ? 'bg-amber-500'
                      : isPro
                      ? 'bg-purple-600'
                      : isPlus
                      ? 'bg-indigo-600'
                      : 'bg-brand'
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between text-xs text-body-subtle pt-0.5">
              <span>
                {t('Còn lại:', 'Remaining:')}{' '}
                <strong className="font-semibold text-heading tabular-nums">{remaining}</strong> {t('lượt', 'calls')}
              </span>
              {quota?.exceeded && (
                <span className="flex items-center gap-1 font-medium text-fg-danger-strong">
                  <AlertTriangle size={13} />
                  {isWeekly
                    ? t('Đã hết hạn mức sử dụng trong tuần', 'Weekly quota exceeded')
                    : t('Đã hết hạn mức sử dụng trong tháng', 'Monthly quota exceeded')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Khối 3: Bảng so sánh 3 gói dịch vụ */}
        <div className="pt-2">
          <div className="mb-4">
            <h3 className="text-base font-bold tracking-tight text-heading">
              {t('Các gói dịch vụ GreyTest', 'GreyTest Service Tiers')}
            </h3>
            <p className="text-xs text-body-subtle">
              {t(
                'Lựa chọn gói phù hợp với quy mô kiểm thử và dự án của bạn. Hỗ trợ thanh toán nhanh qua VNPay.',
                'Choose the tier that matches your testing scale and project needs. Fast payment via VNPay.'
              )}
            </p>
          </div>

          <p className="mb-4 text-xs text-body-subtle">
            {t('Mỗi batch xử lý một nhóm dữ liệu. Tốc độ sinh thực tế còn phụ thuộc model AI và độ phức tạp của source code.', 'Each batch processes a group of items. Actual generation speed also depends on the AI model and source code complexity.')}
          </p>
          <div className="grid gap-5 md:grid-cols-3">
            {/* 1. Thẻ Gói FREE */}
            <div
              className={`relative flex flex-col justify-between rounded-xl border p-5 transition-all ${
                tier === 'FREE'
                  ? 'border-emerald-500/50 bg-neutral-primary-soft shadow-md ring-2 ring-emerald-500/20'
                  : 'border-border-default bg-neutral-primary-soft/80 opacity-90'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-body-subtle">
                    {t('GÓI MIỄN PHÍ', 'FREE TIER')}
                  </span>
                  {tier === 'FREE' && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      <Check size={11} strokeWidth={2.5} />
                      {t('Gói hiện tại', 'Current plan')}
                    </span>
                  )}
                </div>

                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-2xl font-bold tracking-tight text-heading">0đ</span>
                  <span className="text-xs text-body-subtle">/{t('tháng', 'month')}</span>
                </div>

                <p className="mt-1.5 text-xs text-body-subtle leading-relaxed min-h-[36px]">
                  {t(
                    'Phù hợp cho đồ án học tập, thử nghiệm các tính năng sinh test tự động cơ bản.',
                    'Ideal for coursework and evaluating fundamental AI test generation features.'
                  )}
                </p>

                <div className="my-4 border-t border-border-default-subtle" />

                <ul className="space-y-2.5 text-xs">
                  <li className="flex items-start gap-2.5 text-heading">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                      <Check size={11} strokeWidth={2.5} />
                    </span>
                    <span>
                      <strong className="font-semibold">100 {t('lượt gọi AI', 'AI calls')}</strong> / {t('tháng', 'month')}
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5 text-heading">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                      <Check size={11} strokeWidth={2.5} />
                    </span>
                    <span>{t('Sinh Test Plan, Test Case và Unit Test Spring Boot', 'Spring Boot Test Plan, Test Case & Unit Test')}</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-heading">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                      <Zap size={11} />
                    </span>
                    <span>{t('Sinh tối đa 2 batch đồng thời', 'Generate up to 2 batches concurrently')}</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-body-subtle">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-neutral-secondary text-body-subtle">
                      <Layers size={11} />
                    </span>
                    <span>{t('Reset hạn mức vào đầu mỗi tháng', 'Resets at the start of each month')}</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6">
                {tier === 'FREE' ? (
                  <button
                    type="button"
                    disabled
                    className="w-full rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 cursor-default text-center"
                  >
                    {t('Đang sử dụng', 'Currently active')}
                  </button>
                ) : (
                  <div className="py-2 text-center text-xs text-body-subtle font-medium">
                    {t('Gói cơ bản', 'Basic tier')}
                  </div>
                )}
              </div>
            </div>

            {/* 2. Thẻ Gói PLUS */}
            <div
              className={`relative flex flex-col justify-between rounded-xl border p-5 transition-all ${
                tier === 'PLUS'
                  ? 'border-indigo-500/70 bg-gradient-to-b from-indigo-500/10 to-transparent shadow-md ring-2 ring-indigo-500/30'
                  : 'border-indigo-500/30 bg-neutral-primary-soft hover:border-indigo-500/60 shadow-xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    {t('GÓI TIÊU CHUẨN (PLUS)', 'STANDARD TIER (PLUS)')}
                  </span>
                  {tier === 'PLUS' && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 px-2.5 py-0.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                      <Check size={11} strokeWidth={2.5} />
                      {t('Đang kích hoạt', 'Active plan')}
                    </span>
                  )}
                </div>

                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-2xl font-bold tracking-tight text-heading">10.000đ</span>
                  <span className="text-xs text-body-subtle">/{t('tuần', 'week')}</span>
                </div>

                <p className="mt-1.5 text-xs text-body-subtle leading-relaxed min-h-[36px]">
                  {t(
                    'Phục vụ kiểm thử liên tục cho các dịch vụ quy mô vừa với chi phí thử nghiệm tối thiểu.',
                    'Continuous testing for mid-sized services with minimal test cost.'
                  )}
                </p>

                <div className="my-4 border-t border-border-default-subtle" />

                <ul className="space-y-2.5 text-xs">
                  <li className="flex items-start gap-2.5 text-heading font-medium">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                      <Check size={11} strokeWidth={2.5} />
                    </span>
                    <span>
                      <strong className="text-indigo-600 dark:text-indigo-400 font-semibold">200 {t('lượt gọi AI', 'AI calls')}</strong> / {t('tuần', 'week')}
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5 text-heading">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                      <Check size={11} strokeWidth={2.5} />
                    </span>
                    <span>{t('Sinh tối đa 3 batch đồng thời', 'Generate up to 3 batches concurrently')}</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-heading">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                      <Check size={11} strokeWidth={2.5} />
                    </span>
                    <span>{t('Tự động hồi lại 200 lượt sau mỗi tuần', 'Automatically resets 200 calls weekly')}</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-heading">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                      <Check size={11} strokeWidth={2.5} />
                    </span>
                    <span>{t('Thanh toán tiện lợi qua cổng VNPay', 'Instant online payment via VNPay')}</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6">
                {tier === 'PLUS' ? (
                  <div className="space-y-2">
                    <div className="flex flex-col items-center justify-center rounded-lg bg-indigo-500/15 py-2 px-3 text-center">
                      <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                        {t('Gói PLUS đang hoạt động', 'PLUS plan active')}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => openUpgradeModal('PLUS')}
                      className="w-full rounded-lg py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10 border border-indigo-500/30 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Zap size={12} />
                      {t('Gia hạn thêm gói PLUS (10.000đ)', 'Renew PLUS plan (10.000đ)')}
                    </button>
                  </div>
                ) : isPro ? (
                  <button
                    type="button"
                    onClick={() => openUpgradeModal('PLUS')}
                    className="w-full rounded-lg py-2 text-xs font-medium text-body-subtle hover:text-heading border border-border-default hover:bg-neutral-secondary transition-colors flex items-center justify-center gap-1.5"
                  >
                    {t('Chuyển sang gói PLUS (10.000đ)', 'Switch to PLUS (10.000đ)')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => openUpgradeModal('PLUS')}
                    className="w-full rounded-lg py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Zap size={13} />
                    {t('Nâng cấp PLUS (10.000đ)', 'Upgrade to PLUS (10.000đ)')}
                  </button>
                )}
              </div>
            </div>

            {/* 3. Thẻ Gói PRO */}
            <div
              className={`relative flex flex-col justify-between rounded-xl border p-5 transition-all ${
                isPro
                  ? 'border-purple-500/70 bg-gradient-to-b from-purple-500/15 to-transparent shadow-md ring-2 ring-purple-500/30'
                  : 'border-purple-500/40 bg-gradient-to-b from-purple-500/5 to-transparent shadow-xs hover:border-purple-500/70'
              }`}
            >
              <span className="absolute -top-2.5 right-4 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-xs">
                {t('KHUYÊN DÙNG', 'RECOMMENDED')}
              </span>

              <div>
                <div className="flex items-center justify-between">
                  <div className="text-purple-600 dark:text-purple-400 font-bold text-xs uppercase tracking-wider">
                    {t('GÓI CHUYÊN NGHIỆP (PRO)', 'PROFESSIONAL TIER (PRO)')}
                  </div>
                  {isPro && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/20 border border-purple-500/40 px-2.5 py-0.5 text-[10px] font-bold text-purple-600 dark:text-purple-400">
                      <Check size={11} strokeWidth={2.5} />
                      {t('Đang kích hoạt', 'Active plan')}
                    </span>
                  )}
                </div>

                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-2xl font-bold tracking-tight text-heading">20.000đ</span>
                  <span className="text-xs text-body-subtle">/{t('tuần', 'week')}</span>
                </div>

                <p className="mt-1.5 text-xs text-body-subtle leading-relaxed min-h-[36px]">
                  {t(
                    'Mở rộng tối đa hạn mức phục vụ nghiên cứu thực nghiệm và kiểm thử chuyên sâu toàn diện.',
                    'Maximize quotas for experimental evaluation and deep comprehensive grey-box testing.'
                  )}
                </p>

                <div className="my-4 border-t border-purple-500/20" />

                <ul className="space-y-2.5 text-xs">
                  <li className="flex items-start gap-2.5 text-heading font-medium">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-400">
                      <Check size={11} strokeWidth={2.5} />
                    </span>
                    <span>
                      <strong className="text-purple-600 dark:text-purple-400 font-semibold">300 {t('lượt gọi AI', 'AI calls')}</strong> / {t('tuần', 'week')}
                    </span>
                  </li>
                  <li className="flex items-start gap-2.5 text-heading">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-400">
                      <Check size={11} strokeWidth={2.5} />
                    </span>
                    <span>{t('Sinh tối đa 4 batch đồng thời', 'Generate up to 4 batches concurrently')}</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-heading">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-400">
                      <Check size={11} strokeWidth={2.5} />
                    </span>
                    <span>{t('Tự động hồi lại 300 lượt sau mỗi tuần theo chu kỳ', 'Automatically resets 300 calls weekly')}</span>
                  </li>
                  <li className="flex items-start gap-2.5 text-heading">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-400">
                      <Check size={11} strokeWidth={2.5} />
                    </span>
                    <span>{t('Thanh toán tiện lợi qua cổng VNPay', 'Instant online payment via VNPay')}</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6">
                {isPro ? (
                  <div className="space-y-2">
                    <div className="flex flex-col items-center justify-center rounded-lg bg-purple-500/15 py-2 px-3 text-center">
                      <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                        {t('Gói PRO cao cấp nhất đang hoạt động', 'Top-tier PRO plan active')}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => openUpgradeModal('PRO')}
                      className="w-full rounded-lg py-1.5 text-xs font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 border border-purple-500/30 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Sparkles size={12} />
                      {t('Gia hạn thêm gói PRO (20.000đ)', 'Renew PRO plan (20.000đ)')}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => openUpgradeModal('PRO')}
                    className="w-full rounded-lg py-2 text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Sparkles size={13} />
                    {t('Nâng cấp PRO (20.000đ)', 'Upgrade to PRO (20.000đ)')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {user && <PaymentHistory userId={user.id} />}

        {/* Modal nâng cấp gói (PLUS / PRO) qua VNPay */}
        <ConfirmDialog
          open={cancelDialogOpen}
          title={t('Hủy gói hiện tại?', 'Cancel your current plan?')}
          description={t(
            'Tài khoản sẽ chuyển về gói Free ngay với hạn mức theo tháng. Số lượt đã sử dụng được giữ lại; nếu đã vượt hạn mức Free, bạn cần đợi chu kỳ tiếp theo hoặc nâng cấp lại.',
            'Your account will switch to Free immediately with a monthly quota. Used calls are retained; if you exceed the Free limit, wait for the next period or upgrade again.'
          )}
          confirmLabel={cancelPlan.isPending ? t('Đang hủy...', 'Canceling...') : t('Xác nhận hủy gói', 'Confirm cancellation')}
          cancelLabel={t('Giữ gói', 'Keep plan')}
          pending={cancelPlan.isPending}
          onCancel={() => setCancelDialogOpen(false)}
          onConfirm={() => cancelPlan.mutate(undefined, { onSettled: () => setCancelDialogOpen(false) })}
        />
        <UpgradeToProModal
          open={upgradeModalOpen}
          defaultTier={modalTier}
          currentTier={tier}
          onClose={() => setUpgradeModalOpen(false)}
        />
      </div>
    </AppShell>
  );
}
