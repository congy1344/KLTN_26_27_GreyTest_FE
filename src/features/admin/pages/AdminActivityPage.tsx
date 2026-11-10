import { Activity, ArrowLeft, Bot, FilterX, History, LogIn, Settings2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getErrorMessage } from '../../../shared/api/api-client';
import { EmptyState } from '../../../shared/components/EmptyState';
import { GlassCard } from '../../../shared/components/GlassCard';
import { LoadingState } from '../../../shared/components/LoadingState';
import { AdminShell } from '../components/AdminShell';
import { useActivities } from '../hooks/useAdmin';
import type { ActivityAction, ActivityFilters } from '../types';
import { activityLabel, formatActivityMetadata } from '../utils/activity-presentation';

const actions: ActivityAction[] = [
  'GENERATE_BUSINESS_RULE', 'REVIEW_BUSINESS_RULE', 'GENERATE_TEST_PLAN',
  'GENERATE_TEST_CASE', 'GENERATE_UNIT_TEST', 'COVERAGE_REFINEMENT',
  'LLM_CALL', 'USER_LOGIN', 'ADMIN_STATUS_CHANGE', 'ADMIN_ROLE_CHANGE',
  'ADMIN_QUOTA_CHANGE', 'USER_UPGRADE_TIER', 'USER_CANCEL_TIER', 'ADMIN_TIER_CHANGE'
];

