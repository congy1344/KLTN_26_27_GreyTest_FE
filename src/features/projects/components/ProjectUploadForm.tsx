import { useState, useRef } from 'react';
import { Upload, GitBranch, File as FileIcon, ArrowRight } from 'lucide-react';
import { getErrorMessage } from '../../../shared/api/api-client';
import { useCloneGithub, useUploadProject } from '../hooks/useProjects';
import { GlassCard } from '../../../shared/components/GlassCard';

export function ProjectUploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [githubUrl, setGithubUrl] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadProject();
  const clone = useCloneGithub();

  const error = upload.error ?? clone.error;

  function submitZip(e: React.FormEvent) {
    e.preventDefault();
    if (file) {
      upload.mutate(file, { onSuccess: () => setFile(null) });
    }
  }

  function submitGithub(e: React.FormEvent) {
    e.preventDefault();
    if (githubUrl.trim()) {
      clone.mutate(githubUrl.trim(), { onSuccess: () => setGithubUrl('') });
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
      <div className="grid gap-4 md:grid-cols-2">
        {/* ZIP Upload Card */}
        <GlassCard className="!p-5">
          <form onSubmit={submitZip}>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-softer text-fg-brand-strong shrink-0">
                <Upload size={16} strokeWidth={2} />
              </div>
              <h3 className="text-sm font-semibold text-heading">Upload ZIP</h3>
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
              className={`mb-4 flex cursor-pointer flex-col items-center justify-center rounded-default border border-dashed px-4 py-8 transition-all duration-200 ${
                isDragging
                  ? 'border-border-brand bg-brand-softer text-fg-brand'
                  : file
                    ? 'border-border-brand-subtle bg-brand-softer text-fg-brand-strong'
                    : 'border-border-default-medium bg-neutral-secondary-medium text-body hover:border-border-default-strong hover:bg-neutral-secondary-soft'
              }`}
            >
              {file ? (
                <div className="flex items-center gap-2 text-sm">
                  <FileIcon size={16} className="text-fg-brand-strong animate-pulse" strokeWidth={2} />
                  <span className="font-medium truncate max-w-[180px]">{file.name}</span>
                </div>
              ) : (
                <>
                  <Upload
                    size={20}
                    className={`mb-2 ${isDragging ? 'text-fg-brand' : 'text-body-subtle'}`}
                    strokeWidth={1.5}
                  />
                  <p className="text-xs font-medium">
                    Kéo thả file <span className="text-fg-brand">.zip</span> vào đây
                  </p>
                  <p className="text-[11px] text-body-subtle mt-1">hoặc click để chọn</p>
                </>
              )}
            </div>

            <button
              type="submit"
              disabled={!file || upload.isPending}
              className="btn btn-brand w-full justify-center"
              id="btn-upload-zip"
            >
              {upload.isPending ? (
                <>
                  <span className="h-3.5 w-3.5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                  Đang tải lên...
                </>
              ) : (
                <>
                  Tải lên
                  <ArrowRight size={14} strokeWidth={2} />
                </>
              )}
            </button>
          </form>
        </GlassCard>

        {/* GitHub Clone Card */}
        <GlassCard className="!p-5">
          <form onSubmit={submitGithub}>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-softer text-fg-brand-strong shrink-0">
                <GitBranch size={16} strokeWidth={2} />
              </div>
              <h3 className="text-sm font-semibold text-heading">GitHub Repository</h3>
            </div>

            <label htmlFor="github-url-input" className="block text-xs font-medium text-heading mb-2">
              Repository URL
            </label>
            <input
              id="github-url-input"
              type="url"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/user/repo"
              className="form-input w-full mb-4"
              disabled={clone.isPending}
            />

            <button
              type="submit"
              disabled={!githubUrl.trim() || clone.isPending}
              className="btn btn-brand w-full justify-center"
              id="btn-clone-github"
            >
              {clone.isPending ? (
                <>
                  <span className="h-3.5 w-3.5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                  Đang clone...
                </>
              ) : (
                <>
                  Clone
                  <ArrowRight size={14} strokeWidth={2} />
                </>
              )}
            </button>
          </form>
        </GlassCard>
      </div>

      {/* Error message Alert */}
      {error && (
        <div className="flex items-center gap-2.5 rounded-base bg-danger-soft border border-border-danger-subtle px-4 py-3 animate-fade-in text-[14px] text-fg-danger-strong">
          <div className="h-1.5 w-1.5 rounded-full bg-danger shrink-0" />
          <p className="font-medium">{getErrorMessage(error)}</p>
        </div>
      )}
    </div>
  );
}
