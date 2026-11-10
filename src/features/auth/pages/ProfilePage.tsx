import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Save,
  Shield,
  User,
  Calendar,
  Phone,
  Users,
  AlertTriangle,
  Sparkles,
  Zap,
} from 'lucide-react';
import { AppShell } from '../../../shared/components/AppShell';
import {
  useCancelSubscription,
  useChangePassword,
  useCurrentUser,
  useUpdateProfile,
  useUserQuota,
} from '../hooks/useAuth';
import {
  MAX_FULL_NAME_LENGTH,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  validateFullNameInput,
  validatePasswordInput,
} from './LoginPage';
import { useLanguage } from '../../../shared/i18n/language';
import { formatSemanticLabel } from '../../../shared/components/SemanticBadge';
import { UpgradeToProModal } from '../../../shared/components/UpgradeToProModal';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { getErrorMessage } from '../../../shared/api/api-client';
import { PaymentHistory } from '../../payment/components/PaymentHistory';
import { fetchPublicTierPackages, PublicTierPackage } from '../../payment/api/payment-api';

/**
 * Trang Thông tin người dùng (User Profile Page).
 * Cho phép xem và chỉnh sửa thông tin người dùng (Họ và tên), đổi mật khẩu,
 * và theo dõi thông tin gói dịch vụ & hạn mức AI.
 */
