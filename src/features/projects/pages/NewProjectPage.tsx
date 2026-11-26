import { ArrowLeft } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { AppShell } from '../../../shared/components/AppShell';
import { useLanguage } from '../../../shared/i18n/language';
import { ProjectUploadForm } from '../components/ProjectUploadForm';

export function NewProjectPage() {
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const source = searchParams.get('source');
  return (
    <AppShell maxWidth="wide">
      <Link to="/projects" className="btn btn-ghost h-9 py-0 mb-6">
        <ArrowLeft size={16} aria-hidden="true" />
        {t('Quay lại danh sách dự án', 'Back to projects')}
      </Link>
      <section id="section-upload">
        <header className="mb-6">
          <h1 className="font-semibold text-heading text-[28px] font-display">{t('Dự án mới', 'New project')}</h1>
          <p className="mt-2 text-sm text-body">{t('Tải lên file ZIP hoặc dán link GitHub public để bắt đầu.', 'Upload a ZIP file or paste a public GitHub URL to begin.')}</p>
        </header>
        <ProjectUploadForm source={source === 'zip' || source === 'github' ? source : undefined} />
      </section>
    </AppShell>
  );
}
