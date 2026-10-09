// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TestPlansPanel } from './TestPlansPanel';

const mocks = vi.hoisted(() => ({ generate: vi.fn(), generating: false, progress: undefined as unknown,
  rules: [{ id: 7, methodId: 11, ruleCode: 'BR-007', sourceBranchId: 'IF-1-TRUE', description: 'Email hop le', status: 'APPROVED' }],
}));

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
  useBusinessRules: () => ({ data: mocks.rules, error: null }),
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
  mocks.rules = [{ id: 7, methodId: 11, ruleCode: 'BR-007', sourceBranchId: 'IF-1-TRUE', description: 'Email hop le', status: 'APPROVED' }];
});

describe('TestPlansPanel', () => {
  it('requires approved business rules before generating or creating plans', () => {
    mocks.rules[0].status = 'PENDING_REVIEW';
    render(<MemoryRouter><TestPlansPanel projectId={105} projectStatus="BR_PENDING_REVIEW" /></MemoryRouter>);

    expect(screen.getByRole('button', { name: /AI sinh Plan/ })).toBeDisabled();
    expect(screen.getAllByRole('combobox')[0]).toBeDisabled();
    expect(screen.getByText('Hãy approve Business Rule trước khi sinh Test Plan.')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: /AI sinh Plan/ }));
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it('offers only approved rules and excludes pending rules from missing coverage', () => {
    mocks.rules.push({ ...mocks.rules[0], id: 8, ruleCode: 'BR-008', description: 'Pending rule', status: 'PENDING_REVIEW' });
    render(<MemoryRouter><TestPlansPanel projectId={105} projectStatus="BR_APPROVED" /></MemoryRouter>);

    expect(screen.getByRole('button', { name: /AI sinh Plan/ })).toBeEnabled();
    expect(within(screen.getAllByRole('combobox')[0]).getAllByRole('option')).toHaveLength(2);
    expect(screen.queryByRole('option', { name: /BR-008/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Tiếp tục sinh/ })).not.toBeInTheDocument();
  });

  it('disables manual creation when the selected rule loses approval', () => {
    const panel = <MemoryRouter><TestPlansPanel projectId={105} projectStatus="BR_APPROVED" /></MemoryRouter>;
    const { rerender } = render(panel);
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: '7' } });
    fireEvent.change(screen.getByPlaceholderText('Tiêu đề Test Plan'), { target: { value: 'Equality' } });
    fireEvent.change(screen.getByPlaceholderText('Mục tiêu test'), { target: { value: 'Allow equality' } });
    expect(screen.getByRole('button', { name: /Thêm Plan/ })).toBeEnabled();

    mocks.rules = [{ ...mocks.rules[0], status: 'PENDING_REVIEW' }, { ...mocks.rules[0], id: 8, ruleCode: 'BR-008' }];
    rerender(<MemoryRouter><TestPlansPanel projectId={105} projectStatus="BR_APPROVED" /></MemoryRouter>);
    expect(screen.getByRole('button', { name: /Thêm Plan/ })).toBeDisabled();
  });
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

    const floatingDock = screen.getByRole('complementary');
    expect(floatingDock).toBeVisible();
    expect(within(floatingDock).getByText('50%')).toBeVisible();
    expect(within(floatingDock).getByText('Batch 1/1: nhận 3 Test Plan từ AI.')).toBeVisible();
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
