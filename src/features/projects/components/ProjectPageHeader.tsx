import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Archive, ArrowLeft, GitBranch, RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import type { Project } from '../types';
import { StatusBadge } from './StatusBadge';
import { InlineAlert } from '../../../shared/components/InlineAlert';
import { useLanguage } from '../../../shared/i18n/language';
import { SourceUpdateModal } from './SourceUpdateModal';

interface ProjectPageHeaderProps {
  project: Project;
  titlePrefix?: string;
  subtitle: string;
  backTo: string;
  backLabel: string;
  actions?: ReactNode;
  servicePath?: string | null;
  showSourceUpdate?: boolean;
}

function useOptionalQueryClient() {
  try {
    return useQueryClient();
  } catch {
    return null;
  }
}

/** Header dùng chung cho các trang workflow: back link + icon + tên project + StatusBadge + nút cập nhật source. */
export function ProjectPageHeader({
  project,
  titlePrefix,
  subtitle,
  backTo,
  backLabel,
  actions,
  servicePath,
  showSourceUpdate = true,
}: ProjectPageHeaderProps) {
  const { t } = useLanguage();
  const queryClient = useOptionalQueryClient();
  const [showSourceUpdateModal, setShowSourceUpdateModal] = useState(false);
  const location = useLocation();
  const workflowNotice = (location.state as { workflowNotice?: string } | null)?.workflowNotice;
  const [showNotice, setShowNotice] = useState(Boolean(workflowNotice));

  useEffect(() => {
    setShowNotice(Boolean(workflowNotice));
    if (!workflowNotice) return;

    const timer = setTimeout(() => {
      setShowNotice(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, [workflowNotice]);

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
            <div className="flex shrink-0 flex-wrap items-center gap-3">
              <StatusBadge status={project.status} />

              {showSourceUpdate && (
                <button
                  type="button"
                  onClick={() => setShowSourceUpdateModal(true)}
                  className="btn btn-outline flex items-center gap-1.5"
                  id="btn-source-update"
                >
                  <RefreshCw size={14} strokeWidth={1.8} />
                  {t('Cập nhật source', 'Update source')}
                </button>
              )}

              {actions}
            </div>
          </div>
        </div>
      </header>
      {workflowNotice && showNotice && (
        <div className="mb-6 animate-fade-in transition-opacity duration-300" aria-live="polite">
          <InlineAlert tone="success">{workflowNotice}</InlineAlert>
        </div>
      )}

      {showSourceUpdate && (
        <SourceUpdateModal
          project={project}
          servicePath={servicePath}
          isOpen={showSourceUpdateModal}
          onClose={() => setShowSourceUpdateModal(false)}
          onApplied={() => {
            if (queryClient) {
              queryClient.invalidateQueries({ queryKey: ['project', project.id] });
              queryClient.invalidateQueries({ queryKey: ['project-services', project.id] });
              queryClient.invalidateQueries({ queryKey: ['source-updates', project.id] });
              queryClient.invalidateQueries({ queryKey: ['analysis', project.id] });
              queryClient.invalidateQueries({ queryKey: ['business-rules', project.id] });
              queryClient.invalidateQueries({ queryKey: ['test-plans', project.id] });
              queryClient.invalidateQueries({ queryKey: ['test-cases', project.id] });
              queryClient.invalidateQueries({ queryKey: ['unit-tests', project.id] });
              queryClient.invalidateQueries({ queryKey: ['unit-test-files', project.id] });
              queryClient.invalidateQueries({ queryKey: ['coverage', project.id] });
              queryClient.invalidateQueries({ queryKey: ['traceability', project.id] });
              queryClient.invalidateQueries({ queryKey: ['report', project.id] });
            }
          }}
        />
      )}
    </>
  );
}
