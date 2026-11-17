import type { ComponentProps, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchGenerationProgress } from '../../../shared/api/generation-progress-api';
import type { GenerationProgressStage } from '../../../shared/types/generation-progress';
import { useTraceability } from '../../traceability/hooks/useTraceability';
import { AlertCircle, Check, Clock, Loader2 } from 'lucide-react';
import { Tag } from '../../../shared/components/Tag';
import { ProjectPageHeader } from './ProjectPageHeader';
import { useAnalysis } from '../hooks/useProjects';
import { useBusinessRules } from '../../business-rules/hooks/useBusinessRules';
import { useTestPlans } from '../../test-plans/hooks/useTestPlans';
import { useTestCases } from '../../test-cases/hooks/useTestCases';
import { useUnitTests } from '../../unit-tests/hooks/useUnitTests';
import { useCoverageReport, useSandboxRun } from '../../coverage/hooks/useCoverage';
import { useLanguage } from '../../../shared/i18n/language';
import { projectWorkflowPath } from '../utils/project-service';
import {
  canOpenCoverage, canOpenReport, canOpenTestCases, canOpenTestPlans,
  canOpenTraceability, canOpenUnitTests, getCurrentWorkflowStep,
  isWorkflowStepCompleted, type WorkflowStepId,
} from '../utils/project-workflow';
import type { ProjectStatus } from '../types';

const steps = [
  { id: 'analysis', label: ['Phân tích & Business Rule', 'Analysis & Business Rules'] },
  { id: 'test-plans', label: ['Test Plan', 'Test Plan'] },
  { id: 'test-cases', label: ['Test Case', 'Test Case'] },
  { id: 'unit-tests', label: ['Unit Test', 'Unit Test'] },
  { id: 'coverage', label: ['Coverage', 'Coverage'] },
  { id: 'traceability', label: ['Truy vết', 'Traceability'] },
  { id: 'report', label: ['Báo cáo', 'Report'] },
] as const;

const disabledDescriptions: Partial<Record<WorkflowStepId, [string, string]>> = {
  'test-plans': ['Duyệt Business Rule trước khi sang Test Plan', 'Approve Business Rules before opening Test Plans'],
  'test-cases': ['Duyệt Test Plan trước khi sang Test Case', 'Approve Test Plans before opening Test Cases'],
  'unit-tests': ['Duyệt Test Case trước khi sang Unit Test', 'Approve Test Cases before opening Unit Tests'],
  coverage: ['Sinh Unit Test trước khi sang Coverage', 'Generate Unit Tests before opening Coverage'],
  traceability: ['Sinh Unit Test trước khi xem Traceability', 'Generate Unit Tests before viewing Traceability'],
  report: ['Phân tích coverage trước khi xuất Report', 'Analyze coverage before exporting a Report'],
};

type Props = Omit<ComponentProps<typeof ProjectPageHeader>, 'compact'> & {
  active: WorkflowStepId;
  status: ProjectStatus;
  reachedStatus?: ProjectStatus;
  selector?: ReactNode;
  children: ReactNode;
};

function useStageRunning(projectId: number, stage: GenerationProgressStage) {
  const { data } = useQuery({
    queryKey: ['generation-progress', projectId, stage],
    queryFn: () => fetchGenerationProgress(projectId, stage),
    enabled: projectId > 0,
    refetchInterval: (query) => ['QUEUED', 'RUNNING'].includes(query.state.data?.status ?? '') ? 3000 : false,
  });
  return data?.status === 'QUEUED' || data?.status === 'RUNNING' || (data?.status === 'PAUSED' && data.busy === true);
}

