import { AlertTriangle, Eye, Gauge, Lock, Save, Search, Unlock, UserCheck, Users, UserX, X } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getErrorMessage } from '../../../shared/api/api-client';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { EmptyState } from '../../../shared/components/EmptyState';
import { GlassCard } from '../../../shared/components/GlassCard';
import { LoadingState } from '../../../shared/components/LoadingState';
import { AdminShell } from '../components/AdminShell';
import { useAdminUserMutations, useAdminUsers } from '../hooks/useAdmin';
import type { AdminUser, UserFilters, UserRole } from '../types';

interface QuotaEditorState { id: number; name: string; value: string }
interface RoleTargetState { user: AdminUser; role: UserRole }

/** Danh sách quản trị người dùng với bộ lọc và thao tác tài khoản tập trung. */
export function AdminUsersPage() {
  const [filters, setFilters] = useState<UserFilters>({ page: 0, size: 10, sort: 'createdAt', direction: 'desc' });
  const [statusTarget, setStatusTarget] = useState<AdminUser | null>(null);
  const [roleTarget, setRoleTarget] = useState<RoleTargetState | null>(null);
  const [quotaEditor, setQuotaEditor] = useState<QuotaEditorState | null>(null);
  const users = useAdminUsers(filters);
  const mutations = useAdminUserMutations();
  const error = users.error || mutations.status.error || mutations.role.error || mutations.quota.error;
  const patch = (next: Partial<UserFilters>) => setFilters((current) => ({ ...current, ...next, page: next.page ?? 0 }));
  const visibleStats = useMemo(() => {
    const content = users.data?.content ?? [];
    return {
      active: content.filter((user) => user.enabled).length,
      suspended: content.filter((user) => !user.enabled).length,
      quotaAlerts: content.filter((user) => user.quota.exceeded).length,
    };
  }, [users.data?.content]);

  const saveQuota = (event: FormEvent) => {
    event.preventDefault();
    if (!quotaEditor || !/^\d+$/.test(quotaEditor.value)) return;
    mutations.quota.mutate({ id: quotaEditor.id, limit: Number(quotaEditor.value) }, { onSuccess: () => setQuotaEditor(null) });
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
        <select aria-label="Sắp xếp" className="form-input" value={`${filters.sort}:${filters.direction}`} onChange={(event) => { const [sort, direction] = event.target.value.split(':'); patch({ sort, direction: direction as 'asc' | 'desc' }); }}><option value="createdAt:desc">Mới nhất</option><option value="createdAt:asc">Cũ nhất</option><option value="email:asc">Email A–Z</option><option value="email:desc">Email Z–A</option></select>
        <button type="button" className="btn btn-secondary whitespace-nowrap" onClick={() => setFilters({ page: 0, size: 10, sort: 'createdAt', direction: 'desc' })}>Đặt lại</button>
      </div>

      {error && <p role="alert" className="mt-4 rounded-default bg-danger-soft p-3 text-sm text-fg-danger-strong">{getErrorMessage(error)}</p>}
      {users.isLoading ? <LoadingState label="Đang tải danh sách người dùng..." /> : <div className="mt-5 overflow-x-auto rounded-default border border-border-default">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-neutral-secondary-soft text-xs uppercase tracking-wide text-body-subtle"><tr><th className="p-3">Người dùng</th><th className="p-3">Vai trò</th><th className="p-3">Trạng thái</th><th className="p-3">Hoạt động</th><th className="p-3">Quota LLM tháng</th><th className="p-3 text-right">Thao tác</th></tr></thead>
          <tbody>{users.data?.content.map((user) => <tr key={user.id} className="border-t border-border-default-subtle transition-colors hover:bg-neutral-secondary-soft/60">
            <td className="p-3"><div className="flex items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-softer text-xs font-bold uppercase text-fg-brand">{(user.fullName || user.email).slice(0, 2)}</span><div className="min-w-0"><Link className="font-semibold text-heading hover:text-fg-brand hover:underline" to={`/admin/users/${user.id}`}>{user.fullName || 'Chưa cập nhật tên'}</Link><p className="max-w-[260px] truncate text-xs text-body-subtle">{user.email} · tạo {new Date(user.createdAt).toLocaleDateString('vi-VN')}</p></div></div></td>
            <td className="p-3"><select aria-label={`Vai trò của ${user.email}`} className="form-input min-w-[130px] py-1.5" value={user.role} disabled={mutations.role.isPending} onChange={(event) => setRoleTarget({ user, role: event.target.value as UserRole })}><option value="USER">Người dùng</option><option value="ADMIN">Quản trị viên</option></select></td>
            <td className="p-3"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${user.enabled ? 'bg-success-soft text-fg-success-strong' : 'bg-danger-soft text-fg-danger-strong'}`}><span className={`h-1.5 w-1.5 rounded-full ${user.enabled ? 'bg-success' : 'bg-danger'}`} />{user.enabled ? 'Hoạt động' : 'Đã khóa'}</span></td>
            <td className="p-3"><span className="font-semibold text-heading">{user.totalActivities}</span><span className="ml-1 text-xs text-body-subtle">lượt</span></td>
            <td className="p-3"><button type="button" className="group min-w-[150px] text-left" onClick={() => setQuotaEditor({ id: user.id, name: user.fullName || user.email, value: String(user.quota.limit) })}><div className="flex justify-between text-xs"><span className={user.quota.exceeded ? 'font-bold text-fg-danger-strong' : 'font-semibold text-heading'}>{user.quota.used}/{user.quota.limit} lượt</span><span className="text-body-subtle">còn {Math.max(user.quota.remaining, 0)}</span></div><div className="mt-1.5 h-2 rounded-full bg-neutral-secondary-medium"><div className={`h-full rounded-full transition-all ${user.quota.exceeded ? 'bg-danger' : 'bg-brand'}`} style={{ width: `${Math.min(user.quota.limit ? user.quota.used / user.quota.limit * 100 : 100, 100)}%` }} /></div></button></td>
            <td className="p-3"><div className="flex justify-end gap-2"><Link className="btn btn-secondary px-3 py-1.5 text-xs" to={`/admin/users/${user.id}`}><Eye size={14} /> Chi tiết</Link><button type="button" className={`btn px-3 py-1.5 text-xs ${user.enabled ? 'btn-ghost-danger border border-border-danger-subtle' : 'btn-secondary'}`} onClick={() => setStatusTarget(user)}>{user.enabled ? <Lock size={14} /> : <Unlock size={14} />}{user.enabled ? 'Khóa' : 'Mở khóa'}</button></div></td>
          </tr>)}</tbody>
        </table>
        {!users.data?.content.length && <EmptyState icon={Users} title="Không tìm thấy người dùng" hint="Thử thay đổi từ khóa hoặc đặt lại bộ lọc." />}
      </div>}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-body-subtle">Hiển thị tối đa {filters.size} tài khoản mỗi trang</span><div className="flex items-center gap-3"><button className="btn btn-secondary" disabled={!filters.page} onClick={() => setFilters((f) => ({ ...f, page: Math.max((f.page ?? 0) - 1, 0) }))}>Trang trước</button><span className="text-sm font-medium text-body">{(users.data?.page ?? 0) + 1}/{Math.max(users.data?.totalPages ?? 1, 1)}</span><button className="btn btn-secondary" disabled={(users.data?.page ?? 0) + 1 >= (users.data?.totalPages ?? 0)} onClick={() => setFilters((f) => ({ ...f, page: (f.page ?? 0) + 1 }))}>Trang sau</button></div></div>
    </GlassCard>

    <ConfirmDialog open={Boolean(statusTarget)} title={statusTarget?.enabled ? 'Khóa tài khoản?' : 'Mở khóa tài khoản?'} description={statusTarget?.enabled ? `Tài khoản ${statusTarget.email} sẽ không thể đăng nhập cho đến khi được mở khóa.` : `Khôi phục quyền đăng nhập cho ${statusTarget?.email}.`} confirmLabel={statusTarget?.enabled ? 'Khóa tài khoản' : 'Mở khóa'} cancelLabel="Hủy" pending={mutations.status.isPending} onCancel={() => setStatusTarget(null)} onConfirm={() => statusTarget && mutations.status.mutate({ id: statusTarget.id, enabled: !statusTarget.enabled }, { onSuccess: () => setStatusTarget(null) })} />
    <ConfirmDialog open={Boolean(roleTarget)} title="Xác nhận thay đổi vai trò" description={roleTarget ? `${roleTarget.user.email} sẽ được chuyển thành ${roleTarget.role === 'ADMIN' ? 'Quản trị viên' : 'Người dùng'}. Thay đổi này ảnh hưởng trực tiếp tới quyền truy cập hệ thống.` : ''} confirmLabel="Đổi vai trò" cancelLabel="Hủy" pending={mutations.role.isPending} onCancel={() => setRoleTarget(null)} onConfirm={() => roleTarget && mutations.role.mutate({ id: roleTarget.user.id, role: roleTarget.role }, { onSuccess: () => setRoleTarget(null), onError: () => setRoleTarget(null) })} />

    {quotaEditor && <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-primary/75 px-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && setQuotaEditor(null)}><form onSubmit={saveQuota} className="w-full max-w-sm rounded-base border border-border-default bg-neutral-primary-soft p-5 shadow-xl"><div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2 text-fg-brand"><Gauge size={17} /><span className="text-xs font-bold uppercase tracking-wide">Quota LLM</span></div><h2 className="mt-2 text-lg font-semibold text-heading">Điều chỉnh hạn mức tháng</h2><p className="mt-1 text-sm text-body-subtle">{quotaEditor.name}</p></div><button type="button" aria-label="Đóng" className="btn btn-secondary p-2" onClick={() => setQuotaEditor(null)}><X size={15} /></button></div><label className="mt-5 block"><span className="mb-1.5 block text-xs font-semibold text-heading">Số lượt gọi LLM tối đa</span><input aria-label="Quota LLM mỗi tháng" className="form-input" type="number" min="0" max="100000" autoFocus required value={quotaEditor.value} onChange={(event) => setQuotaEditor({ ...quotaEditor, value: event.target.value })} /></label><p className="mt-2 text-xs leading-relaxed text-body-subtle">Đặt bằng 0 để ngừng cấp lượt LLM cho tài khoản trong kỳ hiện tại.</p><div className="mt-6 flex justify-end gap-2"><button type="button" className="btn btn-secondary" onClick={() => setQuotaEditor(null)}>Hủy</button><button className="btn btn-brand" disabled={mutations.quota.isPending}><Save size={15} /> Lưu quota</button></div></form></div>}
  </AdminShell>;
}

function SummaryCard({ icon: Icon, label, value, tone }: { icon: typeof Users; label: string; value: number; tone: 'brand' | 'success' | 'danger' | 'warning' }) {
  const colors = { brand: 'bg-brand-softer text-fg-brand', success: 'bg-success-soft text-fg-success-strong', danger: 'bg-danger-soft text-fg-danger-strong', warning: 'bg-warning-soft text-fg-warning' };
  return <div className="rounded-base border border-border-default bg-neutral-primary-soft p-4 shadow-sm"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-medium text-body-subtle">{label}</p><p className="mt-1 text-2xl font-bold text-heading">{value}</p></div><span className={`flex h-10 w-10 items-center justify-center rounded-default ${colors[tone]}`}><Icon size={18} /></span></div></div>;
}
