import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Check,
  Mail,
  Shield,
  User,
  Calendar,
  AlertTriangle,
  Zap,
  Moon,
  Sun,
  Settings as SettingsIcon,
  CreditCard,
  MessageSquare,
} from 'lucide-react';
import { AppShell } from '../../../shared/components/AppShell';
import { useCancelSubscription, useCurrentUser, useUserQuota } from '../hooks/useAuth';
import { useLanguage } from '../../../shared/i18n/language';
import { useTheme } from '../../../shared/theme/theme';
import { formatSemanticLabel } from '../../../shared/components/SemanticBadge';
import { UpgradeToProModal } from '../../../shared/components/UpgradeToProModal';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { getErrorMessage } from '../../../shared/api/api-client';
import { PaymentHistory } from '../../payment/components/PaymentHistory';
import { fetchPublicTierPackages, PublicTierPackage } from '../../payment/api/payment-api';
import { UserFeedbackSection } from '../../feedback/components/UserFeedbackSection';

/**
 * Trang Cài đặt Hệ thống & Gói dịch vụ (SettingsPage).
 * Phân chia theo 3 tab chuyên biệt:
 * 1. Cài đặt chung: Tùy chỉnh Giao diện (Sáng/Tối), Ngôn ngữ (VI/EN), Thông tin tài khoản & Hạn mức gọi AI.
 * 2. Gói dịch vụ & Hóa đơn: Bảng giá các gói (Free, PLUS, PRO) và Lịch sử thanh toán kèm nút Hủy gói.
 * 3. Phản hồi & Báo lỗi: Gửi phản hồi / báo cáo sự cố cho admin xử lý và theo dõi tiến độ.
 */
