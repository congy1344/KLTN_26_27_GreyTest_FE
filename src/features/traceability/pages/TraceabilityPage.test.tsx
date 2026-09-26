// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import type { ReactNode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import type { Project } from '../../projects/types';
import { useProject } from '../../projects/hooks/useProjects';
import { useProjectServiceScope } from '../../projects/hooks/useProjectServiceScope';
import { TraceabilityPage } from './TraceabilityPage';

vi.mock('../../projects/hooks/useProjects', () => ({
  useProject: vi.fn(),
  useCompleteProject: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
}));
vi.mock('../../projects/hooks/useProjectServiceScope', () => ({ useProjectServiceScope: vi.fn() }));
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
  vi.mocked(useProjectServiceScope).mockReturnValue({
    services: [{ servicePath: 'billing-service', name: 'billing-service', status }],
    selected: { servicePath: 'billing-service', name: 'billing-service', status },
    servicePath: 'billing-service',
    select: vi.fn(),
    isLoading: false,
    error: null,
    isError: false,
    isSuccess: true,
  } as never);

  render(
    <MemoryRouter initialEntries={['/projects/105/traceability?servicePath=billing-service']}>
      <Routes>
        <Route path="/projects/:id/traceability" element={<TraceabilityPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

it('continues from traceability to the final report step', () => {
  renderPage('COVERAGE_ANALYZED');
  expect(screen.getByRole('button', { name: /Tiếp tục đến Report/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /^05.*Coverage/ }))
    .toHaveAttribute('href', '/projects/105/coverage?servicePath=billing-service');
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
