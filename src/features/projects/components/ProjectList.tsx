import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Trash2, GitBranch, Archive, FolderOpen, Scan, Loader2, Clock } from 'lucide-react';
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

function formatDateTime(dateStr: string, language: Language): string {
  try {
    const date = parseApiDate(dateStr);
    const datePart = date.toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const timePart = date.toLocaleTimeString(language === 'vi' ? 'vi-VN' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return `${timePart} ${datePart}`;
  } catch {
    return dateStr;
  }
}

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

export interface ProjectListProps {
  searchQuery?: string;
  statusFilter?: string;
  onResetFilters?: () => void;
  onOpenUploadModal?: () => void;
}

export function ProjectList({
  searchQuery = '',
  statusFilter = 'ALL',
  onResetFilters,
}: ProjectListProps = {}) {
  const { data: projects, isLoading, error, refetch } = useProjects();
  const remove = useDeleteProject();
  const analyze = useAnalyzeProject();
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  // Trạng thái thu gọn từng nhóm chỉ là tiện ích của người xem, lưu trong trình duyệt.
  const [collapsed, setCollapsed] = useState<Record<'ZIP' | 'GITHUB', boolean>>(() => {
    try {
      return { ZIP: false, GITHUB: false, ...JSON.parse(localStorage.getItem('greytest.projectGroups') ?? '{}') };
    } catch {
      return { ZIP: false, GITHUB: false };
    }
  });
  const toggleGroup = (source: 'ZIP' | 'GITHUB') => setCollapsed((current) => {
    const next = { ...current, [source]: !current[source] };
    try { localStorage.setItem('greytest.projectGroups', JSON.stringify(next)); } catch { /* trình duyệt chặn lưu trữ thì chỉ giữ trong phiên */ }
    return next;
  });
  const sortedProjects = [...(projects ?? [])].sort(
    (left, right) => parseApiDate(right.createdAt).getTime() - parseApiDate(left.createdAt).getTime(),
  );

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredProjects = sortedProjects.filter((p) => {
    const matchesSearch = !normalizedQuery || p.name.toLowerCase().includes(normalizedQuery);
    const matchesStatus = !statusFilter || statusFilter === 'ALL' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (isLoading) return <SkeletonLoader count={3} />;

  if (error) {
    return <ErrorState error={error} title={t('Không tải được danh sách dự án', 'Unable to load projects')} onRetry={() => refetch()} />;
  }

  if (!sortedProjects.length) {
    return (
      <div className="rounded-base border border-border-default bg-neutral-primary-soft min-h-[360px] flex flex-col items-center justify-center">
        <EmptyState
          icon={FolderOpen}
          title={t('Chưa có dự án nào', 'No projects yet')}
          hint={t('Dự án và kết quả kiểm thử sẽ xuất hiện ở đây. Tạo dự án để tải source lên.', 'Your projects and test results will appear here. Create a project to upload source code.')}
        />
      </div>
    );
  }

  if (!filteredProjects.length) {
    return (
      <div className="rounded-base border border-border-default bg-neutral-primary-soft p-8 text-center min-h-[360px] flex flex-col items-center justify-center">
        <p className="text-sm font-semibold text-heading">
          {t('Không tìm thấy dự án nào', 'No matching projects found')}
        </p>
        <p className="mt-1 text-xs text-body-subtle">
          {t('Không có dự án nào khớp với từ khóa tìm kiếm hoặc trạng thái đã chọn.', 'No projects match your current search query or status filter.')}
        </p>
        {onResetFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="btn btn-secondary mt-4 px-3.5 py-1.5 text-xs font-semibold"
          >
            {t('Xóa bộ lọc', 'Clear filters')}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 min-h-[360px]">
      {remove.error && <InlineAlert tone="danger">{getErrorMessage(remove.error)}</InlineAlert>}
      {(['ZIP', 'GITHUB'] as const).map((source) => {
        const group = filteredProjects.filter((p) => p.sourceType === source);
        if (!group.length) return null;
        const isCollapsed = collapsed[source];
        const groupId = `project-group-${source.toLowerCase()}`;
        return <section key={source} className="space-y-3">
          <h2 className="pt-3 text-base font-semibold text-heading">
            <button
              type="button"
              aria-expanded={!isCollapsed}
              aria-controls={groupId}
              onClick={() => toggleGroup(source)}
              className="flex min-h-[44px] items-center gap-2 rounded-control pr-2 text-left hover:text-fg-brand-strong"
            >
              <ChevronDown size={16} aria-hidden="true" className={`shrink-0 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`} />
              {source === 'ZIP' ? t('Tải lên từ file ZIP', 'Uploaded from ZIP') : t('Clone từ GitHub', 'Cloned from GitHub')}{' '}
              <span className="font-mono text-sm font-normal text-body-subtle">{group.length}</span>
            </button>
          </h2>
          <div className="collapsible" data-collapsed={isCollapsed}>
          {/* inert khi thu gọn: không bấm, không tab tới được nhưng vẫn chạy được hiệu ứng thu gọn. */}
          <div id={groupId} {...(isCollapsed ? { inert: '', 'aria-hidden': true } : {})} className="overflow-hidden rounded-base border border-border-default bg-neutral-primary-soft divide-y divide-border-default">
          {group.map((p) => {
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
              className="flex cursor-pointer flex-wrap items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-neutral-secondary-soft"
            >
              <div className="flex min-w-0 basis-full items-center gap-3.5 sm:basis-0 sm:flex-1">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-control ${
                  isGithub ? 'bg-neutral-secondary-soft text-body-subtle' : 'bg-neutral-secondary-medium text-body-subtle'
                }`}>
                  {isGithub ? (
                    <GitBranch size={16} strokeWidth={1.7} />
                  ) : (
                    <Archive size={16} strokeWidth={1.7} />
                  )}
                </div>

                <div className="min-w-0">
                  <h3 className="truncate font-mono text-sm font-medium text-heading">{p.name}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-xs text-body-subtle">
                      <Clock size={11} className="text-body-subtle shrink-0" />
                      <span>{formatDateTime(p.createdAt, language)}</span>
                      <span className="text-body-subtle">({timeAgo(p.createdAt, language)})</span>
                    </span>
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
                    title={t('Phân tích dự án', 'Analyze project')}
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
                  title={t('Xóa dự án', 'Delete project')}
                  id={`btn-delete-project-${p.id}`}
                >
                  <Trash2 size={14} strokeWidth={1.6} />
                </button>
              </div>
            </div>
            );
          })}
          </div>
          </div>
        </section>;
      })}
      <ConfirmDialog
        open={projectToDelete != null}
        title={t('Xóa dự án?', 'Delete project?')}
        description={projectToDelete
          ? t(
              `Dự án “${projectToDelete.name}” và toàn bộ kết quả phân tích sẽ bị xóa. Thao tác này không thể hoàn tác.`,
              `Project “${projectToDelete.name}” and all analysis results will be deleted. This action cannot be undone.`,
            )
          : ''}
        confirmLabel={t('Xóa dự án', 'Delete project')}
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
