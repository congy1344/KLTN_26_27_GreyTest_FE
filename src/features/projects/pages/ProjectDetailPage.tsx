import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Scan, Loader2, GitBranch, Archive, RefreshCw } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useProject, useAnalysis, useAnalyzeProject, useExistingTests } from '../hooks/useProjects';
import { StatusBadge } from '../components/StatusBadge';
import { AnalysisResult } from '../components/AnalysisResult';
import { SourceUpdateModal } from '../components/SourceUpdateModal';
import { fetchProjectSourceUpdates } from '../api/source-update-api';
import type { ImpactSummaryDto } from '../types';
import { SkeletonLoader } from '../../../shared/components/SkeletonLoader';
import { getErrorMessage } from '../../../shared/api/api-client';
import { AppShell } from '../../../shared/components/AppShell';
import { ErrorState } from '../../../shared/components/ErrorState';
import { BusinessRulesPanel } from '../../business-rules/components/BusinessRulesPanel';
import { useBusinessRules } from '../../business-rules/hooks/useBusinessRules';
import { useTestPlans } from '../../test-plans/hooks/useTestPlans';
import { useTestCases } from '../../test-cases/hooks/useTestCases';
import { useUnitTests } from '../../unit-tests/hooks/useUnitTests';
import { ProjectWorkflowTabs } from '../components/ProjectWorkflowTabs';
import { useLanguage } from '../../../shared/i18n/language';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { ProjectServiceSelector } from '../components/ProjectServiceSelector';
import { useProjectServiceScope } from '../hooks/useProjectServiceScope';

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const queryClient = useQueryClient();

  const { data: project, isLoading: projectLoading, error: projectError } = useProject(projectId);
  const shouldLoadAnalysis = project?.status !== undefined && project.status !== 'UPLOADED';
  const {
    data: analysis,
    isLoading: analysisLoading,
    error: analysisError,
  } = useAnalysis(projectId, shouldLoadAnalysis);
  const { data: existingTests = [] } = useExistingTests(projectId, shouldLoadAnalysis);
  const serviceScope = useProjectServiceScope(projectId, shouldLoadAnalysis);
  const workflowStatus = serviceScope.selected?.status ?? project?.status;
  const analyzeMutation = useAnalyzeProject();
  const { t } = useLanguage();
  const [showReanalyzeConfirm, setShowReanalyzeConfirm] = useState(false);
  const [showSourceUpdateModal, setShowSourceUpdateModal] = useState(false);

  const sourceUpdatesQuery = useQuery({
    queryKey: ['source-updates', projectId],
    queryFn: () => fetchProjectSourceUpdates(projectId),
    enabled: Boolean(projectId),
  });

  const latestUpdate = useMemo(() => {
    if (!sourceUpdatesQuery.data || sourceUpdatesQuery.data.length === 0) return null;
    const active = sourceUpdatesQuery.data.find((u) => !['CANCELLED', 'FAILED'].includes(u.status));
    return active || sourceUpdatesQuery.data[0];
  }, [sourceUpdatesQuery.data]);

  const { methodDiffMap, affectedRuleIds } = useMemo(() => {
    const diffMap: Record<string, 'ADDED' | 'MODIFIED' | 'DELETED'> = {};
    const ruleIds = new Set<number>();
    if (latestUpdate?.impactSummary) {
      try {
        const impact: ImpactSummaryDto = JSON.parse(latestUpdate.impactSummary);
        impact.changedMethods?.forEach((m) => {
          diffMap[m.methodKey] = m.diffType;
          diffMap[`${m.qualifiedClassName}#${m.methodName}`] = m.diffType;
          diffMap[m.methodName] = m.diffType;
        });
        impact.affectedBusinessRuleIds?.forEach((ruleId) => ruleIds.add(ruleId));
      } catch {
        // ignore parse error
      }
    }
    return { methodDiffMap: diffMap, affectedRuleIds: ruleIds };
  }, [latestUpdate]);

  // Regenerate từ pha đầu: cho phân tích lại ở mọi status miễn còn source
  const canAnalyze = project?.sourceAvailable ?? false;
  const hasAnalysis = project && project.status !== 'UPLOADED';
  // Đã có artifact pipeline → phân tích lại là thao tác phá hủy, cần confirm kèm số liệu
  const hasPipelineData = project !== undefined && !['UPLOADED', 'ANALYZED', 'FAILED'].includes(project.status);
  const rulesQuery = useBusinessRules(hasPipelineData && serviceScope.selected ? projectId : 0, serviceScope.servicePath);
  const plansQuery = useTestPlans(hasPipelineData && serviceScope.selected ? projectId : 0, serviceScope.servicePath);
  const casesQuery = useTestCases(hasPipelineData && serviceScope.selected ? projectId : 0, serviceScope.servicePath);
  const unitsQuery = useUnitTests(hasPipelineData && serviceScope.selected ? projectId : 0, serviceScope.servicePath);
  const pipelineCounts = [
    `${rulesQuery.data?.length ?? 0} Business Rule`,
    `${plansQuery.data?.length ?? 0} Test Plan`,
    `${casesQuery.data?.length ?? 0} Test Case`,
    `${unitsQuery.data?.length ?? 0} Unit Test`,
  ].join(', ');

  const handleAnalyze = () => {
    if (!projectId) return;
    if (hasPipelineData) {
      setShowReanalyzeConfirm(true);
      return;
    }
    analyzeMutation.mutate(projectId);
  };

  if (projectLoading) {
    return (
      <AppShell maxWidth="wide">
        <SkeletonLoader count={4} />
      </AppShell>
    );
  }

  if (projectError || !project) {
    return (
      <AppShell maxWidth="wide">
        <ErrorState error={projectError ?? undefined} title={t('Không tìm thấy project', 'Project not found')} backTo="/projects" />
      </AppShell>
    );
  }

  return (
    <AppShell maxWidth="wide">
      <div className="mb-5 animate-fade-in-up">
        <Link
          to="/projects"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-body transition-colors duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] hover:text-heading"
        >
          <ArrowLeft size={14} strokeWidth={1.8} />
          {t('Danh sách project', 'Projects')}
        </Link>
      </div>

      <header className="mb-8 animate-fade-in-up delay-1">
        <div className="rounded-base border border-border-default bg-neutral-primary-soft p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-default border border-border-default bg-neutral-secondary-soft text-body-subtle shadow-xs">
                {project.sourceType === 'GITHUB' ? (
                  <GitBranch size={20} strokeWidth={1.6} />
                ) : (
                  <Archive size={20} strokeWidth={1.6} />
                )}
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-bold tracking-tight text-heading md:text-3xl">
                  {project.name}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-neutral-secondary-medium px-2 py-0.5 text-[12px] font-mono text-body-subtle">
                    {project.sourceType}
                  </span>
                  {project.sourceUrl && (
                    <a
                      href={project.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="max-w-full truncate text-[12px] font-medium text-fg-brand hover:text-fg-brand-strong md:max-w-[520px]"
                    >
                      {project.sourceUrl}
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-3">
              <StatusBadge status={project.status} />

              <button
                type="button"
                onClick={() => setShowSourceUpdateModal(true)}
                className="btn btn-outline flex items-center gap-1.5"
                id="btn-source-update"
              >
                <RefreshCw size={14} strokeWidth={1.8} />
                {t('Cập nhật source', 'Update source')}
              </button>

              {canAnalyze && (
                <button
                  onClick={handleAnalyze}
                  disabled={analyzeMutation.isPending}
                  className="btn btn-brand"
                  id="btn-analyze-project"
                >
                  {analyzeMutation.isPending ? (
                    <>
                      <Loader2 size={14} strokeWidth={1.8} className="animate-spin" />
                      {t('Đang phân tích', 'Analyzing')}
                    </>
                  ) : (
                    <>
                      <Scan size={14} strokeWidth={1.8} />
                      {project.status !== 'UPLOADED' ? t('Phân tích lại', 'Analyze again') : t('Phân tích source code', 'Analyze source code')}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {!project.sourceAvailable && (
            <div className="mt-4 rounded-default border border-border-warning-subtle bg-warning-soft p-3 animate-fade-in">
              <p className="text-sm font-medium text-fg-warning">
                {t('Source của project này không còn trong storage. Bạn vẫn xem được kết quả đã lưu nhưng cần upload ZIP hoặc clone GitHub lại nếu muốn phân tích lại.', 'This project source is no longer available in storage. Saved results remain visible, but you must upload the ZIP or clone the GitHub repository again to reanalyze it.')}
              </p>
            </div>
          )}

          {analyzeMutation.isError && (
            <div className="mt-4 rounded-default border border-border-danger-subtle bg-danger-soft p-3 animate-fade-in">
              <p className="text-sm font-medium text-fg-danger-strong">
                {getErrorMessage(analyzeMutation.error)}
              </p>
            </div>
          )}
        </div>
      </header>
      {hasAnalysis && <ProjectServiceSelector services={serviceScope.services} servicePath={serviceScope.servicePath} onChange={serviceScope.select} />}
      {hasAnalysis && serviceScope.isError && (
        <div className="mb-6 flex items-start gap-3 rounded-base border border-border-warning-subtle bg-warning-soft p-4 shadow-sm">
          <AlertTriangle size={17} className="mt-0.5 shrink-0 text-fg-warning" />
          <div>
            <p className="text-sm font-semibold text-fg-warning">
              {t('Không thể tải danh sách service để sinh Business Rule', 'Unable to load services for Business Rule generation')}
            </p>
            <p className="mt-1 text-xs text-body">{getErrorMessage(serviceScope.error)}</p>
          </div>
        </div>
      )}
      {hasAnalysis && serviceScope.isSuccess && serviceScope.services.length === 0 && (
        <div className="mb-6 flex items-start gap-3 rounded-base border border-border-warning-subtle bg-warning-soft p-4 shadow-sm">
          <AlertTriangle size={17} className="mt-0.5 shrink-0 text-fg-warning" />
          <div>
            <p className="text-sm font-semibold text-fg-warning">
              {t('Không tìm thấy Service class để sinh Business Rule', 'No Service class found for Business Rule generation')}
            </p>
            <p className="mt-1 text-xs text-body">
              {t('Kiểm tra kết quả phân loại class hoặc bấm Phân tích lại.', 'Check class classification or analyze the project again.')}
            </p>
          </div>
        </div>
      )}
      {hasAnalysis && serviceScope.selected && workflowStatus && (
        <ProjectWorkflowTabs projectId={projectId} active="analysis" status={workflowStatus} servicePath={serviceScope.servicePath} />
      )}

      {analyzeMutation.isPending && (
        <div className="mb-6 animate-fade-in">
          <div className="flex items-center gap-3 rounded-base border border-border-default bg-neutral-primary-soft p-5 shadow-sm">
            <Loader2 size={18} strokeWidth={1.8} className="animate-spin text-fg-brand" />
            <div>
              <p className="text-sm font-semibold text-heading">{t('Đang phân tích source code', 'Analyzing source code')}</p>
              <p className="mt-0.5 text-xs text-body-subtle">{t('JavaParser đang quét các file .java trong project.', 'JavaParser is scanning the project Java files.')}</p>
            </div>
          </div>
        </div>
      )}

      {analyzeMutation.isSuccess && analyzeMutation.data && (
        <AnalysisResult data={analyzeMutation.data} existingTests={existingTests} methodDiffMap={methodDiffMap} />
      )}

      {!analyzeMutation.isSuccess && hasAnalysis && !analysisLoading && analysis && (
        <AnalysisResult data={analysis} existingTests={existingTests} methodDiffMap={methodDiffMap} />
      )}

      {!analyzeMutation.isSuccess && hasAnalysis && analysisLoading && (
        <SkeletonLoader count={4} />
      )}

      {!analyzeMutation.isSuccess && hasAnalysis && analysisError && (
        <div className="rounded-base border border-border-danger-subtle bg-danger-soft p-4 animate-fade-in">
          <p className="text-sm font-semibold text-fg-danger-strong">
            {t('Không thể tải kết quả analysis', 'Unable to load analysis results')}
          </p>
          <p className="mt-1 text-xs text-fg-danger-strong">
            {getErrorMessage(analysisError)}
          </p>
        </div>
      )}

      {hasAnalysis && serviceScope.selected && (
        <BusinessRulesPanel
          key={serviceScope.servicePath ?? 'default'}
          projectId={projectId}
          servicePath={serviceScope.servicePath}
          methodDiffMap={methodDiffMap}
          affectedRuleIds={affectedRuleIds}
        />
      )}
      <SourceUpdateModal
        project={project}
        servicePath={serviceScope.servicePath}
        isOpen={showSourceUpdateModal}
        onClose={() => setShowSourceUpdateModal(false)}
        onApplied={() => {
          queryClient.invalidateQueries({ queryKey: ['project', projectId] });
          queryClient.invalidateQueries({ queryKey: ['source-updates', projectId] });
          queryClient.invalidateQueries({ queryKey: ['analysis', projectId] });
          queryClient.invalidateQueries({ queryKey: ['business-rules', projectId] });
          queryClient.invalidateQueries({ queryKey: ['test-plans', projectId] });
          queryClient.invalidateQueries({ queryKey: ['test-cases', projectId] });
          queryClient.invalidateQueries({ queryKey: ['unit-tests', projectId] });
          queryClient.invalidateQueries({ queryKey: ['project-services', projectId] });
        }}
      />
      <ConfirmDialog
        open={showReanalyzeConfirm}
        title={t('Phân tích lại project?', 'Reanalyze project?')}
        description={t(
          `Hệ thống sẽ xóa artifact của mọi service (service đang chọn: ${pipelineCounts}) và toàn bộ lịch sử coverage trước khi phân tích lại. Thao tác này không thể hoàn tác.`,
          `The system will delete artifacts from every service (selected service: ${pipelineCounts}) and the complete coverage history before reanalysis. This action cannot be undone.`,
        )}
        confirmLabel={t('Phân tích lại', 'Reanalyze')}
        cancelLabel={t('Hủy', 'Cancel')}
        pending={analyzeMutation.isPending}
        onCancel={() => setShowReanalyzeConfirm(false)}
        onConfirm={() => {
          setShowReanalyzeConfirm(false);
          analyzeMutation.mutate(projectId);
        }}
      />
    </AppShell>
  );
}

export default ProjectDetailPage;
