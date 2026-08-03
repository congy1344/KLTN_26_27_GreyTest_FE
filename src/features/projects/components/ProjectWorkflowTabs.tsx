import { Link } from 'react-router-dom';
import { BarChart3, CheckCircle2, ClipboardCheck, ClipboardList, Code2, FileText, ScanLine, TableProperties } from 'lucide-react';
import { useLanguage } from '../../../shared/i18n/language';
import type { ProjectStatus } from '../types';
import {
  canOpenCoverage,
  canOpenReport,
  canOpenTestCases,
  canOpenTestPlans,
  canOpenTraceability,
  canOpenUnitTests,
  isWorkflowStepCompleted,
  type WorkflowStepId,
} from '../utils/project-workflow';

interface ProjectWorkflowTabsProps {
  projectId: number;
  active: WorkflowStepId;
  status: ProjectStatus;
}

const tabs = [
  { id: 'analysis', label: 'Analysis & BR', description: ['Phân tích source và review Business Rule', 'Analyze source and review Business Rules'], icon: ScanLine },
  { id: 'test-plans', label: 'Test Plan', description: ['Sinh, sửa và review Test Plan', 'Generate, edit, and review Test Plans'], icon: ClipboardList },
  { id: 'test-cases', label: 'Test Case', description: ['Soạn data, precondition và expected result', 'Define data, preconditions, and expected results'], icon: ClipboardCheck },
  { id: 'unit-tests', label: 'Unit Test', description: ['Chuẩn bị test class, method và assertion chính', 'Prepare test classes, methods, and key assertions'], icon: Code2 },
  { id: 'coverage', label: 'Coverage', description: ['Upload JaCoCo XML và xem coverage gap', 'Upload JaCoCo XML and inspect coverage gaps'], icon: BarChart3 },
  { id: 'traceability', label: 'Traceability', description: ['Ma trận BR → Plan → Case → Unit Test', 'BR → Plan → Case → Unit Test matrix'], icon: TableProperties },
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

export function ProjectWorkflowTabs({ projectId, active, status }: ProjectWorkflowTabsProps) {
  const { t } = useLanguage();
  const enabledByTab: Record<string, boolean> = {
    analysis: true,
    'test-plans': canOpenTestPlans(status),
    'test-cases': canOpenTestCases(status),
    'unit-tests': canOpenUnitTests(status),
    coverage: canOpenCoverage(status),
    traceability: canOpenTraceability(status),
    report: canOpenReport(status),
  };
  return (
    <nav className="mb-6 grid gap-2 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-7" aria-label="Project workflow">
      {tabs.map((tab, index) => {
        const Icon = tab.icon;
        const isActive = active === tab.id;
        const to = tab.id === 'analysis' ? `/projects/${projectId}` : `/projects/${projectId}/${tab.id}`;
        const isDisabled = !enabledByTab[tab.id];
        const isCurrent = isActive && !isDisabled;
        const isCompleted = isWorkflowStepCompleted(tab.id, status);
        const className = `min-h-[108px] rounded-base border p-3 shadow-sm transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          isDisabled
            ? 'cursor-not-allowed border-border-default bg-neutral-secondary-soft text-body-subtle opacity-70'
            : `hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
              isCurrent
                ? 'border-border-brand-subtle bg-brand-softer text-fg-brand-strong'
                : 'border-border-default bg-neutral-primary-soft text-body hover:border-border-default-strong'
            }`
        }`;
        const description = isDisabled && disabledDescriptions[tab.id]
          ? t(disabledDescriptions[tab.id][0], disabledDescriptions[tab.id][1])
          : t(tab.description[0], tab.description[1]);
        const content = (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-2">
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-default ${
              isCurrent ? 'bg-neutral-primary-soft text-fg-brand-strong' : 'bg-neutral-secondary-medium text-body-subtle'
            }`}>
              <Icon size={15} strokeWidth={1.8} />
            </span>
              <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold text-body-subtle">
                <span>{String(index + 1).padStart(2, '0')}</span>
                {isCompleted && (
                  <span className="inline-flex items-center text-fg-success-strong">
                    <CheckCircle2 size={14} strokeWidth={2} aria-hidden="true" />
                    <span className="sr-only">{t('Hoàn thành', 'Completed')}</span>
                  </span>
                )}
              </span>
            </div>
            <span className="mt-3 min-w-0">
              <span className="block text-xs font-semibold text-heading">{tab.label}</span>
              <span className="mt-1 block text-[11px] leading-relaxed text-body-subtle">{description}</span>
            </span>
          </div>
        );

        if (isDisabled) {
          return (
            <span key={tab.id} aria-disabled="true" className={className}>
              {content}
            </span>
          );
        }

        return (
          <Link
            key={tab.id}
            to={to}
            aria-current={isCurrent ? 'page' : undefined}
            className={className}
          >
            {content}
          </Link>
        );
      })}
    </nav>
  );
}
