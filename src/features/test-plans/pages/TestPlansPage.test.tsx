// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import type { ReactNode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Project } from '../../projects/types';
import { useProject } from '../../projects/hooks/useProjects';
import { TestPlansPage } from './TestPlansPage';

vi.mock('../../projects/hooks/useProjects', () => ({
  useProject: vi.fn(),
}));

vi.mock('../../../shared/components/AppShell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('../components/TestPlansPanel', () => ({
  TestPlansPanel: () => <div>Test Plans Panel</div>,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('TestPlansPage', () => {
  function renderPage(status: Project['status']) {
    vi.mocked(useProject).mockReturnValue({
      data: project(status),
      isLoading: false,
      error: null,
    } as ReturnType<typeof useProject>);

    render(
      <MemoryRouter initialEntries={['/projects/105/test-plans']}>
        <Routes>
          <Route path="/projects/:id/test-plans" element={<TestPlansPage />} />
          <Route path="/projects/:id" element={<div>Analysis Page</div>} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it('allows test plans once business rules are approved', () => {
    renderPage('BR_APPROVED');
    expect(screen.getByText('Test Plans Panel')).toBeInTheDocument();
  });

  it('redirects to analysis while business rules are still under review', () => {
    renderPage('BR_PENDING_REVIEW');
    expect(screen.getByText('Analysis Page')).toBeInTheDocument();
    expect(screen.queryByText('Test Plans Panel')).not.toBeInTheDocument();
  });
});

function project(status: Project['status']): Project {
  return {
    id: 105,
    name: 'demo',
    sourceType: 'ZIP',
    sourceUrl: null,
    status,
    createdAt: '2026-07-17T00:00:00Z',
    ownerUserId: 1,
    sourceAvailable: true,
  };
}
