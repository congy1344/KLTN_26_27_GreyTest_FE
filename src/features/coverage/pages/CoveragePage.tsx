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

export function CoveragePage() {
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

  if (!canOpenCoverage(project.status)) {
    return <Navigate to={`/projects/${projectId}/unit-tests`} replace />;
  }

  return (
    <AppShell maxWidth="wide">
      <ProjectPageHeader
        project={project}
        titlePrefix="Coverage"
        subtitle={t('Upload JaCoCo XML để xem coverage và gợi ý bổ sung test.', 'Upload JaCoCo XML to inspect coverage and test suggestions.')}
        backTo={`/projects/${projectId}/unit-tests`}
        backLabel="Unit Test"
      />

      <ProjectWorkflowTabs projectId={projectId} active="coverage" status={project.status} />
      <CoveragePanel projectId={projectId} projectStatus={project.status} />
    </AppShell>
  );
}

export default CoveragePage;
