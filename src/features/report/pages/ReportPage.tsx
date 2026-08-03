import { Navigate, useParams } from 'react-router-dom';
import { AppShell } from '../../../shared/components/AppShell';
import { SkeletonLoader } from '../../../shared/components/SkeletonLoader';
import { ErrorState } from '../../../shared/components/ErrorState';
import { ProjectWorkflowTabs } from '../../projects/components/ProjectWorkflowTabs';
import { ProjectPageHeader } from '../../projects/components/ProjectPageHeader';
import { useProject } from '../../projects/hooks/useProjects';
import { canOpenReport } from '../../projects/utils/project-workflow';
import { ReportPanel } from '../components/ReportPanel';
import { useLanguage } from '../../../shared/i18n/language';

export function ReportPage() {
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

  if (!canOpenReport(project.status)) {
    return <Navigate to={`/projects/${projectId}/coverage`} replace />;
  }

  return (
    <AppShell maxWidth="wide">
      <ProjectPageHeader
        project={project}
        titlePrefix="Report"
        subtitle={t('Xuất Report dạng JSON hoặc Markdown cho kết quả GreyTest.', 'Export GreyTest results as JSON or Markdown.')}
        backTo={`/projects/${projectId}/traceability`}
        backLabel="Traceability"
      />

      <ProjectWorkflowTabs projectId={projectId} active="report" status={project.status} />
      <ReportPanel projectId={projectId} />
    </AppShell>
  );
}

export default ReportPage;
