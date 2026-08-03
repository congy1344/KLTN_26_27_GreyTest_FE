// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import type { ReactNode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import type { Project } from '../../projects/types';
import { useProject } from '../../projects/hooks/useProjects';
import { TraceabilityPage } from './TraceabilityPage';

vi.mock('../../projects/hooks/useProjects', () => ({ useProject: vi.fn() }));
vi.mock('../../../shared/components/AppShell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('../components/TraceabilityMatrix', () => ({
  TraceabilityMatrix: () => <div>Traceability Matrix</div>,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderPage(status: Project['status']) {
  vi.mocked(useProject).mockReturnValue({
    data: project(status),
    isLoading: false,
    error: null,
  } as ReturnType<typeof useProject>);

  render(
    <MemoryRouter initialEntries={['/projects/105/traceability']}>
      <Routes>
        <Route path="/projects/:id/traceability" element={<TraceabilityPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

it('continues from traceability to the final report step', () => {
  renderPage('COVERAGE_ANALYZED');
  expect(screen.getByRole('link', { name: /Tiếp tục đến Report/i }))
    .toHaveAttribute('href', '/projects/105/report');
});

it('does not offer report before coverage is analyzed', () => {
  renderPage('TEST_GENERATED');
  expect(screen.queryByRole('link', { name: /Tiếp tục đến Report/i })).not.toBeInTheDocument();
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
