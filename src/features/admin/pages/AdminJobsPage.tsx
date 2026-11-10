import {
  AlertCircle, ArrowLeft, CheckCircle2,
  Clock, History, Layers, RefreshCw, RotateCcw, XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { AdminShell } from '../components/AdminShell';
import { useActiveJobs, useAdminUserMutations, useJobHistory, useJobRetryMutation } from '../hooks/useAdmin';
import { useLanguage } from '../../../shared/i18n/language';
import type { ActiveJob, ActivityAction, GenerationProgressStage, GenerationProgressStatus, JobHistoryItem } from '../types';
import { EmptyState } from '../../../shared/components/EmptyState';
import { LoadingState } from '../../../shared/components/LoadingState';

const GENERATION_STAGES: { key: string; stage?: GenerationProgressStage; labelVi: string; labelEn: string }[] = [
  { key: 'ALL', labelVi: 'Tất cả tác vụ', labelEn: 'All Jobs' },
  { key: 'BR', stage: 'BUSINESS_RULE', labelVi: 'Sinh BR', labelEn: 'Business Rules' },
  { key: 'TP', stage: 'TEST_PLAN', labelVi: 'Sinh Test Plan', labelEn: 'Test Plans' },
  { key: 'TC', stage: 'TEST_CASE', labelVi: 'Sinh Test Case', labelEn: 'Test Cases' },
  { key: 'UT', stage: 'UNIT_TEST', labelVi: 'Sinh Unit Test (JUnit 5)', labelEn: 'Unit Tests' },
];

function actionToStage(action?: ActivityAction): GenerationProgressStage {
  if (action === 'GENERATE_BUSINESS_RULE') return 'BUSINESS_RULE';
  if (action === 'GENERATE_TEST_PLAN') return 'TEST_PLAN';
  if (action === 'GENERATE_TEST_CASE') return 'TEST_CASE';
  return 'UNIT_TEST';
}

function stageLabel(stage: GenerationProgressStage | string, language: 'vi' | 'en') {
  switch (stage) {
    case 'BUSINESS_RULE':
      return language === 'vi' ? 'Sinh BR' : 'Business Rules';
    case 'TEST_PLAN':
      return language === 'vi' ? 'Sinh Test Plan' : 'Test Plans';
    case 'TEST_CASE':
      return language === 'vi' ? 'Sinh Test Case' : 'Test Cases';
    case 'UNIT_TEST':
      return language === 'vi' ? 'Sinh Unit Test (JUnit 5)' : 'Unit Tests (JUnit 5)';
    default:
      return stage;
  }
}

function statusBadge(status: GenerationProgressStatus | string, language: 'vi' | 'en') {
  if (status === 'RUNNING') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-softer px-2.5 py-0.5 text-[11px] font-bold text-fg-brand-strong">
        <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />
        {language === 'vi' ? 'Đang chạy' : 'Running'}
      </span>
    );
  }
  if (status === 'QUEUED') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-soft px-2.5 py-0.5 text-[11px] font-bold text-fg-warning">
        <Clock size={11} />
        {language === 'vi' ? 'Chờ trong hàng đợi' : 'Queued'}
      </span>
    );
  }
  if (status === 'PAUSED') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-secondary px-2.5 py-0.5 text-[11px] font-bold text-body">
        {language === 'vi' ? 'Tạm dừng' : 'Paused'}
      </span>
    );
  }
  if (status === 'COMPLETED') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-0.5 text-[11px] font-bold text-fg-success-strong">
        <CheckCircle2 size={11} />
        {language === 'vi' ? 'Hoàn tất' : 'Completed'}
      </span>
    );
  }
  if (status === 'FAILED') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-danger-soft px-2.5 py-0.5 text-[11px] font-bold text-fg-danger-strong">
        <AlertCircle size={11} />
        {language === 'vi' ? 'Thất bại' : 'Failed'}
      </span>
    );
  }
  if (status === 'CANCELLED') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-secondary px-2.5 py-0.5 text-[11px] font-bold text-body-subtle">
        <XCircle size={11} />
        {language === 'vi' ? 'Đã hủy' : 'Cancelled'}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-neutral-secondary-soft px-2.5 py-0.5 text-[11px] font-bold text-body-subtle">
      {status}
    </span>
  );
}

