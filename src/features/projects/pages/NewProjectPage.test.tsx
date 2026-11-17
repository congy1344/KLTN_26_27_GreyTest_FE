// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NewProjectPage } from './NewProjectPage';

const mocks = vi.hoisted(() => ({ upload: vi.fn(), clone: vi.fn() }));
vi.mock('../hooks/useProjects', () => ({
  useUploadProject: () => ({ mutate: mocks.upload, isPending: false }),
  useCloneGithub: () => ({ mutate: mocks.clone, isPending: false }),
}));
vi.mock('../../../shared/components/AppShell', () => ({ AppShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

function renderPage(search = '') {
  return render(<MemoryRouter initialEntries={['/projects/new' + search]}><Routes>
    <Route path="/projects/new" element={<NewProjectPage />} />
    <Route path="/projects/:id" element={<p>Project detail destination</p>} />
    <Route path="/projects" element={<p>Project list destination</p>} />
  </Routes></MemoryRouter>);
}

describe('NewProjectPage', () => {
  it('shows the upload form and a back link', () => {
    renderPage();
    expect(screen.getByText('Upload ZIP')).toBeVisible();
    expect(screen.getByText('GitHub Repository')).toBeVisible();
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
});
