// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import App from './App';
import { fetchProject, fetchProjectServices } from './features/projects/api/project-api';
import type { Project, ProjectServiceScope } from './features/projects/types';
import { approveTestCases, fetchTestCases } from './features/test-cases/api/test-case-api';
import type { TestCase } from './features/test-cases/types';

vi.mock('./features/projects/api/project-api');
vi.mock('./features/test-cases/api/test-case-api');
vi.mock('./features/projects/api/source-update-api', () => ({ fetchProjectSourceUpdates: async () => [] }));
vi.mock('./shared/hooks/useGenerationProgress', () => ({ useGenerationProgress: () => ({}) }));
vi.mock('./features/business-rules/hooks/useBusinessRules', () => ({ useBusinessRules: () => ({}) }));
vi.mock('./features/test-plans/hooks/useTestPlans', () => ({ useTestPlans: () => ({}) }));
vi.mock('./features/unit-tests/hooks/useUnitTests', () => ({ useUnitTests: () => ({}) }));
vi.mock('./features/projects/hooks/useProjects', async (importOriginal) => ({
  ...await importOriginal<typeof import('./features/projects/hooks/useProjects')>(),
  useAnalysis: () => ({ data: undefined }),
}));
vi.mock('./shared/components/AppShell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('./shared/components/UpgradeToProModal', () => ({ UpgradeToProModal: () => null }));
vi.mock('./features/projects/components/ProjectWorkspace', () => ({
  ProjectWorkspace: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock('./features/unit-tests/components/UnitTestsPanel', () => ({
  UnitTestsPanel: () => <h1>Unit Tests</h1>,
}));

afterEach(() => {
  cleanup();
  localStorage.removeItem('greytest.token');
  window.history.replaceState(null, '', '/');
  vi.restoreAllMocks();
});

it('opens Unit Tests after approval even if the service refresh is slower than the project refresh', async () => {
  const project: Project = {
    id: 105, name: 'demo', sourceType: 'ZIP', sourceUrl: null, status: 'CASE_PENDING_REVIEW',
    createdAt: '2026-07-17T00:00:00Z', ownerUserId: 1, sourceAvailable: true,
  };
  const service: ProjectServiceScope = {
    servicePath: '.', name: 'demo', status: 'CASE_PENDING_REVIEW', reachedStatus: 'CASE_PENDING_REVIEW',
  };
  const pendingCase: TestCase = {
    id: 1, testPlanId: 1, caseCode: 'TC-001', testType: 'HAPPY_PATH', priority: 'HIGH',
    description: 'Valid input', preconditions: '', expectedResult: 'Success', testData: {},
    traceSource: '', status: 'PENDING_REVIEW', isModified: false, createdAt: null,
  };
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  let resolveServices!: (services: ProjectServiceScope[]) => void;
  const servicesRefresh = new Promise<ProjectServiceScope[]>((resolve) => { resolveServices = resolve; });
  const approvedProject = { ...project, status: 'CASE_APPROVED' } as const;
  vi.mocked(fetchProject).mockResolvedValueOnce(project).mockResolvedValue(approvedProject);
  vi.mocked(fetchProjectServices).mockReturnValue(servicesRefresh);
  vi.mocked(fetchTestCases).mockResolvedValue([pendingCase]);
  vi.mocked(approveTestCases).mockResolvedValue([{ ...pendingCase, status: 'APPROVED' }]);
  client.setQueryData(['project', 105], project);
  client.setQueryData(['project-services', 105], [service]);
  localStorage.setItem('greytest.token', 'test-token');
  window.history.replaceState(null, '', '/projects/105/test-cases');
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

  render(<QueryClientProvider client={client}><App /></QueryClientProvider>);
  const approveButton = await screen.findByRole('button', { name: 'Duyệt tất cả' });
  fireEvent.click(approveButton);
  await waitFor(() => expect(approveTestCases).toHaveBeenCalledWith(105, '.'));
  // Chưa chuyển trang khi trạng thái service còn cũ, tránh bị đẩy ngược về Test Case.
  expect(window.location.pathname).toBe('/projects/105/test-cases');

  resolveServices([{ ...service, status: 'CASE_APPROVED', reachedStatus: 'CASE_APPROVED' }]);
  expect(await screen.findByRole('heading', { name: 'Unit Tests' })).toBeVisible();
  expect(window.location.pathname).toBe('/projects/105/unit-tests');
  expect(new URLSearchParams(window.location.search).get('servicePath')).toBe('.');
});
