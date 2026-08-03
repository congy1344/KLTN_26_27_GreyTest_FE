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

export function TestPlansPage() {
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

  if (!canOpenTestPlans(project.status)) {
    return <Navigate to={`/projects/${projectId}`} replace />;
  }

  return (
    <AppShell maxWidth="wide">
      <ProjectPageHeader
        project={project}
        titlePrefix="Test Plan"
        subtitle={t('Sinh và review Test Plan từ các Business Rule đã approve.', 'Generate and review Test Plans from approved Business Rules.')}
        backTo={`/projects/${projectId}`}
        backLabel="Analysis & Business Rules"
      />

      <ProjectWorkflowTabs projectId={projectId} active="test-plans" status={project.status} />
      <TestPlansPanel projectId={projectId} projectStatus={project.status} />
    </AppShell>
  );
}

export default TestPlansPage;