export function ProjectWorkspace({ active, status, reachedStatus, selector, children, ...header }: Props) {
  const { t } = useLanguage();
  const { project, servicePath } = header;
  const scope = servicePath ?? undefined;
  const dataId = project.status === 'UPLOADED' ? 0 : project.id;
  const analysis = useAnalysis(project.id, project.status !== 'UPLOADED').data;
  const rules = useBusinessRules(dataId, scope).data;
  const plans = useTestPlans(dataId, scope).data;
  const cases = useTestCases(dataId, scope).data;
  const units = useUnitTests(dataId, scope).data;
  const coverage = useCoverageReport(dataId, scope).data;
  const run = useSandboxRun(dataId, scope).state;
  const openable = reachedStatus ?? status;
  const enabled = {
    analysis: true, 'test-plans': canOpenTestPlans(openable),
    'test-cases': canOpenTestCases(openable), 'unit-tests': canOpenUnitTests(openable),
    coverage: canOpenCoverage(openable), traceability: canOpenTraceability(openable),
    report: canOpenReport(openable),
  };
  const current = getCurrentWorkflowStep(status);
  const traceability = useTraceability(enabled.traceability ? project.id : 0, scope).data;
  const generating: Partial<Record<WorkflowStepId, boolean>> = {
    analysis: useStageRunning(project.id, 'BUSINESS_RULE'),
    'test-plans': useStageRunning(project.id, 'TEST_PLAN'),
    'test-cases': useStageRunning(project.id, 'TEST_CASE'),
    'unit-tests': useStageRunning(project.id, 'UNIT_TEST'),
    coverage: run?.status === 'RUNNING',
  };
  const completedRun = run && ['SUCCEEDED', 'TESTS_FAILED'].includes(run.status);
  const stages = [
    { id: 'analysis', label: t('Phân tích & BR', 'Analysis & BR'), value: rules?.length,
      hint: analysis && rules ? t(
        `${analysis.totalClasses} lớp, ${analysis.totalMethods} method, ${rules.filter((r) => r.status === 'APPROVED').length} đã duyệt`,
        `${analysis.totalClasses} classes, ${analysis.totalMethods} methods, ${rules.filter((r) => r.status === 'APPROVED').length} approved`,
      ) : undefined },
    { id: 'test-plans', label: 'Test Plan', value: plans?.length },
    { id: 'test-cases', label: 'Test Case', value: cases?.length },
    { id: 'unit-tests', label: 'Unit Test', value: units?.length,
      hint: completedRun && run.tests != null && run.failed != null
        ? t(`${run.tests - run.failed}/${run.tests} đạt khi chạy thật (toàn dự án)`, `${run.tests - run.failed}/${run.tests} passed in the project run`) : undefined,
      warning: completedRun && run.failed > 0 },
    { id: 'coverage', label: 'Coverage', value: coverage?.lineCoverage != null ? `${coverage.lineCoverage}%` : undefined,
      hint: coverage?.branchCoverage != null ? t(`dòng, nhánh ${coverage.branchCoverage}%`, `lines, branches ${coverage.branchCoverage}%`) : undefined },
    { id: 'traceability', label: t('Truy vết', 'Traceability'),
      value: enabled.traceability && traceability && rules
        ? `${new Set(traceability.rows.filter((row) => row.unitTestId != null).map((row) => row.ruleId)).size}/${rules.length}` : undefined,
      hint: enabled.traceability && traceability?.uncoveredRules.length
        ? t(`${traceability.uncoveredRules.length} rule chưa phủ`, `${traceability.uncoveredRules.length} uncovered rules`) : undefined },
    { id: 'report', label: t('Báo cáo', 'Report'), value: enabled.report ? t('Sẵn sàng', 'Ready') : undefined },
  ] satisfies { id: WorkflowStepId; label: string; value?: number | string; hint?: string; warning?: boolean }[];

  return (
    <div className="flex min-w-0 flex-wrap md:flex-nowrap">
      <nav aria-label="Các bước của dự án" className="w-full border-b border-border-default bg-neutral-primary-soft px-3 py-5 md:w-[232px] md:shrink-0 md:border-b-0 md:border-r">
        <p className="mb-2 px-3 text-xs font-semibold text-body-subtle">{t('Quy trình', 'Workflow')}</p>
        {steps.map((step, index) => {
          const isActive = active === step.id;
          const done = isWorkflowStepCompleted(step.id, status, active);
          const reason = disabledDescriptions[step.id];
          const className = `flex items-center gap-2.5 rounded-control px-3 py-2.5 text-sm ${!enabled[step.id]
            ? 'text-fg-disabled' : isActive ? 'bg-neutral-primary-soft font-semibold text-heading' : 'text-body hover:bg-neutral-primary-soft'}`;
          const content = <>
            <span className="font-mono text-xs text-body-subtle">{String(index + 1).padStart(2, '0')}</span>{' '}
            <span className="flex-1">{t(step.label[0], step.label[1])}</span>
            {generating[step.id] ? <Loader2 size={14} className="animate-spin text-fg-brand" role="img" aria-label={t('Đang sinh', 'Generating')} />
              : done && <Check size={14} className="text-fg-success-strong" aria-hidden="true" />}
          </>;
          return enabled[step.id] ? <Link key={step.id}
            to={projectWorkflowPath(project.id, step.id === 'analysis' ? undefined : step.id, scope)}
            aria-current={isActive ? 'page' : undefined} className={className}>{content}</Link>
            : <span key={step.id} aria-disabled="true" title={reason ? t(...reason) : undefined} className={className}>{content}</span>;
        })}
      </nav>
      <div className="w-full min-w-0 flex-1 px-6 pb-12 pt-6 lg:px-7">
        <ProjectPageHeader {...header} status={status} reachedStatus={reachedStatus} failedStep={steps.findIndex((step) => step.id === active) + 1} compact />
        {selector}
        <section aria-label={t('Tiến độ quy trình', 'Workflow progress')} className="mb-6 overflow-x-auto rounded-base border border-border-default bg-neutral-primary">
          <div className="grid min-w-0 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-[repeat(7,minmax(0,1fr))]">
            {stages.map((stage) => {
              const done = isWorkflowStepCompleted(stage.id, status, active);
              const working = stage.id === current;
              const state = stage.warning ? t('Có test lỗi', 'Tests failed') : done ? t('Hoàn thành', 'Completed')
                : working ? t('Đang thực hiện', 'In progress') : t('Chưa thực hiện', 'Not started');
              const shortState = stage.warning ? t('Test lỗi', 'Tests failed') : done ? t('Hoàn tất', 'Done')
                : working ? t('Đang chạy', 'Running') : t('Chưa chạy', 'Not started');
              const isActive = stage.id === active;
              const reason = disabledDescriptions[stage.id];
              const tone = isActive ? 'border-b-brand-strong' : stage.warning ? 'border-b-warning' : done ? 'border-b-success' : working ? 'border-b-brand' : 'border-b-border-default';
              const className = `group min-w-0 border-r border-r-border-default border-b-[3px] p-2.5 last:border-r-0 ${tone} ${isActive ? 'bg-neutral-primary-soft' : ''} ${enabled[stage.id] ? 'cursor-pointer hover:bg-neutral-secondary-soft' : ''}`;
              const content = <>
                <div className={`flex items-center gap-2 text-xs font-semibold text-body ${enabled[stage.id] ? 'group-hover:text-fg-brand-strong' : ''}`}>
                  {stage.label}
                </div>
                <Tag variant="status" className="mt-1 whitespace-nowrap" aria-label={state} title={state} tone={stage.warning ? 'warning' : done ? 'success' : working ? 'brand' : 'neutral'} icon={stage.warning ? AlertCircle : done ? Check : working && generating[stage.id] ? Loader2 : Clock}>{shortState}</Tag>
                {stage.value != null && <p className="mt-2 font-display text-[22px] font-semibold text-heading">{stage.value}</p>}
                {stage.hint && <p className="mt-1 break-words text-xs text-body-subtle">{stage.hint}</p>}
              </>;
              return enabled[stage.id] ? <Link key={stage.label}
                to={projectWorkflowPath(project.id, stage.id === 'analysis' ? undefined : stage.id, scope)}
                aria-current={isActive ? 'page' : undefined} className={className}>{content}</Link>
                : <div key={stage.label} aria-disabled="true" title={reason ? t(...reason) : undefined}
                  aria-current={isActive ? 'page' : undefined} className={className}>{content}</div>;
            })}
          </div>
        </section>
        {children}
      </div>
    </div>
  );
}
