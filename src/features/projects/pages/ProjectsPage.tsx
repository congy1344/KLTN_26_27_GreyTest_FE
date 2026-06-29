import { Beaker } from 'lucide-react';
import { ProjectList } from '../components/ProjectList';
import { ProjectUploadForm } from '../components/ProjectUploadForm';
import { AppShell } from '../../../shared/components/AppShell';

export function ProjectsPage() {
  return (
    <AppShell>
      <header className="mb-8 animate-fade-in-up">
        <div className="inline-flex items-center gap-2 rounded-full border border-border-default bg-neutral-primary-soft px-3 py-1.5 text-[12px] font-semibold text-heading shadow-xs">
          <Beaker size={14} strokeWidth={1.8} className="text-fg-brand" />
          Hệ thống sinh test tự động
        </div>
        <div className="mt-4 max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight text-heading md:text-5xl">
            Quản lý project kiểm thử
          </h1>
          <p className="mt-3 text-base leading-relaxed text-body">
            Nhap source code Java Spring Boot de GreyTest phan tich cau truc,
            tach production analysis voi existing tests va chuan bi du lieu cho pipeline AI.
          </p>
        </div>
      </header>

      <section className="mb-8 animate-fade-in-up delay-1" id="section-upload">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-heading">Thêm project</h2>
          <span className="text-xs text-body-subtle">ZIP hoặc GitHub public</span>
        </div>
        <ProjectUploadForm />
      </section>

      <section className="animate-fade-in-up delay-2" id="section-projects">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-heading">Danh sách project</h2>
          <span className="text-xs text-body-subtle">Click vào project để xem analysis</span>
        </div>
        <ProjectList />
      </section>
    </AppShell>
  );
}

export default ProjectsPage;
