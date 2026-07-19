import { Link, Navigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Archive, ArrowRight, GitBranch } from 'lucide-react';
import { AppShell } from '../../../shared/components/AppShell';
import { SkeletonLoader } from '../../../shared/components/SkeletonLoader';
import { getErrorMessage } from '../../../shared/api/api-client';
import { ProjectWorkflowTabs } from '../../projects/components/ProjectWorkflowTabs';
import { StatusBadge } from '../../projects/components/StatusBadge';
import { useProject } from '../../projects/hooks/useProjects';
import { canOpenTestCases, canOpenTestPlans, canOpenUnitTests } from '../../projects/utils/project-workflow';
import { TestPlansPanel } from '../components/TestPlansPanel';

export function TestPlansPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const { data: project, isLoading, error } = useProject(projectId);
  const testPlansEnabled = project ? canOpenTestPlans(project.status) : false;
  const testCasesEnabled = project ? canOpenTestCases(project.status) : false;
  const unitTestsEnabled = project ? canOpenUnitTests(project.status) : false;

  if (isLoading) {
    return (
      <AppShell maxWidth="wide">
        <SkeletonLoader count={4} />
      </AppShell>
    );
  }

  if (error || !project) {
    return (
      <AppShell maxWidth="wide">
        <div className="flex min-h-[360px] flex-col items-center justify-center rounded-base border border-border-default bg-neutral-primary-soft p-10 text-center shadow-sm animate-fade-in">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-default bg-danger-soft text-fg-danger-strong">
            <AlertCircle size={20} strokeWidth={1.8} />
          </div>
          <p className="text-sm font-semibold text-fg-danger-strong">
            {error ? getErrorMessage(error) : 'Không tìm thấy project'}
          </p>
          <Link to="/projects" className="mt-4 text-sm font-medium text-fg-brand hover:text-fg-brand-strong">
            Quay lại danh sách
          </Link>
        </div>
      </AppShell>
    );
  }

  if (!testPlansEnabled) {
    return <Navigate to={`/projects/${projectId}`} replace />;
  }

  return (
    <AppShell maxWidth="wide">
      <div className="mb-5 animate-fade-in-up">
        <Link
          to={`/projects/${projectId}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-body transition-colors duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] hover:text-heading"
        >
          <ArrowLeft size={14} strokeWidth={1.8} />
          Analysis & Business Rules
        </Link>
      </div>

      <header className="mb-6 animate-fade-in-up delay-1">
        <div className="rounded-base border border-border-default bg-neutral-primary-soft p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-default border border-border-default bg-neutral-secondary-soft text-body-subtle shadow-xs">
                {project.sourceType === 'GITHUB' ? (
                  <GitBranch size={20} strokeWidth={1.6} />
                ) : (
                  <Archive size={20} strokeWidth={1.6} />
                )}
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-bold tracking-tight text-heading md:text-3xl">
                  Test Plan · {project.name}
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-body-subtle">
                  Sinh và duyệt Test Plan từ các Business Rule đã approve.
                </p>
              </div>
            </div>
            <StatusBadge status={project.status} />
          </div>
        </div>
      </header>

      <ProjectWorkflowTabs
        projectId={projectId}
        active="test-plans"
        testPlansEnabled={testPlansEnabled}
        testCasesEnabled={testCasesEnabled}
        unitTestsEnabled={unitTestsEnabled}
      />
      <TestPlansPanel projectId={projectId} projectStatus={project.status} />
      <div className="mt-6 rounded-base border border-border-brand-subtle bg-brand-softer p-4 shadow-sm animate-fade-in">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-heading">Bước tiếp theo: Test Case</p>
            <p className="mt-1 text-xs leading-relaxed text-body-subtle">
              Sau khi duyệt Test Plan, chuyển sang màn Test Case để chuẩn bị dữ liệu test.
            </p>
          </div>
          {testCasesEnabled ? (
            <Link to={`/projects/${projectId}/test-cases`} className="btn btn-brand shrink-0">
              Mở Test Case
              <ArrowRight size={14} strokeWidth={1.8} />
            </Link>
          ) : (
            <button className="btn btn-secondary shrink-0" disabled>
              Cần duyệt Plan
            </button>
          )}
        </div>
      </div>
    </AppShell>
  );
}

export default TestPlansPage;
