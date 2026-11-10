import {
  AlertTriangle, ArrowDown, ArrowLeft, ArrowUp, ArrowUpDown, Crown, Eye,
  Save, Search, Trash2, UserCheck, UserPlus, Users, UserX, X,
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getErrorMessage } from '../../../shared/api/api-client';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { EmptyState } from '../../../shared/components/EmptyState';
import { GlassCard } from '../../../shared/components/GlassCard';
import { LoadingState } from '../../../shared/components/LoadingState';
import { useCurrentUser } from '../../auth/hooks/useAuth';
import { AdminShell } from '../components/AdminShell';
import { useAdminUserMutations, useAdminUsers } from '../hooks/useAdmin';
import type { AdminUser, CreateUserRequest, UserFilters, UserRole, UserTier } from '../types';
import { useLanguage } from '../../../shared/i18n/language';

interface RoleTargetState { user: AdminUser; role: UserRole }

/** Danh sách quản trị người dùng với bộ lọc và thao tác tài khoản tập trung. */
export function AdminUsersPage() {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const initialTier = (searchParams.get('tier')?.toUpperCase() as UserTier) || undefined;
  const [filters, setFilters] = useState<UserFilters>({
    page: 0,
    size: 10,
    sort: 'createdAt',
    direction: 'desc',
    tier: initialTier,
  });

  useEffect(() => {
    const tierParam = (searchParams.get('tier')?.toUpperCase() as UserTier) || undefined;
    if (tierParam !== undefined) {
      setFilters((prev) => ({ ...prev, tier: tierParam, page: 0 }));
    }
  }, [searchParams]);

  const [roleTarget, setRoleTarget] = useState<RoleTargetState | null>(null);
  const [statusTarget, setStatusTarget] = useState<AdminUser | null>(null);

  // CRUD User modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [confirmCreateOpen, setConfirmCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: '', fullName: '', password: '', role: 'USER' as UserRole, tier: 'FREE' as UserTier, quotaLimit: '100',
  });
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);

  const users = useAdminUsers(filters);
  const { data: currentUser } = useCurrentUser();
  const mutations = useAdminUserMutations();
  const error = users.error
    || mutations.status.error
    || mutations.role.error
    || mutations.tier?.error
    || mutations.quota.error
    || mutations.create?.error
    || mutations.deleteUser?.error;

  const patch = (next: Partial<UserFilters>) => setFilters((current) => ({ ...current, ...next, page: next.page ?? 0 }));

  const toggleSort = (field: string) => {
    patch({
      page: 0,
      sort: field,
      direction: filters.sort === field && filters.direction === 'desc' ? 'asc' : 'desc',
    });
  };

  const renderSortableHeader = (field: string, label: string) => {
    const isActive = filters.sort === field;
    return (
      <th className="p-3" scope="col">
        <button
          type="button"
          onClick={() => toggleSort(field)}
          className="group inline-flex items-center gap-1.5 font-bold uppercase tracking-wide text-body-subtle hover:text-heading focus:outline-hidden"
          title={`Sắp xếp theo ${label}`}
        >
          <span>{label}</span>
          {isActive ? (
            filters.direction === 'asc' ? (
              <ArrowUp size={13} className="text-fg-brand" aria-hidden="true" />
            ) : (
              <ArrowDown size={13} className="text-fg-brand" aria-hidden="true" />
            )
          ) : (
            <ArrowUpDown size={12} className="opacity-40 transition-opacity group-hover:opacity-100" aria-hidden="true" />
          )}
        </button>
      </th>
    );
  };
  const visibleStats = useMemo(() => {
    const content = users.data?.content ?? [];
    return {
      active: content.filter((user) => user.enabled).length,
      suspended: content.filter((user) => !user.enabled).length,
      quotaAlerts: content.filter((user) => user.quota.exceeded).length,
    };
  }, [users.data?.content]);

  const saveCreateUser = (event: FormEvent) => {
    event.preventDefault();
    if (!createForm.email.trim() || !createForm.password.trim() || mutations.create?.isPending) return;
    setConfirmCreateOpen(true);
  };

  const handleConfirmCreateUser = () => {
    if (!createForm.email.trim() || !createForm.password.trim() || mutations.create?.isPending) return;
    const req: CreateUserRequest = {
      email: createForm.email.trim(),
      password: createForm.password.trim(),
      fullName: createForm.fullName.trim() || undefined,
      role: createForm.role,
      tier: createForm.tier,
      quotaLimit: createForm.quotaLimit ? Number(createForm.quotaLimit) : undefined,
    };
    mutations.create?.mutate(req, {
      onSuccess: () => {
        setConfirmCreateOpen(false);
        setCreateModalOpen(false);
        setCreateForm({ email: '', fullName: '', password: '', role: 'USER', tier: 'FREE', quotaLimit: '100' });
      },
      onError: () => setConfirmCreateOpen(false),
    });
  };

  const confirmDelete = () => {
    if (!deleteTarget || mutations.deleteUser?.isPending) return;
    mutations.deleteUser?.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
      onError: () => setDeleteTarget(null),
    });
  };

  return <AdminShell>
    <div className="mb-4">
      <Link
        to="/admin"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-body-subtle hover:text-heading transition-colors"
      >
        <ArrowLeft size={14} />
        <span>{t('Quay lại Dashboard', 'Back to Dashboard')}</span>
      </Link>
    </div>
    <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryCard icon={Users} label="Tổng tài khoản" value={users.data?.totalElements ?? 0} tone="brand" />
      <SummaryCard icon={UserCheck} label="Đang hoạt động (trang này)" value={visibleStats.active} tone="success" />
      <SummaryCard icon={UserX} label="Đang bị khóa (trang này)" value={visibleStats.suspended} tone="danger" />
      <SummaryCard icon={AlertTriangle} label="Vượt quota (trang này)" value={visibleStats.quotaAlerts} tone="warning" />
    </div>

    <GlassCard>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-heading">Quản lý người dùng</h2>
          <p className="mt-1 text-sm text-body-subtle">Tìm kiếm tài khoản, kiểm soát quyền truy cập và hạn mức LLM tại một nơi.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="btn btn-brand inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold shadow-xs"
          >
            <UserPlus size={14} />
            <span>{t('Thêm người dùng', 'Add User')}</span>
          </button>
          <span className="rounded-full bg-neutral-secondary px-3 py-1 text-xs font-semibold text-body">
            {users.data?.totalElements ?? 0} {t('tài khoản', 'accounts')}
          </span>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]">
        <label className="relative"><Search className="absolute left-3 top-3 text-body-subtle" size={16} /><input aria-label="Tìm người dùng" className="form-input pl-9" placeholder="Tìm theo email hoặc họ tên" value={filters.search ?? ''} onChange={(event) => patch({ search: event.target.value })} /></label>
        <select aria-label="Lọc role" className="form-input" value={filters.role ?? ''} onChange={(event) => patch({ role: event.target.value as UserRole | '' })}><option value="">Tất cả vai trò</option><option value="ADMIN">Quản trị viên</option><option value="USER">Người dùng</option></select>
        <select aria-label="Lọc gói tier" className="form-input" value={filters.tier ?? ''} onChange={(event) => patch({ tier: (event.target.value as UserTier) || undefined })}><option value="">Tất cả gói</option><option value="FREE">Gói FREE</option><option value="PLUS">Gói PLUS</option><option value="PRO">Gói PRO</option></select>
        <select aria-label="Lọc trạng thái" className="form-input" value={filters.enabled ?? ''} onChange={(event) => patch({ enabled: event.target.value as UserFilters['enabled'] })}><option value="">Mọi trạng thái</option><option value="true">Đang hoạt động</option><option value="false">Đã khóa</option></select>
        <select aria-label="Sắp xếp" className="form-input" value={`${filters.sort}:${filters.direction}`} onChange={(event) => { const [sort, direction] = event.target.value.split(':'); patch({ sort, direction: direction as 'asc' | 'desc' }); }}>
          <option value="createdAt:desc">Mới nhất</option>
          <option value="createdAt:asc">Cũ nhất</option>
          <option value="email:asc">Email A–Z</option>
          <option value="email:desc">Email Z–A</option>
          <option value="totalGenerationRequests:desc">Lượt sinh test: Nhiều nhất</option>
          <option value="totalGenerationRequests:asc">Lượt sinh test: Ít nhất</option>
          <option value="lastActivityAt:desc">Hoạt động gần nhất</option>
          <option value="lastActivityAt:asc">Hoạt động cũ nhất</option>
          <option value="quota:desc">Quota LLM: Dùng nhiều nhất</option>
          <option value="quota:asc">Quota LLM: Dùng ít nhất</option>
        </select>
        <button type="button" className="btn btn-secondary whitespace-nowrap" onClick={() => setFilters({ page: 0, size: 10, sort: 'createdAt', direction: 'desc' })}>Đặt lại</button>
      </div>

      {error && <p role="alert" className="mt-4 rounded-xl bg-danger-soft p-3 text-sm text-fg-danger-strong">{getErrorMessage(error)}</p>}
      {users.isLoading ? <LoadingState label="Đang tải danh sách người dùng..." /> : <div className="mt-5 overflow-x-auto rounded-xl border border-border-default">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-secondary-soft text-xs uppercase tracking-wide text-body-subtle">
            <tr>
              {renderSortableHeader('id', 'ID')}
              {renderSortableHeader('fullName', 'Họ và tên')}
              {renderSortableHeader('email', 'Email')}
              {renderSortableHeader('createdAt', 'Ngày đăng ký')}
              {renderSortableHeader('enabled', 'Trạng thái')}
              {renderSortableHeader('role', 'Vai trò')}
              {renderSortableHeader('tier', 'Gói')}
              <th className="p-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>{users.data?.content.map((user) => {
            const isSelf = currentUser?.id === user.id;
            return (
              <tr key={user.id} className="border-t border-border-default-subtle transition-colors hover:bg-neutral-secondary-soft/60">
                <td className="p-3">
                  <span className="font-sans tabular-nums text-xs font-bold text-body-subtle bg-neutral-secondary px-2 py-0.5 rounded-md">
                    #{user.id}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-softer text-xs font-bold uppercase text-fg-brand">
                      {(user.fullName || user.email).slice(0, 2)}
                    </span>
                    <Link className="font-semibold text-heading hover:text-fg-brand hover:underline" to={`/admin/users/${user.id}`}>
                      {user.fullName || 'Chưa cập nhật tên'}
                    </Link>
                  </div>
                </td>
                <td className="p-3">
                  <span className="font-sans text-xs text-body">{user.email}</span>
                </td>
                <td className="p-3">
                  <div className="text-xs text-body">
                    <p>{new Date(user.createdAt).toLocaleDateString('vi-VN')}</p>
                    <p className="text-[10px] text-body-subtle">
                      {new Date(user.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </td>
                <td className="p-3">
                  <button
                    type="button"
                    disabled={isSelf || mutations.status.isPending}
                    onClick={() => setStatusTarget(user)}
                    className={`inline-flex whitespace-nowrap items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-all ${
                      isSelf ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:shadow-xs hover:opacity-90'
                    } ${user.enabled ? 'bg-success-soft text-fg-success-strong' : 'bg-danger-soft text-fg-danger-strong'}`}
                    title={
                      isSelf
                        ? t('Không thể tự đổi trạng thái của mình', 'Cannot toggle own status')
                        : user.enabled
                        ? t('Nhấn để khóa tài khoản', 'Click to lock account')
                        : t('Nhấn để mở khóa tài khoản', 'Click to activate account')
                    }
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${user.enabled ? 'bg-success' : 'bg-danger'}`} />
                    <span>{user.enabled ? t('Hoạt động', 'Active') : t('Đã khóa', 'Locked')}</span>
                  </button>
                </td>
                <td className="p-3">
                  <select
                    aria-label={`Vai trò của ${user.email}`}
                    className="form-input min-w-[120px] py-1 text-xs"
                    value={user.role}
                    disabled={isSelf || mutations.role.isPending}
                    onChange={(event) => setRoleTarget({ user, role: event.target.value as UserRole })}
                  >
                    <option value="USER">Người dùng</option>
                    <option value="ADMIN">Quản trị viên</option>
                  </select>
                </td>
                <td className="p-3">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    user.tier === 'PRO'
                      ? 'border border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-300'
                      : user.tier === 'PLUS'
                      ? 'border border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300'
                      : 'bg-neutral-secondary text-body-subtle'
                  }`}>
                    {user.tier === 'PRO' && <Crown size={12} className="text-amber-500" />}
                    <span>{user.tier || 'FREE'}</span>
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex justify-end gap-1.5 whitespace-nowrap">
                    <Link
                      className="btn btn-secondary whitespace-nowrap px-3 py-1 text-xs inline-flex items-center gap-1.5 shadow-2xs hover:bg-brand-softer hover:text-fg-brand hover:border-brand-subtle transition-colors"
                      to={`/admin/users/${user.id}`}
                      title={t('Xem chi tiết, chỉnh sửa và quản lý tài khoản', 'View Details & Manage User')}
                    >
                      <Eye size={13} />
                      <span className="font-semibold">{t('Chi tiết', 'Details')}</span>
                    </Link>
                    <button
                      type="button"
                      disabled={isSelf || mutations.deleteUser?.isPending}
                      className="btn btn-ghost-danger border border-border-danger-subtle whitespace-nowrap p-1 text-xs disabled:opacity-30"
                      onClick={() => setDeleteTarget(user)}
                      title={isSelf ? t('Không thể tự xóa chính mình', 'Cannot delete self') : t('Xóa tài khoản', 'Delete Account')}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}</tbody>
        </table>
        {!users.data?.content.length && <EmptyState icon={Users} title="Không tìm thấy người dùng" hint="Thử thay đổi từ khóa hoặc đặt lại bộ lọc." />}
      </div>}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-body-subtle">Hiển thị tối đa {filters.size} tài khoản mỗi trang</span><div className="flex items-center gap-3"><button className="btn btn-secondary" disabled={!filters.page} onClick={() => setFilters((f) => ({ ...f, page: Math.max((f.page ?? 0) - 1, 0) }))}>Trang trước</button><span className="text-sm font-medium text-body">{(users.data?.page ?? 0) + 1}/{Math.max(users.data?.totalPages ?? 1, 1)}</span><button className="btn btn-secondary" disabled={(users.data?.page ?? 0) + 1 >= (users.data?.totalPages ?? 0)} onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 0) + 1 }))}>Trang sau</button></div></div>
    </GlassCard>

    <ConfirmDialog open={Boolean(roleTarget)} title="Xác nhận thay đổi vai trò" description={roleTarget ? `${roleTarget.user.email} sẽ được chuyển thành ${roleTarget.role === 'ADMIN' ? 'Quản trị viên' : 'Người dùng'}. Thay đổi này ảnh hưởng trực tiếp tới quyền truy cập hệ thống.` : ''} confirmLabel="Đổi vai trò" cancelLabel="Hủy" pending={mutations.role.isPending} onCancel={() => setRoleTarget(null)} onConfirm={() => roleTarget && mutations.role.mutate({ id: roleTarget.user.id, role: roleTarget.role }, { onSuccess: () => setRoleTarget(null), onError: () => setRoleTarget(null) })} />

    <ConfirmDialog
      open={Boolean(statusTarget)}
      title={statusTarget?.enabled ? 'Xác nhận khóa tài khoản' : 'Xác nhận mở khóa tài khoản'}
      description={
        statusTarget
          ? statusTarget.enabled
            ? `Bạn có chắc muốn khóa tài khoản "${statusTarget.email}"? Người dùng này sẽ không thể đăng nhập vào hệ thống.`
            : `Bạn có chắc muốn mở khóa tài khoản "${statusTarget.email}"? Người dùng này sẽ có thể đăng nhập bình thường.`
          : ''
      }
      confirmLabel={statusTarget?.enabled ? 'Khóa tài khoản' : 'Mở khóa'}
      cancelLabel="Hủy"
      variant={statusTarget?.enabled ? 'danger' : 'brand'}
      pending={mutations.status.isPending}
      onCancel={() => setStatusTarget(null)}
      onConfirm={() => {
        if (!statusTarget) return;
        mutations.status.mutate(
          {
            id: statusTarget.id,
            enabled: !statusTarget.enabled,
            reason: statusTarget.enabled ? 'Khóa từ danh sách người dùng' : 'Mở khóa từ danh sách người dùng',
          },
          {
            onSettled: () => setStatusTarget(null),
          }
        );
      }}
    />

    {/* Modal Tạo Người Dùng Mới (Create User) */}
    {createModalOpen && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-primary/75 px-4 backdrop-blur-sm"
        onMouseDown={(e) => e.target === e.currentTarget && setCreateModalOpen(false)}
      >
        <form onSubmit={saveCreateUser} className="w-full max-w-md rounded-xl border border-border-default bg-neutral-primary-soft p-6 shadow-xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-fg-brand">
                <UserPlus size={18} />
                <span className="text-xs font-bold uppercase tracking-wide">Thêm Người Dùng</span>
              </div>
              <h2 className="mt-1 text-lg font-bold text-heading">Tạo tài khoản mới</h2>
            </div>
            <button type="button" aria-label="Đóng" className="btn btn-secondary p-2" onClick={() => setCreateModalOpen(false)}>
              <X size={15} />
            </button>
          </div>

          <div className="mt-4 space-y-3.5 text-xs">
            <label className="block">
              <span className="mb-1 block font-semibold text-heading">Email đăng nhập *</span>
              <input
                type="email"
                required
                className="form-input"
                placeholder="user@greytest.dev"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              />
            </label>

            <label className="block">
              <span className="mb-1 block font-semibold text-heading">Họ và tên</span>
              <input
                type="text"
                className="form-input"
                placeholder="Nguyễn Văn A"
                value={createForm.fullName}
                onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
              />
            </label>

            <label className="block">
              <span className="mb-1 block font-semibold text-heading">Mật khẩu khởi tạo * (ít nhất 6 ký tự)</span>
              <input
                type="password"
                required
                minLength={6}
                className="form-input"
                placeholder="••••••••"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block font-semibold text-heading">Vai trò</span>
                <select
                  className="form-input"
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as UserRole })}
                >
                  <option value="USER">Người dùng</option>
                  <option value="ADMIN">Quản trị viên</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block font-semibold text-heading">Hạng tài khoản</span>
                <select
                  className="form-input"
                  value={createForm.tier}
                  onChange={(e) => setCreateForm({ ...createForm, tier: e.target.value as UserTier })}
                >
                  <option value="FREE">FREE</option>
                  <option value="PLUS">PLUS</option>
                  <option value="PRO">PRO</option>
                </select>
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block font-semibold text-heading">Hạn ngạch LLM khởi tạo (lượt/tháng)</span>
              <input
                type="number"
                min="0"
                max="100000"
                className="form-input"
                value={createForm.quotaLimit}
                onChange={(e) => setCreateForm({ ...createForm, quotaLimit: e.target.value })}
              />
            </label>
          </div>

          {mutations.create?.error && (
            <p role="alert" className="mt-3 text-xs text-fg-danger-strong">
              {getErrorMessage(mutations.create.error)}
            </p>
          )}

          <div className="mt-6 flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={() => setCreateModalOpen(false)}>
              Hủy
            </button>
            <button type="submit" className="btn btn-brand" disabled={mutations.create?.isPending}>
              <Save size={14} />
              <span>{mutations.create?.isPending ? 'Đang tạo...' : 'Tạo tài khoản'}</span>
            </button>
          </div>
        </form>
      </div>
    )}

    {/* Confirm Xóa Người Dùng (Delete User) */}
    <ConfirmDialog
      open={Boolean(deleteTarget)}
      title="Xác nhận xóa tài khoản người dùng"
      description={deleteTarget ? `Bạn có chắc chắn muốn xóa tài khoản ${deleteTarget.email}? Thao tác này sẽ dọn dẹp các bản ghi hạn ngạch và nhật ký liên quan. Không thể hoàn tác hành động này.` : ''}
      confirmLabel="Xóa tài khoản"
      cancelLabel="Hủy"
      pending={mutations.deleteUser?.isPending}
      onCancel={() => setDeleteTarget(null)}
      onConfirm={confirmDelete}
    />

    {/* Confirm Tạo Người Dùng Mới (Create User) */}
    <ConfirmDialog
      open={confirmCreateOpen}
      variant="brand"
      title="Xác nhận tạo tài khoản người dùng"
      description={`Bạn có chắc muốn tạo tài khoản mới cho "${createForm.email}" với vai trò ${createForm.role === 'ADMIN' ? 'Quản trị viên' : 'Người dùng'} và gói ${createForm.tier}?`}
      confirmLabel="Xác nhận tạo"
      cancelLabel="Hủy"
      pending={mutations.create?.isPending}
      onCancel={() => setConfirmCreateOpen(false)}
      onConfirm={handleConfirmCreateUser}
    />
  </AdminShell>;
}

function SummaryCard({ icon: Icon, label, value, tone }: { icon: typeof Users; label: string; value: number; tone: 'brand' | 'success' | 'danger' | 'warning' }) {
  const colors = { brand: 'bg-brand-softer text-fg-brand', success: 'bg-success-soft text-fg-success-strong', danger: 'bg-danger-soft text-fg-danger-strong', warning: 'bg-warning-soft text-fg-warning' };
  return <div className="rounded-xl border border-border-default bg-neutral-primary-soft p-4 shadow-sm"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-medium text-body-subtle">{label}</p><p className="mt-1 text-2xl font-bold text-heading font-sans tabular-nums">{value}</p></div><span className={`flex h-10 w-10 items-center justify-center rounded-lg ${colors[tone]}`}><Icon size={18} /></span></div></div>;
}
