// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import type { ReactNode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Project } from '../../projects/types';
import { useProject } from '../../projects/hooks/useProjects';
import { CoveragePage } from './CoveragePage';

vi.mock('../../projects/hooks/useProjects', () => ({
  useProject: vi.fn(),
}));

vi.mock('../../../shared/components/AppShell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('../components/CoveragePanel', () => ({
  CoveragePanel: () => <div>Coverage Panel</div>,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('CoveragePage', () => {
  function renderPage(status: Project['status']) {
    vi.mocked(useProject).mockReturnValue({
      data: project(status),
      isLoading: false,
      error: null,
    } as ReturnType<typeof useProject>);

    render(
      <MemoryRouter initialEntries={['/projects/105/coverage']}>
        <Routes>
          <Route path="/projects/:id/coverage" element={<CoveragePage />} />
          <Route path="/projects/:id/unit-tests" element={<div>Unit Test Page</div>} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it('allows coverage once unit tests are generated', () => {
    renderPage('TEST_GENERATED');
    expect(screen.getByText('Coverage Panel')).toBeInTheDocument();
  });

  it('redirects to unit tests while cases are still under review', () => {
    renderPage('CASE_PENDING_REVIEW');
    expect(screen.getByText('Unit Test Page')).toBeInTheDocument();
    expect(screen.queryByText('Coverage Panel')).not.toBeInTheDocument();
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
