import { useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { Upload, GitBranch, File as FileIcon, ArrowRight, Loader2 } from 'lucide-react';
import { getErrorMessage } from '../../../shared/api/api-client';
import { useCloneGithub, useUploadProject } from '../hooks/useProjects';
import { GlassCard } from '../../../shared/components/GlassCard';
import { InlineAlert } from '../../../shared/components/InlineAlert';
import { useLanguage } from '../../../shared/i18n/language';

interface ProjectUploadFormProps {
  onSuccess?: () => void;
  source?: 'zip' | 'github';
}

export function ProjectUploadForm({ onSuccess, source }: ProjectUploadFormProps = {}) {
  const [file, setFile] = useState<File | null>(null);
  const [githubUrl, setGithubUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const zipDropRef = useRef<HTMLButtonElement>(null);
  const githubInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (source === 'zip') zipDropRef.current?.focus();
    if (source === 'github') githubInputRef.current?.focus();
  }, [source]);
  const navigate = useNavigate();
  const upload = useUploadProject();
  const clone = useCloneGithub();
  const { t } = useLanguage();

  const error = upload.error ?? clone.error;

  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(''), 3000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  function submitZip(e: React.FormEvent) {
    e.preventDefault();
    if (file) {
      upload.mutate(file, {
        onSuccess: (project) => {
          setFile(null);
          setSuccessMessage(t('Tải lên thành công. Mở dự án để phân tích.', 'Upload successful. Open the project to analyze it.'));
          onSuccess?.();
          navigate(project?.id ? `/projects/${project.id}` : '/projects');
        },
      });
    }
  }

  function submitGithub(e: React.FormEvent) {
    e.preventDefault();
    if (githubUrl.trim()) {
      clone.mutate(githubUrl.trim(), {
        onSuccess: (project) => {
          setGithubUrl('');
          setSuccessMessage(t('Clone thành công. Mở dự án để phân tích.', 'Clone successful. Open the project to analyze it.'));
          onSuccess?.();
          navigate(project?.id ? `/projects/${project.id}` : '/projects');
        },
      });
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile?.name.endsWith('.zip')) {
      setFile(droppedFile);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid items-stretch gap-5 md:grid-cols-2">
        <GlassCard className="h-full">
          <form onSubmit={submitZip} className="flex h-full flex-col">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-neutral-secondary-soft text-body-subtle">
                <Upload size={16} strokeWidth={1.8} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-heading font-display">Upload ZIP</h2>
                <p className="text-xs text-body-subtle">{t('Chọn file ZIP của dự án Spring Boot', 'Choose a Spring Boot project ZIP')}</p>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".zip"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="hidden"
              id="zip-upload-input"
            />

            <button
              type="button"
              ref={zipDropRef}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`mb-4 flex min-h-[162px] cursor-pointer flex-col items-center justify-center rounded-base border border-dashed px-4 py-8 transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                isDragging
                  ? 'border-border-brand bg-brand-softer text-fg-brand'
                  : file
                    ? 'border-border-brand-subtle bg-neutral-secondary-soft text-body-subtle'
                    : 'border-border-default-medium bg-neutral-secondary-medium text-body hover:border-border-default-strong hover:bg-neutral-secondary-soft'
              }`}
            >
              {file ? (
                <div className="flex items-center gap-2 text-sm">
                  <FileIcon size={16} className="text-fg-brand-strong " strokeWidth={1.8} />
                  <span className="max-w-[180px] truncate font-mono font-medium">{file.name}</span>
                </div>
              ) : (
                <>
                  <Upload
                    size={20}
                    className={`mb-2 ${isDragging ? 'text-fg-brand' : 'text-body-subtle'}`}
                    strokeWidth={1.6}
                  />
                  <p className="text-xs font-medium">
                    {t('Kéo thả file', 'Drag and drop a')} <span className="text-fg-brand">.zip</span> {t('vào đây', 'file here')}
                  </p>
                  <p className="mt-1 text-xs text-body-subtle">{t('hoặc click để chọn', 'or click to choose')}</p>
                </>
              )}
            </button>

            <button
              type="submit"
              disabled={!file || upload.isPending}
              className="btn btn-brand mt-auto w-full justify-center"
              id="btn-upload-zip"
            >
              {upload.isPending ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  {t('Đang tải lên', 'Uploading')}
                </>
              ) : (
                <>
                  {t('Tải lên', 'Upload')}
                  <ArrowRight size={14} strokeWidth={1.8} />
                </>
              )}
            </button>
          </form>
        </GlassCard>

        <GlassCard className="h-full">
          <form onSubmit={submitGithub} className="flex h-full flex-col">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-brand-softer text-fg-brand-strong">
                <GitBranch size={16} strokeWidth={1.8} />
              </div>
              <div>
                <h2 className="text-base font-semibold text-heading font-display">GitHub Repository</h2>
                <p className="text-xs text-body-subtle">{t('Clone repo public để phân tích', 'Clone a public repository for analysis')}</p>
              </div>
            </div>

            <div className="mb-4 flex min-h-[162px] flex-col justify-center">
              <label htmlFor="github-url-input" className="mb-2 block text-xs font-medium text-heading">
                Repository URL
              </label>
              <input
                ref={githubInputRef}
                id="github-url-input"
                type="url"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/user/repo"
                className="form-input w-full"
                disabled={clone.isPending}
              />
              <p className="mt-2 text-xs leading-relaxed text-body-subtle">
                {t('Dán URL repository public. Bạn sẽ mở dự án sau khi clone.', 'Paste a public repository URL. The project will open after cloning.')}
              </p>
            </div>

            <button
              type="submit"
              disabled={!githubUrl.trim() || clone.isPending}
              className="btn btn-secondary mt-auto w-full justify-center"
              id="btn-clone-github"
            >
              {clone.isPending ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  {t('Đang clone', 'Cloning')}
                </>
              ) : (
                <>
                  Clone
                  <ArrowRight size={14} strokeWidth={1.8} />
                </>
              )}
            </button>
          </form>
        </GlassCard>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 rounded-base border border-border-danger-subtle bg-danger-soft px-4 py-3 text-[14px] text-fg-danger-strong animate-fade-in">

          <p className="font-medium">{getErrorMessage(error)}</p>
        </div>
      )}
      {successMessage && <InlineAlert tone="success">{successMessage}</InlineAlert>}
    </div>
  );
}
