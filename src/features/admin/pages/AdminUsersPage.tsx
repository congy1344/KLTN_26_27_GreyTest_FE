import { AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, Crown, Eye, Gauge, Lock, Save, Search, Unlock, UserCheck, Users, UserX, X } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getErrorMessage } from '../../../shared/api/api-client';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { EmptyState } from '../../../shared/components/EmptyState';
import { GlassCard } from '../../../shared/components/GlassCard';
import { LoadingState } from '../../../shared/components/LoadingState';
import { useCurrentUser } from '../../auth/hooks/useAuth';
import { AdminShell } from '../components/AdminShell';
import { useAdminUserMutations, useAdminUsers } from '../hooks/useAdmin';
import type { AdminUser, UserFilters, UserRole, UserTier } from '../types';

interface QuotaEditorState { id: number; name: string; value: string; unlimited: boolean }
interface RoleTargetState { user: AdminUser; role: UserRole }
interface TierTargetState { user: AdminUser; tier: UserTier }

/** Danh sách quản trị người dùng với bộ lọc và thao tác tài khoản tập trung. */
export function AdminUsersPage() {
  const [filters, setFilters] = useState<UserFilters>({ page: 0, size: 10, sort: 'createdAt', direction: 'desc' });
  const [statusTarget, setStatusTarget] = useState<AdminUser | null>(null);
  const [lockReason, setLockReason] = useState('');
  const statusDialogRef = useRef<HTMLDialogElement>(null);
  const [roleTarget, setRoleTarget] = useState<RoleTargetState | null>(null);
  const [tierTarget, setTierTarget] = useState<TierTargetState | null>(null);
  const [quotaEditor, setQuotaEditor] = useState<QuotaEditorState | null>(null);
  const users = useAdminUsers(filters);
  const { data: currentUser } = useCurrentUser();
  const mutations = useAdminUserMutations();
  const error = users.error || mutations.status.error || mutations.role.error || mutations.tier?.error || mutations.quota.error;
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

  useEffect(() => {
    const dialog = statusDialogRef.current;
    if (!dialog) return;
    if (statusTarget && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    }
    if (!statusTarget && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }
  }, [statusTarget]);

  const saveStatus = (event: FormEvent) => {
    event.preventDefault();
    if (!statusTarget || mutations.status.isPending || (statusTarget.enabled && !lockReason.trim())) return;
    mutations.status.mutate({ id: statusTarget.id, enabled: !statusTarget.enabled, ...(statusTarget.enabled ? { reason: lockReason.trim() } : {}) }, { onSuccess: () => setStatusTarget(null) });
  };

  const saveQuota = (event: FormEvent) => {
    event.preventDefault();
    if (!quotaEditor || mutations.quota.isPending || (!quotaEditor.unlimited && (!/^\d+$/.test(quotaEditor.value) || Number(quotaEditor.value) > 100000))) return;
    // Null biểu thị không giới hạn; quota 0 vẫn chặn lượt gọi LLM.
    mutations.quota.mutate({ id: quotaEditor.id, limit: quotaEditor.unlimited ? null : Number(quotaEditor.value) }, { onSuccess: () => setQuotaEditor(null) });
  };

  return <AdminShell>
    <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryCard icon={Users} label="Tổng tài khoản" value={users.data?.totalElements ?? 0} tone="brand" />
      <SummaryCard icon={UserCheck} label="Đang hoạt động (trang này)" value={visibleStats.active} tone="success" />
      <SummaryCard icon={UserX} label="Đang bị khóa (trang này)" value={visibleStats.suspended} tone="danger" />
      <SummaryCard icon={AlertTriangle} label="Vượt quota (trang này)" value={visibleStats.quotaAlerts} tone="warning" />
    </div>

    <GlassCard>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-lg font-semibold text-heading">Quản lý người dùng</h2><p className="mt-1 text-sm text-body-subtle">Tìm kiếm tài khoản, kiểm soát quyền truy cập và hạn mức LLM tại một nơi.</p></div>
        <span className="rounded-full bg-neutral-secondary px-3 py-1 text-xs font-semibold text-body">{users.data?.totalElements ?? 0} tài khoản</span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_1fr_auto]">
        <label className="relative"><Search className="absolute left-3 top-3 text-body-subtle" size={16} /><input aria-label="Tìm người dùng" className="form-input pl-9" placeholder="Tìm theo email hoặc họ tên" value={filters.search ?? ''} onChange={(event) => patch({ search: event.target.value })} /></label>
        <select aria-label="Lọc role" className="form-input" value={filters.role ?? ''} onChange={(event) => patch({ role: event.target.value as UserRole | '' })}><option value="">Tất cả vai trò</option><option value="ADMIN">Quản trị viên</option><option value="USER">Người dùng</option></select>
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

      {error && <p role="alert" className="mt-4 rounded-default bg-danger-soft p-3 text-sm text-fg-danger-strong">{getErrorMessage(error)}</p>}
      {users.isLoading ? <LoadingState label="Đang tải danh sách người dùng..." /> : <div className="mt-5 overflow-x-auto rounded-default border border-border-default">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-neutral-secondary-soft text-xs uppercase tracking-wide text-body-subtle">
            <tr>
              {renderSortableHeader('email', 'Người dùng')}
              {renderSortableHeader('role', 'Vai trò')}
              {renderSortableHeader('tier', 'Gói (Tier)')}
              {renderSortableHeader('enabled', 'Trạng thái')}
              {renderSortableHeader('totalGenerationRequests', 'Tổng lượt sinh test')}
              {renderSortableHeader('lastActivityAt', 'Hoạt động gần nhất')}
              {renderSortableHeader('quota', 'Quota LLM tháng')}
              <th className="p-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>{users.data?.content.map((user) => {
            const isSelf = currentUser?.id === user.id;
            return <tr key={user.id} className="border-t border-border-default-subtle transition-colors hover:bg-neutral-secondary-soft/60">
            <td className="p-3"><div className="flex items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-softer text-xs font-bold uppercase text-fg-brand">{(user.fullName || user.email).slice(0, 2)}</span><div className="min-w-0"><Link className="font-semibold text-heading hover:text-fg-brand hover:underline" to={`/admin/users/${user.id}`}>{user.fullName || 'Chưa cập nhật tên'}</Link><p className="max-w-xs truncate text-xs text-body-subtle xl:max-w-md">{user.email} · tạo {new Date(user.createdAt).toLocaleDateString('vi-VN')}</p></div></div></td>
            <td className="p-3"><select aria-label={`Vai trò của ${user.email}`} className="form-input min-w-[130px] py-1.5" value={user.role} disabled={isSelf || mutations.role.isPending} onChange={(event) => setRoleTarget({ user, role: event.target.value as UserRole })}><option value="USER">Người dùng</option><option value="ADMIN">Quản trị viên</option></select></td>
            <td className="p-3"><div className="flex items-center gap-1.5"><select aria-label={`Gói của ${user.email}`} className={`form-input min-w-[110px] py-1.5 text-xs font-semibold ${user.tier === 'PRO' ? 'border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-300' : 'bg-neutral-secondary-soft text-body'}`} value={user.tier || 'FREE'} disabled={mutations.tier.isPending} onChange={(event) => setTierTarget({ user, tier: event.target.value as UserTier })}><option value="FREE">Free (100)</option><option value="PRO">Pro (1.000)</option></select>{user.tier === 'PRO' && <Crown size={15} className="shrink-0 text-amber-500" />}</div></td>
            <td className="p-3"><span className={`inline-flex whitespace-nowrap items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${user.enabled ? 'bg-success-soft text-fg-success-strong' : 'bg-danger-soft text-fg-danger-strong'}`}><span className={`h-1.5 w-1.5 rounded-full ${user.enabled ? 'bg-success' : 'bg-danger'}`} />{user.enabled ? 'Hoạt động' : 'Đã khóa'}</span></td>
            <td className="p-3"><span className="font-semibold text-heading">{user.totalGenerationRequests}</span><span className="ml-1 text-xs text-body-subtle">lượt</span></td>
            <td className="p-3 whitespace-nowrap text-xs text-body-subtle">{user.lastActivityAt ? new Date(user.lastActivityAt).toLocaleString('vi-VN') : 'Chưa có'}</td>
            <td className="p-3"><button type="button" className="group min-w-[170px] text-left" onClick={() => setQuotaEditor({ id: user.id, name: user.fullName || user.email, value: String(user.quota.limit ?? 0), unlimited: user.quota.limit === null })}>
              {user.quota.limit === null ? <><p className="text-xs font-semibold text-heading">Không giới hạn</p><p className="mt-1 text-xs text-body-subtle">Đã dùng {user.quota.used} lượt</p></> : <><div className="flex justify-between text-xs"><span className={user.quota.exceeded ? 'font-bold text-fg-danger-strong' : 'font-semibold text-heading'}>{user.quota.used}/{user.quota.limit} lượt</span><span className="text-body-subtle">còn {Math.max(user.quota.remaining ?? 0, 0)}</span></div><div role="progressbar" aria-label={`Quota LLM của ${user.email}`} aria-valuemin={0} aria-valuemax={user.quota.limit} aria-valuenow={Math.min(user.quota.used, user.quota.limit)} aria-valuetext={`${user.quota.used}/${user.quota.limit} lượt`} className="mt-1.5 h-2 rounded-full bg-neutral-secondary-medium"><div className={`h-full rounded-full transition-all ${user.quota.exceeded ? 'bg-danger' : 'bg-brand'}`} style={{ width: `${Math.min(user.quota.limit ? user.quota.used / user.quota.limit * 100 : 100, 100)}%` }} /></div></>}
              <p className="mt-1.5 text-xs text-body-subtle">Reset ngày {user.quota.resetDate}</p>
            </button></td>
            <td className="p-3"><div className="flex justify-end gap-2 whitespace-nowrap"><Link className="btn btn-secondary whitespace-nowrap px-3 py-1.5 text-xs" to={`/admin/users/${user.id}`}><Eye size={14} /> Chi tiết</Link><button type="button" disabled={isSelf || mutations.status.isPending} className={`btn whitespace-nowrap px-3 py-1.5 text-xs ${user.enabled ? 'btn-ghost-danger border border-border-danger-subtle' : 'btn-secondary'}`} onClick={() => { setLockReason(''); setStatusTarget(user); }}>{user.enabled ? <Lock size={14} /> : <Unlock size={14} />}{user.enabled ? 'Khóa' : 'Mở khóa'}</button></div></td>
          </tr>; })}</tbody>
        </table>
        {!users.data?.content.length && <EmptyState icon={Users} title="Không tìm thấy người dùng" hint="Thử thay đổi từ khóa hoặc đặt lại bộ lọc." />}
      </div>}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-body-subtle">Hiển thị tối đa {filters.size} tài khoản mỗi trang</span><div className="flex items-center gap-3"><button className="btn btn-secondary" disabled={!filters.page} onClick={() => setFilters((f) => ({ ...f, page: Math.max((f.page ?? 0) - 1, 0) }))}>Trang trước</button><span className="text-sm font-medium text-body">{(users.data?.page ?? 0) + 1}/{Math.max(users.data?.totalPages ?? 1, 1)}</span><button className="btn btn-secondary" disabled={(users.data?.page ?? 0) + 1 >= (users.data?.totalPages ?? 0)} onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 0) + 1 }))}>Trang sau</button></div></div>
    </GlassCard>

    <dialog ref={statusDialogRef} aria-labelledby="status-dialog-title" aria-describedby="status-dialog-description" className="m-auto w-[min(92vw,460px)] rounded-base border border-border-default bg-neutral-primary-soft p-5 text-body shadow-xl backdrop:bg-neutral-primary/80 backdrop:backdrop-blur-sm" onCancel={(event) => { event.preventDefault(); if (!mutations.status.isPending) setStatusTarget(null); }}>
      <form onSubmit={saveStatus}>
        <h2 id="status-dialog-title" className="text-base font-semibold text-heading">{statusTarget?.enabled ? 'Khóa tài khoản?' : 'Mở khóa tài khoản?'}</h2>
        <p id="status-dialog-description" className="mt-2 text-sm text-body-subtle">{statusTarget?.enabled ? `Tài khoản ${statusTarget.email} sẽ không thể đăng nhập cho đến khi được mở khóa.` : `Khôi phục quyền đăng nhập cho ${statusTarget?.email}.`}</p>
        {statusTarget?.enabled && <label className="mt-4 block"><span className="mb-1.5 block text-sm font-semibold text-heading">Lý do khóa tài khoản</span><textarea className="form-input" required maxLength={500} autoFocus value={lockReason} onChange={(event) => setLockReason(event.target.value)} /></label>}
        {mutations.status.error && <p role="alert" className="mt-3 text-sm text-fg-danger-strong">{getErrorMessage(mutations.status.error)}</p>}
        <div className="mt-6 flex justify-end gap-2"><button type="button" className="btn btn-secondary" disabled={mutations.status.isPending} onClick={() => setStatusTarget(null)}>Hủy</button><button className="btn-ghost-danger border border-border-danger-subtle px-4 py-2" disabled={mutations.status.isPending || Boolean(statusTarget?.enabled && !lockReason.trim())}>{statusTarget?.enabled ? 'Khóa tài khoản' : 'Mở khóa'}</button></div>
      </form>
    </dialog>
    <ConfirmDialog open={Boolean(roleTarget)} title="Xác nhận thay đổi vai trò" description={roleTarget ? `${roleTarget.user.email} sẽ được chuyển thành ${roleTarget.role === 'ADMIN' ? 'Quản trị viên' : 'Người dùng'}. Thay đổi này ảnh hưởng trực tiếp tới quyền truy cập hệ thống.` : ''} confirmLabel="Đổi vai trò" cancelLabel="Hủy" pending={mutations.role.isPending} onCancel={() => setRoleTarget(null)} onConfirm={() => roleTarget && mutations.role.mutate({ id: roleTarget.user.id, role: roleTarget.role }, { onSuccess: () => setRoleTarget(null), onError: () => setRoleTarget(null) })} />
    <ConfirmDialog open={Boolean(tierTarget)} title="Xác nhận thay đổi gói tài khoản" description={tierTarget ? `Tài khoản ${tierTarget.user.email} sẽ được chuyển sang gói ${tierTarget.tier === 'PRO' ? 'PRO (Hạn mức 1.000 lượt/tháng)' : 'FREE (Hạn mức 100 lượt/tháng)'}. Hạn mức quota của tài khoản sẽ được đồng bộ tự động.` : ''} confirmLabel="Đổi gói" cancelLabel="Hủy" pending={mutations.tier.isPending} onCancel={() => setTierTarget(null)} onConfirm={() => tierTarget && mutations.tier.mutate({ id: tierTarget.user.id, tier: tierTarget.tier }, { onSuccess: () => setTierTarget(null), onError: () => setTierTarget(null) })} />

    {quotaEditor && <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-primary/75 px-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && setQuotaEditor(null)}><form onSubmit={saveQuota} className="w-full max-w-sm rounded-base border border-border-default bg-neutral-primary-soft p-5 shadow-xl"><div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2 text-fg-brand"><Gauge size={17} /><span className="text-xs font-bold uppercase tracking-wide">Quota LLM</span></div><h2 className="mt-2 text-lg font-semibold text-heading">Điều chỉnh hạn mức tháng</h2><p className="mt-1 text-sm text-body-subtle">{quotaEditor.name}</p></div><button type="button" aria-label="Đóng" className="btn btn-secondary p-2" onClick={() => setQuotaEditor(null)}><X size={15} /></button></div><label className="mt-5 flex items-center gap-2 text-sm text-heading"><input type="checkbox" checked={quotaEditor.unlimited} onChange={(event) => setQuotaEditor({ ...quotaEditor, unlimited: event.target.checked })} />Không giới hạn</label><label className="mt-3 block"><span className="mb-1.5 block text-xs font-semibold text-heading">Số lượt gọi LLM tối đa</span><input aria-label="Quota LLM mỗi tháng" className="form-input" type="number" min="0" max="100000" autoFocus required disabled={quotaEditor.unlimited} value={quotaEditor.value} onChange={(event) => setQuotaEditor({ ...quotaEditor, value: event.target.value })} /></label><p className="mt-2 text-xs leading-relaxed text-body-subtle">Đặt bằng 0 để ngừng cấp lượt LLM cho tài khoản trong kỳ hiện tại.</p><div className="mt-6 flex justify-end gap-2"><button type="button" className="btn btn-secondary" onClick={() => setQuotaEditor(null)}>Hủy</button><button className="btn btn-brand" disabled={mutations.quota.isPending}><Save size={15} /> Lưu quota</button></div></form></div>}
  </AdminShell>;
}

function SummaryCard({ icon: Icon, label, value, tone }: { icon: typeof Users; label: string; value: number; tone: 'brand' | 'success' | 'danger' | 'warning' }) {
  const colors = { brand: 'bg-brand-softer text-fg-brand', success: 'bg-success-soft text-fg-success-strong', danger: 'bg-danger-soft text-fg-danger-strong', warning: 'bg-warning-soft text-fg-warning' };
  return <div className="rounded-base border border-border-default bg-neutral-primary-soft p-4 shadow-sm"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-medium text-body-subtle">{label}</p><p className="mt-1 text-2xl font-bold text-heading">{value}</p></div><span className={`flex h-10 w-10 items-center justify-center rounded-default ${colors[tone]}`}><Icon size={18} /></span></div></div>;
}
