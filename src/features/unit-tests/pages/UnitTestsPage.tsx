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

export function UnitTestsPage() {
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

  if (!canOpenUnitTests(project.status)) {
    return <Navigate to={`/projects/${projectId}/test-cases`} replace />;
  }

  return (
    <AppShell maxWidth="wide">
      <ProjectPageHeader
        project={project}
        titlePrefix="Unit Test"
        subtitle={t('Chuẩn bị Unit Test từ các Test Case đã approve.', 'Prepare Unit Tests from approved Test Cases.')}
        backTo={`/projects/${projectId}/test-cases`}
        backLabel="Test Case"
      />

      <ProjectWorkflowTabs projectId={projectId} active="unit-tests" status={project.status} />
      <UnitTestsPanel projectId={projectId} />
    </AppShell>
  );
}

export default UnitTestsPage;
