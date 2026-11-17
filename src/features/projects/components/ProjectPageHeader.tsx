import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Archive, ArrowLeft, GitBranch, RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import type { Project, ProjectStatus } from '../types';
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
  compact?: boolean;
  status?: ProjectStatus;
  reachedStatus?: ProjectStatus;
  failedStep?: number;
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
  compact = false,
  status = project.status,
  reachedStatus,
  failedStep,
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
      {compact && (
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-body-subtle">
          <Link to="/projects" className="rounded-control hover:text-heading">{t('Dự án', 'Projects')}</Link>
          <span aria-hidden="true">/</span>
          <span className="break-all font-mono text-heading">{project.name}</span>
        </div>
      )}
      {/* Trong khung dự án đã có đường dẫn "Dự án / tên" nên không lặp link quay lại. */}
      {!compact && <div className="mb-5 animate-fade-in-up">
        <Link
          to={backTo}
          className="btn btn-ghost h-9 py-0"
        >
          <ArrowLeft size={14} strokeWidth={1.8} />
          {backLabel}
        </Link>
      </div>}

      <header className="mb-6 animate-fade-in-up delay-1">
        <div className={compact ? '' : 'rounded-base border border-border-default bg-neutral-primary-soft p-5 md:p-6'}>
          <div className={compact ? 'flex flex-wrap items-start justify-between gap-4' : 'flex flex-col gap-5 md:flex-row md:items-start md:justify-between'}>
            <div className={compact ? 'min-w-0 flex-[1_1_320px]' : 'flex min-w-0 items-start gap-4'}>
              {!compact && <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-control border border-border-default bg-neutral-secondary-soft text-body-subtle">
                {project.sourceType === 'GITHUB' ? (
                  <GitBranch size={20} strokeWidth={1.6} />
                ) : (
                  <Archive size={20} strokeWidth={1.6} />
                )}
              </div>}
              <div className="min-w-0">
                <h1 className={compact ? 'font-display text-[28px] font-semibold text-heading' : 'truncate font-semibold text-heading text-[28px] font-display'}>
                  {compact ? titlePrefix : titlePrefix ? `${titlePrefix}: ${project.name}` : project.name}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-body-subtle">{subtitle}</p>
              </div>
            </div>
            <div className={compact ? 'flex flex-[1_1_220px] flex-wrap items-center justify-end gap-2' : 'flex shrink-0 flex-wrap items-center gap-3'}>
              <StatusBadge status={status} reachedStatus={reachedStatus} failedStep={failedStep} />

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
