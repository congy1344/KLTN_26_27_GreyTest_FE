import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle, Scan, Loader2, RefreshCw } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useProject, useAnalysis, useAnalyzeProject, useExistingTests } from '../hooks/useProjects';
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
import { ProjectWorkspace } from '../components/ProjectWorkspace';
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
          if (m.diffType !== 'UNCHANGED') {
            diffMap[m.methodKey] = m.diffType;
            diffMap[`${m.qualifiedClassName}#${m.methodName}`] = m.diffType;
            diffMap[m.methodName] = m.diffType;
          }
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
    [rulesQuery.data?.length, 'Business Rule'],
    [plansQuery.data?.length, 'Test Plan'],
    [casesQuery.data?.length, 'Test Case'],
    [unitsQuery.data?.length, 'Unit Test'],
  ].filter(([count]) => count != null).map(([count, label]) => [count, label].join(' ')).join(', ');

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
        <ErrorState error={projectError ?? undefined} title={t('Không tìm thấy dự án', 'Project not found')} backTo="/projects" />
      </AppShell>
    );
  }

  return (
    <AppShell maxWidth="bleed">
      <ProjectWorkspace
        project={project}
        active="analysis"
        status={workflowStatus ?? project.status}
        reachedStatus={serviceScope.selected?.reachedStatus}
        servicePath={serviceScope.servicePath}
        titlePrefix={t('Phân tích & Business Rule', 'Analysis & Business Rules')}
        subtitle={t('Quy tắc nghiệp vụ trích từ mã nguồn, làm căn cứ cho Test Plan, Test Case và Unit Test.', 'Business Rules extracted from source guide Test Plans, Test Cases, and Unit Tests.')}
        backTo="/projects"
        backLabel={t('Danh sách dự án', 'Projects')}
        showSourceUpdate={false}
        actions={<>
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
                  className={hasAnalysis ? 'btn btn-secondary' : 'btn btn-brand'}
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
        </>}
        selector={hasAnalysis && <ProjectServiceSelector services={serviceScope.services} servicePath={serviceScope.servicePath} onChange={serviceScope.select} />}
      >
        <div className="mb-4 flex flex-wrap gap-2 text-xs text-body-subtle">
          <span>{t('Nguồn', 'Source')}: <span className="font-mono">{project.sourceType}</span></span>
          {project.sourceUrl && <a href={project.sourceUrl} target="_blank" rel="noopener noreferrer" className="rounded-control break-all text-fg-brand-strong">{project.sourceUrl}</a>}
        </div>
          {!project.sourceAvailable && (
            <div className="mt-4 rounded-base border border-border-warning-subtle bg-warning-soft p-3 animate-fade-in">
              <p className="text-sm font-medium text-fg-warning">
                {t('Source của dự án này không còn trong storage. Bạn vẫn xem được kết quả đã lưu nhưng cần upload ZIP hoặc clone GitHub lại nếu muốn phân tích lại.', 'This project source is no longer available in storage. Saved results remain visible, but you must upload the ZIP or clone the GitHub repository again to reanalyze it.')}
              </p>
            </div>
          )}

          {analyzeMutation.isError && (
            <div className="mt-4 rounded-base border border-border-danger-subtle bg-danger-soft p-3 animate-fade-in">
              <p className="text-sm font-medium text-fg-danger-strong">
                {getErrorMessage(analyzeMutation.error)}
              </p>
            </div>
          )}
      {hasAnalysis && serviceScope.isError && (
        <div className="mb-6 flex items-start gap-3 rounded-base border border-border-warning-subtle bg-warning-soft p-4">
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
        <div className="mb-6 flex items-start gap-3 rounded-base border border-border-warning-subtle bg-warning-soft p-4">
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

      {analyzeMutation.isPending && (
        <div className="mb-6 animate-fade-in">
          <div className="flex items-center gap-3 rounded-base border border-border-default bg-neutral-primary-soft p-5">
            <Loader2 size={18} strokeWidth={1.8} className="animate-spin text-fg-brand" />
            <div>
              <p className="text-sm font-semibold text-heading">{t('Đang phân tích source code', 'Analyzing source code')}</p>
              <p className="mt-0.5 text-xs text-body-subtle">{t('JavaParser đang quét các file .java trong dự án.', 'JavaParser is scanning the project Java files.')}</p>
            </div>
          </div>
        </div>
      )}

      {(hasAnalysis || analyzeMutation.isSuccess) && <details className="mb-6 rounded-base border border-border-default bg-neutral-primary-soft" open={!serviceScope.selected || undefined}>
        <summary className="rounded-base cursor-pointer px-4 py-3 text-sm font-semibold text-heading">{t('Kết quả phân tích mã nguồn', 'Source analysis results')}</summary>
        <div className="p-4">
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
            {t('Không thể tải kết quả phân tích', 'Unable to load analysis results')}
          </p>
          <p className="mt-1 text-xs text-fg-danger-strong">
            {getErrorMessage(analysisError)}
          </p>
        </div>
      )}

        </div>
      </details>}

      {hasAnalysis && serviceScope.selected && (
        <BusinessRulesPanel
          key={serviceScope.servicePath ?? 'default'}
          projectId={projectId}
          servicePath={serviceScope.servicePath}
          methodDiffMap={methodDiffMap}
          affectedRuleIds={affectedRuleIds}
          projectStatus={project?.status}
        />
      )}
      </ProjectWorkspace>
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
          queryClient.invalidateQueries({ queryKey: ['unit-test-files', projectId] });
          queryClient.invalidateQueries({ queryKey: ['project-services', projectId] });
        }}
      />
      <ConfirmDialog
        open={showReanalyzeConfirm}
        title={t('Phân tích lại dự án?', 'Reanalyze project?')}
        description={t(
          `Hệ thống sẽ xóa artifact của mọi service ${pipelineCounts ? '(service đang chọn: ' + pipelineCounts + ') ' : ''}và toàn bộ lịch sử coverage trước khi phân tích lại. Thao tác này không thể hoàn tác.`,
          `The system will delete artifacts from every service ${pipelineCounts ? '(selected service: ' + pipelineCounts + ') ' : ''}and the complete coverage history before reanalysis. This action cannot be undone.`,
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
