import { Tag } from '../../../shared/components/Tag';
import { Link } from 'react-router-dom';
import { Clock, AlertCircle, BarChart3, CheckCircle2, ClipboardCheck, ClipboardList, Code2, FileText, ScanLine, TableProperties } from 'lucide-react';
import { useLanguage } from '../../../shared/i18n/language';
import type { ProjectStatus } from '../types';
import {
  canOpenCoverage,
  canOpenReport,
  canOpenTestCases,
  canOpenTestPlans,
  canOpenTraceability,
  canOpenUnitTests,
  getCurrentWorkflowStep,
  isWorkflowStepCompleted,
  type WorkflowStepId,
} from '../utils/project-workflow';
import { projectWorkflowPath } from '../utils/project-service';

interface ProjectWorkflowTabsProps {
  projectId: number;
  active: WorkflowStepId;
  status: ProjectStatus;
  servicePath?: string;
  reachedStatus?: ProjectStatus;
}

const tabs = [
  { id: 'analysis', label: 'Analysis & BR', description: ['Phân tích source và review Business Rule', 'Analyze source and review Business Rules'], icon: ScanLine },
  { id: 'test-plans', label: 'Test Plan', description: ['Sinh, sửa và review Test Plan', 'Generate, edit, and review Test Plans'], icon: ClipboardList },
  { id: 'test-cases', label: 'Test Case', description: ['Soạn data, precondition và expected result', 'Define data, preconditions, and expected results'], icon: ClipboardCheck },
  { id: 'unit-tests', label: 'Unit Test', description: ['Chuẩn bị test class, method và assertion chính', 'Prepare test classes, methods, and key assertions'], icon: Code2 },
  { id: 'coverage', label: 'Coverage', description: ['Upload JaCoCo XML và xem coverage gap', 'Upload JaCoCo XML and inspect coverage gaps'], icon: BarChart3 },
  { id: 'traceability', label: 'Traceability', description: ['Truy vết BR, Plan, Case và Unit Test', 'Trace BR, Plan, Case and Unit Test'], icon: TableProperties },
  { id: 'report', label: 'Report', description: ['Xuất JSON hoặc Markdown', 'Export JSON or Markdown'], icon: FileText },
] as const;

const disabledDescriptions: Record<string, [string, string]> = {
  'test-plans': ['Duyệt Business Rule trước khi sang Test Plan', 'Approve Business Rules before opening Test Plans'],
  'test-cases': ['Duyệt Test Plan trước khi sang Test Case', 'Approve Test Plans before opening Test Cases'],
  'unit-tests': ['Duyệt Test Case trước khi sang Unit Test', 'Approve Test Cases before opening Unit Tests'],
  coverage: ['Sinh Unit Test trước khi sang Coverage', 'Generate Unit Tests before opening Coverage'],
  traceability: ['Sinh Unit Test trước khi xem Traceability', 'Generate Unit Tests before viewing Traceability'],
  report: ['Phân tích coverage trước khi xuất Report', 'Analyze coverage before exporting a Report'],
};

export function ProjectWorkflowTabs({ projectId, active, status, reachedStatus, servicePath }: ProjectWorkflowTabsProps) {
  const { t } = useLanguage();
  const currentWorkflowStep = active === 'report' && canOpenReport(status) && status !== 'COMPLETED'
    ? 'report'
    : getCurrentWorkflowStep(status);
  // Trang sau đã có dữ liệu thì vẫn mở được, kể cả khi một BR vừa sửa đang chờ duyệt lại.
  const openable = reachedStatus ?? status;
  const enabledByTab: Record<string, boolean> = {
    analysis: true,
    'test-plans': canOpenTestPlans(openable),
    'test-cases': canOpenTestCases(openable),
    'unit-tests': canOpenUnitTests(openable),
    coverage: canOpenCoverage(openable),
    traceability: canOpenTraceability(openable),
    report: canOpenReport(openable),
  };
  return (
    <nav className="mb-6 grid gap-2 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-7" aria-label="Project workflow">
      {tabs.map((tab, index) => {
        const Icon = tab.icon;
        const isActive = active === tab.id;
        const to = projectWorkflowPath(projectId, tab.id === 'analysis' ? undefined : tab.id, servicePath);
        const isDisabled = !enabledByTab[tab.id];
        const isCurrent = isActive && !isDisabled;
        const isCompleted = isWorkflowStepCompleted(tab.id, status, active);
        const isWorkflowCurrent = currentWorkflowStep === tab.id && status !== 'COMPLETED' && status !== 'FAILED';
        const isFailedStep = currentWorkflowStep === tab.id && status === 'FAILED';
        const workflowState = isDisabled
          ? 'disabled'
          : isCurrent
            ? 'active'
            : isCompleted
              ? 'completed'
              : 'available';
        const className = `min-h-[96px] rounded-base border px-2.5 py-3 sm:p-3  transition-colors duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          isDisabled
            ? 'cursor-not-allowed border-border-default bg-neutral-secondary-soft text-body-subtle '
            : `     ${
              isCurrent
                ? 'border-border-brand bg-brand-softer text-fg-brand-strong  ring-2 ring-brand/20'
                : isCompleted
                  ? 'border-border-success-subtle bg-success-soft text-fg-success-strong'
                  : 'border-border-default bg-neutral-primary-soft text-body hover:border-border-default-strong'
            }`
        }`;
        const description = isDisabled && disabledDescriptions[tab.id]
          ? t(disabledDescriptions[tab.id][0], disabledDescriptions[tab.id][1])
          : t(tab.description[0], tab.description[1]);
        const content = (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-1.5">
              <span className={`flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-control transition-colors ${
                isCurrent
                  ? 'bg-brand text-on-brand '
                  : isCompleted
                    ? 'bg-success-soft text-fg-success-strong'
                    : 'bg-neutral-secondary-medium text-body-subtle'
              }`}>
                <Icon size={14} className="sm:h-[15px] sm:w-[15px]" strokeWidth={1.8} />
              </span>
              <span className="inline-flex shrink-0 items-center gap-1.5 font-mono text-xs font-semibold text-body-subtle">
                <span>{String(index + 1).padStart(2, '0')}</span>
                {isWorkflowCurrent && (
                  <Tag variant="status" tone={'brand'} icon={Clock} title={t('Giai đoạn hiện tại của quy trình', 'Current workflow stage')} className="shrink-0 whitespace-nowrap">

                    <span className="whitespace-nowrap">{t('Đang thực hiện', 'In progress')}</span>
                  </Tag>
                )}
                {isFailedStep && (
                  <Tag variant="status" tone={'danger'} icon={AlertCircle} className="shrink-0 whitespace-nowrap">

                    <span className="whitespace-nowrap">{t('Lỗi', 'Failed')}</span>
                  </Tag>
                )}
                {isCompleted && (
                  <Tag variant="status" tone="success" icon={CheckCircle2} className="shrink-0">{t('Hoàn thành', 'Completed')}</Tag>
                )}
              </span>
            </div>
            <span className="mt-3 min-w-0">
              <span className="block text-xs font-semibold text-heading">{tab.label}</span>
              <span className="mt-1 block text-xs leading-relaxed text-body-subtle">{description}</span>
            </span>
          </div>
        );

        if (isDisabled) {
          return (
            <span key={tab.id} aria-disabled="true" data-workflow-state={workflowState} className={className}>
              {content}
            </span>
          );
        }

        return (
          <Link
            key={tab.id}
            to={to}
            aria-current={isCurrent ? 'page' : undefined}
            data-workflow-state={workflowState}
            className={className}
          >
            {content}
          </Link>
        );
      })}
    </nav>
  );
}