/** Nhật ký vận hành cô đọng, ưu tiên thông tin mà quản trị viên cần tra cứu. */
export function AdminActivityPage() {
  const [searchParams] = useSearchParams();
  const initialAction = (searchParams.get('action') as ActivityAction) || undefined;
  const initialUserSearch = searchParams.get('userSearch') || undefined;

  const [filters, setFilters] = useState<ActivityFilters>({
    page: 0,
    size: 20,
    action: initialAction,
    userSearch: initialUserSearch,
  });

  const query = useActivities(filters);
  const patch = (next: Partial<ActivityFilters>) => setFilters((current) => ({ ...current, ...next, page: next.page ?? 0 }));
  const stats = useMemo(() => {
    const items = query.data?.content ?? [];
    return {
      total: query.data?.totalElements ?? 0,
      ai: items.filter((item) => item.actionType === 'LLM_CALL').length,
      admin: items.filter((item) => item.actionType.startsWith('ADMIN_')).length,
      login: items.filter((item) => item.actionType === 'USER_LOGIN').length,
    };
  }, [query.data]);

  return <AdminShell>
    <div className="mb-4">
      <Link
        to="/admin"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-body-subtle hover:text-heading transition-colors"
      >
        <ArrowLeft size={14} />
        <span>Quay lại Dashboard</span>
      </Link>
    </div>

    <div className="mb-5 grid gap-3 sm:grid-cols-4">
      <LogMetric icon={History} label="Tổng bản ghi phù hợp" value={stats.total} />
      <LogMetric icon={Bot} label="Lượt LLM trên trang" value={stats.ai} />
      <LogMetric icon={LogIn} label="Lượt Đăng nhập trên trang" value={stats.login} />
      <LogMetric icon={Settings2} label="Thao tác Admin trên trang" value={stats.admin} />
    </div>

    <GlassCard>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-heading">Nhật ký hoạt động</h2>
          <p className="mt-1 text-sm text-body-subtle">Theo dõi thao tác quan trọng theo thời gian, người dùng và loại hoạt động.</p>
        </div>

        <div className="flex items-center rounded-lg border border-border-default bg-neutral-primary p-0.5 text-xs shadow-2xs">
          <button
            type="button"
            onClick={() => patch({ action: '' })}
            className={`rounded-md px-3 py-1 font-medium transition-all ${
              !filters.action
                ? 'bg-brand text-white font-semibold shadow-2xs'
                : 'text-body-subtle hover:text-heading hover:bg-neutral-secondary/50'
            }`}
          >
            Tất cả hoạt động
          </button>
          <button
            type="button"
            onClick={() => patch({ action: 'USER_LOGIN' })}
            className={`rounded-md px-3 py-1 font-medium transition-all ${
              filters.action === 'USER_LOGIN'
                ? 'bg-brand text-white font-semibold shadow-2xs'
                : 'text-body-subtle hover:text-heading hover:bg-neutral-secondary/50'
            }`}
          >
            Nhật ký đăng nhập
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-[1.2fr_1.4fr_1fr_1fr_auto]">
        <input
          aria-label="Tìm kiếm người dùng"
          className="form-input"
          type="text"
          placeholder="Tìm theo tên, email, ID..."
          value={filters.userSearch ?? ''}
          onChange={(event) => patch({ userSearch: event.target.value || undefined, userId: undefined })}
        />
        <select aria-label="Loại hoạt động" className="form-input" value={filters.action ?? ''} onChange={(event) => patch({ action: event.target.value as ActivityAction | '' })}><option value="">Tất cả hoạt động</option>{actions.map((action) => <option key={action} value={action}>{activityLabel(action)}</option>)}</select>
        <label><span className="sr-only">Từ ngày</span><input aria-label="Từ ngày" className="form-input" type="datetime-local" value={filters.from ?? ''} onChange={(event) => patch({ from: event.target.value || undefined })} /></label>
        <label><span className="sr-only">Đến ngày</span><input aria-label="Đến ngày" className="form-input" type="datetime-local" value={filters.to ?? ''} onChange={(event) => patch({ to: event.target.value || undefined })} /></label>
        <button type="button" className="btn btn-secondary whitespace-nowrap" onClick={() => setFilters({ page: 0, size: 20 })}><FilterX size={15} /> Xóa lọc</button>
      </div>

      {query.error && <p role="alert" className="mt-4 rounded-xl bg-danger-soft p-3 text-sm text-fg-danger-strong">{getErrorMessage(query.error)}</p>}
      {query.isLoading ? <LoadingState label="Đang tải nhật ký..." /> : <div className="mt-5 overflow-hidden rounded-xl border border-border-default">
        <div className="divide-y divide-border-default-subtle">
          {query.data?.content.map((item) => {
            const isAdmin = item.actionType.startsWith('ADMIN_');
            const isLlm = item.actionType === 'LLM_CALL';
            const isLogin = item.actionType === 'USER_LOGIN';
            return <article key={item.id} className="grid gap-3 p-3 transition-colors hover:bg-neutral-secondary-soft/60 md:grid-cols-[150px_minmax(180px,1fr)_minmax(180px,1.1fr)_minmax(180px,1.3fr)] md:items-center">
              <div><p className="text-xs font-semibold text-heading">{new Date(item.createdAt).toLocaleDateString('vi-VN')}</p><p className="mt-0.5 text-[11px] text-body-subtle">{new Date(item.createdAt).toLocaleTimeString('vi-VN')}</p></div>
              <div className="min-w-0"><p className="truncate text-sm font-semibold text-heading">{item.userEmail ?? `User #${item.userId}`}</p><p className="text-[11px] text-body-subtle">ID {item.userId}{item.projectId ? ` · Project #${item.projectId}` : ''}</p></div>
              <div><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${isLlm ? 'bg-purple-soft text-purple' : isAdmin ? 'bg-warning-soft text-fg-warning' : isLogin ? 'bg-success-soft text-fg-success-strong' : 'bg-brand-softer text-fg-brand'}`}>{activityLabel(item.actionType)}</span></div>
              <p className="line-clamp-2 text-xs leading-relaxed text-body-subtle" title={formatActivityMetadata(item.metadata)}>{formatActivityMetadata(item.metadata)}</p>
            </article>;
          })}
        </div>
        {!query.data?.content.length && <EmptyState icon={Activity} title="Chưa có hoạt động phù hợp" hint="Thử xóa bộ lọc hoặc chọn khoảng thời gian khác." />}
      </div>}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-body-subtle">Trang {(query.data?.page ?? 0) + 1} trên {Math.max(query.data?.totalPages ?? 1, 1)}</span><div className="flex gap-2"><button className="btn btn-secondary" disabled={!filters.page} onClick={() => setFilters((current) => ({ ...current, page: Math.max((current.page ?? 0) - 1, 0) }))}>Trang trước</button><button className="btn btn-secondary" disabled={(query.data?.page ?? 0) + 1 >= (query.data?.totalPages ?? 0)} onClick={() => setFilters((current) => ({ ...current, page: (current.page ?? 0) + 1 }))}>Trang sau</button></div></div>
    </GlassCard>
  </AdminShell>;
}

function LogMetric({ icon: Icon, label, value }: { icon: typeof History; label: string; value: number }) {
  return <div className="rounded-xl border border-border-default bg-neutral-primary-soft p-4 shadow-sm"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-softer text-fg-brand"><Icon size={17} /></span><div><p className="text-xs text-body-subtle">{label}</p><p className="text-xl font-bold text-heading font-sans tabular-nums">{value}</p></div></div></div>;
}
