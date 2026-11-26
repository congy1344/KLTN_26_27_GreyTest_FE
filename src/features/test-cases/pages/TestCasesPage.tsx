import { Navigate, useParams } from 'react-router-dom';
import { AppShell } from '../../../shared/components/AppShell';
import { SkeletonLoader } from '../../../shared/components/SkeletonLoader';
import { ErrorState } from '../../../shared/components/ErrorState';
import { ProjectWorkspace } from '../../projects/components/ProjectWorkspace';
import { useProject } from '../../projects/hooks/useProjects';
import { canOpenTestCases } from '../../projects/utils/project-workflow';
import { TestCasesPanel } from '../components/TestCasesPanel';
import { useLanguage } from '../../../shared/i18n/language';
import { ProjectServiceSelector } from '../../projects/components/ProjectServiceSelector';
import { useProjectServiceScope } from '../../projects/hooks/useProjectServiceScope';
import { projectWorkflowPath } from '../../projects/utils/project-service';


export function TestCasesPage() {
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

  if (!project || (!serviceScope.selected && serviceScope.error)) {
    return (
      <AppShell maxWidth="wide">
        <ErrorState error={error ?? serviceScope.error ?? undefined} title={t('Không tìm thấy dự án', 'Project not found')} backTo="/projects" />
      </AppShell>
    );
  }

  if (serviceScope.selected && status && !canOpenTestCases(serviceScope.selected?.reachedStatus ?? status)) {
    return <Navigate to={projectWorkflowPath(projectId, 'test-plans', serviceScope.servicePath)} replace />;
  }

  return (
    <AppShell maxWidth="bleed">
      <ProjectWorkspace
        project={project}
        servicePath={serviceScope.servicePath}
        titlePrefix="Test Case"
        subtitle={t('Chuẩn bị test data từ các Test Plan đã duyệt.', 'Prepare test data from approved Test Plans.')}
        backTo={projectWorkflowPath(projectId, 'test-plans', serviceScope.servicePath)}
        backLabel="Test Plan"
        active="test-cases"
        status={status ?? project.status}
        reachedStatus={serviceScope.selected?.reachedStatus}
        selector={<ProjectServiceSelector services={serviceScope.services} servicePath={serviceScope.servicePath} onChange={serviceScope.select} />}
      >
      {serviceScope.selected && status && (
        <>
          <TestCasesPanel key={serviceScope.servicePath ?? 'default'} projectId={projectId} projectStatus={status} servicePath={serviceScope.servicePath} />
        </>
      )}
      </ProjectWorkspace>
    </AppShell>
  );
}

export default TestCasesPage;

