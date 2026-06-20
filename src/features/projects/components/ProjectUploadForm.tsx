import { useState } from 'react';
import { getErrorMessage } from '../../../shared/api/api-client';
import { useCloneGithub, useUploadProject } from '../hooks/useProjects';

export function ProjectUploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [githubUrl, setGithubUrl] = useState('');
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

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <form onSubmit={submitZip} className="rounded-lg border p-4">
        <h3 className="mb-2 font-semibold">Upload ZIP</h3>
        <input
          type="file"
          accept=".zip"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="mb-3 block w-full text-sm"
        />
        <button
          type="submit"
          disabled={!file || upload.isPending}
          className="rounded bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {upload.isPending ? 'Đang tải lên...' : 'Tải lên'}
        </button>
      </form>

      <form onSubmit={submitGithub} className="rounded-lg border p-4">
        <h3 className="mb-2 font-semibold">GitHub repository</h3>
        <input
          type="url"
          value={githubUrl}
          onChange={(e) => setGithubUrl(e.target.value)}
          placeholder="https://github.com/user/repo"
          className="mb-3 block w-full rounded border px-2 py-1 text-sm"
        />
        <button
          type="submit"
          disabled={!githubUrl.trim() || clone.isPending}
          className="rounded bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {clone.isPending ? 'Đang clone...' : 'Clone'}
        </button>
      </form>

      {error && (
        <p className="text-sm text-red-600 md:col-span-2">{getErrorMessage(error)}</p>
      )}
    </div>
  );
}
