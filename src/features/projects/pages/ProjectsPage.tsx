import { Beaker } from 'lucide-react';
import { ProjectList } from '../components/ProjectList';
import { ProjectUploadForm } from '../components/ProjectUploadForm';

export function ProjectsPage() {
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
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-softer text-fg-brand-strong shrink-0">
              <Beaker size={16} strokeWidth={2} />
            </div>
            <span className="text-sm font-semibold tracking-tight text-heading">
              GreyTest
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-softer border border-border-brand-subtle px-2.5 py-1 text-[11px] font-medium text-fg-brand-strong">
              <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />
              AI QA Agent
            </span>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="relative mx-auto max-w-5xl px-6 py-12">
        {/* Header (Section Header Pattern) */}
        <header className="mb-10 animate-fade-in-up">
          <span className="section-label mb-2">
            <Beaker size={14} className="text-fg-brand" />
            Hệ thống sinh test tự động
          </span>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-heading mb-3">
            Projects
          </h1>
          <p className="text-base text-body leading-relaxed max-w-2xl">
            Nhập source code Java Spring Boot để AI phân tích và tự động sinh Test Plan,
            Test Case, Unit Test hỗ trợ kiểm thử hộp xám.
          </p>
        </header>

        {/* Upload Section */}
        <section className="mb-10 animate-fade-in-up delay-1" id="section-upload">
          <h2 className="text-xs font-semibold text-body-subtle uppercase tracking-widest mb-4">
            Thêm project
          </h2>
          <ProjectUploadForm />
        </section>

        {/* Projects List Section */}
        <section className="animate-fade-in-up delay-2" id="section-projects">
          <h2 className="text-xs font-semibold text-body-subtle uppercase tracking-widest mb-4">
            Danh sách project
          </h2>
          <ProjectList />
        </section>
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
export default ProjectsPage;
