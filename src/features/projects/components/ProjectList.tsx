import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, GitBranch, Archive, FolderOpen, Scan, Loader2 } from 'lucide-react';
import { useAnalyzeProject, useDeleteProject, useProjects } from '../hooks/useProjects';
import { StatusBadge } from './StatusBadge';
import { SkeletonLoader } from '../../../shared/components/SkeletonLoader';
import { EmptyState } from '../../../shared/components/EmptyState';
import { ErrorState } from '../../../shared/components/ErrorState';
import { useLanguage, type Language } from '../../../shared/i18n/language';
import { ConfirmDialog } from '../../../shared/components/ConfirmDialog';
import { InlineAlert } from '../../../shared/components/InlineAlert';
import { getErrorMessage } from '../../../shared/api/api-client';
import { parseApiDate } from '../../../shared/utils/date-time';
import type { Project } from '../types';
import { getProjectResumePath } from '../utils/project-workflow';

function timeAgo(dateStr: string, language: Language): string {
  const now = new Date();
  const date = parseApiDate(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  const relative = new Intl.RelativeTimeFormat(language, { numeric: 'auto' });
  if (seconds < 60) return relative.format(-seconds, 'second');
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return relative.format(-minutes, 'minute');
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return relative.format(-hours, 'hour');
  const days = Math.floor(hours / 24);
  if (days < 30) return relative.format(-days, 'day');
  const months = Math.floor(days / 30);
  return relative.format(-months, 'month');
}

export function ProjectList() {
  const { data: projects, isLoading, error } = useProjects();
  const remove = useDeleteProject();
  const analyze = useAnalyzeProject();
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const sortedProjects = [...(projects ?? [])].sort(
    (left, right) => parseApiDate(right.createdAt).getTime() - parseApiDate(left.createdAt).getTime(),
  );

  if (isLoading) return <SkeletonLoader count={3} />;

  if (error) {
    return <ErrorState error={error} />;
  }

  if (!sortedProjects.length) {
    return (
      <div className="rounded-base border border-border-default bg-neutral-primary-soft shadow-sm">
        <EmptyState
          icon={FolderOpen}
          title={t('Chưa có project nào', 'No projects yet')}
          hint={t('Upload file ZIP hoặc clone từ GitHub, sau đó bấm Phân tích.', 'Upload a ZIP file or clone from GitHub, then select Analyze.')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {remove.error && <InlineAlert tone="danger">{getErrorMessage(remove.error)}</InlineAlert>}
      {sortedProjects.map((p, i) => {
        const isGithub = p.sourceType === 'GITHUB';
        return (
        <div
          key={p.id}
          role="button"
          tabIndex={0}
          onClick={() => navigate(getProjectResumePath(p.id, p.status))}
          onKeyDown={(e) => {
            if (e.target !== e.currentTarget) return;
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              navigate(getProjectResumePath(p.id, p.status));
            }
          }}
          className={`flex cursor-pointer items-center justify-between gap-4 rounded-base border bg-neutral-primary-soft px-5 py-4 shadow-sm transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:border-border-default-strong hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand animate-fade-in-up ${
            isGithub ? 'border-border-brand-subtle' : 'border-border-default'
          }`}
          style={{ animationDelay: `${i * 0.06}s` }}
        >
          <div className="flex min-w-0 flex-1 items-center gap-3.5">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-default ${
              isGithub ? 'bg-brand-softer text-fg-brand-strong' : 'bg-neutral-secondary-medium text-body-subtle'
            }`}>
              {isGithub ? (
                <GitBranch size={16} strokeWidth={1.7} />
              ) : (
                <Archive size={16} strokeWidth={1.7} />
              )}
            </div>

            <div className="min-w-0">
              <h4 className="truncate text-sm font-semibold text-heading">{p.name}</h4>
              <div className="mt-1 flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  isGithub ? 'bg-brand-softer text-fg-brand-strong' : 'bg-neutral-secondary-medium text-body'
                }`}>
                  {isGithub ? 'GitHub' : 'ZIP'}
                </span>
                <span className="h-1 w-1 rounded-full bg-neutral-quaternary" />
                <span className="text-[11px] text-body-subtle">{timeAgo(p.createdAt, language)}</span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <StatusBadge status={p.status} />
            {p.status === 'UPLOADED' && p.sourceAvailable && (
              <button
                onClick={(e) => { e.stopPropagation(); analyze.mutate(p.id); }}
                disabled={analyze.isPending}
                className="btn btn-secondary"
                title={t('Phân tích project', 'Analyze project')}
                id={`btn-analyze-project-${p.id}`}
              >
                {analyze.isPending && analyze.variables === p.id
                  ? <Loader2 size={14} className="animate-spin" />
                  : <Scan size={14} />}
                <span className="hidden sm:inline">{t('Phân tích', 'Analyze')}</span>
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setProjectToDelete(p);
              }}
              disabled={remove.isPending}
              className="btn-ghost-danger"
              title={t('Xóa project', 'Delete project')}
              id={`btn-delete-project-${p.id}`}
            >
              <Trash2 size={14} strokeWidth={1.6} />
            </button>
          </div>
        </div>
        );
      })}
      <ConfirmDialog
        open={projectToDelete != null}
        title={t('Xóa project?', 'Delete project?')}
        description={projectToDelete
          ? t(
              `Project “${projectToDelete.name}” và toàn bộ kết quả phân tích sẽ bị xóa. Thao tác này không thể hoàn tác.`,
              `Project “${projectToDelete.name}” and all analysis results will be deleted. This action cannot be undone.`,
            )
          : ''}
        confirmLabel={t('Xóa project', 'Delete project')}
        cancelLabel={t('Hủy', 'Cancel')}
        pending={remove.isPending}
        onCancel={() => setProjectToDelete(null)}
        onConfirm={() => {
          if (!projectToDelete) return;
          const projectId = projectToDelete.id;
          setProjectToDelete(null);
          remove.mutate(projectId);
        }}
      />
    </div>
  );
}
