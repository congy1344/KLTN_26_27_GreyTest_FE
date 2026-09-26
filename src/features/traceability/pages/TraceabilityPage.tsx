import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, FileText } from 'lucide-react';
import { AppShell } from '../../../shared/components/AppShell';
import { SkeletonLoader } from '../../../shared/components/SkeletonLoader';
import { ErrorState } from '../../../shared/components/ErrorState';
import { ProjectWorkflowTabs } from '../../projects/components/ProjectWorkflowTabs';
import { ProjectPageHeader } from '../../projects/components/ProjectPageHeader';
import { ProjectServiceSelector } from '../../projects/components/ProjectServiceSelector';
import { useCompleteProject, useProject } from '../../projects/hooks/useProjects';
import { useProjectServiceScope } from '../../projects/hooks/useProjectServiceScope';
import { canOpenReport, canOpenTraceability } from '../../projects/utils/project-workflow';
import { projectWorkflowPath } from '../../projects/utils/project-service';
import { TraceabilityMatrix } from '../components/TraceabilityMatrix';
import { useLanguage } from '../../../shared/i18n/language';

export function TraceabilityPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const navigate = useNavigate();
  const { data: project, isLoading, error } = useProject(projectId);
  const completeMutation = useCompleteProject();
  const { t } = useLanguage();
  const serviceScope = useProjectServiceScope(projectId, project?.status !== undefined && project.status !== 'UPLOADED');
  const status = project?.status === 'COMPLETED' ? 'COMPLETED' : (serviceScope.selected?.status ?? project?.status);

  const handleContinueToReport = () => {
    if (project && project.status === 'COVERAGE_ANALYZED') {
      completeMutation.mutate(projectId);
    }
    navigate(projectWorkflowPath(projectId, 'report', serviceScope.servicePath));
  };

  if (isLoading || serviceScope.isLoading) {
    return (
      <AppShell maxWidth="wide">
        <SkeletonLoader count={4} />
      </AppShell>
    );
  }

  if (error || serviceScope.error || !project) {
    return (
      <AppShell maxWidth="wide">
        <ErrorState error={error ?? serviceScope.error ?? undefined} title={t('Không tìm thấy project', 'Project not found')} backTo="/projects" />
      </AppShell>
    );
  }

  if (serviceScope.selected && status && !canOpenTraceability(status)) {
    return <Navigate to={projectWorkflowPath(projectId, 'unit-tests', serviceScope.servicePath)} replace />;
  }

  return (
    <AppShell maxWidth="wide">
      <ProjectPageHeader
        project={project}
        titlePrefix="Traceability"
        subtitle={t('Truy vết từng Business Rule tới Test Plan, Test Case và Unit Test tương ứng.', 'Trace each Business Rule to its Test Plans, Test Cases, and Unit Tests.')}
        backTo={projectWorkflowPath(projectId, 'coverage', serviceScope.servicePath)}
        backLabel="Coverage"
      />

      <ProjectWorkflowTabs projectId={projectId} active="traceability" status={status ?? project.status} servicePath={serviceScope.servicePath} />
      <ProjectServiceSelector services={serviceScope.services} servicePath={serviceScope.servicePath} onChange={serviceScope.select} />
      <TraceabilityMatrix projectId={projectId} servicePath={serviceScope.servicePath} />

      {canOpenReport(status ?? project.status) && <div className="mt-6 rounded-base border border-border-brand-subtle bg-brand-softer p-4 shadow-sm animate-fade-in">
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
          <button
            type="button"
            onClick={handleContinueToReport}
            className="btn btn-brand shrink-0"
          >
            {t('Tiếp tục đến Report', 'Continue to Report')}
            <ArrowRight size={14} strokeWidth={1.8} />
          </button>
        </div>
      </div>}
    </AppShell>
  );
}

export default TraceabilityPage;
