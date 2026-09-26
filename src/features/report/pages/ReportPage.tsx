import { useEffect } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { AppShell } from '../../../shared/components/AppShell';
import { SkeletonLoader } from '../../../shared/components/SkeletonLoader';
import { ErrorState } from '../../../shared/components/ErrorState';
import { ProjectWorkflowTabs } from '../../projects/components/ProjectWorkflowTabs';
import { ProjectPageHeader } from '../../projects/components/ProjectPageHeader';
import { ProjectServiceSelector } from '../../projects/components/ProjectServiceSelector';
import { useCompleteProject, useProject } from '../../projects/hooks/useProjects';
import { useProjectServiceScope } from '../../projects/hooks/useProjectServiceScope';
import { canOpenReport } from '../../projects/utils/project-workflow';
import { projectWorkflowPath } from '../../projects/utils/project-service';
import { ReportPanel } from '../components/ReportPanel';
import { useLanguage } from '../../../shared/i18n/language';

export function ReportPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const { data: project, isLoading, error } = useProject(projectId);
  const completeMutation = useCompleteProject();
  const { t } = useLanguage();
  const serviceScope = useProjectServiceScope(projectId, project?.status !== undefined && project.status !== 'UPLOADED');
  const status = project?.status === 'COMPLETED' ? 'COMPLETED' : (serviceScope.selected?.status ?? project?.status);

  useEffect(() => {
    if (project && project.status === 'COVERAGE_ANALYZED') {
      completeMutation.mutate(projectId);
    }
  }, [project?.status, projectId]);

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

  if (serviceScope.selected && status && !canOpenReport(status)) {
    return <Navigate to={projectWorkflowPath(projectId, 'coverage', serviceScope.servicePath)} replace />;
  }

  return (
    <AppShell maxWidth="wide">
      <ProjectPageHeader
        project={project}
        titlePrefix="Report"
        subtitle={t('Xuất Report dạng JSON hoặc Markdown cho kết quả GreyTest.', 'Export GreyTest results as JSON or Markdown.')}
        backTo={projectWorkflowPath(projectId, 'traceability', serviceScope.servicePath)}
        backLabel="Traceability"
      />

      <ProjectWorkflowTabs projectId={projectId} active="report" status={status ?? project.status} servicePath={serviceScope.servicePath} />
      <ProjectServiceSelector services={serviceScope.services} servicePath={serviceScope.servicePath} onChange={serviceScope.select} />
      <ReportPanel projectId={projectId} servicePath={serviceScope.servicePath} />
    </AppShell>
  );
}

export default ReportPage;
