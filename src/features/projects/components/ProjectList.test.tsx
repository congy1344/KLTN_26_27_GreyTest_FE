// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProjectList } from './ProjectList';
import type { Project } from '../types';

const mocks = vi.hoisted(() => ({
  analyze: vi.fn(),
  remove: vi.fn(),
  pending: false,
  variables: undefined as number | undefined,
  project: {
    id: 7,
    name: 'Demo project',
    sourceType: 'ZIP',
    sourceUrl: null,
    status: 'UPLOADED',
    createdAt: '2026-07-28T10:00:00',
    ownerUserId: 1,
    sourceAvailable: true,
  } as Project,
}));

vi.mock('../hooks/useProjects', () => ({
  useProjects: () => ({ data: [mocks.project], isLoading: false, error: null }),
  useDeleteProject: () => ({ mutate: mocks.remove, isPending: false, error: null }),
  useAnalyzeProject: () => ({
    mutate: (projectId: number) => {
      mocks.analyze(projectId);
      mocks.pending = true;
      mocks.variables = projectId;
    },
    isPending: mocks.pending,
    variables: mocks.variables,
  }),
}));

function ProjectListRoutes() {
  return (
    <MemoryRouter initialEntries={['/projects']}>
      <Routes>
        <Route path="/projects" element={<ProjectList />} />
        <Route path="/projects/:projectId/coverage" element={<div>Coverage destination</div>} />
      </Routes>
    </MemoryRouter>
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mocks.pending = false;
  mocks.variables = undefined;
  mocks.project.status = 'UPLOADED';
});

describe('ProjectList', () => {
  it('keeps nested keyboard actions inside the card and disables repeated analysis', () => {
    const view = render(<ProjectListRoutes />);
    const analyzeButton = screen.getByRole('button', { name: 'Phân tích' });

    fireEvent.keyDown(analyzeButton, { key: 'Enter' });
    expect(screen.queryByText('Coverage destination')).not.toBeInTheDocument();

    fireEvent.click(analyzeButton);
    view.rerender(<ProjectListRoutes />);

    expect(mocks.analyze).toHaveBeenCalledWith(7);
    expect(screen.getByRole('button', { name: 'Phân tích' })).toBeDisabled();
  });

  it('opens a returning project at its current workflow step', () => {
    mocks.project.status = 'TEST_GENERATED';
    render(<ProjectListRoutes />);

    fireEvent.click(screen.getByRole('button', { name: /Demo project/ }));

    expect(screen.getByText('Coverage destination')).toBeInTheDocument();
  });
});
