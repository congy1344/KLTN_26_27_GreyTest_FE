import { Beaker } from 'lucide-react';
import { ProjectList } from '../components/ProjectList';
import { ProjectUploadForm } from '../components/ProjectUploadForm';
import { AppShell } from '../../../shared/components/AppShell';
import { useLanguage } from '../../../shared/i18n/language';

export function ProjectsPage() {
  const { t } = useLanguage();
  return (
    <AppShell>
      <header className="mb-8 animate-fade-in-up">
        <div className="inline-flex items-center gap-2 rounded-full border border-border-default bg-neutral-primary-soft px-3 py-1.5 text-[12px] font-semibold text-heading shadow-xs">
          <Beaker size={14} strokeWidth={1.8} className="text-fg-brand" />
          {t('Hệ thống sinh test tự động', 'Automated test generation system')}
        </div>
        <div className="mt-4 max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight text-heading md:text-5xl">
            {t('Quản lý project kiểm thử', 'Test project management')}
          </h1>
          <p className="mt-3 text-base leading-relaxed text-body">
            {t(
              'Nhập source code Java Spring Boot để GreyTest phân tích cấu trúc, tách production analysis với existing tests và chuẩn bị dữ liệu cho pipeline AI.',
              'Import Java Spring Boot source code so GreyTest can analyze its structure, separate production analysis from existing tests, and prepare data for the AI pipeline.',
            )}
          </p>
        </div>
      </header>

      <section className="mb-8 animate-fade-in-up delay-1" id="section-upload">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-heading">{t('Thêm project', 'Add project')}</h2>
          <span className="text-xs text-body-subtle">{t('ZIP hoặc GitHub public', 'ZIP or public GitHub repository')}</span>
        </div>
        <ProjectUploadForm />
      </section>

      <section className="animate-fade-in-up delay-2" id="section-projects">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-heading">{t('Danh sách project', 'Projects')}</h2>
          <span className="text-xs text-body-subtle">{t('Click vào project để xem analysis', 'Select a project to view its analysis')}</span>
        </div>
        <ProjectList />
      </section>
    </AppShell>
  );
}

export default ProjectsPage;
