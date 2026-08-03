// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TestPlansPanel } from './TestPlansPanel';

const mocks = vi.hoisted(() => ({ generate: vi.fn() }));

vi.mock('../hooks/useTestPlans', () => {
  const idleMutation = () => ({ isPending: false, error: null, mutate: vi.fn() });
  return {
    useTestPlans: () => ({
      data: [{ id: 1, projectId: 105, businessRuleId: 7, coveredRuleIds: [7], planCode: 'TP-001', title: 'Happy path', description: 'mo ta', testType: 'HAPPY_PATH', status: 'APPROVED', isModified: false, createdAt: null }],
      isLoading: false,
      error: null,
    }),
    useCreateTestPlan: idleMutation,
    useGenerateTestPlans: () => ({ isPending: false, error: null, mutate: mocks.generate }),
    useApproveTestPlans: idleMutation,
    useUpdateTestPlan: idleMutation,
    useDeleteTestPlan: idleMutation,
  };
});
vi.mock('../../business-rules/hooks/useBusinessRules', () => ({
  useBusinessRules: () => ({ data: [{ id: 7, methodId: 11, ruleCode: 'BR-007', sourceBranchId: 'IF-1-TRUE', description: 'Email hop le', status: 'APPROVED' }], error: null }),
}));
vi.mock('../../test-cases/hooks/useTestCases', () => ({
  useTestCases: () => ({ data: [{ id: 1, testPlanId: 1 }, { id: 2, testPlanId: 1 }, { id: 3, testPlanId: 1 }], isLoading: false, error: null }),
}));
vi.mock('../../unit-tests/hooks/useUnitTests', () => ({
  useUnitTests: () => ({ data: [{ id: 11 }, { id: 12 }], isLoading: false, error: null }),
}));
vi.mock('../../projects/hooks/useProjects', () => ({
  useAnalysis: () => ({ data: { classes: [{
    id: 10,
    className: 'UserService',
    filePath: 'src/main/java/demo/UserService.java',
    methods: [{
      id: 11,
      methodName: 'createUser',
      lineStart: 20,
      lineEnd: 30,
      branches: [{ branchId: 'IF-1-TRUE', kind: 'IF', outcome: 'TRUE', condition: 'email != null', lineStart: 22, lineEnd: 22 }],
    }],
  }] }, isLoading: false, error: null }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('TestPlansPanel', () => {
  it('warns about downstream cases and unit tests before regenerating plans', () => {
    render(<MemoryRouter><TestPlansPanel projectId={105} projectStatus="COVERAGE_ANALYZED" /></MemoryRouter>);

    expect(screen.getByText('UserService.createUser')).toBeVisible();
    expect(screen.getByText('IF-1-TRUE TRUE')).toBeVisible();
    const generateButton = screen.getByRole('button', { name: /AI sinh Plan/ });
    expect(generateButton).toBeEnabled();
    fireEvent.click(generateButton);

    const dialog = screen.getByRole('dialog', { name: /Sinh lại toàn bộ Test Plan/ });
    expect(dialog).toHaveTextContent('1 Test Plan');
    expect(dialog).toHaveTextContent('3 Test Case');
    expect(dialog).toHaveTextContent('2 Unit Test');
    expect(mocks.generate).not.toHaveBeenCalled();
  });
});
