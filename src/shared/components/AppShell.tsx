import { Beaker, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AppShellProps {
  children: React.ReactNode;
  maxWidth?: 'default' | 'wide';
}

export function AppShell({ children, maxWidth = 'default' }: AppShellProps) {
  const widthClass = maxWidth === 'wide' ? 'max-w-6xl' : 'max-w-5xl';

  return (
    <div className="min-h-[100dvh] text-body">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-px w-[82vw] -translate-x-1/2 bg-gradient-to-r from-transparent via-border-brand-subtle to-transparent" />
        <div className="absolute right-[8%] top-[-18rem] h-[34rem] w-[34rem] rounded-full bg-brand/[0.08] blur-[110px]" />
      </div>

      <nav className="sticky top-0 z-40 border-b border-border-default-subtle bg-neutral-primary-soft/88 backdrop-blur-xl">
        <div className={`mx-auto flex h-16 ${widthClass} items-center justify-between px-4 sm:px-6`}>
          <Link to="/projects" className="group flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-default border border-border-brand-subtle bg-brand-softer text-fg-brand-strong shadow-xs transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-y-0.5">
              <Beaker size={16} strokeWidth={1.8} />
            </span>
            <span className="text-sm font-semibold tracking-tight text-heading">
              GreyTest
            </span>
          </Link>

          <span className="inline-flex items-center gap-2 rounded-full border border-border-default bg-neutral-primary-soft px-3 py-1.5 text-[12px] font-medium text-heading shadow-xs">
            <Sparkles size={13} strokeWidth={1.8} className="text-fg-brand" />
            AI QA Agent
          </span>
        </div>
      </nav>

      <main className={`relative mx-auto ${widthClass} px-4 py-8 sm:px-6 sm:py-10`}>
        {children}
      </main>

      <footer className="mt-16 border-t border-border-default-subtle bg-neutral-primary-soft/80">
        <div className={`mx-auto flex ${widthClass} flex-col gap-2 px-4 py-6 text-[12px] text-body-subtle sm:flex-row sm:items-center sm:justify-between sm:px-6`}>
          <span>GreyTest · Đồ án tốt nghiệp KTPM</span>
          <span className="font-mono">Grey-box AI QA System</span>
        </div>
      </footer>
    </div>
  );
}
