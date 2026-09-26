import { Navigate, useParams } from 'react-router-dom';
import { AppShell } from '../../../shared/components/AppShell';
import { SkeletonLoader } from '../../../shared/components/SkeletonLoader';
import { ErrorState } from '../../../shared/components/ErrorState';
import { ProjectWorkflowTabs } from '../../projects/components/ProjectWorkflowTabs';
import { ProjectPageHeader } from '../../projects/components/ProjectPageHeader';
import { useProject } from '../../projects/hooks/useProjects';
import { canOpenCoverage } from '../../projects/utils/project-workflow';
import { CoveragePanel } from '../components/CoveragePanel';
import { useLanguage } from '../../../shared/i18n/language';
import { ProjectServiceSelector } from '../../projects/components/ProjectServiceSelector';
import { useProjectServiceScope } from '../../projects/hooks/useProjectServiceScope';
import { projectWorkflowPath } from '../../projects/utils/project-service';


export function CoveragePage() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const { data: project, isLoading, error } = useProject(projectId);
  const { t } = useLanguage();
  const serviceScope = useProjectServiceScope(projectId, project?.status !== undefined && project.status !== 'UPLOADED');
  const status = serviceScope.selected?.status ?? project?.status;

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

  if (serviceScope.selected && status && !canOpenCoverage(status)) {
    return <Navigate to={projectWorkflowPath(projectId, 'unit-tests', serviceScope.servicePath)} replace />;
  }

  return (
    <AppShell maxWidth="wide">
      <ProjectPageHeader
        project={project}
        titlePrefix="Coverage"
        subtitle={t('Upload JaCoCo XML để xem coverage và gợi ý bổ sung test.', 'Upload JaCoCo XML to inspect coverage and test suggestions.')}
        backTo={projectWorkflowPath(projectId, 'unit-tests', serviceScope.servicePath)}
        backLabel="Unit Test"
      />
      {serviceScope.selected && status && (
        <>
          <ProjectWorkflowTabs projectId={projectId} active="coverage" status={status} servicePath={serviceScope.servicePath} />
          <ProjectServiceSelector services={serviceScope.services} servicePath={serviceScope.servicePath} onChange={serviceScope.select} />
          <CoveragePanel projectId={projectId} projectStatus={status} servicePath={serviceScope.servicePath} />
        </>
      )}
    </AppShell>
  );
}

export default CoveragePage;
