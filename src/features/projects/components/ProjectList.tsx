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

  if (isLoading) return <SkeletonLoader count={3} />;

  if (error) {
    return (
      <div className="bg-neutral-primary-soft border border-border-default rounded-base shadow-xs p-8 flex flex-col items-center justify-center text-center animate-fade-in">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-danger-soft text-fg-danger-strong mb-4 shrink-0">
          <FolderOpen size={20} strokeWidth={2} />
        </div>
        <p className="text-sm font-semibold text-fg-danger-strong mb-1">{getErrorMessage(error)}</p>
        <p className="text-xs text-body-subtle">Không thể tải danh sách project</p>
      </div>
    );
  }

  if (!projects?.length) {
    return (
      <div className="bg-neutral-primary-soft border border-border-default rounded-base shadow-xs p-12 flex flex-col items-center justify-center text-center animate-fade-in">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-secondary-medium text-body-subtle mb-4 shrink-0">
          <FolderOpen size={24} strokeWidth={1.5} />
        </div>
        <p className="text-sm font-semibold text-heading mb-1.5">Chưa có project nào</p>
        <p className="text-xs text-body-subtle max-w-[280px] leading-relaxed">
          Upload file ZIP hoặc clone từ GitHub để bắt đầu phân tích tự động.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {projects.map((p, i) => (
        <div
          key={p.id}
          className="bg-neutral-primary-soft border border-border-default rounded-base shadow-xs px-5 py-4 transition-all duration-200 hover:border-border-default-strong hover:shadow-sm flex items-center justify-between gap-4 animate-fade-in-up"
          style={{ animationDelay: `${i * 0.06}s` }}
        >
          {/* Left: Project info */}
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-secondary-medium text-body-subtle">
              {p.sourceType === 'GITHUB' ? (
                <GitBranch size={16} strokeWidth={1.5} />
              ) : (
                <Archive size={16} strokeWidth={1.5} />
              )}
            </div>

            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-heading truncate">{p.name}</h4>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] text-body-subtle font-mono">{p.sourceType}</span>
                <span className="text-border-default-strong text-[11px] select-none">·</span>
                <span className="text-[11px] text-body-subtle">{timeAgo(p.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Right: Status + actions */}
          <div className="flex items-center gap-3 shrink-0">
            <StatusBadge status={p.status} />
            <button
              onClick={() => remove.mutate(p.id)}
              disabled={remove.isPending}
              className="btn-ghost-danger"
              title="Xóa project"
              id={`btn-delete-project-${p.id}`}
            >
              <Trash2 size={14} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
