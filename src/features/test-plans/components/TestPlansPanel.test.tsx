// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TestPlansPanel } from './TestPlansPanel';

const mocks = vi.hoisted(() => ({ generate: vi.fn(), generating: false, progress: undefined as unknown }));

vi.mock('../../../shared/hooks/useGenerationProgress', () => ({
  useGenerationProgress: () => ({ data: mocks.progress }),
}));

vi.mock('../hooks/useTestPlans', () => {
  const idleMutation = () => ({ isPending: false, error: null, mutate: vi.fn() });
  return {
    useTestPlans: () => ({
      data: [{ id: 1, projectId: 105, businessRuleId: 7, coveredRuleIds: [7], planCode: 'TP-001', title: 'Happy path', description: 'mo ta', testType: 'HAPPY_PATH', status: 'APPROVED', isModified: false, createdAt: null }],
      isLoading: false,
      error: null,
    }),
    useCreateTestPlan: idleMutation,
    useGenerateTestPlans: () => ({ isPending: mocks.generating, error: null, mutate: mocks.generate }),
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
  mocks.generating = false;
  mocks.progress = undefined;
});

describe('TestPlansPanel', () => {
  it('shows generation progress while Test Plans are being generated', () => {
    mocks.generating = true;
    mocks.progress = {
      stage: 'TEST_PLAN', status: 'RUNNING', percent: 50,
      completedSteps: 1, totalSteps: 2,
      steps: [
        { order: 1, label: 'Sinh Test Plan - batch 1/1', status: 'COMPLETED', percent: 100 },
        { order: 2, label: 'Kiểm tra và lưu Test Plan', status: 'RUNNING', percent: 0 },
      ],
      logs: [{ timestamp: '2026-08-14T12:00:00Z', message: 'Batch 1/1: nhận 3 Test Plan từ AI.' }],
    };
    render(<MemoryRouter><TestPlansPanel projectId={105} projectStatus="BR_APPROVED" /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: 'Log tiến độ 50%' }));
    expect(screen.getByRole('progressbar', { name: 'Tiến độ tổng thể' })).toBeVisible();
    expect(screen.getAllByText('50%')).toHaveLength(2);
    expect(screen.getByText('Batch 1/1: nhận 3 Test Plan từ AI.')).toBeVisible();
  });

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