export function ProfilePage() {
  const { data: user, isLoading: isUserLoading } = useCurrentUser();
  const { data: quota } = useUserQuota();
  const { t, language } = useLanguage();
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [modalTier, setModalTier] = useState<'PLUS' | 'PRO'>('PRO');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const cancelPlan = useCancelSubscription();

  // State chức năng Chỉnh sửa thông tin cá nhân (Họ tên, SĐT, Giới tính, Ngày sinh)
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber ?? '');
  const [gender, setGender] = useState(user?.gender ?? '');
  const [dateOfBirth, setDateOfBirth] = useState(user?.dateOfBirth ?? '');
  const [fullNameTouched, setFullNameTouched] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);
  const updateProfileMutation = useUpdateProfile();

  useEffect(() => {
    if (user && !fullNameTouched) {
      setFullName(user.fullName ?? '');
      setPhoneNumber(user.phoneNumber ?? '');
      setGender(user.gender ?? '');
      setDateOfBirth(user.dateOfBirth ?? '');
    }
  }, [user, fullNameTouched]);

  const fullNameError = validateFullNameInput(fullName, t);
  const phoneError =
    phoneNumber.trim() && !/^(0|\+84)[0-9]{9,10}$/.test(phoneNumber.trim())
      ? t('Số điện thoại không hợp lệ (10-11 chữ số)', 'Invalid phone number (10-11 digits)')
      : null;

  const handleUpdateProfile = (event: FormEvent) => {
    event.preventDefault();
    setFullNameTouched(true);
    setProfileSuccessMsg(null);
    if (fullNameError || phoneError) return;

    updateProfileMutation.mutate(
      {
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim() || null,
        gender: gender || null,
        dateOfBirth: dateOfBirth || null,
      },
      {
        onSuccess: (updated) => {
          setFullName(updated.fullName);
          setPhoneNumber(updated.phoneNumber ?? '');
          setGender(updated.gender ?? '');
          setDateOfBirth(updated.dateOfBirth ?? '');
          setFullNameTouched(false);
          setProfileSuccessMsg(
            t('Cập nhật thông tin cá nhân thành công!', 'Profile updated successfully!')
          );
        },
      }
    );
  };

  // State chức năng Đổi mật khẩu
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [currentPwdTouched, setCurrentPwdTouched] = useState(false);
  const [newPwdTouched, setNewPwdTouched] = useState(false);
  const [confirmPwdTouched, setConfirmPwdTouched] = useState(false);
  const [changePwdSubmitted, setChangePwdSubmitted] = useState(false);
  const [changePwdSuccess, setChangePwdSuccess] = useState<string | null>(null);
  const changePasswordMutation = useChangePassword();

  const currentPasswordError = !currentPassword
    ? t('Mật khẩu hiện tại không được để trống', 'Current password is required')
    : null;
  const rawNewPasswordError = validatePasswordInput(newPassword, t);
  const newPasswordError = rawNewPasswordError
    ? rawNewPasswordError
    : currentPassword && newPassword === currentPassword
      ? t('Mật khẩu mới không được trùng với mật khẩu hiện tại', 'New password must be different from current password')
      : null;
  const confirmPasswordError = !confirmPassword
    ? t('Xác nhận mật khẩu mới không được để trống', 'Confirm password is required')
    : confirmPassword !== newPassword
      ? t('Xác nhận mật khẩu mới không khớp', 'Passwords do not match')
      : null;

  const handlePasswordChangeSubmit = (event: FormEvent) => {
    event.preventDefault();
    setChangePwdSubmitted(true);
    setCurrentPwdTouched(true);
    setNewPwdTouched(true);
    setConfirmPwdTouched(true);
    setChangePwdSuccess(null);

    if (currentPasswordError || newPasswordError || confirmPasswordError) {
      return;
    }

    changePasswordMutation.mutate(
      { currentPassword, newPassword, confirmPassword },
      {
        onSuccess: (res) => {
          setChangePwdSuccess(res.message || t('Đổi mật khẩu thành công', 'Password changed successfully'));
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
          setCurrentPwdTouched(false);
          setNewPwdTouched(false);
          setConfirmPwdTouched(false);
          setChangePwdSubmitted(false);
        },
      }
    );
  };

  const { data: publicPackages } = useQuery<PublicTierPackage[]>({
    queryKey: ['public-tier-packages'],
    queryFn: fetchPublicTierPackages,
    staleTime: 10_000,
  });

  const tier = user?.tier ?? quota?.tier ?? 'FREE';
  const isPro = tier === 'PRO';
  const isPlus = tier === 'PLUS';
  const isWeekly = isPro || isPlus;

  const quotaLimit = quota?.limit ?? (isPro ? 300 : isPlus ? 200 : 100);
  const quotaUsed = quota?.used ?? 0;
  const remaining = quota?.remaining ?? Math.max(0, quotaLimit - quotaUsed);
  const usedPercent = quotaLimit > 0 ? Math.min(100, Math.round((quotaUsed / quotaLimit) * 100)) : 0;

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

  const isCurrentFree = tier === 'FREE';
  const isCurrentPlus = tier === 'PLUS';
  const isCurrentPro = tier === 'PRO';

  const hasPackages = Boolean(publicPackages && Array.isArray(publicPackages));
  const freePkg = publicPackages?.find((p) => p.code.toUpperCase() === 'FREE');
  const plusPkg = publicPackages?.find((p) => p.code.toUpperCase() === 'PLUS');
  const proPkg = publicPackages?.find((p) => p.code.toUpperCase() === 'PRO');

  const isFreePaused = hasPackages && !freePkg;
  const isPlusPaused = hasPackages && !plusPkg;
  const isProPaused = hasPackages && !proPkg;

  const showFree = !hasPackages || Boolean(freePkg) || isCurrentFree;
  const showPlus = !hasPackages || Boolean(plusPkg) || isCurrentPlus;
  const showPro = !hasPackages || Boolean(proPkg) || isCurrentPro;

  const openUpgradeModal = (targetTier: 'PLUS' | 'PRO') => {
    if (cancelPlan.isPending) return;
    setModalTier(targetTier);
    setUpgradeModalOpen(true);
  };

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

        {/* Khối 1: Thông tin người dùng & Chỉnh sửa thông tin cá nhân */}
        <div className="rounded-xl border border-border-default bg-neutral-primary-soft p-5 shadow-xs" data-testid="edit-profile-section">
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
                    {formatSemanticLabel(user?.role ?? 'USER', language)}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-4 text-xs text-body-subtle">
                  <span className="flex items-center gap-1.5">
                    <Mail size={13} className="text-body-subtle/80" />
                    {user?.email ?? '—'}
                  </span>
                  {user?.phoneNumber && (
                    <span className="flex items-center gap-1.5">
                      <Phone size={13} className="text-body-subtle/80" />
                      {user.phoneNumber}
                    </span>
                  )}
                  {user?.gender && (
                    <span className="flex items-center gap-1.5">
                      <Users size={13} className="text-body-subtle/80" />
                      {user.gender === 'MALE' ? t('Nam', 'Male') : user.gender === 'FEMALE' ? t('Nữ', 'Female') : t('Khác', 'Other')}
                    </span>
                  )}
                  {user?.dateOfBirth && (
                    <span className="flex items-center gap-1.5">
                      <Calendar size={13} className="text-body-subtle/80" />
                      {user.dateOfBirth.split('-').reverse().join('/')}
                    </span>
                  )}
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
                data-testid="toggle-change-password-btn"
                onClick={() => {
                  setShowChangePassword((prev) => !prev);
                  setChangePwdSuccess(null);
                  changePasswordMutation.reset();
                }}
                className="btn btn-secondary px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5"
              >
                <KeyRound size={13} />
                {showChangePassword ? t('Đóng đổi mật khẩu', 'Close password form') : t('Đổi mật khẩu', 'Change password')}
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

          {/* Form Chỉnh sửa thông tin người dùng (Họ và tên) */}
          <form onSubmit={handleUpdateProfile} noValidate className="mt-6 border-t border-border-default pt-5">
            <h3 className="text-sm font-semibold text-heading mb-1">
              {t('Chỉnh sửa thông tin cá nhân', 'Edit Personal Information')}
            </h3>
            <p className="text-xs text-body-subtle mb-4">
              {t(
                'Cập nhật họ tên hiển thị trên hệ thống. Email đăng ký được cố định để xác thực tài khoản.',
                'Update your display name. Registered email is permanent for account verification.'
              )}
            </p>

            {profileSuccessMsg && (
              <div
                role="status"
                className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-medium text-emerald-700 dark:text-emerald-300 animate-fade-in"
              >
                <CheckCircle2 size={15} className="shrink-0" />
                <span>{profileSuccessMsg}</span>
              </div>
            )}

            {updateProfileMutation.error && (
              <div
                role="alert"
                className="mb-4 flex items-center gap-2 rounded-lg border border-border-danger-subtle bg-danger-soft p-3 text-xs font-medium text-fg-danger-strong animate-fade-in"
              >
                <AlertCircle size={15} className="shrink-0" />
                <span>{getErrorMessage(updateProfileMutation.error)}</span>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-xs font-semibold text-heading">{t('Họ và tên', 'Full name')}</span>
                  <span className="text-[11px] font-mono text-body-subtle">
                    {fullName.trim().length}/{MAX_FULL_NAME_LENGTH}
                  </span>
                </div>
                <input
                  aria-label={t('Họ và tên', 'Full name')}
                  className={`form-input ${fullNameTouched && fullNameError ? 'border-red-500 focus:border-red-500' : ''}`}
                  value={fullName}
                  maxLength={MAX_FULL_NAME_LENGTH}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (!fullNameTouched) setFullNameTouched(true);
                    setProfileSuccessMsg(null);
                  }}
                  required
                />
                {fullNameTouched && fullNameError && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-fg-danger-strong">
                    <AlertCircle size={12} className="shrink-0" />
                    <span>{fullNameError}</span>
                  </p>
                )}
              </label>

              <label className="block">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-xs font-semibold text-heading">Email</span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-body-subtle">
                    <Lock size={11} /> {t('Không thể sửa', 'Read-only')}
                  </span>
                </div>
                <input
                  aria-label="Email"
                  disabled
                  value={user?.email ?? ''}
                  className="form-input bg-neutral-secondary-soft text-body-subtle cursor-not-allowed"
                />
              </label>

              <label className="block">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-xs font-semibold text-heading">{t('Số điện thoại', 'Phone number')}</span>
                  <span className="text-[11px] text-body-subtle">{t('Tùy chọn', 'Optional')}</span>
                </div>
                <input
                  type="tel"
                  aria-label={t('Số điện thoại', 'Phone number')}
                  placeholder={t('Ví dụ: 0912345678', 'e.g. 0912345678')}
                  className={`form-input placeholder:text-body-subtle/50 ${phoneError ? 'border-red-500 focus:border-red-500' : ''}`}
                  value={phoneNumber}
                  maxLength={20}
                  onChange={(e) => {
                    setPhoneNumber(e.target.value);
                    setProfileSuccessMsg(null);
                  }}
                />
                {phoneError && (
                  <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-fg-danger-strong">
                    <AlertCircle size={12} className="shrink-0" />
                    <span>{phoneError}</span>
                  </p>
                )}
              </label>

              <label className="block">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-xs font-semibold text-heading">{t('Giới tính', 'Gender')}</span>
                  <span className="text-[11px] text-body-subtle">{t('Tùy chọn', 'Optional')}</span>
                </div>
                <select
                  aria-label={t('Giới tính', 'Gender')}
                  className="form-input"
                  value={gender}
                  onChange={(e) => {
                    setGender(e.target.value);
                    setProfileSuccessMsg(null);
                  }}
                >
                  <option value="">{t('— Chọn giới tính —', '— Select gender —')}</option>
                  <option value="MALE">{t('Nam', 'Male')}</option>
                  <option value="FEMALE">{t('Nữ', 'Female')}</option>
                  <option value="OTHER">{t('Khác', 'Other')}</option>
                </select>
              </label>

              <label className="block sm:col-span-2">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-xs font-semibold text-heading">{t('Ngày sinh', 'Date of birth')}</span>
                  <span className="text-[11px] text-body-subtle">{t('Tùy chọn', 'Optional')}</span>
                </div>
                <input
                  type="date"
                  aria-label={t('Ngày sinh', 'Date of birth')}
                  className="form-input"
                  value={dateOfBirth}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={(e) => {
                    setDateOfBirth(e.target.value);
                    setProfileSuccessMsg(null);
                  }}
                />
              </label>
            </div>

            <div className="mt-4 flex items-center justify-end gap-3">
              <button
                type="submit"
                data-testid="save-profile-btn"
                disabled={updateProfileMutation.isPending || Boolean(fullNameError) || Boolean(phoneError)}
                className="btn btn-brand px-4 py-2 text-xs font-semibold flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                {updateProfileMutation.isPending ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Save size={13} />
                )}
                <span>
                  {updateProfileMutation.isPending
                    ? t('Đang lưu...', 'Saving...')
                    : t('Lưu thông tin', 'Save Changes')}
                </span>
              </button>
            </div>
          </form>

          {/* Khu vực Đổi mật khẩu */}
          {showChangePassword && (
            <form
              onSubmit={handlePasswordChangeSubmit}
              noValidate
              data-testid="change-password-form"
              className="mt-5 border-t border-border-default pt-5 space-y-4 animate-fade-in"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-heading flex items-center gap-1.5">
                    <KeyRound size={14} className="text-fg-brand" />
                    {t('Đổi mật khẩu tài khoản', 'Change Account Password')}
                  </h3>
                  <p className="text-xs text-body-subtle mt-0.5">
                    {t(
                      'Mật khẩu mới phải từ 6–72 ký tự, có chữ hoặc số và không chứa khoảng trắng.',
                      'New password must be 6–72 characters, contain letters or digits, and have no spaces.'
                    )}
                  </p>
                </div>
              </div>

              {changePwdSuccess && (
                <div
                  role="status"
                  className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-medium text-emerald-700 dark:text-emerald-300 animate-fade-in"
                >
                  <CheckCircle2 size={15} className="shrink-0" />
                  <span>{changePwdSuccess}</span>
                </div>
              )}

              {changePasswordMutation.error && (
                <div
                  role="alert"
                  className="flex items-center gap-2 rounded-lg border border-border-danger-subtle bg-danger-soft p-3 text-xs font-medium text-fg-danger-strong animate-fade-in"
                >
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{getErrorMessage(changePasswordMutation.error)}</span>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-heading">
                    {t('Mật khẩu hiện tại', 'Current password')}
                  </span>
                  <input
                    aria-label={t('Mật khẩu hiện tại', 'Current password')}
                    className={`form-input ${
                      (currentPwdTouched || changePwdSubmitted) && currentPasswordError
                        ? 'border-red-500 focus:border-red-500'
                        : ''
                    }`}
                    type="password"
                    autoComplete="current-password"
                    maxLength={MAX_PASSWORD_LENGTH}
                    value={currentPassword}
                    onChange={(e) => {
                      setCurrentPassword(e.target.value);
                      if (!currentPwdTouched) setCurrentPwdTouched(true);
                    }}
                    required
                  />
                  {(currentPwdTouched || changePwdSubmitted) && currentPasswordError && (
                    <p
                      data-testid="current-password-error"
                      className="mt-1.5 flex items-center gap-1 text-xs font-medium text-fg-danger-strong"
                    >
                      <AlertCircle size={12} className="shrink-0" />
                      <span>{currentPasswordError}</span>
                    </p>
                  )}
                </label>

                <label className="block">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-xs font-semibold text-heading">
                      {t('Mật khẩu mới', 'New password')}
                    </span>
                    <span className="text-[11px] font-mono text-body-subtle">
                      {newPassword.length}/{MAX_PASSWORD_LENGTH}
                    </span>
                  </div>
                  <input
                    aria-label={t('Mật khẩu mới', 'New password')}
                    className={`form-input ${
                      (newPwdTouched || newPassword.length > 0 || changePwdSubmitted) && newPasswordError
                        ? 'border-red-500 focus:border-red-500'
                        : (newPwdTouched || newPassword.length > 0) && !newPasswordError
                          ? 'border-emerald-500/70'
                          : ''
                    }`}
                    type="password"
                    autoComplete="new-password"
                    minLength={MIN_PASSWORD_LENGTH}
                    maxLength={MAX_PASSWORD_LENGTH}
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (!newPwdTouched) setNewPwdTouched(true);
                    }}
                    required
                  />
                  {(newPwdTouched || newPassword.length > 0 || changePwdSubmitted) && newPasswordError && (
                    <p
                      data-testid="new-password-error"
                      className="mt-1.5 flex items-center gap-1 text-xs font-medium text-fg-danger-strong"
                    >
                      <AlertCircle size={12} className="shrink-0" />
                      <span>{newPasswordError}</span>
                    </p>
                  )}
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-heading">
                    {t('Xác nhận mật khẩu mới', 'Confirm new password')}
                  </span>
                  <input
                    aria-label={t('Xác nhận mật khẩu mới', 'Confirm new password')}
                    className={`form-input ${
                      (confirmPwdTouched || confirmPassword.length > 0 || changePwdSubmitted) && confirmPasswordError
                        ? 'border-red-500 focus:border-red-500'
                        : (confirmPwdTouched || confirmPassword.length > 0) && !confirmPasswordError
                          ? 'border-emerald-500/70'
                          : ''
                    }`}
                    type="password"
                    autoComplete="new-password"
                    maxLength={MAX_PASSWORD_LENGTH}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (!confirmPwdTouched) setConfirmPwdTouched(true);
                    }}
                    required
                  />
                  {(confirmPwdTouched || confirmPassword.length > 0 || changePwdSubmitted) && confirmPasswordError && (
                    <p
                      data-testid="confirm-password-error"
                      className="mt-1.5 flex items-center gap-1 text-xs font-medium text-fg-danger-strong"
                    >
                      <AlertCircle size={12} className="shrink-0" />
                      <span>{confirmPasswordError}</span>
                    </p>
                  )}
                  {(confirmPwdTouched || confirmPassword.length > 0) && !confirmPasswordError && (
                    <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 size={12} className="shrink-0" />
                      <span>{t('Mật khẩu xác nhận khớp', 'Passwords match')}</span>
                    </p>
                  )}
                </label>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={changePasswordMutation.isPending}
                  className="btn btn-brand px-4 py-2 text-xs font-semibold"
                >
                  {changePasswordMutation.isPending ? t('Đang cập nhật...', 'Updating...') : t('Lưu mật khẩu mới', 'Save new password')}
                </button>
              </div>
            </form>
          )}
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

        {/* Khối 2: Tóm tắt Quota sử dụng & Gói dịch vụ */}
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
                    <Calendar size={13} /> {t('Ngày kích hoạt:', 'Started:')} <span>{formattedPeriodStart}</span>
                  </span>
                )}
                {formattedResetDate && (
                  <span className="flex items-center gap-1">
                    <Calendar size={13} /> {t('Ngày kết thúc:', 'Ends:')} <span>{formattedResetDate}</span>
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-medium text-heading">
                {t('Đã sử dụng:', 'Used:')} <strong className="text-brand font-bold">{quotaUsed}</strong> / {quotaLimit} {t('lượt', 'credits')}
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

          <div className="mt-4 pt-3 border-t border-border-default-subtle flex items-center justify-between">
            <span className="text-xs text-body-subtle">
              {t('Xem chi tiết các gói và tính năng nâng cấp tại trang Cài đặt.', 'View all subscription plans and pricing in Settings.')}
            </span>
            <Link
              to="/settings"
              className="text-xs font-semibold text-fg-brand hover:underline flex items-center gap-1"
            >
              <span>{t('Quản lý gói dịch vụ', 'Manage Subscriptions')}</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        {/* Khối 3: Bảng giá & Các gói dịch vụ */}
        <div>
          <div className="mb-4">
            <h3 className="text-base font-bold text-heading">
              {t('Các gói dịch vụ GreyTest', 'GreyTest Subscription Plans')}
            </h3>
            <p className="text-xs text-body-subtle mt-0.5">
              {t('Lựa chọn gói phù hợp với quy mô kiểm thử và dự án của bạn.', 'Choose a plan that fits your testing scale and project needs.')}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Gói Free */}
            {showFree && (
              <div className={`relative flex flex-col justify-between rounded-xl border p-5 transition-all shadow-xs ${
                isCurrentFree
                  ? 'border-brand-primary bg-neutral-primary-soft ring-1 ring-brand-primary/30'
                  : 'border-border-default bg-neutral-primary-soft/60'
              }`}>
                {isCurrentFree && (
                  <span className="absolute -top-2.5 right-4 rounded-full bg-brand px-2.5 py-0.5 text-[10px] font-bold text-white shadow-xs">
                    {t('Đang sử dụng', 'Active')}
                  </span>
                )}
                <div>
                  <span className="text-xs font-semibold text-body-subtle uppercase tracking-wider">{t('GÓI MIỄN PHÍ (FREE)', 'Free Tier')}</span>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-heading">0đ</span>
                    <span className="text-xs text-body-subtle">/{t('tháng', 'month')}</span>
                  </div>
                  {isFreePaused && isCurrentFree && (
                    <div className="mt-2 rounded bg-amber-500/10 p-1.5 text-[11px] text-amber-600 dark:text-amber-400">
                      {t('Đang tạm dừng áp dụng cho người dùng mới', 'Paused for new users')}
                    </div>
                  )}
                  <p className="mt-2 text-xs text-body-subtle">
                    {freePkg?.description || t('Dành cho sinh viên và dự án thử nghiệm cơ bản', 'For students and basic experimental projects')}
                  </p>
                  <ul className="mt-4 space-y-2 text-xs text-body">
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-emerald-500 shrink-0" />
                      <span>{t('100 lượt gọi AI / tháng', '100 AI credits / month')}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-emerald-500 shrink-0" />
                      <span>{t('Sinh tối đa 2 batch đồng thời', 'Max 2 concurrent batches')}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-emerald-500 shrink-0" />
                      <span>{t('Sinh Test Plan & Test Case cơ bản', 'Basic Test Plan & Test Cases')}</span>
                    </li>
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
                  : 'border-border-default bg-neutral-primary-soft/60'
              }`}>
                {isCurrentPlus && (
                  <span className="absolute -top-2.5 right-4 rounded-full bg-indigo-600 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-xs">
                    {t('Gói PLUS đang hoạt động', 'Active')}
                  </span>
                )}
                <div>
                  <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">{t('Gói Tiêu Chuẩn (PLUS)', 'Standard (PLUS)')}</span>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-heading">10.000đ</span>
                    <span className="text-xs text-body-subtle">/{t('tuần', 'week')}</span>
                  </div>
                  {isPlusPaused && isCurrentPlus && (
                    <div className="mt-2 rounded bg-amber-500/10 p-1.5 text-[11px] text-amber-600 dark:text-amber-400">
                      {t('Gói này đang tạm dừng đăng ký mới/gia hạn', 'Package currently paused')}
                    </div>
                  )}
                  <p className="mt-2 text-xs text-body-subtle">
                    {plusPkg?.description || t('Dành cho nhóm phát triển mở rộng / dự án sprint nước rút', 'For scaling dev teams / sprint projects')}
                  </p>
                  <ul className="mt-4 space-y-2 text-xs text-body">
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-indigo-500 shrink-0" />
                      <span>{t('200 lượt gọi AI / tuần (làm mới hàng tuần)', '200 AI credits / week')}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-indigo-500 shrink-0" />
                      <span>{t('Sinh tối đa 3 batch đồng thời', 'Max 3 concurrent batches')}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-indigo-500 shrink-0" />
                      <span>{t('Độ ưu tiên xử lý cao hơn gói Free', 'Higher priority than Free')}</span>
                    </li>
                  </ul>
                </div>
                <div className="mt-6 pt-4 border-t border-border-default-subtle">
                  {isCurrentPlus ? (
                    isPlusPaused ? (
                      <button disabled className="btn w-full bg-neutral-secondary text-body-subtle text-xs cursor-default">
                        {t('Gói hiện tại', 'Current plan')}
                      </button>
                    ) : (
                      <button
                        onClick={() => openUpgradeModal('PLUS')}
                        className="btn btn-secondary w-full text-xs"
                      >
                        {t('Gia hạn thêm gói PLUS (10.000đ)', 'Renew PLUS plan')}
                      </button>
                    )
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
                  : 'border-purple-500/40 bg-neutral-primary-soft'
              }`}>
                <span className="absolute -top-2.5 right-4 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-xs">
                  {isCurrentPro ? t('Gói PRO cao cấp nhất đang hoạt động', 'Active PRO') : t('KHUYÊN DÙNG', 'RECOMMENDED')}
                </span>
                <div>
                  <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">{t('Gói Chuyên Nghiệp (PRO)', 'Professional (PRO)')}</span>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-heading">20.000đ</span>
                    <span className="text-xs text-body-subtle">/{t('tuần', 'week')}</span>
                  </div>
                  {isProPaused && isCurrentPro && (
                    <div className="mt-2 rounded bg-amber-500/10 p-1.5 text-[11px] text-amber-600 dark:text-amber-400">
                      {t('Gói này đang tạm dừng đăng ký mới/gia hạn', 'Package currently paused')}
                    </div>
                  )}
                  <p className="mt-2 text-xs text-body-subtle">
                    {proPkg?.description || t('Toàn bộ tính năng phân tích sâu & JaCoCo Refinement', 'Full deep analysis & JaCoCo refinement features')}
                  </p>
                  <ul className="mt-4 space-y-2 text-xs text-body">
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-purple-500 shrink-0" />
                      <span>{t('300 lượt gọi AI / tuần (làm mới hàng tuần)', '300 AI credits / week')}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-purple-500 shrink-0" />
                      <span>{t('Sinh tối đa 4 batch đồng thời', 'Max 4 concurrent batches')}</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-purple-500 shrink-0" />
                      <span>{t('Toàn quyền truy cập JaCoCo Coverage Refinement', 'Full JaCoCo access')}</span>
                    </li>
                  </ul>
                </div>
                <div className="mt-6 pt-4 border-t border-border-default-subtle">
                  {isCurrentPro ? (
                    isProPaused ? (
                      <button disabled className="btn w-full bg-neutral-secondary text-body-subtle text-xs cursor-default">
                        {t('Gói hiện tại', 'Current plan')}
                      </button>
                    ) : (
                      <button
                        onClick={() => openUpgradeModal('PRO')}
                        className="btn btn-secondary w-full text-xs"
                      >
                        {t('Gia hạn thêm gói PRO (20.000đ)', 'Renew PRO plan')}
                      </button>
                    )
                  ) : (
                    <button
                      onClick={() => openUpgradeModal('PRO')}
                      disabled={isProPaused}
                      className="btn w-full text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-xs disabled:opacity-50"
                    >
                      {isProPaused ? t('Tạm dừng đăng ký', 'Paused') : t('Nâng cấp PRO ngay (20.000đ)', 'Upgrade to PRO (20.000đ)')}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Khối 4: Lịch sử giao dịch */}
        <div className="mt-8">
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
        title={t('Hủy gói hiện tại?', 'Cancel your current plan?')}
        description={t(
          'Tài khoản sẽ chuyển về gói Free ngay với hạn mức theo tháng. Số lượt đã sử dụng được giữ lại; nếu đã vượt hạn mức Free, bạn cần đợi chu kỳ tiếp theo hoặc nâng cấp lại.',
          'Your account will switch to Free immediately with a monthly quota. Used calls are retained; if you exceed the Free limit, wait for the next period or upgrade again.'
        )}
        confirmLabel={cancelPlan.isPending ? t('Đang hủy...', 'Cancelling...') : t('Xác nhận hủy gói', 'Confirm cancellation')}
        cancelLabel={t('Giữ gói', 'Keep plan')}
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

export default ProfilePage;
