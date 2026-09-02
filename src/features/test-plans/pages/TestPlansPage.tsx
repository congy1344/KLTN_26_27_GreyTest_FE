import { Navigate, useParams } from 'react-router-dom';
import { AppShell } from '../../../shared/components/AppShell';
import { SkeletonLoader } from '../../../shared/components/SkeletonLoader';
import { ErrorState } from '../../../shared/components/ErrorState';
import { ProjectWorkflowTabs } from '../../projects/components/ProjectWorkflowTabs';
import { ProjectPageHeader } from '../../projects/components/ProjectPageHeader';
import { useProject } from '../../projects/hooks/useProjects';
import { canOpenTestPlans } from '../../projects/utils/project-workflow';
import { TestPlansPanel } from '../components/TestPlansPanel';
import { useLanguage } from '../../../shared/i18n/language';
import { ProjectServiceSelector } from '../../projects/components/ProjectServiceSelector';
import { useProjectServiceScope } from '../../projects/hooks/useProjectServiceScope';
import { projectWorkflowPath } from '../../projects/utils/project-service';


export function TestPlansPage() {
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

  if (serviceScope.selected && status && !canOpenTestPlans(status)) {
    return <Navigate to={projectWorkflowPath(projectId, undefined, serviceScope.servicePath)} replace />;
  }

  return (
    <AppShell maxWidth="wide">
      <ProjectPageHeader
        project={project}
        titlePrefix="Test Plan"
        subtitle={t('Sinh và review Test Plan từ các Business Rule đã approve.', 'Generate and review Test Plans from approved Business Rules.')}
        backTo={projectWorkflowPath(projectId, undefined, serviceScope.servicePath)}
        backLabel="Analysis & Business Rules"
      />
      <ProjectServiceSelector services={serviceScope.services} servicePath={serviceScope.servicePath} onChange={serviceScope.select} />
      {serviceScope.selected && status && (
        <>
          <ProjectWorkflowTabs projectId={projectId} active="test-plans" status={status} servicePath={serviceScope.servicePath} />
          <TestPlansPanel key={serviceScope.servicePath ?? 'default'} projectId={projectId} projectStatus={status} servicePath={serviceScope.servicePath} />
        </>
      )}
    </AppShell>
  );
}

export default TestPlansPage;