export function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const currentTab: 'general' | 'subscription' | 'feedback' =
    tabParam === 'subscription' || tabParam === 'feedback' ? tabParam : 'general';

  const { data: user, isLoading: isUserLoading } = useCurrentUser();
  const { data: quota } = useUserQuota();
  const { t, language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [modalTier, setModalTier] = useState<'PLUS' | 'PRO'>('PRO');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const cancelPlan = useCancelSubscription();

  const { data: publicPackages } = useQuery<PublicTierPackage[]>({
    queryKey: ['public-tier-packages'],
    queryFn: fetchPublicTierPackages,
    staleTime: 10_000,
  });

  const tier = user?.tier ?? quota?.tier ?? 'FREE';
  const isPro = tier === 'PRO';
  const isPlus = tier === 'PLUS';
  const isWeekly = isPro || isPlus;

  const isCurrentFree = tier === 'FREE';
  const isCurrentPlus = tier === 'PLUS';
  const isCurrentPro = tier === 'PRO';

  const hasPackages = Boolean(publicPackages && Array.isArray(publicPackages));
  const freePkg = publicPackages?.find((p) => p.code.toUpperCase() === 'FREE');
  const plusPkg = publicPackages?.find((p) => p.code.toUpperCase() === 'PLUS');
  const proPkg = publicPackages?.find((p) => p.code.toUpperCase() === 'PRO');

  const isPlusPaused = hasPackages && !plusPkg;
  const isProPaused = hasPackages && !proPkg;

  const showFree = !hasPackages || Boolean(freePkg) || isCurrentFree;
  const showPlus = !hasPackages || Boolean(plusPkg) || isCurrentPlus;
  const showPro = !hasPackages || Boolean(proPkg) || isCurrentPro;

  const formatCycleText = (cycle?: string) => {
    if (!cycle) return t('tháng', 'month');
    const c = cycle.toUpperCase();
    if (c === 'WEEKLY') return t('tuần', 'week');
    if (c === 'YEARLY') return t('năm', 'year');
    return t('tháng', 'month');
  };

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
    setModalTier(targetTier);
    setUpgradeModalOpen(true);
  };

  const setTab = (tab: 'general' | 'subscription' | 'feedback') => {
    setSearchParams({ tab });
  };

  const quotaLimit = quota?.limit ?? 0;
  const remaining = quota ? Math.max(0, quotaLimit - quota.used) : 0;
  const usedPercent = quota && quotaLimit > 0 ? Math.min(100, Math.round((quota.used / quotaLimit) * 100)) : 0;

  return (
    <AppShell maxWidth="wide">
      <div className="space-y-6">
        {/* Header điều hướng */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
                {t('Cài đặt & Gói dịch vụ', 'Settings & Subscriptions')}
              </h1>
              <p className="text-xs text-body-subtle">
                {t(
                  'Quản lý giao diện, ngôn ngữ hiển thị, gói dịch vụ AI và gửi phản hồi cho ban quản trị.',
                  'Manage display preferences, language, AI subscriptions, and send feedback to admins.'
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/profile"
              className="btn btn-secondary px-3.5 py-1.5 text-xs font-semibold flex items-center gap-1.5"
            >
              <User size={13} />
              {t('Hồ sơ cá nhân', 'User Profile')}
            </Link>
            {isPro ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-600 dark:text-purple-400">
                <Zap size={13} /> {t('Tài khoản PRO', 'PRO Account')}
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

        {/* Thanh chuyển đổi Tab chuyên biệt trong Cài đặt */}
        <div className="flex border-b border-border-default gap-2 sm:gap-6 overflow-x-auto">
          <button
            type="button"
            data-testid="tab-general"
            onClick={() => setTab('general')}
            className={`flex items-center gap-2 border-b-2 pb-3 pt-1 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
              currentTab === 'general'
                ? 'border-brand text-fg-brand-strong'
                : 'border-transparent text-body-subtle hover:border-border-default-strong hover:text-heading'
            }`}
          >
            <SettingsIcon size={16} />
            <span>{t('Cài đặt chung', 'General')}</span>
          </button>

          <button
            type="button"
            data-testid="tab-subscription"
            onClick={() => setTab('subscription')}
            className={`flex items-center gap-2 border-b-2 pb-3 pt-1 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
              currentTab === 'subscription'
                ? 'border-brand text-fg-brand-strong'
                : 'border-transparent text-body-subtle hover:border-border-default-strong hover:text-heading'
            }`}
          >
            <CreditCard size={16} />
            <span>{t('Gói dịch vụ & Hóa đơn', 'Subscription & Invoices')}</span>
          </button>

          <button
            type="button"
            data-testid="tab-feedback"
            onClick={() => setTab('feedback')}
            className={`flex items-center gap-2 border-b-2 pb-3 pt-1 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
              currentTab === 'feedback'
                ? 'border-brand text-fg-brand-strong'
                : 'border-transparent text-body-subtle hover:border-border-default-strong hover:text-heading'
            }`}
          >
            <MessageSquare size={16} />
            <span>{t('Phản hồi & Báo lỗi', 'Feedback & Support')}</span>
          </button>
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

        {/* ============================================================== */}
        {/* TAB 1: CÀI ĐẶT CHUNG (General Settings)                         */}
        {/* ============================================================== */}
        {currentTab === 'general' && (
          <div className="space-y-6 animate-fade-in">
            {/* Khối 1: Tùy chọn Giao diện Sáng/Tối & Ngôn ngữ theo yêu cầu */}
            <div className="rounded-xl border border-border-default bg-neutral-primary-soft p-5 shadow-xs">
              <div className="mb-4">
                <h3 className="text-base font-bold text-heading">
                  {t('Giao diện & Ngôn ngữ', 'Appearance & Language')}
                </h3>
                <p className="text-xs text-body-subtle mt-0.5">
                  {t(
                    'Tùy chỉnh chế độ hiển thị sáng/tối và ngôn ngữ hiển thị của toàn bộ hệ thống.',
                    'Customize dark/light mode and system display language.'
                  )}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Chế độ Giao diện */}
                <div>
                  <span className="block text-xs font-semibold text-heading mb-2">
                    {t('Chế độ giao diện', 'Theme mode')}
                  </span>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      data-testid="theme-light-btn"
                      onClick={() => theme !== 'light' && toggleTheme()}
                      className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                        theme === 'light'
                          ? 'border-brand bg-brand-softer text-fg-brand-strong ring-1 ring-brand'
                          : 'border-border-default bg-neutral-secondary-soft/50 text-body hover:border-border-default-strong hover:bg-neutral-secondary-soft'
                      }`}
                    >
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        theme === 'light' ? 'bg-brand text-white shadow-xs' : 'bg-neutral-secondary text-body-subtle'
                      }`}>
                        <Sun size={17} />
                      </div>
                      <div>
                        <div className="text-xs font-bold">{t('Giao diện Sáng', 'Light Mode')}</div>
                        <div className="text-[10px] text-body-subtle">{t('Nền sáng rõ ràng', 'Clean & bright')}</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      data-testid="theme-dark-btn"
                      onClick={() => theme !== 'dark' && toggleTheme()}
                      className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                        theme === 'dark'
                          ? 'border-brand bg-brand-softer text-fg-brand-strong ring-1 ring-brand'
                          : 'border-border-default bg-neutral-secondary-soft/50 text-body hover:border-border-default-strong hover:bg-neutral-secondary-soft'
                      }`}
                    >
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        theme === 'dark' ? 'bg-brand text-white shadow-xs' : 'bg-neutral-secondary text-body-subtle'
                      }`}>
                        <Moon size={17} />
                      </div>
                      <div>
                        <div className="text-xs font-bold">{t('Giao diện Tối', 'Dark Mode')}</div>
                        <div className="text-[10px] text-body-subtle">{t('Dịu mắt, ban đêm', 'Easy on the eyes')}</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Ngôn ngữ hiển thị */}
                <div>
                  <span className="block text-xs font-semibold text-heading mb-2">
                    {t('Ngôn ngữ hiển thị', 'Display language')}
                  </span>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      data-testid="lang-vi-btn"
                      onClick={() => setLanguage('vi')}
                      className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                        language === 'vi'
                          ? 'border-brand bg-brand-softer text-fg-brand-strong ring-1 ring-brand'
                          : 'border-border-default bg-neutral-secondary-soft/50 text-body hover:border-border-default-strong hover:bg-neutral-secondary-soft'
                      }`}
                    >
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-black ${
                        language === 'vi' ? 'bg-brand text-white shadow-xs' : 'bg-neutral-secondary text-body-subtle'
                      }`}>
                        VI
                      </div>
                      <div>
                        <div className="text-xs font-bold">{t('Tiếng Việt', 'Vietnamese')}</div>
                        <div className="text-[10px] text-body-subtle">{t('Mặc định', 'Default')}</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      data-testid="lang-en-btn"
                      onClick={() => setLanguage('en')}
                      className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                        language === 'en'
                          ? 'border-brand bg-brand-softer text-fg-brand-strong ring-1 ring-brand'
                          : 'border-border-default bg-neutral-secondary-soft/50 text-body hover:border-border-default-strong hover:bg-neutral-secondary-soft'
                      }`}
                    >
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-black ${
                        language === 'en' ? 'bg-brand text-white shadow-xs' : 'bg-neutral-secondary text-body-subtle'
                      }`}>
                        EN
                      </div>
                      <div>
                        <div className="text-xs font-bold">English</div>
                        <div className="text-[10px] text-body-subtle">International</div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Khối 2: Tóm tắt thông tin tài khoản */}
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
                        {user?.fullName ?? (isUserLoading ? '...' : t('Người dùng', 'User'))}
                      </h2>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                          user?.role === 'ADMIN'
                            ? 'bg-danger-soft text-fg-danger-strong border border-border-danger-subtle'
                            : 'bg-neutral-secondary text-body-subtle'
                        }`}
                      >
                        {formatSemanticLabel(user?.role ?? 'USER', language)}
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

                <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                  <button
                    type="button"
                    onClick={() => setTab('subscription')}
                    className="btn btn-secondary px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5"
                  >
                    <CreditCard size={13} />
                    {t('Quản lý gói dịch vụ', 'Manage Subscription')}
                  </button>
                  {!isPro && !(isCurrentPlus && isProPaused) && (
                    <button
                      type="button"
                      onClick={() => openUpgradeModal('PRO')}
                      className="btn text-xs px-4 py-2 font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-xs flex items-center gap-1.5"
                    >
                      <Zap size={13} />
                      {t('Nâng cấp gói', 'Upgrade Tier')}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Khối 3: Tiến độ sử dụng Hạn mức AI */}
            <div className="rounded-xl border border-border-default bg-neutral-primary-soft p-5 shadow-xs">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-heading">
                    {isWeekly ? t('Hạn mức gọi AI tuần này', 'Weekly AI quota') : t('Hạn mức gọi AI tháng này', 'Monthly AI quota')}
                  </h3>
                  <p className="text-xs text-body-subtle mt-0.5">
                    {t('1 lượt tương ứng với 2 Unit Test, 2 Test Case, 2 Test Plan hoặc 3 phương thức mã nguồn.', '1 credit corresponds to 2 Unit Tests, 2 Test Cases, 2 Test Plans, or 3 source methods.')}
                  </p>
                </div>
                {quota && (
                  <div className="flex items-center gap-3 text-xs text-body-subtle">
                    {formattedPeriodStart && (
                      <span className="flex items-center gap-1">
                        <Calendar size={13} /> {t('Ngày kích hoạt:', 'Started:')} {formattedPeriodStart}
                      </span>
                    )}
                    {formattedResetDate && (
                      <span className="flex items-center gap-1">
                        <Calendar size={13} /> {t('Ngày kết thúc:', 'Ends:')} {formattedResetDate}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-medium text-heading">
                    {t('Đã sử dụng:', 'Used:')} <strong className="text-brand font-bold">{quota?.used ?? 0}</strong> / {quota?.limit ?? 100} {t('lượt', 'credits')}
                  </span>
                  <span className="font-semibold text-heading">{usedPercent}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-secondary">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      usedPercent >= 90
                        ? 'bg-red-500'
                        : usedPercent >= 70
                        ? 'bg-amber-500'
                        : 'bg-gradient-to-r from-purple-600 to-indigo-600'
                    }`}
                    style={{ width: `${usedPercent}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-body-subtle">
                  <span>{t('Còn lại:', 'Remaining:')} <strong className="text-heading font-medium">{remaining}</strong> {t('lượt', 'credits')}</span>
                  {quota?.exceeded && (
                    <span className="flex items-center gap-1 text-red-500 font-medium">
                      <AlertTriangle size={12} /> {t('Đã hết hạn mức chu kỳ này', 'Quota exceeded for this cycle')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: GÓI DỊCH VỤ & HÓA ĐƠN (Subscription & Invoices)          */}
        {/* Đưa 2 phần này ra riêng theo yêu cầu của người dùng             */}
        {/* ============================================================== */}
        {currentTab === 'subscription' && (
          <div className="space-y-8 animate-fade-in">
            {/* Phần 1: Bảng giá & Các gói dịch vụ GreyTest */}
            <div>
              <div className="mb-4">
                <h3 className="text-base font-bold text-heading">
                  {t('Các gói dịch vụ GreyTest', 'GreyTest Subscription Plans')}
                </h3>
                <p className="text-xs text-body-subtle mt-0.5">
                  {t('Lựa chọn gói phù hợp với quy mô kiểm thử và dự án của bạn. Hỗ trợ thanh toán nhanh qua VNPay.', 'Choose a plan that fits your testing scale and project needs. Quick payment via VNPay.')}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {/* Gói Free */}
                {showFree && (
                  <div className={`relative flex flex-col justify-between rounded-xl border p-5 transition-all shadow-xs ${
                    isCurrentFree
                      ? 'border-brand-primary bg-neutral-primary-soft ring-1 ring-brand-primary/30'
                      : 'border-border-default bg-neutral-primary-soft/60 hover:border-border-default-strong'
                  }`}>
                    {isCurrentFree && (
                      <span className="absolute -top-2.5 right-4 rounded-full bg-brand px-2.5 py-0.5 text-[10px] font-bold text-white shadow-xs">
                        {t('Đang kích hoạt', 'Active')}
                      </span>
                    )}
                    <div>
                      <span className="text-xs font-semibold text-body-subtle uppercase tracking-wider">{t('Gói Miễn Phí', 'Free Tier')}</span>
                      <div className="mt-2 flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-heading">0đ</span>
                        <span className="text-xs text-body-subtle">/{formatCycleText(freePkg?.cycle)}</span>
                      </div>
                      <p className="mt-2 text-xs text-body-subtle">
                        {freePkg?.description ?? t('Dành cho sinh viên và dự án thử nghiệm cơ bản', 'For students and basic experimental projects')}
                      </p>
                      <ul className="mt-4 space-y-2 text-xs text-body">
                        {(freePkg?.features && freePkg.features.length > 0 ? freePkg.features : [
                          t('100 lượt gọi AI / tháng', '100 AI credits / month'),
                          t('Tối đa 1 tác vụ đồng thời', 'Max 1 concurrent task'),
                          t('Sinh Test Plan & Test Case cơ bản', 'Basic Test Plan & Test Cases'),
                        ]).map((feat, idx) => (
                          <li key={idx} className="flex items-center gap-2">
                            <Check size={14} className="text-emerald-500 shrink-0" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="mt-6 pt-4 border-t border-border-default-subtle">
                      {isCurrentFree ? (
                        <button disabled className="btn w-full bg-neutral-secondary text-body-subtle text-xs cursor-default">
                          {t('Gói hiện tại', 'Current plan')}
                        </button>
                      ) : (
                        <button
                          onClick={() => setCancelDialogOpen(true)}
                          className="btn btn-secondary w-full text-xs"
                        >
                          {t('Chuyển về Free', 'Downgrade to Free')}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Gói PLUS */}
                {showPlus && (
                  <div className={`relative flex flex-col justify-between rounded-xl border p-5 transition-all shadow-xs ${
                    isCurrentPlus
                      ? 'border-indigo-500 bg-neutral-primary-soft ring-1 ring-indigo-500/30'
                      : 'border-border-default bg-neutral-primary-soft/60 hover:border-border-default-strong'
                  }`}>
                    {isCurrentPlus && (
                      <span className="absolute -top-2.5 right-4 rounded-full bg-indigo-600 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-xs">
                        {t('Đang kích hoạt', 'Active')}
                      </span>
                    )}
                    <div>
                      <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">{t('Gói Tiêu Chuẩn (PLUS)', 'Standard (PLUS)')}</span>
                      <div className="mt-2 flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-heading">{plusPkg?.price ? plusPkg.price.toLocaleString('vi-VN') : '10.000'}đ</span>
                        <span className="text-xs text-body-subtle">/{formatCycleText(plusPkg?.cycle ?? 'WEEKLY')}</span>
                      </div>
                      <p className="mt-2 text-xs text-body-subtle">
                        {plusPkg?.description ?? t('Dành cho nhóm phát triển mở rộng / dự án sprint nước rút', 'For scaling dev teams / sprint projects')}
                      </p>
                      <ul className="mt-4 space-y-2 text-xs text-body">
                        {(plusPkg?.features && plusPkg.features.length > 0 ? plusPkg.features : [
                          t('200 lượt gọi AI / tuần (làm mới hàng tuần)', '200 AI credits / week (weekly refresh)'),
                          t('Tối đa 2 tác vụ sinh test đồng thời', 'Max 2 concurrent generation tasks'),
                          t('Độ ưu tiên xử lý cao hơn gói Free', 'Higher priority queue than Free'),
                        ]).map((feat, idx) => (
                          <li key={idx} className="flex items-center gap-2">
                            <Check size={14} className="text-indigo-500 shrink-0" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="mt-6 pt-4 border-t border-border-default-subtle">
                      {isCurrentPlus ? (
                        <button disabled className="btn w-full bg-neutral-secondary text-body-subtle text-xs cursor-default">
                          {t('Gói hiện tại', 'Current plan')}
                        </button>
                      ) : (
                        <button
                          onClick={() => openUpgradeModal('PLUS')}
                          disabled={isPlusPaused}
                          className="btn w-full text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                        >
                          {isPlusPaused ? t('Tạm dừng đăng ký', 'Paused') : t('Nâng cấp PLUS', 'Upgrade PLUS')}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Gói PRO */}
                {showPro && (
                  <div className={`relative flex flex-col justify-between rounded-xl border p-5 transition-all shadow-md ${
                    isCurrentPro
                      ? 'border-purple-500 bg-neutral-primary-soft ring-2 ring-purple-500/40'
                      : 'border-purple-500/40 bg-neutral-primary-soft hover:border-purple-500'
                  }`}>
                    <span className="absolute -top-2.5 right-4 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-xs">
                      {isCurrentPro ? t('Đang kích hoạt', 'Active') : t('KHUYẾN DÙNG', 'RECOMMENDED')}
                    </span>
                    <div>
                      <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">{t('Gói Chuyên Nghiệp (PRO)', 'Professional (PRO)')}</span>
                      <div className="mt-2 flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-heading">{proPkg?.price ? proPkg.price.toLocaleString('vi-VN') : '20.000'}đ</span>
                        <span className="text-xs text-body-subtle">/{formatCycleText(proPkg?.cycle ?? 'WEEKLY')}</span>
                      </div>
                      <p className="mt-2 text-xs text-body-subtle">
                        {proPkg?.description ?? t('Toàn bộ tính năng phân tích sâu & JaCoCo Refinement', 'Full deep analysis & JaCoCo refinement features')}
                      </p>
                      <ul className="mt-4 space-y-2 text-xs text-body">
                        {(proPkg?.features && proPkg.features.length > 0 ? proPkg.features : [
                          t('300 lượt gọi AI / tuần (làm mới hàng tuần)', '300 AI credits / week (weekly refresh)'),
                          t('Tối đa 4 tác vụ song song cùng lúc', 'Max 4 concurrent batch tasks'),
                          t('Toàn quyền truy cập JaCoCo Coverage Refinement', 'Full access to JaCoCo Coverage Refinement'),
                          t('Tạo test không giới hạn theo module', 'Unlimited generation by module'),
                        ]).map((feat, idx) => (
                          <li key={idx} className="flex items-center gap-2">
                            <Check size={14} className="text-purple-500 shrink-0" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="mt-6 pt-4 border-t border-border-default-subtle">
                      {isCurrentPro ? (
                        <button disabled className="btn w-full bg-neutral-secondary text-body-subtle text-xs cursor-default">
                          {t('Gói hiện tại', 'Current plan')}
                        </button>
                      ) : (
                        <button
                          onClick={() => openUpgradeModal('PRO')}
                          disabled={isProPaused}
                          className="btn w-full text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-xs disabled:opacity-50"
                        >
                          {isProPaused ? t('Tạm dừng đăng ký', 'Paused') : t('Nâng cấp PRO ngay', 'Upgrade to PRO')}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Phần 2: Lịch sử thanh toán & Hóa đơn (Nút Hủy gói nằm trong header phần này) */}
            <div>
              <PaymentHistory
                userId={user?.id ?? 0}
                canCancel={isPro || isPlus}
                isCancelling={cancelPlan.isPending}
                onCancelSubscription={() => {
                  cancelPlan.reset();
                  setCancelDialogOpen(true);
                }}
              />
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: PHẢN HỒI & BÁO LỖI (User Feedback & Support)             */}
        {/* Cho phép người dùng thông báo với admin các vấn đề hiện có       */}
        {/* ============================================================== */}
        {currentTab === 'feedback' && (
          <div className="animate-fade-in">
            <UserFeedbackSection />
          </div>
        )}
      </div>

      {/* Modal nâng cấp qua VNPay */}
      {upgradeModalOpen && (
        <UpgradeToProModal
          open={upgradeModalOpen}
          defaultTier={modalTier}
          currentTier={tier}
          onClose={() => setUpgradeModalOpen(false)}
        />
      )}

      {/* Dialog xác nhận hủy gói */}
      <ConfirmDialog
        open={cancelDialogOpen}
        title={t('Xác nhận hủy gói dịch vụ?', 'Confirm subscription cancellation?')}
        description={t(
          'Khi hủy, tài khoản sẽ được chuyển về gói FREE ngay lập tức với hạn mức 100 lượt/tháng. Bạn có chắc chắn muốn tiếp tục?',
          'Upon cancellation, your account will immediately revert to the FREE tier with 100 credits/month. Are you sure you want to proceed?'
        )}
        confirmLabel={cancelPlan.isPending ? t('Đang hủy...', 'Cancelling...') : t('Xác nhận hủy', 'Confirm Cancel')}
        cancelLabel={t('Giữ lại gói', 'Keep Plan')}
        variant="danger"
        pending={cancelPlan.isPending}
        onConfirm={() => {
          cancelPlan.mutate(undefined, {
            onSettled: () => setCancelDialogOpen(false),
          });
        }}
        onCancel={() => setCancelDialogOpen(false)}
      />
    </AppShell>
  );
}

export default SettingsPage;
