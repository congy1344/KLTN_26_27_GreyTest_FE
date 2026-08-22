import { Activity, ArrowLeft, CalendarDays, FolderKanban, Gauge, Mail, ShieldCheck, TestTube2, UserRound } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { getErrorMessage } from '../../../shared/api/api-client';
import { EmptyState } from '../../../shared/components/EmptyState';
import { GlassCard } from '../../../shared/components/GlassCard';
import { LoadingState } from '../../../shared/components/LoadingState';
import { AdminShell } from '../components/AdminShell';
import { useAdminUser } from '../hooks/useAdmin';
import { activityLabel } from '../utils/activity-presentation';

/** Hồ sơ quản trị tổng hợp thông tin tài khoản, quota, dự án và lịch sử gần nhất. */
export function AdminUserDetailPage() {
  const id = Number(useParams().id);
  const query = useAdminUser(id);

  return <AdminShell>
    <Link to="/admin/users" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-fg-brand hover:underline"><ArrowLeft size={15} /> Danh sách người dùng</Link>
    {query.isLoading && <GlassCard><LoadingState label="Đang tải hồ sơ người dùng..." /></GlassCard>}
    {query.error && <p role="alert" className="rounded-default bg-danger-soft p-3 text-sm text-fg-danger-strong">{getErrorMessage(query.error)}</p>}
    {query.data && <>
      <GlassCard>
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex items-center gap-4"><span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-softer text-fg-brand"><UserRound size={24} /></span><div><h2 className="text-xl font-bold text-heading">{query.data.user.fullName || 'Chưa cập nhật tên'}</h2><p className="mt-1 flex items-center gap-1.5 text-sm text-body-subtle"><Mail size={13} /> {query.data.user.email}</p><p className="mt-1 flex items-center gap-1.5 text-xs text-body-subtle"><CalendarDays size={13} /> Tham gia {new Date(query.data.user.createdAt).toLocaleDateString('vi-VN')}</p></div></div>
          <div className="flex flex-wrap gap-2"><span className="inline-flex items-center gap-1.5 rounded-full bg-brand-softer px-3 py-1 text-xs font-semibold text-fg-brand"><ShieldCheck size={13} /> {query.data.user.role === 'ADMIN' ? 'Quản trị viên' : 'Người dùng'}</span><span className={`rounded-full px-3 py-1 text-xs font-semibold ${query.data.user.enabled ? 'bg-success-soft text-fg-success-strong' : 'bg-danger-soft text-fg-danger-strong'}`}>{query.data.user.enabled ? 'Đang hoạt động' : 'Đã khóa'}</span></div>
        </div>
      </GlassCard>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <DetailMetric icon={Activity} label="Tổng hoạt động" value={`${query.data.user.totalActivities}`} />
        <DetailMetric icon={TestTube2} label="Unit test đã sinh" value={`${query.data.generatedUnitTests}`} />
        <DetailMetric icon={FolderKanban} label="Dự án liên kết" value={`${query.data.projects.length}`} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-5">
          <GlassCard><div className="flex items-center gap-2"><Gauge size={17} className="text-fg-brand" /><h3 className="font-semibold text-heading">Quota LLM tháng</h3></div><div className="mt-4 flex items-end justify-between"><p className="text-2xl font-bold text-heading">{query.data.user.quota.used}<span className="text-sm font-medium text-body-subtle">/{query.data.user.quota.limit} lượt</span></p><span className="text-xs text-body-subtle">Còn {Math.max(query.data.user.quota.remaining, 0)}</span></div><div className="mt-3 h-2 rounded-full bg-neutral-secondary-medium"><div className={`h-full rounded-full ${query.data.user.quota.exceeded ? 'bg-danger' : 'bg-brand'}`} style={{ width: `${Math.min(query.data.user.quota.limit ? query.data.user.quota.used / query.data.user.quota.limit * 100 : 100, 100)}%` }} /></div><p className="mt-3 text-xs text-body-subtle">Kỳ bắt đầu: {new Date(query.data.user.quota.periodStart).toLocaleDateString('vi-VN')}</p></GlassCard>
          <GlassCard><h3 className="font-semibold text-heading">Dự án đã liên kết</h3><div className="mt-4 space-y-3">{query.data.projects.map((project) => <div key={project.id} className="rounded-default border border-border-default p-3"><p className="font-semibold text-heading">{project.name}</p><p className="mt-1 text-xs text-body-subtle">Project #{project.id} · {project.status}</p></div>)}{!query.data.projects.length && <EmptyState icon={FolderKanban} title="Chưa có dự án" minHeight="min-h-[140px]" />}</div></GlassCard>
        </div>
        <GlassCard><h3 className="font-semibold text-heading">Hoạt động gần đây</h3><div className="mt-4 space-y-1">{query.data.recentActivities.map((item) => <div key={item.id} className="flex gap-3 rounded-default p-3 hover:bg-neutral-secondary-soft"><span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand" /><div><p className="text-sm font-semibold text-heading">{activityLabel(item.actionType)}</p><p className="mt-1 text-xs text-body-subtle">{new Date(item.createdAt).toLocaleString('vi-VN')}{item.projectId ? ` · Project #${item.projectId}` : ''}</p></div></div>)}{!query.data.recentActivities.length && <EmptyState icon={Activity} title="Chưa có hoạt động" minHeight="min-h-[220px]" />}</div></GlassCard>
      </div>
    </>}
  </AdminShell>;
}

function DetailMetric({ icon: Icon, label, value }: { icon: typeof Activity; label: string; value: string }) {
  return <div className="rounded-base border border-border-default bg-neutral-primary-soft p-4 shadow-sm"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-default bg-brand-softer text-fg-brand"><Icon size={17} /></span><div><p className="text-xs text-body-subtle">{label}</p><p className="text-xl font-bold text-heading">{value}</p></div></div></div>;
}
