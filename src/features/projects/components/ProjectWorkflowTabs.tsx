import { Link } from 'react-router-dom';
import { ClipboardCheck, ClipboardList, Code2, ScanLine } from 'lucide-react';

interface ProjectWorkflowTabsProps {
  projectId: number;
  active: 'analysis' | 'test-plans' | 'test-cases' | 'unit-tests';
  testPlansEnabled?: boolean;
  testCasesEnabled?: boolean;
  unitTestsEnabled?: boolean;
}

const tabs = [
  { id: 'analysis', label: 'Analysis & BR', description: 'Phân tích source và duyệt Business Rule', icon: ScanLine },
  { id: 'test-plans', label: 'Test Plan', description: 'Sinh, sửa và duyệt kế hoạch test', icon: ClipboardList },
  { id: 'test-cases', label: 'Test Case', description: 'Soạn data, precondition và expected result', icon: ClipboardCheck },
  { id: 'unit-tests', label: 'Unit Test', description: 'Chuẩn bị class test, method và assert chính', icon: Code2 },
] as const;

export function ProjectWorkflowTabs({
  projectId,
  active,
  testPlansEnabled = true,
  testCasesEnabled = testPlansEnabled,
  unitTestsEnabled = testCasesEnabled,
}: ProjectWorkflowTabsProps) {
  return (
    <nav className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Project workflow">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.id;
        const to = tab.id === 'analysis' ? `/projects/${projectId}` : `/projects/${projectId}/${tab.id}`;
        const isDisabled =
          (tab.id === 'test-plans' && !testPlansEnabled) ||
          (tab.id === 'test-cases' && !testCasesEnabled) ||
          (tab.id === 'unit-tests' && !unitTestsEnabled);
        const isCurrent = isActive && !isDisabled;
        const className = `rounded-base border p-4 shadow-sm transition-all duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          isDisabled
            ? 'cursor-not-allowed border-border-default bg-neutral-secondary-soft text-body-subtle opacity-70'
            : `hover:-translate-y-0.5 hover:shadow-md ${
              isCurrent
                ? 'border-border-brand-subtle bg-brand-softer text-fg-brand-strong'
                : 'border-border-default bg-neutral-primary-soft text-body hover:border-border-default-strong'
            }`
        }`;
        const description = isDisabled
          ? tab.id === 'test-plans'
            ? 'Duyệt Business Rule trước khi sang Test Plan'
            : tab.id === 'test-cases'
              ? 'Duyệt Test Plan trước khi sang Test Case'
              : 'Duyệt Test Case trước khi sang Unit Test'
          : tab.description;
        const content = (
          <div className="flex items-start gap-3">
            <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-default ${
              isCurrent ? 'bg-neutral-primary-soft text-fg-brand-strong' : 'bg-neutral-secondary-medium text-body-subtle'
            }`}>
              <Icon size={15} strokeWidth={1.8} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-heading">{tab.label}</span>
              <span className="mt-1 block text-xs leading-relaxed text-body-subtle">{description}</span>
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
