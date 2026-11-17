import { AlertTriangle, Bot, CheckCircle2, CircleDot, Clock, FlaskConical, RefreshCw, UserPlus, Users } from 'lucide-react';
import { Tag } from '../../../shared/components/Tag';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { GlassCard } from '../../../shared/components/GlassCard';
import { MetricCard } from '../../../shared/components/MetricCard';
import { AdminShell } from '../components/AdminShell';
import { UsageTrendChart } from '../components/UsageTrendChart';
import { QualityGateCard } from '../components/QualityGateCard';
import { PipelineStageFlow } from '../components/PipelineStageFlow';
import { useAdminOverview, useAdminTrend, useServiceHealth, useTopUsers } from '../hooks/useAdmin';
import { useLanguage } from '../../../shared/i18n/language';
import { formatSemanticLabel } from '../../../shared/components/SemanticBadge';

export function AdminDashboardPage() {
  const { language } = useLanguage();
  const [trendGranularity, setTrendGranularity] = useState<'day' | 'month' | 'year'>('day');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const trendDays = trendGranularity === 'year' ? 1825 : trendGranularity === 'month' ? 365 : 30;
  const fromIso = dateFrom ? `${dateFrom}T00:00:00` : undefined;
  const toIso = dateTo ? `${dateTo}T23:59:59` : undefined;

  const overview = useAdminOverview();
  const trend = useAdminTrend(trendDays, trendGranularity, fromIso, toIso);
  const top = useTopUsers(30);
  const health = useServiceHealth();
  const data = overview.data;

  const handleRefresh = () => {
    overview.refetch();
    trend.refetch();
    top.refetch();
    health.refetch();
  };

  // Tính tổng số lượt hoạt động trong 7 ngày gần nhất khi đang ở view ngày
  const trend7DaysTotal =
    trendGranularity === 'day'
      ? (trend.data || []).slice(-7).reduce((acc, curr) => acc + (curr.total || 0), 0)
      : 0;

  const gen7Days = data?.generationRequests7Days ?? trend7DaysTotal;
  const llm7Days = data?.llmCalls7Days ?? 0;

  const trendTitle = dateFrom && dateTo
    ? (language === 'vi' ? `Xu hướng hoạt động kiểm thử, ${dateFrom} đến ${dateTo}` : `Testing Activity Trend, ${dateFrom} to ${dateTo}`)
    : dateFrom
    ? (language === 'vi' ? `Xu hướng hoạt động kiểm thử, Từ ${dateFrom}` : `Testing Activity Trend, From ${dateFrom}`)
    : trendGranularity === 'year'
    ? (language === 'vi' ? 'Xu hướng hoạt động kiểm thử, 5 năm' : 'Testing Activity Trend, 5 Years')
    : trendGranularity === 'month'
    ? (language === 'vi' ? 'Xu hướng hoạt động kiểm thử, 12 tháng' : 'Testing Activity Trend, 12 Months')
    : (language === 'vi' ? 'Xu hướng hoạt động kiểm thử, 30 ngày' : 'Testing Activity Trend, 30 Days');

  return (
    <AdminShell>
      {/* Page Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-body-subtle">
              SonarQube-Inspired Quality & Ops
            </span>
            <Tag variant="status" tone="brand" icon={CircleDot}>
              GreyTest v1.2
            </Tag>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-heading sm:text-3xl">
            {language === 'vi' ? 'Bảng điều khiển quản trị' : "Admin operations dashboard"}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            className="btn btn-secondary rounded-control inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold"
          >
            <RefreshCw size={13} className={overview.isFetching ? 'animate-spin text-brand' : ''} />
            <span>{language === 'vi' ? 'Làm mới số liệu' : 'Refresh Data'}</span>
          </button>
        </div>
      </div>

      <div className="space-y-6 sm:space-y-8">
        {/* Module 1: SonarQube-inspired Quality Gate Master Banner */}
        <div id="quality-gate" className="scroll-mt-20">
          <QualityGateCard overview={data} />
        </div>

        {/* Module 2: GreyTest BR → TP → TC → UT Pipeline Progression */}
        <PipelineStageFlow overview={data} />

        {/* Module 3: Core Operational KPI Metrics */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Link to="/admin/users" className="block transition-transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-brand rounded-base">
            <MetricCard
              icon={Users}
              label={language === 'vi' ? 'Tổng người dùng' : 'Total Users'}
              value={data?.totalUsers ?? '—'}
              trend={{
                value: (data?.newUsers7Days ?? 0) > 0 ? `+${data?.newUsers7Days}` : '0',
                direction: (data?.newUsers7Days ?? 0) > 0 ? 'up' : 'neutral',
                label: language === 'vi' ? 'trong 7 ngày' : 'in 7d',
              }}
            />
          </Link>
          <Link to="/admin/users" className="block transition-transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-brand rounded-base">
            <MetricCard
              icon={UserPlus}
              label={language === 'vi' ? 'User mới 7 ngày' : 'New Users (7d)'}
              value={data?.newUsers7Days ?? '—'}
              trend={{
                value: (data?.newUsers7Days ?? 0) > 0 ? `+${data?.newUsers7Days}` : '0',
                direction: (data?.newUsers7Days ?? 0) > 0 ? 'up' : 'neutral',
                label: language === 'vi' ? 'tuần này' : 'this week',
              }}
            />
          </Link>
          <Link to="/admin/jobs" className="block transition-transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-brand rounded-base">
            <MetricCard
              icon={FlaskConical}
              label={language === 'vi' ? 'Lượt sinh test' : 'Generation Requests'}
              value={data?.totalGenerationRequests ?? '—'}
              tone="brand"
              trend={{
                value: gen7Days > 0 ? `+${gen7Days}` : '0',
                direction: gen7Days > 0 ? 'up' : 'neutral',
                label: language === 'vi' ? 'trong 7 ngày' : 'in 7d',
              }}
            />
          </Link>
          <Link to="/admin/activity" className="block transition-transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-brand rounded-base">
            <MetricCard
              icon={Bot}
              label={language === 'vi' ? 'Lượt gọi LLM' : 'Total LLM Calls'}
              value={data?.totalLlmCalls ?? '—'}
              tone="brand"
              trend={{
                value: llm7Days > 0 ? `+${llm7Days}` : '0',
                direction: llm7Days > 0 ? 'up' : 'neutral',
                label: language === 'vi' ? 'trong 7 ngày' : 'in 7d',
              }}
            />
          </Link>
          <Link to="/admin/quotas" className="block transition-transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-brand rounded-base">
            <MetricCard
              icon={AlertTriangle}
              label={language === 'vi' ? 'Cảnh báo quota' : 'Quota Alerts'}
              value={data?.quotaAlerts ?? '—'}
              trend={{
                value: (data?.quotaAlerts ?? 0) === 0 ? '0' : `+${data?.quotaAlerts}`,
                direction: (data?.quotaAlerts ?? 0) === 0 ? 'neutral' : 'up',
                tone: (data?.quotaAlerts ?? 0) === 0 ? 'neutral' : 'danger',
                label: (data?.quotaAlerts ?? 0) === 0 ? (language === 'vi' ? 'ổn định (7 ngày)' : 'stable (7d)') : (language === 'vi' ? 'vượt ngưỡng' : 'exceeded'),
              }}
            />
          </Link>
        </section>

        {/* Module 4: Trend Analysis & Top Users */}
        <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <GlassCard>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-default pb-3">
              <div>
                <h2 className="font-bold text-heading">
                  {trendTitle}
                </h2>
                <p className="text-xs text-body-subtle">
                  {language === 'vi' ? 'Tần suất sinh Unit Test và gọi mô hình AI theo thời gian' : 'Generation and LLM inference frequency over time'}
                </p>
              </div>

              {/* Bộ lọc xu hướng theo Ngày / Tháng / Năm và Khoảng ngày tùy chọn */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center rounded-base border border-border-default bg-neutral-primary p-0.5 text-xs shadow-2xs">
                  <button
                    type="button"
                    onClick={() => { setDateFrom(''); setDateTo(''); setTrendGranularity('day'); }}
                    className={`btn rounded-control px-2.5 py-1 font-medium transition-colors ${
                      !dateFrom && !dateTo && trendGranularity === 'day'
                        ? 'bg-brand text-on-brand font-semibold shadow-2xs'
                        : 'text-body-subtle hover:text-heading hover:bg-neutral-secondary/50'
                    }`}
                  >
                    {language === 'vi' ? 'Theo ngày' : 'Daily'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setDateFrom(''); setDateTo(''); setTrendGranularity('month'); }}
                    className={`btn rounded-control px-2.5 py-1 font-medium transition-colors ${
                      !dateFrom && !dateTo && trendGranularity === 'month'
                        ? 'bg-brand text-on-brand font-semibold shadow-2xs'
                        : 'text-body-subtle hover:text-heading hover:bg-neutral-secondary/50'
                    }`}
                  >
                    {language === 'vi' ? 'Theo tháng' : 'Monthly'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setDateFrom(''); setDateTo(''); setTrendGranularity('year'); }}
                    className={`btn rounded-control px-2.5 py-1 font-medium transition-colors ${
                      !dateFrom && !dateTo && trendGranularity === 'year'
                        ? 'bg-brand text-on-brand font-semibold shadow-2xs'
                        : 'text-body-subtle hover:text-heading hover:bg-neutral-secondary/50'
                    }`}
                  >
                    {language === 'vi' ? 'Theo năm' : 'Yearly'}
                  </button>
                </div>

                <div className="flex items-center gap-1.5 rounded-base border border-border-default bg-neutral-primary px-2 py-1 text-xs shadow-2xs">
                  <label className="flex items-center gap-1 text-xs text-body-subtle">
                    <span>{language === 'vi' ? 'Từ:' : 'From:'}</span>
                    <input
                      type="date"
                      aria-label={language === 'vi' ? 'Từ ngày' : 'From date'}
                      value={dateFrom}
                      max={dateTo || undefined}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="form-input rounded-control border border-border-default bg-neutral-secondary-soft px-1.5 py-0.5 text-xs text-heading focus:border-brand focus:outline-none"
                    />
                  </label>
                  <span className="text-body-subtle">-</span>
                  <label className="flex items-center gap-1 text-xs text-body-subtle">
                    <span>{language === 'vi' ? 'Đến:' : 'To:'}</span>
                    <input
                      type="date"
                      aria-label={language === 'vi' ? 'Đến ngày' : 'To date'}
                      value={dateTo}
                      min={dateFrom || undefined}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="form-input rounded-control border border-border-default bg-neutral-secondary-soft px-1.5 py-0.5 text-xs text-heading focus:border-brand focus:outline-none"
                    />
                  </label>
                  {(dateFrom || dateTo) && (
                    <button
                      type="button"
                      onClick={() => { setDateFrom(''); setDateTo(''); }}
                      className="btn btn-ghost rounded-control ml-1 text-xs font-semibold hover:underline"
                    >
                      {language === 'vi' ? 'Đặt lại' : 'Reset'}
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-4">
              <UsageTrendChart points={trend.data ?? []} granularity={trendGranularity} />
            </div>
          </GlassCard>

          <GlassCard>
            <div className="border-b border-border-default pb-3">
              <h2 className="font-bold text-heading">
                {language === 'vi' ? 'Top người dùng LLM' : "Top LLM consumers"}
              </h2>
              <p className="text-xs text-body-subtle">
                {language === 'vi' ? '30 ngày gần nhất' : 'Past 30 days'}
              </p>
            </div>
            <div className="mt-4 space-y-3">
              {(top.data ?? []).map((user, index) => (
                <div key={user.userId} className="flex items-center gap-3 border-b border-border-default-subtle pb-2.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-softer text-xs font-sans tabular-nums font-bold text-fg-brand-strong">
                    {index + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs font-medium text-heading" title={user.email}>
                    {user.email}
                  </span>
                  <span className="font-sans tabular-nums text-xs font-bold text-heading">
                    {user.totalLlmCalls}
                  </span>
                </div>
              ))}
              {!top.data?.length && (
                <p className="py-8 text-center text-xs text-body-subtle">
                  {language === 'vi' ? 'Chưa có lượt gọi LLM nào trong kỳ.' : 'No LLM calls recorded in period.'}
                </p>
              )}
            </div>
          </GlassCard>
        </section>

        {/* Module 5: Infrastructure & Service Health */}
        <GlassCard>
          <div className="flex items-center justify-between border-b border-border-default pb-3">
            <div>
              <h2 className="font-bold text-heading">
                {language === 'vi' ? 'Trạng thái dịch vụ cốt lõi' : "Core infrastructure & service health"}
              </h2>
              <p className="text-xs text-body-subtle">
                {language === 'vi' ? 'Trạng thái hoạt động của hệ thống và các dịch vụ tích hợp' : 'System and integrated services status'}
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                key: 'application',
                name: language === 'vi' ? 'Hệ thống Backend' : 'Application Core',
                desc: language === 'vi' ? 'Dịch vụ máy chủ Backend' : 'Backend Server Core',
                status: health.data?.application ?? 'UNKNOWN',
              },
              {
                key: 'database',
                name: language === 'vi' ? 'Cơ sở dữ liệu' : 'Database',
                desc: language === 'vi' ? 'Cơ sở dữ liệu PostgreSQL' : 'PostgreSQL Database',
                status: health.data?.database ?? 'UNKNOWN',
              },
              {
                key: 'llmGateway',
                name: language === 'vi' ? 'Cổng kết nối AI' : 'AI Model Gateway',
                desc: language === 'vi' ? 'Mô hình AI (Google Gemini / VietAPI)' : 'Google Gemini / VietAPI',
                status: health.data?.llmGateway ?? 'UNKNOWN',
              },
              {
                key: 'javaParser',
                name: language === 'vi' ? 'Bộ phân tích mã nguồn' : 'Java Parser',
                desc: language === 'vi' ? 'Bộ phân tích cú pháp AST' : 'AST Semantic Engine',
                status: health.data?.javaParser ?? 'UNKNOWN',
              },
            ].map(({ key, name, desc, status }) => (
              <div key={key} className="flex items-center justify-between rounded-base border border-border-default bg-neutral-secondary-soft/50 p-3">
                <div>
                  <span className="text-xs font-bold text-heading">
                    {name}
                  </span>
                  <p className="text-xs text-body-subtle">{desc}</p>
                </div>
                <Tag variant="status" tone={status === 'UP' ? "success" : status === 'IN_PROCESS' ? "brand" : "warning"} icon={status === 'UP' ? CheckCircle2 : status === 'IN_PROCESS' ? CircleDot : Clock}>
                  {formatSemanticLabel(status, language)}
                </Tag>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </AdminShell>
  );
}
