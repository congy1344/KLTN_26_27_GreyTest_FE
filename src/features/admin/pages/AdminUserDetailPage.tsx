import {
  Activity, ArrowLeft, CalendarDays, Crown, FolderKanban, Gauge, Lock, LogIn, Mail,
  Monitor, Pencil, RefreshCw, RotateCcw, Save, ShieldCheck, Smartphone, TestTube2,
  Unlock, UserRound, X, Zap,
} from 'lucide-react';
import { FormEvent, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getErrorMessage } from '../../../shared/api/api-client';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { EmptyState } from '../../../shared/components/EmptyState';
import { GlassCard } from '../../../shared/components/GlassCard';
import { LoadingState } from '../../../shared/components/LoadingState';
import { useCurrentUser } from '../../auth/hooks/useAuth';
import { AdminShell } from '../components/AdminShell';
import { useAdminUser, useAdminUserMutations } from '../hooks/useAdmin';
import { activityLabel, formatActivityMetadata } from '../utils/activity-presentation';
import { useLanguage } from '../../../shared/i18n/language';
import { formatSemanticLabel } from '../../../shared/components/SemanticBadge';
import type { UpdateUserRequest, UserRole, UserTier } from '../types';

/** Hồ sơ quản trị tổng hợp thông tin tài khoản, gói tier, quota, dự án và lịch sử gần nhất. */
export function AdminUserDetailPage() {
  const { t, language } = useLanguage();
  const id = Number(useParams().id);
  const query = useAdminUser(id);
  const mutations = useAdminUserMutations();

  // Tier change state
  const [tierModalOpen, setTierModalOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<UserTier>('FREE');

  // Quota edit state
  const [quotaModalOpen, setQuotaModalOpen] = useState(false);
  const [quotaLimit, setQuotaLimit] = useState('100');
  const [unlimitedQuota, setUnlimitedQuota] = useState(false);

  // User edit state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: '',
    password: '',
    role: 'USER' as UserRole,
    tier: 'FREE' as UserTier,
    quotaLimit: '100',
    unlimitedQuota: false,
  });

  // Reset Quota confirmation
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  // Edit action confirmation dialogs
  const [confirmTierOpen, setConfirmTierOpen] = useState(false);
  const [confirmQuotaOpen, setConfirmQuotaOpen] = useState(false);
  const [confirmEditOpen, setConfirmEditOpen] = useState(false);

  // Status toggle confirmation
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
  const [lockReason, setLockReason] = useState('');

  const user = query.data?.user;
  const { data: currentUser } = useCurrentUser();
  const isSelf = currentUser?.id === user?.id;

  const handleOpenEditUser = () => {
    if (!user) return;
    setEditForm({
      fullName: user.fullName || '',
      password: '',
      role: user.role,
      tier: user.tier,
      quotaLimit: String(user.quota?.limit ?? 100),
      unlimitedQuota: user.quota?.limit === null,
    });
    setEditModalOpen(true);
  };

  const handleSaveEditUser = (e: FormEvent) => {
    e.preventDefault();
    if (!user || mutations.update?.isPending) return;
    setConfirmEditOpen(true);
  };

  const handleConfirmEditUser = () => {
    if (!user || mutations.update?.isPending) return;
    const req: UpdateUserRequest = {
      fullName: editForm.fullName.trim() || undefined,
      password: editForm.password.trim() || undefined,
      role: editForm.role,
      tier: editForm.tier,
      quotaLimit: editForm.unlimitedQuota ? null : (editForm.quotaLimit ? Number(editForm.quotaLimit) : null),
      unlimitedQuota: editForm.unlimitedQuota,
    };
    mutations.update?.mutate({ id: user.id, data: req }, {
      onSuccess: () => {
        setConfirmEditOpen(false);
        setEditModalOpen(false);
        query.refetch();
      },
      onError: () => setConfirmEditOpen(false),
    });
  };

  const handleOpenTierModal = () => {
    if (!user) return;
    setSelectedTier(user.tier || 'FREE');
    setTierModalOpen(true);
  };

  const handleSaveTier = (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setConfirmTierOpen(true);
  };

  const handleConfirmSaveTier = () => {
    if (!user) return;
    mutations.tier.mutate({ id: user.id, tier: selectedTier }, {
      onSuccess: () => {
        setConfirmTierOpen(false);
        setTierModalOpen(false);
        query.refetch();
      },
      onError: () => setConfirmTierOpen(false),
    });
  };

  const handleOpenQuotaModal = () => {
    if (!user) return;
    setQuotaLimit(String(user.quota.limit ?? 100));
    setUnlimitedQuota(user.quota.limit === null);
    setQuotaModalOpen(true);
  };

  const handleSaveQuota = (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setConfirmQuotaOpen(true);
  };

  const handleConfirmSaveQuota = () => {
    if (!user) return;
    const limit = unlimitedQuota ? null : Number(quotaLimit);
    mutations.quota.mutate({ id: user.id, limit }, {
      onSuccess: () => {
        setConfirmQuotaOpen(false);
        setQuotaModalOpen(false);
        query.refetch();
      },
      onError: () => setConfirmQuotaOpen(false),
    });
  };

  const handleConfirmResetQuota = () => {
    if (!user) return;
    mutations.resetQuota.mutate(user.id, {
      onSuccess: () => {
        setResetConfirmOpen(false);
        query.refetch();
      },
      onError: () => setResetConfirmOpen(false),
    });
  };

  const handleToggleStatus = () => {
    if (!user) return;
    const nextStatus = !user.enabled;
    mutations.status.mutate(
      { id: user.id, enabled: nextStatus, reason: nextStatus ? undefined : lockReason.trim() },
      {
        onSuccess: () => {
          setStatusConfirmOpen(false);
          setLockReason('');
          query.refetch();
        },
      },
    );
  };

  return (
    <AdminShell>
      <div className="mb-4 flex items-center gap-2 text-xs">
        <Link to="/admin" className="text-body-subtle hover:text-heading transition-colors">
          Dashboard
        </Link>
        <span className="text-body-subtle">/</span>
        <Link to="/admin/users" className="inline-flex items-center gap-1 font-semibold text-fg-brand hover:underline">
          <ArrowLeft size={13} />
          <span>{t('Danh sách người dùng', 'Users')}</span>
        </Link>
      </div>

      {query.isLoading && (
        <GlassCard>
          <LoadingState label="Đang tải hồ sơ người dùng..." />
        </GlassCard>
      )}

      {query.error && (
        <p role="alert" className="rounded-xl bg-danger-soft p-3 text-sm text-fg-danger-strong">
          {getErrorMessage(query.error)}
        </p>
      )}

      {user && query.data && (
        <>
          {/* Header Profile Card with Role, Status, and Tier Governance */}
          <GlassCard>
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="flex items-center gap-4">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-softer text-fg-brand">
                  <UserRound size={26} />
                </span>
                <div>
                  <h2 className="text-xl font-bold text-heading">
                    {user.fullName || 'Chưa cập nhật tên'}
                  </h2>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-body-subtle">
                    <Mail size={13} /> {user.email}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-body-subtle">
                    <CalendarDays size={13} /> Tham gia {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                  </p>
                </div>
              </div>

              {/* Status and Action Badges */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Role Badge */}
                <span className="inline-flex whitespace-nowrap items-center gap-1.5 rounded-full bg-brand-softer px-3 py-1 text-xs font-semibold text-fg-brand">
                  <ShieldCheck size={13} />
                  <span>{formatSemanticLabel(user.role, language)}</span>
                </span>

                {/* Tier Badge with Quick Edit */}
                <button
                  type="button"
                  onClick={handleOpenTierModal}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold transition-all hover:ring-2 hover:ring-brand ${
                    user.tier === 'PRO'
                      ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300'
                      : user.tier === 'PLUS'
                      ? 'bg-brand-softer text-fg-brand-strong'
                      : 'bg-neutral-secondary text-body-subtle'
                  }`}
                  title="Nhấn để nâng cấp hoặc đổi gói Tier"
                >
                  {user.tier === 'PRO' ? <Crown size={13} className="text-amber-500" /> : <Zap size={13} />}
                  <span>Gói {user.tier || 'FREE'}</span>
                  <Pencil size={11} className="opacity-60" />
                </button>

                {/* Edit User Button */}
                <button
                  type="button"
                  onClick={handleOpenEditUser}
                  className="btn btn-secondary inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold shadow-2xs hover:bg-neutral-secondary transition-colors"
                  title="Chỉnh sửa thông tin tài khoản"
                >
                  <Pencil size={12} />
                  <span>{t('Chỉnh sửa', 'Edit')}</span>
                </button>

                {/* Status Badge with Lock/Unlock button */}
                <button
                  type="button"
                  disabled={isSelf || mutations.status.isPending}
                  onClick={() => {
                    setLockReason('');
                    setStatusConfirmOpen(true);
                  }}
                  className={`btn whitespace-nowrap inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold shadow-2xs transition-opacity ${
                    isSelf ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-85'
                  } ${
                    user.enabled
                      ? 'btn-ghost-danger border border-border-danger-subtle'
                      : 'btn-secondary text-fg-success border border-border-success-subtle'
                  }`}
                  title={
                    isSelf
                      ? t('Không thể tự khóa tài khoản của chính mình', 'Cannot lock your own account')
                      : user.enabled
                      ? t('Nhấn để khóa tài khoản', 'Click to lock account')
                      : t('Nhấn để mở khóa', 'Click to unlock')
                  }
                >
                  {user.enabled ? <Lock size={12} /> : <Unlock size={12} />}
                  <span>{user.enabled ? t('Khóa', 'Lock') : t('Mở khóa', 'Unlock')}</span>
                </button>
              </div>
            </div>
          </GlassCard>

          {/* 5 Detail Metrics */}
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <DetailMetric
              icon={LogIn}
              label="Đăng nhập gần nhất"
              value={query.data.lastLoginAt ? new Date(query.data.lastLoginAt).toLocaleString('vi-VN') : 'Chưa có'}
            />
            <DetailMetric
              icon={CalendarDays}
              label="Hoạt động gần nhất"
              value={user.lastActivityAt ? new Date(user.lastActivityAt).toLocaleString('vi-VN') : 'Chưa có'}
            />
            <DetailMetric
              icon={Activity}
              label="Tổng lượt sinh test"
              value={`${user.totalGenerationRequests}`}
            />
            <DetailMetric
              icon={TestTube2}
              label="Unit test đã sinh"
              value={`${query.data.generatedUnitTests}`}
            />
            <DetailMetric
              icon={FolderKanban}
              label="Dự án liên kết"
              value={`${query.data.projects.length}`}
            />
          </div>

          {/* Quota Management & Recent Activities */}
          <div className="mt-5 grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="space-y-5">
              {/* Quota LLM Management Card */}
              <GlassCard>
                <div className="flex items-center justify-between border-b border-border-default pb-3">
                  <div className="flex items-center gap-2">
                    <Gauge size={17} className="text-fg-brand" />
                    <h3 className="font-bold text-heading">Hạn Mức & Quota LLM Tháng</h3>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleOpenQuotaModal}
                      className="btn btn-secondary px-2.5 py-1 text-xs flex items-center gap-1"
                      title="Chỉnh sửa hạn mức quota"
                    >
                      <Pencil size={12} />
                      <span>Sửa</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setResetConfirmOpen(true)}
                      className="btn btn-secondary px-2.5 py-1 text-xs text-fg-brand hover:text-fg-brand-strong flex items-center gap-1"
                      title="Đặt lại số lượt gọi về 0"
                    >
                      <RotateCcw size={12} />
                      <span>Reset</span>
                    </button>
                  </div>
                </div>

                {user.quota.limit === null ? (
                  <div className="mt-4">
                    <p className="text-xl font-bold text-heading">Không giới hạn</p>
                    <p className="mt-1 text-sm text-body-subtle">
                      Đã dùng <strong className="font-sans tabular-nums text-heading">{user.quota.used}</strong> lượt
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="mt-4 flex items-end justify-between">
                      <p className="text-2xl font-bold text-heading">
                        {user.quota.used}
                        <span className="text-sm font-medium text-body-subtle">
                          /{user.quota.limit} lượt
                        </span>
                      </p>
                      <span className="text-xs text-body-subtle font-sans tabular-nums">
                        Còn {Math.max(user.quota.remaining ?? 0, 0)} lượt
                      </span>
                    </div>

                    <div
                      role="progressbar"
                      aria-label="Quota LLM tháng"
                      aria-valuemin={0}
                      aria-valuemax={user.quota.limit}
                      aria-valuenow={Math.min(user.quota.used, user.quota.limit)}
                      className="mt-3 h-2.5 rounded-full bg-neutral-secondary-medium overflow-hidden"
                    >
                      <div
                        className={`h-full rounded-full transition-all ${
                          user.quota.exceeded ? 'bg-danger' : 'bg-brand'
                        }`}
                        style={{
                          width: `${Math.min(
                            user.quota.limit ? (user.quota.used / user.quota.limit) * 100 : 100,
                            100,
                          )}%`,
                        }}
                      />
                    </div>
                  </>
                )}

                <div className="mt-4 border-t border-border-default-subtle pt-3 text-xs text-body-subtle space-y-1">
                  <p>Kỳ bắt đầu: {new Date(user.quota.periodStart).toLocaleDateString('vi-VN')}</p>
                  <p>Reset ngày: <strong className="text-heading">{user.quota.resetDate}</strong></p>
                </div>
              </GlassCard>

              {/* Projects Card */}
              <GlassCard>
                <h3 className="font-semibold text-heading">Dự án đã liên kết</h3>
                <div className="mt-4 space-y-2.5">
                  {query.data.projects.map((project) => (
                    <div key={project.id} className="rounded-lg border border-border-default p-3 flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-heading text-xs">{project.name}</p>
                        <p className="mt-0.5 text-[11px] text-body-subtle">Project #{project.id}</p>
                      </div>
                      <span className="rounded-md bg-neutral-secondary px-2 py-0.5 text-[10px] font-bold text-body-subtle uppercase">
                        {project.status}
                      </span>
                    </div>
                  ))}
                  {!query.data.projects.length && (
                    <EmptyState icon={FolderKanban} title="Chưa có dự án" minHeight="min-h-[140px]" />
                  )}
                </div>
              </GlassCard>
            </div>

            <div className="space-y-5">
              {/* Login History Card */}
              <GlassCard>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-default pb-3">
                  <div className="flex items-center gap-2.5">
                    <LogIn size={18} className="text-fg-brand" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-heading">Lịch Sử Đăng Nhập</h3>
                      </div>
                      <p className="mt-0.5 text-[11px] text-body-subtle">
                        Ghi nhận thiết bị, địa chỉ IP và trạng thái các phiên đăng nhập vào hệ thống.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => query.refetch()}
                    disabled={query.isFetching}
                    className="btn btn-secondary px-2.5 py-1 text-xs flex items-center gap-1.5 shadow-2xs"
                    title="Làm mới lịch sử đăng nhập ngay lập tức"
                  >
                    <RefreshCw size={12} className={query.isFetching ? 'animate-spin' : ''} />
                    <span>{query.isFetching ? 'Đang tải...' : 'Làm mới'}</span>
                  </button>
                </div>

                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-border-default bg-neutral-secondary-soft text-[11px] font-bold uppercase text-body-subtle">
                      <tr>
                        <th className="p-2.5">Thời Gian</th>
                        <th className="p-2.5">Địa Chỉ IP</th>
                        <th className="p-2.5">Thiết Bị / Trình Duyệt</th>
                        <th className="p-2.5">Cổng</th>
                        <th className="p-2.5 text-right">Trạng Thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-default-subtle">
                      {(query.data.loginHistory ?? []).map((lh) => {
                        const isSuccess = lh.status === 'SUCCESS' || lh.status === 'ACTIVE';
                        const isMobile = lh.device?.toLowerCase().includes('mobile') || lh.device?.toLowerCase().includes('android') || lh.device?.toLowerCase().includes('iphone');

                        return (
                          <tr key={lh.id} className="hover:bg-neutral-secondary-soft/50 transition-colors">
                            <td className="p-2.5 whitespace-nowrap">
                              <p className="font-semibold text-heading">
                                {new Date(lh.timestamp).toLocaleDateString('vi-VN')}
                              </p>
                              <p className="text-[10px] text-body-subtle">
                                {new Date(lh.timestamp).toLocaleTimeString('vi-VN')}
                              </p>
                            </td>

                            <td className="p-2.5 whitespace-nowrap">
                              <span className="font-sans text-xs text-body bg-neutral-secondary px-2 py-0.5 rounded-md">
                                {lh.ip || '127.0.0.1'}
                              </span>
                            </td>

                            <td className="p-2.5 min-w-[150px]">
                              <div className="flex items-center gap-1.5" title={lh.userAgent}>
                                {isMobile ? (
                                  <Smartphone size={14} className="text-body-subtle shrink-0" />
                                ) : (
                                  <Monitor size={14} className="text-body-subtle shrink-0" />
                                )}
                                <span className="font-medium text-heading truncate max-w-[170px]">
                                  {lh.device || 'Thiết bị Web'}
                                </span>
                              </div>
                            </td>

                            <td className="p-2.5 whitespace-nowrap">
                              <span className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-bold ${
                                lh.portal?.includes('ADMIN')
                                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300'
                                  : 'bg-neutral-secondary text-body-subtle'
                              }`}>
                                {lh.portal?.includes('ADMIN') ? 'Admin' : 'Web'}
                              </span>
                            </td>

                            <td className="p-2.5 text-right whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                isSuccess
                                  ? 'bg-success-soft text-fg-success-strong'
                                  : 'bg-danger-soft text-fg-danger-strong'
                              }`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${isSuccess ? 'bg-success' : 'bg-danger'}`} />
                                <span>{isSuccess ? 'Thành công' : 'Thất bại'}</span>
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {(!query.data.loginHistory || query.data.loginHistory.length === 0) && (
                    <div className="py-6 text-center">
                      <EmptyState
                        icon={LogIn}
                        title="Chưa có dữ liệu đăng nhập"
                        hint="Các lượt đăng nhập vào hệ thống của người dùng này sẽ tự động cập nhật tại đây theo thời gian thực."
                        minHeight="min-h-[140px]"
                      />
                    </div>
                  )}
                  {query.data.loginHistory && query.data.loginHistory.length > 0 && (
                    <div className="mt-3 border-t border-border-default-subtle pt-2.5 text-right">
                      <Link
                        to={`/admin/activity?action=USER_LOGIN&userSearch=${encodeURIComponent(query.data.user.email)}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-fg-brand hover:underline"
                      >
                        <span>Tra cứu toàn bộ lịch sử đăng nhập tại Nhật ký hoạt động &rarr;</span>
                      </Link>
                    </div>
                  )}
                </div>
              </GlassCard>

              {/* Recent Activities Card */}
              <GlassCard>
                <div className="flex items-center justify-between border-b border-border-default pb-3">
                  <h3 className="font-semibold text-heading">Lịch sử hoạt động gần đây</h3>
                  <Link
                    to={`/admin/activity?userSearch=${encodeURIComponent(query.data.user.email)}`}
                    className="text-xs font-semibold text-fg-brand hover:underline"
                  >
                    Xem tất cả &rarr;
                  </Link>
                </div>
                <div className="mt-4 space-y-1 divide-y divide-border-default-subtle">
                  {query.data.recentActivities.map((item) => (
                    <div key={item.id} className="flex gap-3 p-3 hover:bg-neutral-secondary-soft/50 rounded-lg transition-colors">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />
                      <div>
                        <p className="text-xs font-semibold text-heading">{activityLabel(item.actionType)}</p>
                        <p className="mt-0.5 text-[11px] text-body-subtle">
                          {new Date(item.createdAt).toLocaleString('vi-VN')}
                          {item.projectId ? ` · Project #${item.projectId}` : ''}
                        </p>
                        {item.metadata && (
                          <p className="mt-0.5 text-[11px] text-body-subtle font-sans tabular-nums">
                            {formatActivityMetadata(item.metadata)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  {!query.data.recentActivities.length && (
                    <EmptyState icon={Activity} title="Chưa có hoạt động" minHeight="min-h-[220px]" />
                  )}
                </div>
              </GlassCard>
            </div>
          </div>

          {/* Modal Đổi Gói Tier */}
          {tierModalOpen && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-primary/75 px-4 backdrop-blur-sm"
              onMouseDown={(e) => e.target === e.currentTarget && setTierModalOpen(false)}
            >
              <form onSubmit={handleSaveTier} className="w-full max-w-sm rounded-xl border border-border-default bg-neutral-primary-soft p-5 shadow-xl">
                <div className="flex items-center justify-between border-b border-border-default pb-3">
                  <div className="flex items-center gap-2 text-fg-brand">
                    <Crown size={16} />
                    <h3 className="text-sm font-bold text-heading">Cập Nhật Gói Tier Dịch Vụ</h3>
                  </div>
                  <button type="button" className="btn btn-secondary p-1" onClick={() => setTierModalOpen(false)}>
                    <X size={14} />
                  </button>
                </div>

                <div className="mt-4 space-y-3 text-xs">
                  <p className="text-body-subtle">
                    Chọn gói dịch vụ muốn áp dụng cho <strong>{user.email}</strong>:
                  </p>
                  <label className="block">
                    <select
                      className="form-input"
                      value={selectedTier}
                      onChange={(e) => setSelectedTier(e.target.value as UserTier)}
                    >
                      <option value="FREE">FREE - 100 lượt gọi/tháng, 2 batch song song</option>
                      <option value="PLUS">PLUS - 200 lượt gọi/tuần, 3 batch song song</option>
                      <option value="PRO">PRO - 300 lượt gọi/tháng, 4 batch, JaCoCo Refinement</option>
                    </select>
                  </label>
                </div>

                {mutations.tier?.error && (
                  <p role="alert" className="mt-3 text-xs text-fg-danger-strong bg-danger-soft p-2.5 rounded-lg">
                    {getErrorMessage(mutations.tier.error)}
                  </p>
                )}

                <div className="mt-6 flex justify-end gap-2">
                  <button type="button" className="btn btn-secondary text-xs" onClick={() => setTierModalOpen(false)}>
                    Hủy
                  </button>
                  <button type="submit" className="btn btn-brand text-xs flex items-center gap-1" disabled={mutations.tier.isPending}>
                    <Save size={13} />
                    <span>Lưu gói Tier</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Modal Sửa Quota */}
          {quotaModalOpen && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-primary/75 px-4 backdrop-blur-sm"
              onMouseDown={(e) => e.target === e.currentTarget && setQuotaModalOpen(false)}
            >
              <form onSubmit={handleSaveQuota} className="w-full max-w-sm rounded-xl border border-border-default bg-neutral-primary-soft p-5 shadow-xl">
                <div className="flex items-center justify-between border-b border-border-default pb-3">
                  <div className="flex items-center gap-2 text-fg-brand">
                    <Gauge size={16} />
                    <h3 className="text-sm font-bold text-heading">Điều Chỉnh Hạn Mức Quota</h3>
                  </div>
                  <button type="button" className="btn btn-secondary p-1" onClick={() => setQuotaModalOpen(false)}>
                    <X size={14} />
                  </button>
                </div>

                <div className="mt-4 space-y-3 text-xs">
                  <label className="flex items-center gap-2 font-semibold text-heading cursor-pointer">
                    <input
                      type="checkbox"
                      checked={unlimitedQuota}
                      onChange={(e) => setUnlimitedQuota(e.target.checked)}
                    />
                    <span>Không giới hạn Quota LLM</span>
                  </label>

                  {!unlimitedQuota && (
                    <label className="block">
                      <span className="mb-1 block font-semibold text-heading">Hạn mức tùy chỉnh (lượt/tháng)</span>
                      <input
                        type="number"
                        min="0"
                        max="100000"
                        className="form-input font-sans tabular-nums"
                        value={quotaLimit}
                        onChange={(e) => setQuotaLimit(e.target.value)}
                      />
                    </label>
                  )}
                </div>

                {mutations.quota?.error && (
                  <p role="alert" className="mt-3 text-xs text-fg-danger-strong bg-danger-soft p-2.5 rounded-lg">
                    {getErrorMessage(mutations.quota.error)}
                  </p>
                )}

                <div className="mt-6 flex justify-end gap-2">
                  <button type="button" className="btn btn-secondary text-xs" onClick={() => setQuotaModalOpen(false)}>
                    Hủy
                  </button>
                  <button type="submit" className="btn btn-brand text-xs flex items-center gap-1" disabled={mutations.quota.isPending}>
                    <Save size={13} />
                    <span>Lưu hạn mức</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Confirm Reset Quota */}
          <ConfirmDialog
            open={resetConfirmOpen}
            title="Đặt lại số lượt gọi đã dùng?"
            description={`Bạn có chắc muốn đặt lại số lượt gọi LLM đã dùng về 0 cho tài khoản ${user.email}?`}
            confirmLabel="Đặt lại về 0"
            cancelLabel="Hủy"
            pending={mutations.resetQuota?.isPending}
            onCancel={() => setResetConfirmOpen(false)}
            onConfirm={handleConfirmResetQuota}
          />

          {/* Modal Khóa / Mở Khóa Tài Khoản */}
          {statusConfirmOpen && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-primary/75 px-4 backdrop-blur-sm"
              onMouseDown={(e) => e.target === e.currentTarget && !mutations.status.isPending && setStatusConfirmOpen(false)}
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleToggleStatus();
                }}
                className="w-full max-w-md rounded-xl border border-border-default bg-neutral-primary-soft p-6 shadow-xl space-y-4"
              >
                <h3 className="text-base font-semibold text-heading">
                  {user.enabled ? 'Khóa tài khoản người dùng?' : 'Mở khóa tài khoản?'}
                </h3>
                <p className="text-sm text-body-subtle">
                  {user.enabled
                    ? `Tài khoản ${user.email} sẽ tạm thời không thể đăng nhập và sinh kiểm thử.`
                    : `Tài khoản ${user.email} sẽ được khôi phục quyền truy cập bình thường.`}
                </p>

                {user.enabled && (
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-heading">
                      Lý do khóa tài khoản <span className="text-fg-danger-strong">*</span>
                    </span>
                    <textarea
                      className="form-input text-xs"
                      rows={3}
                      required
                      maxLength={500}
                      autoFocus
                      placeholder="Nhập lý do khóa tài khoản..."
                      value={lockReason}
                      onChange={(e) => setLockReason(e.target.value)}
                    />
                  </label>
                )}

                {mutations.status.error && (
                  <p role="alert" className="text-xs text-fg-danger-strong">
                    {getErrorMessage(mutations.status.error)}
                  </p>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    className="btn btn-secondary px-3 py-1.5 text-xs"
                    disabled={mutations.status.isPending}
                    onClick={() => {
                      setStatusConfirmOpen(false);
                      setLockReason('');
                    }}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className={`btn px-4 py-1.5 text-xs ${
                      user.enabled
                        ? 'btn-ghost-danger border border-border-danger-subtle'
                        : 'btn-brand'
                    }`}
                    disabled={mutations.status.isPending || (user.enabled && !lockReason.trim())}
                  >
                    {mutations.status.isPending ? 'Đang lưu...' : user.enabled ? 'Khóa tài khoản' : 'Mở khóa'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Modal Chỉnh Sửa Thông Tin Người Dùng */}
          {editModalOpen && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-primary/75 px-4 backdrop-blur-sm"
              onMouseDown={(e) => e.target === e.currentTarget && !mutations.update?.isPending && setEditModalOpen(false)}
            >
              <form onSubmit={handleSaveEditUser} className="w-full max-w-md rounded-xl border border-border-default bg-neutral-primary-soft p-6 shadow-xl">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-fg-brand">
                      <Pencil size={17} />
                      <span className="text-xs font-bold uppercase tracking-wide">Chỉnh Sửa Tài Khoản</span>
                    </div>
                    <h2 className="mt-1 text-lg font-bold text-heading">{user.email}</h2>
                  </div>
                  <button type="button" aria-label="Đóng" className="btn btn-secondary p-2" onClick={() => setEditModalOpen(false)}>
                    <X size={15} />
                  </button>
                </div>

                <div className="mt-4 space-y-3.5 text-xs">
                  <label className="block">
                    <span className="mb-1 block font-semibold text-heading">Họ và tên</span>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Cập nhật họ tên..."
                      value={editForm.fullName}
                      onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block font-semibold text-heading">Đặt lại mật khẩu mới (để trống nếu giữ nguyên)</span>
                    <input
                      type="password"
                      minLength={6}
                      className="form-input"
                      placeholder="Nhập mật khẩu mới nếu muốn đổi..."
                      value={editForm.password}
                      onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="mb-1 block font-semibold text-heading">Vai trò</span>
                      <select
                        className="form-input"
                        value={editForm.role}
                        disabled={currentUser?.id === user.id}
                        onChange={(e) => setEditForm({ ...editForm, role: e.target.value as UserRole })}
                      >
                        <option value="USER">Người dùng</option>
                        <option value="ADMIN">Quản trị viên</option>
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-1 block font-semibold text-heading">Hạng tài khoản</span>
                      <select
                        className="form-input"
                        value={editForm.tier}
                        onChange={(e) => setEditForm({ ...editForm, tier: e.target.value as UserTier })}
                      >
                        <option value="FREE">FREE</option>
                        <option value="PLUS">PLUS</option>
                        <option value="PRO">PRO</option>
                      </select>
                    </label>
                  </div>

                  <label className="flex items-center gap-2 pt-1 font-semibold text-heading">
                    <input
                      type="checkbox"
                      checked={editForm.unlimitedQuota}
                      onChange={(e) => setEditForm({ ...editForm, unlimitedQuota: e.target.checked })}
                    />
                    <span>Không giới hạn Quota LLM</span>
                  </label>

                  {!editForm.unlimitedQuota && (
                    <label className="block">
                      <span className="mb-1 block font-semibold text-heading">Hạn mức Quota tháng</span>
                      <input
                        type="number"
                        min="0"
                        max="100000"
                        className="form-input"
                        value={editForm.quotaLimit}
                        onChange={(e) => setEditForm({ ...editForm, quotaLimit: e.target.value })}
                      />
                    </label>
                  )}
                </div>

                {mutations.update?.error && (
                  <p role="alert" className="mt-3 text-xs text-fg-danger-strong">
                    {getErrorMessage(mutations.update.error)}
                  </p>
                )}

                <div className="mt-6 flex justify-end gap-2">
                  <button type="button" className="btn btn-secondary" onClick={() => setEditModalOpen(false)}>
                    Hủy
                  </button>
                  <button type="submit" className="btn btn-brand" disabled={mutations.update?.isPending}>
                    <Save size={14} />
                    <span>{mutations.update?.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Confirm Đổi Gói Tier */}
          <ConfirmDialog
            open={confirmTierOpen}
            variant="brand"
            title={language === 'vi' ? 'Xác nhận thay đổi gói Tier?' : 'Confirm Subscription Tier Change?'}
            description={
              user
                ? language === 'vi'
                  ? `Bạn có chắc muốn chuyển tài khoản ${user.email} sang gói ${selectedTier}? Thay đổi này sẽ cập nhật trực tiếp giới hạn gọi LLM và luồng xử lý.`
                  : `Are you sure you want to change subscription tier for ${user.email} to ${selectedTier}?`
                : ''
            }
            confirmLabel={language === 'vi' ? 'Xác nhận đổi gói' : 'Confirm Change'}
            cancelLabel={language === 'vi' ? 'Hủy' : 'Cancel'}
            pending={mutations.tier.isPending}
            onCancel={() => setConfirmTierOpen(false)}
            onConfirm={handleConfirmSaveTier}
          />

          {/* Confirm Sửa Quota */}
          <ConfirmDialog
            open={confirmQuotaOpen}
            variant="brand"
            title={language === 'vi' ? 'Xác nhận điều chỉnh hạn mức Quota?' : 'Confirm Quota Adjustment?'}
            description={
              user
                ? language === 'vi'
                  ? `Bạn có chắc muốn đổi hạn mức Quota cho ${user.email} thành ${unlimitedQuota ? 'Không giới hạn' : `${quotaLimit} lượt/tháng`}?`
                  : `Are you sure you want to adjust monthly LLM quota for ${user.email}?`
                : ''
            }
            confirmLabel={language === 'vi' ? 'Xác nhận lưu' : 'Confirm Save'}
            cancelLabel={language === 'vi' ? 'Hủy' : 'Cancel'}
            pending={mutations.quota.isPending}
            onCancel={() => setConfirmQuotaOpen(false)}
            onConfirm={handleConfirmSaveQuota}
          />

          {/* Confirm Sửa Thông Tin User */}
          <ConfirmDialog
            open={confirmEditOpen}
            variant="brand"
            title={language === 'vi' ? 'Xác nhận lưu thay đổi tài khoản?' : 'Confirm User Profile Changes?'}
            description={
              user
                ? language === 'vi'
                  ? `Bạn có chắc muốn lưu các thông tin chỉnh sửa cho tài khoản ${user.email}?`
                  : `Are you sure you want to apply updates to user ${user.email}?`
                : ''
            }
            confirmLabel={language === 'vi' ? 'Xác nhận lưu' : 'Confirm Save'}
            cancelLabel={language === 'vi' ? 'Hủy' : 'Cancel'}
            pending={mutations.update?.isPending}
            onCancel={() => setConfirmEditOpen(false)}
            onConfirm={handleConfirmEditUser}
          />
        </>
      )}
    </AdminShell>
  );
}

function DetailMetric({ icon: Icon, label, value }: { icon: typeof Activity; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border-default bg-neutral-primary-soft p-4 shadow-xs">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-softer text-fg-brand">
          <Icon size={17} />
        </span>
        <div>
          <p className="text-xs text-body-subtle">{label}</p>
          <p className="text-xl font-bold text-heading font-sans tabular-nums">{value}</p>
        </div>
      </div>
    </div>
  );
}
