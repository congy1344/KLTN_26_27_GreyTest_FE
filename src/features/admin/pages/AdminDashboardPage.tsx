import { AlertTriangle, Bot, Sparkles, UserPlus, Users } from 'lucide-react';
import { GlassCard } from '../../../shared/components/GlassCard';
import { MetricCard } from '../../../shared/components/MetricCard';
import { AdminShell } from '../components/AdminShell';
import { UsageTrendChart } from '../components/UsageTrendChart';
import { useAdminOverview, useAdminTrend, useServiceHealth, useTopUsers } from '../hooks/useAdmin';

export function AdminDashboardPage() {
  const overview = useAdminOverview();
  const trend = useAdminTrend(30, 'day');
  const top = useTopUsers(30);
  const health = useServiceHealth();
  const data = overview.data;
  return (
    <AdminShell>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard icon={Users} label="Tổng user" value={data?.totalUsers ?? '—'} />
        <MetricCard icon={UserPlus} label="User mới 7 ngày" value={data?.newUsers7Days ?? '—'} />
        <MetricCard icon={Sparkles} label="Lượt sinh test" value={data?.totalGenerationRequests ?? '—'} tone="brand" />
        <MetricCard icon={Bot} label="Lượt gọi LLM" value={data?.totalLlmCalls ?? '—'} tone="brand" />
        <MetricCard icon={AlertTriangle} label="Cảnh báo quota" value={data?.quotaAlerts ?? '—'} />
      </section>
      <section className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <GlassCard>
          <div className="flex items-center justify-between"><h2 className="font-semibold text-heading">Xu hướng hoạt động · 30 ngày</h2><span className="text-xs text-body-subtle">Theo ngày</span></div>
          <UsageTrendChart points={trend.data ?? []} />
        </GlassCard>
        <GlassCard>
          <h2 className="font-semibold text-heading">Top người dùng LLM</h2>
          <div className="mt-4 space-y-3">
            {(top.data ?? []).map((user, index) => <div key={user.userId} className="flex items-center gap-3 border-b border-border-default-subtle pb-3"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-softer text-xs font-bold text-fg-brand">{index + 1}</span><span className="min-w-0 flex-1 truncate text-sm text-heading">{user.email}</span><strong className="text-sm text-heading">{user.totalLlmCalls}</strong></div>)}
            {!top.data?.length && <p className="py-8 text-center text-sm text-body-subtle">Chưa có lượt gọi LLM.</p>}
          </div>
        </GlassCard>
      </section>
      <GlassCard className="mt-6">
        <h2 className="font-semibold text-heading">Sức khỏe dịch vụ</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(health.data ?? {}).map(([name, status]) => <div key={name} className="flex items-center justify-between rounded-default border border-border-default p-3"><span className="text-sm capitalize text-body">{name.replace(/([A-Z])/g, ' $1')}</span><span className={`rounded-full px-2 py-1 text-xs font-bold ${status === 'UP' ? 'bg-success-soft text-fg-success-strong' : 'bg-warning-soft text-fg-warning'}`}>{status}</span></div>)}
        </div>
      </GlassCard>
    </AdminShell>
  );
}
