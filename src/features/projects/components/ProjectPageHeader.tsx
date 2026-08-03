import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Archive, ArrowLeft, GitBranch } from 'lucide-react';
import type { Project } from '../types';
import { StatusBadge } from './StatusBadge';
import { InlineAlert } from '../../../shared/components/InlineAlert';

interface ProjectPageHeaderProps {
  project: Project;
  titlePrefix?: string;
  subtitle: string;
  backTo: string;
  backLabel: string;
  actions?: ReactNode;
}

/** Header dùng chung cho các trang workflow: back link + icon + tên project + StatusBadge. */
export function ProjectPageHeader({ project, titlePrefix, subtitle, backTo, backLabel, actions }: ProjectPageHeaderProps) {
  const location = useLocation();
  const workflowNotice = (location.state as { workflowNotice?: string } | null)?.workflowNotice;

  return (
    <>
      <div className="mb-5 animate-fade-in-up">
        <Link
          to={backTo}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-body transition-colors duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] hover:text-heading"
        >
          <ArrowLeft size={14} strokeWidth={1.8} />
          {backLabel}
        </Link>
      </div>

      <header className="mb-6 animate-fade-in-up delay-1">
        <div className="rounded-base border border-border-default bg-neutral-primary-soft p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-default border border-border-default bg-neutral-secondary-soft text-body-subtle shadow-xs">
                {project.sourceType === 'GITHUB' ? (
                  <GitBranch size={20} strokeWidth={1.6} />
                ) : (
                  <Archive size={20} strokeWidth={1.6} />
                )}
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-bold tracking-tight text-heading md:text-3xl">
                  {titlePrefix ? `${titlePrefix} · ${project.name}` : project.name}
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-body-subtle">{subtitle}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              {actions}
              <StatusBadge status={project.status} />
            </div>
          </div>
        </div>
      </header>
      {workflowNotice && (
        <div className="mb-6" aria-live="polite">
          <InlineAlert tone="success">{workflowNotice}</InlineAlert>
        </div>
      )}
    </>
  );
}
