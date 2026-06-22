import { useParams, Link } from 'react-router-dom';
import { Beaker, ArrowLeft, Scan, Loader2, GitBranch, Archive, AlertCircle } from 'lucide-react';
import { useProject, useAnalysis, useAnalyzeProject } from '../hooks/useProjects';
import { StatusBadge } from '../components/StatusBadge';
import { AnalysisResult } from '../components/AnalysisResult';
import { SkeletonLoader } from '../../../shared/components/SkeletonLoader';
import { getErrorMessage } from '../../../shared/api/api-client';

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);

  const { data: project, isLoading: projectLoading, error: projectError } = useProject(projectId);
  const shouldLoadAnalysis = project?.status !== undefined && project.status !== 'UPLOADED';
  const {
    data: analysis,
    isLoading: analysisLoading,
    error: analysisError,
  } = useAnalysis(projectId, shouldLoadAnalysis);
  const analyzeMutation = useAnalyzeProject();

  const canAnalyze = project?.status === 'UPLOADED' || project?.status === 'ANALYZED';
  const hasAnalysis = project && project.status !== 'UPLOADED';

  const handleAnalyze = () => {
    if (!projectId) return;
    analyzeMutation.mutate(projectId);
  };

  if (projectLoading) {
    return (
      <PageShell>
        <SkeletonLoader count={4} />
      </PageShell>
    );
  }

  if (projectError || !project) {
    return (
      <PageShell>
        <div className="bg-neutral-primary-soft border border-border-default rounded-base shadow-xs p-12 flex flex-col items-center justify-center text-center animate-fade-in">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger-soft text-fg-danger-strong mb-4">
            <AlertCircle size={20} strokeWidth={2} />
          </div>
          <p className="text-sm font-semibold text-fg-danger-strong mb-1">
            {projectError ? getErrorMessage(projectError) : 'Không tìm thấy project'}
          </p>
          <Link to="/projects" className="text-sm text-fg-brand hover:underline mt-3">
            ← Quay lại danh sách
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      {/* Breadcrumb */}
      <div className="mb-6 animate-fade-in-up">
        <Link
          to="/projects"
          className="inline-flex items-center gap-1.5 text-sm text-body hover:text-heading transition-colors duration-150"
        >
          <ArrowLeft size={14} strokeWidth={2} />
          Danh sách project
        </Link>
      </div>

      {/* Project Header */}
      <header className="mb-8 animate-fade-in-up delay-1">
        <div className="bg-neutral-primary-soft border border-border-default rounded-base shadow-xs p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4 min-w-0">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-neutral-secondary-medium text-body-subtle">
                {project.sourceType === 'GITHUB' ? (
                  <GitBranch size={18} strokeWidth={1.5} />
                ) : (
                  <Archive size={18} strokeWidth={1.5} />
                )}
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-heading tracking-tight truncate">{project.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[12px] text-body-subtle font-mono">{project.sourceType}</span>
                  {project.sourceUrl && (
                    <>
                      <span className="text-border-default-strong text-[11px] select-none">·</span>
                      <a
                        href={project.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[12px] text-fg-brand hover:underline truncate max-w-[300px]"
                      >
                        {project.sourceUrl}
                      </a>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <StatusBadge status={project.status} />

              {canAnalyze && (
                <button
                  onClick={handleAnalyze}
                  disabled={analyzeMutation.isPending}
                  className="btn btn-brand"
                  id="btn-analyze-project"
                >
                  {analyzeMutation.isPending ? (
                    <>
                      <Loader2 size={14} strokeWidth={2} className="animate-spin" />
                      Đang phân tích…
                    </>
                  ) : (
                    <>
                      <Scan size={14} strokeWidth={2} />
                      {project.status === 'ANALYZED' ? 'Phân tích lại' : 'Phân tích source code'}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Error message */}
          {analyzeMutation.isError && (
            <div className="mt-4 p-3 bg-danger-soft border border-border-danger-subtle rounded-default animate-fade-in">
              <p className="text-sm text-fg-danger-strong">
                {getErrorMessage(analyzeMutation.error)}
              </p>
            </div>
          )}
        </div>
      </header>

      {/* Analysis Results */}
      {analyzeMutation.isPending && (
        <div className="animate-fade-in">
          <div className="flex items-center gap-3 p-6 bg-neutral-primary-soft border border-border-default rounded-base shadow-xs">
            <Loader2 size={18} strokeWidth={2} className="animate-spin text-fg-brand" />
            <div>
              <p className="text-sm font-semibold text-heading">Đang phân tích source code…</p>
              <p className="text-xs text-body-subtle mt-0.5">JavaParser đang quét các file .java trong project</p>
            </div>
          </div>
        </div>
      )}

      {analyzeMutation.isSuccess && analyzeMutation.data && (
        <AnalysisResult data={analyzeMutation.data} />
      )}

      {!analyzeMutation.isSuccess && hasAnalysis && !analysisLoading && analysis && (
        <AnalysisResult data={analysis} />
      )}

      {!analyzeMutation.isSuccess && hasAnalysis && analysisLoading && (
        <SkeletonLoader count={4} />
      )}

      {!analyzeMutation.isSuccess && hasAnalysis && analysisError && (
        <div className="p-4 bg-danger-soft border border-border-danger-subtle rounded-base animate-fade-in">
          <p className="text-sm font-semibold text-fg-danger-strong">
            Không thể tải kết quả phân tích
          </p>
          <p className="text-xs text-fg-danger-strong mt-1">
            {getErrorMessage(analysisError)}
          </p>
        </div>
      )}
    </PageShell>
  );
}

/** Layout shell tái sử dụng nav + footer từ ProjectsPage */
function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh]">
      {/* Subtle purple ambient glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-[30%] left-[15%] h-[600px] w-[600px] rounded-full bg-brand/[0.03] blur-[120px]" />
        <div className="absolute -bottom-[20%] right-[10%] h-[500px] w-[500px] rounded-full bg-brand/[0.02] blur-[100px]" />
      </div>

      {/* Navigation */}
      <nav className="sticky top-0 z-40 border-b border-border-default-subtle bg-neutral-primary-soft/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link to="/projects" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-softer text-fg-brand-strong shrink-0">
              <Beaker size={16} strokeWidth={2} />
            </div>
            <span className="text-sm font-semibold tracking-tight text-heading">
              GreyTest
            </span>
          </Link>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-softer border border-border-brand-subtle px-2.5 py-1 text-[11px] font-medium text-fg-brand-strong">
              <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />
              AI QA Agent
            </span>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="relative mx-auto max-w-5xl px-6 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border-default-subtle mt-16 bg-neutral-secondary-soft">
        <div className="mx-auto max-w-5xl px-6 py-6 flex items-center justify-between">
          <p className="text-[11px] text-body-subtle">
            GreyTest &middot; Đồ án tốt nghiệp KTPM
          </p>
          <p className="text-[11px] text-body-subtle font-mono">
            Grey-box AI QA System
          </p>
        </div>
      </footer>
    </div>
  );
}

export default ProjectDetailPage;
