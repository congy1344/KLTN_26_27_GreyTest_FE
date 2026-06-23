import { useNavigate } from 'react-router-dom';
import { Trash2, GitBranch, Archive, FolderOpen } from 'lucide-react';
import { getErrorMessage } from '../../../shared/api/api-client';
import { useDeleteProject, useProjects } from '../hooks/useProjects';
import { StatusBadge } from './StatusBadge';
import { SkeletonLoader } from '../../../shared/components/SkeletonLoader';

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'vừa xong';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ngày trước`;
  const months = Math.floor(days / 30);
  return `${months} tháng trước`;
}

export function ProjectList() {
  const { data: projects, isLoading, error } = useProjects();
  const remove = useDeleteProject();
  const navigate = useNavigate();
  const sortedProjects = [...(projects ?? [])].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );

  if (isLoading) return <SkeletonLoader count={3} />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-base border border-border-default bg-neutral-primary-soft p-8 text-center shadow-sm animate-fade-in">
        <div className="mb-4 flex h-12 w-12 shrink-0 items-center justify-center rounded-default bg-danger-soft text-fg-danger-strong">
          <FolderOpen size={20} strokeWidth={1.8} />
        </div>
        <p className="mb-1 text-sm font-semibold text-fg-danger-strong">{getErrorMessage(error)}</p>
        <p className="text-xs text-body-subtle">Không thể tải danh sách project</p>
      </div>
    );
  }

  if (!sortedProjects.length) {
    return (
      <div className="flex flex-col items-center justify-center rounded-base border border-border-default bg-neutral-primary-soft p-12 text-center shadow-sm animate-fade-in">
        <div className="mb-4 flex h-14 w-14 shrink-0 items-center justify-center rounded-default bg-neutral-secondary-medium text-body-subtle">
          <FolderOpen size={24} strokeWidth={1.6} />
        </div>
        <p className="mb-1.5 text-sm font-semibold text-heading">Chưa có project nào</p>
        <p className="max-w-[280px] text-xs leading-relaxed text-body-subtle">
          Upload file ZIP hoặc clone từ GitHub để bắt đầu phân tích tự động.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sortedProjects.map((p, i) => {
        const isGithub = p.sourceType === 'GITHUB';
        return (
        <div
          key={p.id}
          onClick={() => navigate(`/projects/${p.id}`)}
          className={`flex cursor-pointer items-center justify-between gap-4 rounded-base border bg-neutral-primary-soft px-5 py-4 shadow-sm transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:border-border-default-strong hover:shadow-md animate-fade-in-up ${
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
                <span className="text-[11px] text-body-subtle">{timeAgo(p.createdAt)}</span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <StatusBadge status={p.status} />
            <button
              onClick={(e) => { e.stopPropagation(); remove.mutate(p.id); }}
              disabled={remove.isPending}
              className="btn-ghost-danger"
              title="Xóa project"
              id={`btn-delete-project-${p.id}`}
            >
              <Trash2 size={14} strokeWidth={1.6} />
            </button>
          </div>
        </div>
        );
      })}
    </div>
  );
}
