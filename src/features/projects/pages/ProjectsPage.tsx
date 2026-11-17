import { Link, useSearchParams } from 'react-router-dom';
import { Search, X, Upload, GitBranch } from 'lucide-react';
import { IconButton } from '../../../shared/components/IconButton';
import { ProjectList } from '../components/ProjectList';
import { AppShell } from '../../../shared/components/AppShell';
import { useLanguage } from '../../../shared/i18n/language';
import { useProjects } from '../hooks/useProjects';
import { StatusFilter } from '../components/StatusFilter';
import { STATUS_CONFIG } from '../components/StatusBadge';
import type { ProjectStatus } from '../types';

export function ProjectsPage() {
  const { t } = useLanguage();
  const { data: projects } = useProjects();
  const hasProjects = Boolean(projects && projects.length > 0);
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') ?? '';
  const statusParam = searchParams.get('status') ?? 'ALL';
  const statusFilter = Object.prototype.hasOwnProperty.call(STATUS_CONFIG, statusParam) ? statusParam as ProjectStatus : 'ALL';
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const searchedProjects = (projects ?? []).filter((project) =>
    !normalizedQuery || project.name.toLowerCase().includes(normalizedQuery),
  );
  const statusCounts: Partial<Record<ProjectStatus, number>> = {};
  for (const project of searchedProjects) {
    statusCounts[project.status] = (statusCounts[project.status] ?? 0) + 1;
  }
  const resultCount = statusFilter === 'ALL' ? searchedProjects.length : statusCounts[statusFilter] ?? 0;
  const hasFilters = Boolean(searchQuery || statusFilter !== 'ALL');

  function updateFilter(key: 'q' | 'status', value: string) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (!value || value === 'ALL') next.delete(key);
      else next.set(key, value);
      return next;
    }, { replace: true });
  }

  function resetFilters() {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete('q');
      next.delete('status');
      return next;
    }, { replace: true });
  }

  return (
    <AppShell maxWidth="bleed">
      <section className="animate-fade-in" id="section-projects">
        <div className="projects-band">
          <svg viewBox="0 0 480 300" fill="none" aria-hidden="true" className="projects-band-mark">
            <path d="M370 50A140 140 0 1 0 410 150H300" style={{ stroke: 'var(--band-mark)' }} strokeWidth="22" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="370" cy="50" r="22" style={{ fill: 'var(--accent)' }} />
            <circle cx="130" cy="150" r="22" style={{ fill: 'var(--band-dot)' }} />
            <circle cx="300" cy="150" r="22" style={{ fill: 'var(--on-band)' }} />
          </svg>
          <div className="relative mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-8 px-4 py-12 sm:px-8 sm:pb-14">
            <div className="max-w-[600px]">
              <h1 className="font-display text-[40px] font-bold leading-tight sm:text-[44px]">{t('Dự án của bạn', 'Your projects')}</h1>
              <p className="mt-3 max-w-[520px] text-base text-band-muted">{t('Tải một dự án Java Spring Boot lên để GreyTest đọc mã nguồn, rút Business Rule và sinh test theo từng nhánh.', 'Upload a Java Spring Boot project for GreyTest to read its source, extract Business Rules, and generate tests for each branch.')}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/projects/new?source=zip" className="btn btn-brand min-h-[46px] px-5"><Upload size={16} aria-hidden="true" />{t('Tải file ZIP', 'Upload ZIP')}</Link>
              <Link to="/projects/new?source=github" className="btn btn-band min-h-[46px] px-5"><GitBranch size={16} aria-hidden="true" />{t('Clone từ GitHub', 'Clone from GitHub')}</Link>
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-4 py-7 sm:px-8 sm:pb-14">

        {hasProjects && (
          <div className="mb-6 flex flex-wrap items-center gap-3 rounded-base border border-border-default bg-neutral-primary-soft p-3">
            <div className="relative min-w-[200px] flex-[1_1_260px]">
              <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-3 text-body-subtle" />
              <input type="text" data-testid="project-search-input" value={searchQuery}
                onChange={(event) => updateFilter('q', event.target.value)}
                aria-label={t('Tìm theo tên dự án', 'Search by project name')}
                placeholder={t('Tìm theo tên dự án', 'Search by project name')}
                className="h-10 w-full rounded-control border border-border-default bg-neutral-primary-soft pl-9 pr-12 text-sm text-heading placeholder:text-body-subtle transition-colors hover:border-border-default-strong" />
              {searchQuery && <span className="absolute inset-y-0 right-1 flex items-center">
                <IconButton icon={X} size="sm" label={t('Xóa tìm kiếm', 'Clear search')} onClick={() => updateFilter('q', '')} />
              </span>}
            </div>
            <StatusFilter value={statusFilter} onChange={(value) => updateFilter('status', value)}
              counts={statusCounts} total={searchedProjects.length} />
            {hasFilters && <button type="button" data-testid="reset-filter-btn" onClick={resetFilters}
              className="btn btn-ghost h-10 shrink-0 px-3 text-sm">
              {t('Đặt lại bộ lọc', 'Reset filters')}
            </button>}
            <p role="status" className="ml-auto whitespace-nowrap text-sm text-body-subtle">{t(`${resultCount} dự án`, `${resultCount} projects`)}</p>
          </div>
        )}



        <ProjectList
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          onResetFilters={resetFilters}
        />
        </div>
      </section>
    </AppShell>
  );
}

export default ProjectsPage;
