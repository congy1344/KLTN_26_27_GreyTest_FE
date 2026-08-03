import { useEffect, useRef, useState } from 'react';
import { Upload, GitBranch, File as FileIcon, ArrowRight, Loader2 } from 'lucide-react';
import { getErrorMessage } from '../../../shared/api/api-client';
import { useCloneGithub, useUploadProject } from '../hooks/useProjects';
import { GlassCard } from '../../../shared/components/GlassCard';
import { InlineAlert } from '../../../shared/components/InlineAlert';
import { useLanguage } from '../../../shared/i18n/language';

export function ProjectUploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [githubUrl, setGithubUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
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
        onSuccess: () => {
          setFile(null);
          setSuccessMessage(t('Upload thành công. Bấm Phân tích trong danh sách để bắt đầu.', 'Upload successful. Select Analyze in the list to begin.'));
        },
      });
    }
  }

  function submitGithub(e: React.FormEvent) {
    e.preventDefault();
    if (githubUrl.trim()) {
      clone.mutate(githubUrl.trim(), {
        onSuccess: () => {
          setGithubUrl('');
          setSuccessMessage(t('Clone thành công. Bấm Phân tích trong danh sách để bắt đầu.', 'Clone successful. Select Analyze in the list to begin.'));
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
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-default bg-brand-softer text-fg-brand-strong">
                <Upload size={16} strokeWidth={1.8} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-heading">Upload ZIP</h3>
                <p className="text-xs text-body-subtle">{t('Tải source để phân tích sau', 'Upload source for later analysis')}</p>
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

            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`mb-4 flex min-h-[162px] cursor-pointer flex-col items-center justify-center rounded-default border border-dashed px-4 py-8 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                isDragging
                  ? 'border-border-brand bg-brand-softer text-fg-brand'
                  : file
                    ? 'border-border-brand-subtle bg-brand-softer text-fg-brand-strong'
                    : 'border-border-default-medium bg-neutral-secondary-medium text-body hover:border-border-default-strong hover:bg-neutral-secondary-soft'
              }`}
            >
              {file ? (
                <div className="flex items-center gap-2 text-sm">
                  <FileIcon size={16} className="text-fg-brand-strong animate-pulse" strokeWidth={1.8} />
                  <span className="max-w-[180px] truncate font-medium">{file.name}</span>
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
                  <p className="mt-1 text-[11px] text-body-subtle">{t('hoặc click để chọn', 'or click to choose')}</p>
                </>
              )}
            </div>

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
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-default bg-brand-softer text-fg-brand-strong">
                <GitBranch size={16} strokeWidth={1.8} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-heading">GitHub Repository</h3>
                <p className="text-xs text-body-subtle">{t('Clone repo public để phân tích', 'Clone a public repository for analysis')}</p>
              </div>
            </div>

            <div className="mb-4 flex min-h-[162px] flex-col justify-center rounded-default border border-border-default bg-neutral-secondary-soft p-4">
              <label htmlFor="github-url-input" className="mb-2 block text-xs font-medium text-heading">
                Repository URL
              </label>
              <input
                id="github-url-input"
                type="url"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                placeholder="https://github.com/user/repo"
                className="form-input w-full"
                disabled={clone.isPending}
              />
              <p className="mt-2 text-[11px] leading-relaxed text-body-subtle">
                {t('Hỗ trợ repository public. Sau khi clone, bấm Phân tích trong danh sách project.', 'Public repositories are supported. After cloning, select Analyze in the project list.')}
              </p>
            </div>

            <button
              type="submit"
              disabled={!githubUrl.trim() || clone.isPending}
              className="btn btn-brand mt-auto w-full justify-center"
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
          <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-danger" />
          <p className="font-medium">{getErrorMessage(error)}</p>
        </div>
      )}
      {successMessage && <InlineAlert tone="success">{successMessage}</InlineAlert>}
    </div>
  );
}
