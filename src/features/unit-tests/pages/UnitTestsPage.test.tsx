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
  function renderPage(status: Project['status'], workflowNotice?: string) {
    vi.mocked(useProject).mockReturnValue({
      data: project(status),
      isLoading: false,
      error: null,
    } as ReturnType<typeof useProject>);

    render(
      <MemoryRouter initialEntries={[{
        pathname: '/projects/105/unit-tests',
        state: workflowNotice ? { workflowNotice } : null,
      }]}>
        <Routes>
          <Route path="/projects/:id/unit-tests" element={<UnitTestsPage />} />
          <Route path="/projects/:id/test-cases" element={<div>Test Case Page</div>} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it('allows unit tests once test cases are approved', () => {
    renderPage('CASE_APPROVED');
    expect(screen.getByText('Unit Tests Panel')).toBeInTheDocument();
  });

  it('redirects to test cases while they are still under review', () => {
    renderPage('CASE_PENDING_REVIEW');
    expect(screen.getByText('Test Case Page')).toBeInTheDocument();
    expect(screen.queryByText('Unit Tests Panel')).not.toBeInTheDocument();
  });

  it('shows the workflow transition notice on the destination page', () => {
    renderPage('CASE_APPROVED', 'Đã duyệt Test Case. Chuyển sang bước Unit Test.');

    expect(screen.getByText('Đã duyệt Test Case. Chuyển sang bước Unit Test.')).toBeInTheDocument();
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