export function AdminJobsPage() {
  const { language } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const stageParam = searchParams.get('stage') || searchParams.get('action');

  const selectedStage: GenerationProgressStage | undefined =
    stageParam === 'GENERATE_BUSINESS_RULE' || stageParam === 'BUSINESS_RULE' ? 'BUSINESS_RULE'
    : stageParam === 'GENERATE_TEST_PLAN' || stageParam === 'TEST_PLAN' ? 'TEST_PLAN'
    : stageParam === 'GENERATE_TEST_CASE' || stageParam === 'TEST_CASE' ? 'TEST_CASE'
    : stageParam === 'GENERATE_UNIT_TEST' || stageParam === 'UNIT_TEST' ? 'UNIT_TEST'
    : undefined;

  const [viewMode, setViewMode] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');
  const [historyPage, setHistoryPage] = useState(0);

  const activeQuery = useActiveJobs(selectedStage);
  const historyQuery = useJobHistory(historyPage, 15, selectedStage);
  const mutations = useAdminUserMutations();
  const retryMutation = useJobRetryMutation();

  const [cancelTarget, setCancelTarget] = useState<ActiveJob | null>(null);
  const [retryTarget, setRetryTarget] = useState<JobHistoryItem | null>(null);

  const jobs = activeQuery.data ?? [];
  const historyPageData = historyQuery.data;

  const handleTabChange = (stage?: GenerationProgressStage) => {
    setHistoryPage(0);
    if (stage) {
      setSearchParams({ stage });
    } else {
      setSearchParams({});
    }
  };

  const currentTab = GENERATION_STAGES.find((tab) => tab.stage === selectedStage)?.key || 'ALL';

  return (
    <AdminShell>
      {/* Back Navigation Link */}
      <div className="mb-4">
        <Link
          to="/admin"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-body-subtle hover:text-heading transition-colors"
        >
          <ArrowLeft size={14} />
          <span>{language === 'vi' ? 'Quay lại Dashboard' : 'Back to Dashboard'}</span>
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-fg-brand">
              AI Job Orchestration
            </span>
            <span className="rounded-md bg-brand-softer px-2 py-0.5 text-[10px] font-sans font-bold text-fg-brand-strong">
              Active Queue & History
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-heading sm:text-3xl">
            {language === 'vi' ? 'Hàng Đợi & Tiến Trình Sinh Test' : 'Test Generation Jobs Monitor'}
          </h1>
          <p className="mt-1 text-xs text-body-subtle">
            {language === 'vi'
              ? 'Theo dõi hàng đợi tác vụ AI theo thời gian thực và lịch sử các đợt thực thi kiểm thử.'
              : 'Real-time active queue and execution history of AI test generation jobs.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center rounded-lg border border-border-default bg-neutral-primary p-0.5 text-xs shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('ACTIVE')}
              className={`rounded-md px-3 py-1.5 font-semibold transition-all flex items-center gap-1.5 ${
                viewMode === 'ACTIVE'
                  ? 'bg-brand text-white shadow-2xs'
                  : 'text-body-subtle hover:text-heading'
              }`}
            >
              <Layers size={13} />
              <span>{language === 'vi' ? 'Hàng đợi đang chạy' : 'Active Queue'}</span>
              <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.2 text-[10px] tabular-nums font-bold">
                {jobs.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('HISTORY')}
              className={`rounded-md px-3 py-1.5 font-semibold transition-all flex items-center gap-1.5 ${
                viewMode === 'HISTORY'
                  ? 'bg-brand text-white shadow-2xs'
                  : 'text-body-subtle hover:text-heading'
              }`}
            >
              <History size={13} />
              <span>{language === 'vi' ? 'Lịch sử thực thi' : 'Execution History'}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => (viewMode === 'ACTIVE' ? activeQuery.refetch() : historyQuery.refetch())}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border-default bg-neutral-primary-soft px-3 py-1.5 text-xs font-semibold text-body hover:bg-neutral-secondary-soft shadow-xs"
          >
            <RefreshCw
              size={13}
              className={activeQuery.isFetching || historyQuery.isFetching ? 'animate-spin text-brand' : ''}
            />
            <span>{language === 'vi' ? 'Làm mới' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Stage Filter Tabs */}
      <div className="mb-5 flex flex-wrap gap-2 border-b border-border-default pb-3">
        {GENERATION_STAGES.map((tab) => {
          const isSelected = currentTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleTabChange(tab.stage)}
              className={`rounded-lg border px-3.5 py-1.5 text-xs font-semibold transition-all shadow-2xs ${
                isSelected
                  ? 'border-brand bg-brand text-white shadow-xs font-bold'
                  : 'border-border-default bg-neutral-primary-soft text-heading hover:border-brand hover:bg-neutral-secondary-soft'
              }`}
            >
              {language === 'vi' ? tab.labelVi : tab.labelEn}
            </button>
          );
        })}
      </div>

      {viewMode === 'ACTIVE' ? (
        <>
          {/* Summary KPI Bar */}
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
            <div className="rounded-xl border border-border-default bg-neutral-primary-soft p-3">
              <span className="text-body-subtle">{language === 'vi' ? 'Tác vụ đang chạy' : 'Active Jobs'}</span>
              <p className="mt-1 font-sans tabular-nums text-lg font-bold text-heading">
                {jobs.length}
              </p>
            </div>
            <div className="rounded-xl border border-border-default bg-neutral-primary-soft p-3">
              <span className="text-body-subtle">{language === 'vi' ? 'Trạng thái hàng đợi' : 'Queue State'}</span>
              <p className="mt-1 font-sans text-sm font-bold text-heading">
                {jobs.length > 0
                  ? (language === 'vi' ? 'Đang xử lý' : 'Processing')
                  : (language === 'vi' ? 'Rảnh / Sẵn sàng' : 'Idle / Ready')}
              </p>
            </div>
            <div className="rounded-xl border border-border-default bg-neutral-primary-soft p-3">
              <span className="text-body-subtle">{language === 'vi' ? 'Bộ lọc giai đoạn' : 'Stage Scope'}</span>
              <p className="mt-1 text-xs font-semibold text-heading truncate">
                {GENERATION_STAGES.find((s) => s.key === currentTab)?.[language === 'vi' ? 'labelVi' : 'labelEn']}
              </p>
            </div>
            <div className="rounded-xl border border-border-default bg-neutral-primary-soft p-3">
              <span className="text-body-subtle">{language === 'vi' ? 'Đồng bộ thời gian thực' : 'Real-time Sync'}</span>
              <p className="mt-1 font-sans tabular-nums text-xs font-semibold text-body">
                5s polling
              </p>
            </div>
          </div>

          {/* Active Jobs Table */}
          <div className="rounded-xl border border-border-default bg-neutral-primary-soft shadow-xs overflow-hidden">
            {activeQuery.isLoading ? (
              <div className="p-8">
                <LoadingState label={language === 'vi' ? 'Đang kiểm tra hàng đợi tác vụ...' : 'Checking queue status...'} />
              </div>
            ) : jobs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border-default bg-neutral-secondary-soft font-bold uppercase text-body-subtle">
                    <tr>
                      <th className="p-3">{language === 'vi' ? 'Dự án' : 'Project'}</th>
                      <th className="p-3">{language === 'vi' ? 'Người thực hiện' : 'User'}</th>
                      <th className="p-3">{language === 'vi' ? 'Giai đoạn' : 'Stage'}</th>
                      <th className="p-3">{language === 'vi' ? 'Trạng thái' : 'Status'}</th>
                      <th className="p-3 min-w-[200px]">{language === 'vi' ? 'Tiến độ xử lý' : 'Progress'}</th>
                      <th className="p-3">{language === 'vi' ? 'Chi tiết bước hiện tại' : 'Current Step'}</th>
                      <th className="p-3">{language === 'vi' ? 'Cập nhật' : 'Updated'}</th>
                      <th className="p-3 text-right">{language === 'vi' ? 'Thao tác' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-default-subtle">
                    {jobs.map((job) => (
                      <tr key={`${job.projectId}-${job.stage}`} className="hover:bg-neutral-secondary-soft/50 transition-colors">
                        <td className="p-3">
                          <span className="font-semibold text-heading">{job.projectName}</span>
                          <span className="block text-[11px] font-sans tabular-nums text-body-subtle">Project #{job.projectId}</span>
                        </td>
                        <td className="p-3 max-w-[180px] truncate" title={job.userEmail}>
                          <span className="font-medium text-heading">{job.userEmail}</span>
                        </td>
                        <td className="p-3">
                          <span className="rounded-md bg-brand-softer px-2 py-0.5 font-sans text-[11px] font-bold text-fg-brand-strong whitespace-nowrap">
                            {stageLabel(job.stage, language)}
                          </span>
                        </td>
                        <td className="p-3">
                          {statusBadge(job.status, language)}
                        </td>
                        <td className="p-3">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-sans tabular-nums font-bold text-heading">{job.percent}%</span>
                              <span className="text-body-subtle">
                                {language === 'vi' ? 'Bước' : 'Step'} {job.completedSteps}/{job.totalSteps}
                              </span>
                            </div>
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-secondary">
                              <div
                                className="h-full rounded-full bg-brand transition-all duration-300"
                                style={{ width: `${Math.min(job.percent, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="p-3 max-w-[280px]">
                          <p className="line-clamp-2 text-xs leading-relaxed text-body-subtle" title={job.message || '—'}>
                            {job.message || '—'}
                          </p>
                        </td>
                        <td className="p-3 whitespace-nowrap text-body-subtle font-sans tabular-nums text-[11px]">
                          {job.updatedAt ? new Date(job.updatedAt).toLocaleTimeString('vi-VN') : '—'}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            disabled={mutations.cancelJob?.isPending}
                            className="btn btn-ghost-danger border border-border-danger-subtle px-2.5 py-1 text-xs"
                            onClick={() => setCancelTarget(job)}
                            title={language === 'vi' ? 'Hủy tác vụ này' : 'Cancel this job'}
                          >
                            <XCircle size={13} />
                            <span>{language === 'vi' ? 'Hủy' : 'Cancel'}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 px-4 text-center">
                <EmptyState
                  icon={Layers}
                  title={language === 'vi' ? 'Không có tác vụ nào đang chạy' : 'No active generation jobs'}
                  hint={
                    language === 'vi'
                      ? 'Hàng đợi xử lý sinh kiểm thử AI hiện tại đang rảnh. Khi có tác vụ Sinh BR, Test Plan, Test Case hoặc Unit Test được kích hoạt, tiến trình sẽ hiển thị trực tiếp tại đây.'
                      : 'AI test generation queue is currently idle. When a generation task starts, its progress will appear here in real-time.'
                  }
                />
              </div>
            )}
          </div>
        </>
      ) : (
        /* History View */
        <div className="rounded-xl border border-border-default bg-neutral-primary-soft shadow-xs overflow-hidden">
          {historyQuery.isLoading ? (
            <div className="p-8">
              <LoadingState label={language === 'vi' ? 'Đang tải lịch sử thực thi...' : 'Loading job execution history...'} />
            </div>
          ) : historyPageData && historyPageData.content.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border-default bg-neutral-secondary-soft font-bold uppercase text-body-subtle">
                    <tr>
                      <th className="p-3">{language === 'vi' ? 'Dự án' : 'Project'}</th>
                      <th className="p-3">{language === 'vi' ? 'Người thực hiện' : 'User'}</th>
                      <th className="p-3">{language === 'vi' ? 'Giai đoạn' : 'Stage'}</th>
                      <th className="p-3">{language === 'vi' ? 'Trạng thái' : 'Status'}</th>
                      <th className="p-3">{language === 'vi' ? 'Thời gian' : 'Timestamp'}</th>
                      <th className="p-3 min-w-[240px]">{language === 'vi' ? 'Chi tiết' : 'Details'}</th>
                      <th className="p-3 text-right">{language === 'vi' ? 'Thao tác' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-default-subtle">
                    {historyPageData.content.map((item) => {
                      const itemStage = item.stage ?? actionToStage(item.action);
                      const itemMessage = item.message ?? (item.metadata?.message as string) ?? (item.metadata?.step as string) ?? '—';
                      return (
                        <tr key={item.id} className="hover:bg-neutral-secondary-soft/50 transition-colors">
                          <td className="p-3">
                            <span className="font-semibold text-heading">{item.projectName}</span>
                            {item.projectId && (
                              <span className="block text-[11px] font-sans tabular-nums text-body-subtle">
                                Project #{item.projectId}
                              </span>
                            )}
                          </td>
                          <td className="p-3 max-w-[180px] truncate" title={item.userEmail}>
                            <span className="font-medium text-heading">{item.userEmail}</span>
                          </td>
                          <td className="p-3">
                            <span className="rounded-md bg-brand-softer px-2 py-0.5 font-sans text-[11px] font-bold text-fg-brand-strong whitespace-nowrap">
                              {stageLabel(itemStage, language)}
                            </span>
                          </td>
                          <td className="p-3">
                            {statusBadge(item.status, language)}
                          </td>
                          <td className="p-3 whitespace-nowrap text-body-subtle font-sans tabular-nums text-[11px]">
                            <div>{new Date(item.createdAt).toLocaleDateString('vi-VN')}</div>
                            <div className="text-[10px] text-body-subtle">
                              {new Date(item.createdAt).toLocaleTimeString('vi-VN')}
                            </div>
                          </td>
                          <td className="p-3 max-w-[280px]">
                            <p className="line-clamp-2 text-xs leading-relaxed text-body-subtle" title={itemMessage}>
                              {itemMessage}
                            </p>
                          </td>
                          <td className="p-3 text-right">
                            {item.projectId && (
                              <button
                                type="button"
                                disabled={retryMutation.isPending}
                                className="btn btn-secondary border border-border-default px-2.5 py-1 text-xs inline-flex items-center gap-1 shadow-2xs hover:bg-brand-softer hover:text-fg-brand hover:border-brand-subtle"
                                onClick={() => setRetryTarget({ ...item, stage: itemStage })}
                                title={language === 'vi' ? 'Chạy lại tác vụ này' : 'Retry this job'}
                              >
                                <RotateCcw size={12} />
                                <span>{language === 'vi' ? 'Chạy lại' : 'Retry'}</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="border-t border-border-default p-3 flex flex-wrap items-center justify-between gap-3 text-xs bg-neutral-primary-soft">
                <span className="text-body-subtle">
                  {language === 'vi'
                    ? `Hiển thị trang ${historyPageData.page + 1} / ${Math.max(historyPageData.totalPages, 1)} (${historyPageData.totalElements} bản ghi)`
                    : `Page ${historyPageData.page + 1} of ${Math.max(historyPageData.totalPages, 1)} (${historyPageData.totalElements} records)`}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn btn-secondary px-3 py-1 text-xs"
                    disabled={historyPage <= 0}
                    onClick={() => setHistoryPage((p) => Math.max(p - 1, 0))}
                  >
                    {language === 'vi' ? 'Trang trước' : 'Previous'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary px-3 py-1 text-xs"
                    disabled={historyPage + 1 >= historyPageData.totalPages}
                    onClick={() => setHistoryPage((p) => p + 1)}
                  >
                    {language === 'vi' ? 'Trang sau' : 'Next'}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="py-12 px-4 text-center">
              <EmptyState
                icon={History}
                title={language === 'vi' ? 'Chưa có lịch sử thực thi' : 'No execution history'}
                hint={
                  language === 'vi'
                    ? 'Chưa ghi nhận tác vụ sinh kiểm thử nào hoàn thành hoặc thất bại trong giai đoạn này.'
                    : 'No completed or failed jobs recorded for this stage yet.'
                }
              />
            </div>
          )}
        </div>
      )}

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(cancelTarget)}
        title={language === 'vi' ? 'Xác nhận hủy tác vụ sinh test' : 'Confirm Cancel Job'}
        description={
          cancelTarget
            ? `Bạn có chắc muốn hủy tác vụ "${stageLabel(cancelTarget.stage, language)}" của dự án ${cancelTarget.projectName}? Tác vụ sẽ bị dừng ngay lập tức và giải phóng hàng đợi.`
            : ''
        }
        confirmLabel={language === 'vi' ? 'Hủy tác vụ' : 'Cancel Job'}
        cancelLabel={language === 'vi' ? 'Đóng' : 'Close'}
        variant="danger"
        pending={mutations.cancelJob?.isPending}
        onCancel={() => setCancelTarget(null)}
        onConfirm={() => {
          if (!cancelTarget) return;
          mutations.cancelJob.mutate(
            { projectId: cancelTarget.projectId, stage: cancelTarget.stage },
            {
              onSuccess: () => setCancelTarget(null),
            }
          );
        }}
      />

      {/* Retry Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(retryTarget)}
        title={language === 'vi' ? 'Xác nhận chạy lại tác vụ' : 'Confirm Retry Job'}
        description={
          retryTarget
            ? `Bạn có chắc chắn muốn chạy lại tác vụ "${stageLabel(retryTarget.stage ?? actionToStage(retryTarget.action), language)}" cho dự án "${retryTarget.projectName}"? Hệ thống sẽ khởi tạo lại tiến trình sinh kiểm thử theo chính sách pipeline.`
            : ''
        }
        confirmLabel={language === 'vi' ? 'Chạy lại tác vụ' : 'Retry Job'}
        cancelLabel={language === 'vi' ? 'Đóng' : 'Close'}
        pending={retryMutation.isPending}
        onCancel={() => setRetryTarget(null)}
        onConfirm={() => {
          if (!retryTarget || !retryTarget.projectId) return;
          const targetStage = retryTarget.stage ?? actionToStage(retryTarget.action);
          retryMutation.mutate(
            { projectId: retryTarget.projectId, stage: targetStage },
            {
              onSuccess: () => {
                setRetryTarget(null);
                setViewMode('ACTIVE');
              },
              onError: () => setRetryTarget(null),
            }
          );
        }}
      />
    </AdminShell>
  );
}
