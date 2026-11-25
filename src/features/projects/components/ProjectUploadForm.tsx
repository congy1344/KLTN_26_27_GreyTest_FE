import { useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import {
  Upload,
  GitBranch,
  File as FileIcon,
  ArrowRight,
  Loader2,
  Lock,
  Globe,
  Search,
  ExternalLink,
  ChevronDown,
  Check,
} from 'lucide-react';
import { getErrorMessage } from '../../../shared/api/api-client';
import { useCloneGithub, useUploadProject } from '../hooks/useProjects';
import { buildGithubAuthorizeUrl } from '../../auth/api/auth-api';
import {
  useCurrentUser,
  useDisconnectGithub,
  useGithubConfig,
  useGithubRepos,
  useImportGithubRepo,
} from '../../auth/hooks/useAuth';
import type { GithubRepo } from '../../auth/types';
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
  const importRepo = useImportGithubRepo();
  const disconnectGithub = useDisconnectGithub();
  const { data: currentUser, isLoading: isUserLoading } = useCurrentUser();
  const githubConfigQuery = useGithubConfig();

  const isGithubConnected = Boolean(currentUser?.githubUsername);
  const githubReposQuery = useGithubRepos(isGithubConnected);

  const [repoSearch, setRepoSearch] = useState('');
  const [selectedRepo, setSelectedRepo] = useState<GithubRepo | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { t } = useLanguage();

  const error = upload.error ?? clone.error ?? importRepo.error ?? disconnectGithub.error ?? githubReposQuery.error;
  const reposErrorCode = (githubReposQuery.error as { response?: { data?: { code?: string } } } | null)?.response?.data?.code;
  const isGithubTokenExpired =
    reposErrorCode === 'GITHUB_TOKEN_EXPIRED' ||
    reposErrorCode === 'GITHUB_NOT_CONNECTED' ||
    (Boolean(githubReposQuery.error) && /hết hạn|thu hồi|expired|revoked/i.test(getErrorMessage(githubReposQuery.error)));

  const filteredRepos = (githubReposQuery.data ?? []).filter((r) =>
    r.name.toLowerCase().includes(repoSearch.toLowerCase()) ||
    Boolean(r.description?.toLowerCase().includes(repoSearch.toLowerCase()))
  );

  const handleConnectGithub = () => {
    const config = githubConfigQuery.data;
    if (!config?.enabled || !config.clientId) {
      alert(t('Chức năng GitHub OAuth chưa được cấu hình Client ID / Secret.', 'GitHub OAuth is not configured.'));
      return;
    }
    window.location.href = buildGithubAuthorizeUrl(config, '/projects/new', 'link');
  };

  function submitImportRepo(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedRepo) return;
    importRepo.mutate(
      { cloneUrl: selectedRepo.cloneUrl, branch: selectedRepo.defaultBranch },
      {
        onSuccess: (project) => {
          setSelectedRepo(null);
          setSuccessMessage(t('Import thành công. Mở dự án để phân tích.', 'Import successful. Open the project to analyze it.'));
          onSuccess?.();
          navigate(project?.id ? `/projects/${project.id}` : '/projects');
        },
      }
    );
  }

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
      <div className="grid items-stretch gap-5 grid-cols-1 lg:grid-cols-3">
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
              className={`mb-4 flex min-h-[162px] cursor-pointer flex-col items-center justify-center rounded-base border border-dashed px-4 py-8 transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${isDragging
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
                <p className="text-xs text-body-subtle">{t('Dán link clone repo public', 'Paste public repo URL to clone')}</p>
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
                {t('Dán URL repository public bất kỳ. Dự án sẽ mở sau khi clone.', 'Paste any public repository URL. Project will open after cloning.')}
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

        <GlassCard className="h-full">
          <div className="flex h-full flex-col">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-neutral-secondary-soft text-heading">
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="whitespace-nowrap text-base font-semibold text-heading font-display">
                    {t('Kho GitHub của tôi', 'My GitHub Repos')}
                  </h2>
                  {isGithubConnected && !isGithubTokenExpired && (
                    <button
                      type="button"
                      disabled={disconnectGithub.isPending || importRepo.isPending}
                      onClick={handleConnectGithub}
                      className="shrink-0 text-xs font-medium text-fg-brand hover:underline disabled:opacity-50"
                    >
                      {t('Kết nối lại', 'Reconnect')}
                    </button>
                  )}
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <p className="truncate text-xs text-body-subtle">
                    {isGithubConnected ? `@${currentUser?.githubUsername}` : t('Chọn trực tiếp từ tài khoản GitHub', 'Choose from your GitHub account')}
                  </p>
                  {isGithubConnected && (
                    <button
                      type="button"
                      disabled={disconnectGithub.isPending || importRepo.isPending}
                      onClick={() =>
                        disconnectGithub.mutate(undefined, {
                          onSuccess: () => {
                            importRepo.reset?.();
                            setSelectedRepo(null);
                            setIsDropdownOpen(false);
                          },
                        })
                      }
                      className="shrink-0 text-xs font-medium text-fg-danger-strong hover:underline disabled:opacity-50"
                    >
                      {t('Đăng xuất', 'Sign out')}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {isUserLoading ? (
              <div className="flex flex-1 flex-col items-center justify-center py-8 text-center text-body-subtle gap-2">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-xs">{t('Đang kiểm tra tài khoản...', 'Checking account...')}</span>
              </div>
            ) : !isGithubConnected || isGithubTokenExpired ? (
              <div className="mb-4 flex min-h-[162px] flex-1 flex-col items-center justify-center py-4 text-center">
                <div className="mb-2.5 flex h-10 w-10 items-center justify-center rounded-full bg-neutral-secondary-soft text-body-subtle">
                  <GitBranch size={20} className="opacity-70" />
                </div>
                <p className="mb-1 text-sm font-semibold text-heading">
                  {isGithubTokenExpired
                    ? t('Phiên liên kết GitHub đã hết hạn', 'GitHub session expired')
                    : t('Chưa kết nối GitHub', 'GitHub not connected')}
                </p>
                <p className="mb-4 text-xs text-body-subtle max-w-xs">
                  {isGithubTokenExpired
                    ? t('Token truy cập GitHub đã hết hạn hoặc bị thu hồi. Vui lòng kết nối lại để tải danh sách repository.', 'Your GitHub access token has expired or been revoked. Please reconnect to load your repositories.')
                    : t('Kết nối tài khoản GitHub để truy cập và chọn trực tiếp danh sách repository của bạn.', 'Connect your GitHub account to access and choose from your repositories directly.')}
                </p>
                <button
                  type="button"
                  onClick={handleConnectGithub}
                  className="btn btn-brand w-full justify-center"
                >
                  <ExternalLink size={14} />
                  {isGithubTokenExpired
                    ? t('Kết nối lại tài khoản GitHub', 'Reconnect GitHub Account')
                    : t('Kết nối tài khoản GitHub', 'Connect GitHub Account')}
                </button>
              </div>
            ) : (
              <form onSubmit={submitImportRepo} className="flex flex-1 flex-col">
                <div className="mb-4 flex min-h-[162px] flex-col justify-center">
                  <label className="mb-2 block text-xs font-medium text-heading">
                    {t('Chọn repository từ GitHub', 'Select repository from GitHub')}
                  </label>

                  <div className="relative" ref={dropdownRef}>
                    <button
                      type="button"
                      data-testid="github-repo-dropdown-trigger"
                      disabled={importRepo.isPending}
                      onClick={() => {
                        const nextState = !isDropdownOpen;
                        setIsDropdownOpen(nextState);
                        if (nextState) {
                          setRepoSearch('');
                        }
                      }}
                      className={`form-input flex w-full items-center justify-between py-2 text-left transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
                        isDropdownOpen ? 'border-border-brand ring-1 ring-border-brand' : ''
                      }`}
                      aria-expanded={isDropdownOpen}
                      aria-haspopup="listbox"
                    >
                      {selectedRepo ? (
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <span className="truncate font-medium text-heading text-xs">
                            {selectedRepo.name}
                          </span>
                          {selectedRepo.isPrivate ? (
                            <span className="inline-flex shrink-0 items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] bg-warning-soft text-fg-warning font-medium">
                              <Lock size={10} aria-hidden="true" />
                              Private
                            </span>
                          ) : (
                            <span className="inline-flex shrink-0 items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] bg-neutral-secondary-soft text-body-subtle font-medium">
                              <Globe size={10} aria-hidden="true" />
                              Public
                            </span>
                          )}
                          <span className="text-[10px] font-mono text-body-subtle shrink-0">
                            {selectedRepo.defaultBranch}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-body-subtle">
                          {githubReposQuery.isLoading
                            ? t('Đang tải danh sách repo...', 'Loading repositories...')
                            : t('Chọn một repository...', 'Select a repository...')}
                        </span>
                      )}
                      <ChevronDown
                        size={14}
                        className={`shrink-0 text-body-subtle transition-transform duration-200 ${
                          isDropdownOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </button>

                    {isDropdownOpen && (
                      <div className="absolute left-0 right-0 top-full z-50 mt-1.5 rounded-base border border-border-default bg-neutral-primary-soft p-2 shadow-xl animate-fade-in">
                        <div className="relative mb-2">
                          <Search size={14} className="absolute left-2.5 top-2.5 text-body-subtle" aria-hidden="true" />
                          <input
                            ref={searchInputRef}
                            autoFocus
                            type="text"
                            value={repoSearch}
                            onChange={(e) => setRepoSearch(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') e.preventDefault();
                              if (e.key === 'Escape') setIsDropdownOpen(false);
                            }}
                            placeholder={t('Tìm kiếm repository...', 'Search repositories...')}
                            className="form-input w-full pl-8 py-1.5 text-xs bg-neutral-primary"
                          />
                        </div>

                        <div className="max-h-56 overflow-y-auto space-y-1 pr-1 text-xs" role="listbox">
                          {githubReposQuery.isLoading ? (
                            <div className="flex items-center justify-center py-6 text-body-subtle gap-2">
                              <Loader2 size={14} className="animate-spin" />
                              <span>{t('Đang tải danh sách repo...', 'Loading repositories...')}</span>
                            </div>
                          ) : filteredRepos.length === 0 ? (
                            <div className="py-6 text-center text-xs text-body-subtle">
                              {t('Không tìm thấy repository nào', 'No repositories found')}
                            </div>
                          ) : (
                            filteredRepos.map((repo) => {
                              const isSelected = selectedRepo?.id === repo.id;
                              return (
                                <button
                                  key={repo.id}
                                  type="button"
                                  role="option"
                                  aria-selected={isSelected}
                                  onClick={() => {
                                    setSelectedRepo(repo);
                                    setIsDropdownOpen(false);
                                    setRepoSearch('');
                                  }}
                                  className={`w-full flex items-center justify-between rounded-control px-2.5 py-2 text-left transition-colors ${
                                    isSelected
                                      ? 'bg-brand-soft text-fg-brand font-semibold'
                                      : 'hover:bg-neutral-secondary-medium text-heading'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0 pr-2">
                                    <Check
                                      size={13}
                                      className={`shrink-0 ${isSelected ? 'text-fg-brand' : 'opacity-0'}`}
                                    />
                                    <span className="truncate font-medium">{repo.name}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {repo.isPrivate ? (
                                      <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] bg-warning-soft text-fg-warning font-medium">
                                        <Lock size={10} aria-hidden="true" />
                                        Private
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] bg-neutral-secondary-soft text-body-subtle font-medium">
                                        <Globe size={10} aria-hidden="true" />
                                        Public
                                      </span>
                                    )}
                                    <span className="text-[10px] text-body-subtle font-mono">
                                      {repo.defaultBranch}
                                    </span>
                                  </div>
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <p className="mt-2 text-xs leading-relaxed text-body-subtle truncate">
                    {selectedRepo ? (
                      <>
                        <span className="font-medium text-heading">{selectedRepo.fullName || selectedRepo.name}</span>
                        {selectedRepo.description ? ` • ${selectedRepo.description}` : ''}
                      </>
                    ) : (
                      t('Chọn repository bạn muốn phân tích từ danh sách.', 'Select the repository you want to analyze.')
                    )}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={!selectedRepo || importRepo.isPending || disconnectGithub.isPending}
                  className="btn btn-brand mt-auto w-full justify-center"
                >
                  {importRepo.isPending ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      {t('Đang import...', 'Importing...')}
                    </>
                  ) : (
                    <>
                      {t('Import dự án & Phân tích', 'Import & Analyze')}
                      <ArrowRight size={14} strokeWidth={1.8} />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
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
