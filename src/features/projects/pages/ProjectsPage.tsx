import { useState } from 'react';
import { Search, Filter, ChevronDown, X } from 'lucide-react';
import { ProjectList } from '../components/ProjectList';
import { ProjectUploadForm } from '../components/ProjectUploadForm';
import { AppShell } from '../../../shared/components/AppShell';
import { useLanguage } from '../../../shared/i18n/language';
import { useProjects } from '../hooks/useProjects';

export function ProjectsPage() {
  const { t } = useLanguage();
  const { data: projects } = useProjects();
  const hasProjects = Boolean(projects && projects.length > 0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  return (
    <AppShell maxWidth="wide">
      {/* 1. Giao diện Thêm dự án mới nằm trực tiếp ở đầu trang */}
      <section className="mb-8 animate-fade-in" id="section-upload">
        <div className="mb-4">
          <h2 className="text-base font-bold text-heading sm:text-lg">
            {t('Thêm dự án mới', 'Add new project')}
          </h2>
          <p className="text-xs text-body-subtle mt-0.5">
            {t('Tải lên file ZIP hoặc clone từ GitHub public để phân tích và sinh test', 'Upload ZIP file or clone from public GitHub to analyze and generate tests')}
          </p>
        </div>

        <ProjectUploadForm />
      </section>

      {/* 2. Giao diện Danh sách dự án nằm phía dưới */}
      <section className="animate-fade-in" id="section-projects">
        <div className="mb-4 flex flex-col gap-4">
          {/* Header row: Tiêu đề + số lượng */}
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-heading sm:text-xl">
              {t('Danh sách dự án', 'Projects')}
            </h1>
            {hasProjects && (
              <span className="rounded-full bg-brand-softer px-2.5 py-0.5 text-xs font-semibold text-fg-brand-strong border border-border-brand-subtle">
                {projects?.length}
              </span>
            )}
          </div>

          {/* Thanh công cụ tìm kiếm và lọc trạng thái dự án */}
          {hasProjects && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Ô tìm kiếm theo tên dự án */}
              <div className="relative flex-1 min-w-0">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-body-subtle pointer-events-none" />
                <input
                  type="text"
                  data-testid="project-search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('Tìm kiếm theo tên dự án...', 'Search by project name...')}
                  className="w-full rounded-lg border border-border-default bg-neutral-primary-soft pl-9 pr-8 py-2 text-xs text-body placeholder:text-body-subtle/70 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-body-subtle hover:text-heading transition-colors"
                    title={t('Xóa tìm kiếm', 'Clear search')}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Bộ lọc trạng thái cố định kích thước sm:w-64 không bị co giãn khi đổi trạng thái */}
              <div className="relative w-full sm:w-64 sm:shrink-0">
                <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-body-subtle pointer-events-none" />
                <select
                  data-testid="project-status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-border-default bg-neutral-primary-soft pl-8 pr-8 py-2 text-xs text-body focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand transition-colors cursor-pointer"
                >
                  <option value="ALL">{t('Tất cả trạng thái', 'All statuses')}</option>
                  <option value="UPLOADED">{t('Đã tải lên', 'Uploaded')}</option>
                  <option value="ANALYZED">{t('Đã phân tích', 'Analyzed')}</option>
                  <option value="BR_PENDING_REVIEW">{t('BR chờ duyệt', 'BR pending review')}</option>
                  <option value="BR_APPROVED">{t('BR đã duyệt', 'BR approved')}</option>
                  <option value="PLAN_PENDING_REVIEW">{t('Kế hoạch chờ duyệt', 'Plan pending review')}</option>
                  <option value="PLAN_APPROVED">{t('Kế hoạch đã duyệt', 'Plan approved')}</option>
                  <option value="CASE_PENDING_REVIEW">{t('Ca kiểm thử chờ duyệt', 'Case pending review')}</option>
                  <option value="CASE_APPROVED">{t('Ca kiểm thử đã duyệt', 'Case approved')}</option>
                  <option value="TEST_GENERATED">{t('Đã sinh test', 'Tests generated')}</option>
                  <option value="COVERAGE_ANALYZED">{t('Đã phân tích coverage', 'Coverage analyzed')}</option>
                  <option value="COMPLETED">{t('Hoàn thành', 'Completed')}</option>
                  <option value="FAILED">{t('Thất bại', 'Failed')}</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-body-subtle pointer-events-none" />
              </div>

              {/* Nút đặt lại bộ lọc set cứng cố định luôn hiển thị kể cả ở Tất cả trạng thái */}
              <button
                type="button"
                data-testid="reset-filter-btn"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('ALL');
                }}
                className="btn btn-secondary px-3 py-2 text-xs text-body-subtle hover:text-heading whitespace-nowrap shrink-0"
              >
                {t('Đặt lại bộ lọc', 'Reset filters')}
              </button>
            </div>
          )}
        </div>

        <ProjectList
          searchQuery={searchQuery}
          statusFilter={statusFilter}
          onResetFilters={() => {
            setSearchQuery('');
            setStatusFilter('ALL');
          }}
        />
      </section>
    </AppShell>
  );
}

export default ProjectsPage;
