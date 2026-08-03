// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import type { ReactNode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Project } from '../../projects/types';
import { useProject } from '../../projects/hooks/useProjects';
import { ReportPage } from './ReportPage';

vi.mock('../../projects/hooks/useProjects', () => ({
  useProject: vi.fn(),
}));

vi.mock('../../../shared/components/AppShell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('../components/ReportPanel', () => ({
  ReportPanel: () => <div>Report Panel</div>,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ReportPage', () => {
  function renderPage(status: Project['status']) {
    vi.mocked(useProject).mockReturnValue({
      data: project(status),
      isLoading: false,
      error: null,
    } as ReturnType<typeof useProject>);

    render(
      <MemoryRouter initialEntries={['/projects/105/report']}>
        <Routes>
          <Route path="/projects/:id/report" element={<ReportPage />} />
          <Route path="/projects/:id/coverage" element={<div>Coverage Page</div>} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it('allows report once coverage is analyzed', () => {
    renderPage('COVERAGE_ANALYZED');
    expect(screen.getByText('Report Panel')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Traceability' })).toHaveAttribute('href', '/projects/105/traceability');
    expect(screen.queryByText('Mở Traceability')).not.toBeInTheDocument();
  });

  it('redirects to coverage while it has not been analyzed', () => {
    renderPage('TEST_GENERATED');
    expect(screen.getByText('Coverage Page')).toBeInTheDocument();
    expect(screen.queryByText('Report Panel')).not.toBeInTheDocument();
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
