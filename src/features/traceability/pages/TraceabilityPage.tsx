import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowRight, FileText } from 'lucide-react';
import { AppShell } from '../../../shared/components/AppShell';
import { SkeletonLoader } from '../../../shared/components/SkeletonLoader';
import { ErrorState } from '../../../shared/components/ErrorState';
import { ProjectWorkflowTabs } from '../../projects/components/ProjectWorkflowTabs';
import { ProjectPageHeader } from '../../projects/components/ProjectPageHeader';
import { useProject } from '../../projects/hooks/useProjects';
import { canOpenReport, canOpenTraceability } from '../../projects/utils/project-workflow';
import { TraceabilityMatrix } from '../components/TraceabilityMatrix';
import { useLanguage } from '../../../shared/i18n/language';

export function TraceabilityPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const { data: project, isLoading, error } = useProject(projectId);
  const { t } = useLanguage();

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
        <ErrorState error={error ?? undefined} title={t('Không tìm thấy project', 'Project not found')} backTo="/projects" />
      </AppShell>
    );
  }

  if (!canOpenTraceability(project.status)) {
    return <Navigate to={`/projects/${projectId}/unit-tests`} replace />;
  }

  return (
    <AppShell maxWidth="wide">
      <ProjectPageHeader
        project={project}
        titlePrefix="Traceability"
        subtitle={t('Truy vết từng Business Rule tới Test Plan, Test Case và Unit Test tương ứng.', 'Trace each Business Rule to its Test Plans, Test Cases, and Unit Tests.')}
        backTo={`/projects/${projectId}/coverage`}
        backLabel="Coverage"
      />

      <ProjectWorkflowTabs projectId={projectId} active="traceability" status={project.status} />
      <TraceabilityMatrix projectId={projectId} />

      {canOpenReport(project.status) && <div className="mt-6 rounded-base border border-border-brand-subtle bg-brand-softer p-4 shadow-sm animate-fade-in">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <FileText size={16} className="shrink-0 text-fg-brand-strong" />
            <div>
              <p className="text-sm font-semibold text-heading">{t('Bước cuối: Report', 'Final step: Report')}</p>
              <p className="mt-1 text-xs leading-relaxed text-body-subtle">
                {t('Xem tổng hợp kết quả và tải report của project.', 'Review the results and download the project report.')}
              </p>
            </div>
          </div>
          <Link to={`/projects/${projectId}/report`} className="btn btn-brand shrink-0">
            {t('Tiếp tục đến Report', 'Continue to Report')}
            <ArrowRight size={14} strokeWidth={1.8} />
          </Link>
        </div>
      </div>}
    </AppShell>
  );
}

export default TraceabilityPage;
