// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import type { ReactNode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Project } from '../../projects/types';
import { useProject } from '../../projects/hooks/useProjects';
import { UnitTestsPage } from './UnitTestsPage';

vi.mock('../../projects/hooks/useProjects', () => ({
  useProject: vi.fn(),
}));

vi.mock('../../../shared/components/AppShell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('../components/UnitTestsPanel', () => ({
  UnitTestsPanel: () => <div>Unit Tests Panel</div>,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('UnitTestsPage', () => {
  it('allows unit tests while workflow locks are temporarily disabled', () => {
    vi.mocked(useProject).mockReturnValue({
      data: project('CASE_PENDING_REVIEW'),
      isLoading: false,
      error: null,
    } as ReturnType<typeof useProject>);

    render(
      <MemoryRouter initialEntries={['/projects/105/unit-tests']}>
        <Routes>
          <Route path="/projects/:id/unit-tests" element={<UnitTestsPage />} />
          <Route path="/projects/:id/test-cases" element={<div>Test Case Page</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Unit Tests Panel')).toBeInTheDocument();
    expect(screen.queryByText('Test Case Page')).not.toBeInTheDocument();
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
