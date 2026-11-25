// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NewProjectPage } from './NewProjectPage';

const mocks = vi.hoisted(() => ({
  upload: vi.fn(),
  clone: vi.fn(),
  importRepo: vi.fn(),
  currentUser: { id: 1, email: 'user@test.com', githubUsername: 'testuser' } as any,
  repos: [
    { id: 101, name: 'ChuTi_Store', fullName: 'testuser/ChuTi_Store', cloneUrl: 'https://github.com/testuser/ChuTi_Store.git', defaultBranch: 'main', isPrivate: false },
  ] as any[],
}));

vi.mock('../hooks/useProjects', () => ({
  useUploadProject: () => ({ mutate: mocks.upload, isPending: false }),
  useCloneGithub: () => ({ mutate: mocks.clone, isPending: false }),
}));

vi.mock('../../auth/hooks/useAuth', () => ({
  useCurrentUser: () => ({ data: mocks.currentUser, isLoading: false }),
  useGithubConfig: () => ({ data: { enabled: true, clientId: 'abc' } }),
  useGithubRepos: () => ({ data: mocks.repos, isLoading: false }),
  useImportGithubRepo: () => ({ mutate: mocks.importRepo, isPending: false }),
  useDisconnectGithub: () => ({ mutate: vi.fn(), isPending: false, error: null }),
}));

vi.mock('../../../shared/components/AppShell', () => ({ AppShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderPage(search = '') {
  return render(
    <MemoryRouter initialEntries={['/projects/new' + search]}>
      <Routes>
        <Route path="/projects/new" element={<NewProjectPage />} />
        <Route path="/projects/:id" element={<p>Project detail destination</p>} />
        <Route path="/projects" element={<p>Project list destination</p>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('NewProjectPage', () => {
  it('shows the upload form and a back link', () => {
    renderPage();
    expect(screen.getByText('Upload ZIP')).toBeVisible();
    expect(screen.getByText('GitHub Repository')).toBeVisible();
    expect(screen.getByText('Kho GitHub của tôi')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Quay lại danh sách dự án' })).toHaveAttribute('href', '/projects');
  });

  it.each(['zip', 'github'])('focuses the selected source from ?source=%s without changing the two forms', (source) => {
    const view = renderPage('?source=' + source);
    const input = view.container.querySelector('#github-url-input');
    if (source === 'github') expect(input).toHaveFocus();
    else expect(screen.getByRole('button', { name: /Kéo thả file/ })).toHaveFocus();
    expect(screen.getByText('Upload ZIP')).toBeVisible();
    expect(screen.getByText('GitHub Repository')).toBeVisible();
  });

  it.each([['ZIP', 42], ['GitHub', 53], ['ZIP', undefined], ['GitHub', undefined]])('navigates after %s creation (id: %s)', (source, id) => {
    const mutate = source === 'ZIP' ? mocks.upload : mocks.clone;
    mutate.mockImplementation((_value, options) => options.onSuccess(id ? { id } : undefined));
    const view = renderPage();
    if (source === 'ZIP') {
      fireEvent.change(view.container.querySelector('#zip-upload-input')!, { target: { files: [new File(['source'], 'spring.zip', { type: 'application/zip' })] } });
      fireEvent.click(screen.getByRole('button', { name: 'Tải lên' }));
    } else {
      fireEvent.change(screen.getByLabelText('Repository URL'), { target: { value: 'https://github.com/example/spring' } });
      fireEvent.click(screen.getByRole('button', { name: 'Clone' }));
    }
    expect(mutate).toHaveBeenCalledOnce();
    expect(screen.getByText(id ? 'Project detail destination' : 'Project list destination')).toBeVisible();
  });

  it('selects repository from dropdown and imports project', () => {
    mocks.importRepo.mockImplementation((_value, options) => options.onSuccess({ id: 99 }));
    renderPage();

    // Trigger opens the dropdown
    const trigger = screen.getByTestId('github-repo-dropdown-trigger');
    fireEvent.click(trigger);

    // Option should be visible in the dropdown
    const option = screen.getByRole('option', { name: /ChuTi_Store/i });
    expect(option).toBeVisible();

    // Select option
    fireEvent.click(option);

    // Trigger should now show selected repo name
    expect(trigger).toHaveTextContent('ChuTi_Store');

    // Click Import
    const importBtn = screen.getByRole('button', { name: /Import dự án & Phân tích/i });
    expect(importBtn).toBeEnabled();
    fireEvent.click(importBtn);

    expect(mocks.importRepo).toHaveBeenCalledWith(
      { cloneUrl: 'https://github.com/testuser/ChuTi_Store.git', branch: 'main' },
      expect.any(Object)
    );
    expect(screen.getByText('Project detail destination')).toBeVisible();
  });

  it('filters repositories via search input and shows empty state when no match', () => {
    renderPage();

    const trigger = screen.getByTestId('github-repo-dropdown-trigger');
    fireEvent.click(trigger);

    const searchInput = screen.getByPlaceholderText(/Tìm kiếm repository.../i);
    expect(searchInput).toBeVisible();

    // Matching query
    fireEvent.change(searchInput, { target: { value: 'Store' } });
    expect(screen.getByRole('option', { name: /ChuTi_Store/i })).toBeVisible();

    // Non-matching query
    fireEvent.change(searchInput, { target: { value: 'non_existent_repo_xyz' } });
    expect(screen.queryByRole('option', { name: /ChuTi_Store/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Không tìm thấy repository nào/i)).toBeVisible();
  });
});
