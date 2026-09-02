import { Navigate, useParams } from 'react-router-dom';
import { AppShell } from '../../../shared/components/AppShell';
import { SkeletonLoader } from '../../../shared/components/SkeletonLoader';
import { ErrorState } from '../../../shared/components/ErrorState';
import { ProjectWorkflowTabs } from '../../projects/components/ProjectWorkflowTabs';
import { ProjectPageHeader } from '../../projects/components/ProjectPageHeader';
import { useProject } from '../../projects/hooks/useProjects';
import { canOpenUnitTests } from '../../projects/utils/project-workflow';
import { UnitTestsPanel } from '../components/UnitTestsPanel';
import { useLanguage } from '../../../shared/i18n/language';
import { ProjectServiceSelector } from '../../projects/components/ProjectServiceSelector';
import { useProjectServiceScope } from '../../projects/hooks/useProjectServiceScope';
import { projectWorkflowPath } from '../../projects/utils/project-service';


export function UnitTestsPage() {
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

  if (serviceScope.selected && status && !canOpenUnitTests(status)) {
    return <Navigate to={projectWorkflowPath(projectId, 'test-cases', serviceScope.servicePath)} replace />;
  }

  return (
    <AppShell maxWidth="wide">
      <ProjectPageHeader
        project={project}
        titlePrefix="Unit Test"
        subtitle={t('Chuẩn bị Unit Test từ các Test Case đã approve.', 'Prepare Unit Tests from approved Test Cases.')}
        backTo={projectWorkflowPath(projectId, 'test-cases', serviceScope.servicePath)}
        backLabel="Test Case"
      />
      <ProjectServiceSelector services={serviceScope.services} servicePath={serviceScope.servicePath} onChange={serviceScope.select} />
      {serviceScope.selected && status && (
        <>
          <ProjectWorkflowTabs projectId={projectId} active="unit-tests" status={status} servicePath={serviceScope.servicePath} />
          <UnitTestsPanel key={serviceScope.servicePath ?? 'default'} projectId={projectId} servicePath={serviceScope.servicePath} />
        </>
      )}
    </AppShell>
  );
}

export default UnitTestsPage;

