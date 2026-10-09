// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TestCasesPanel } from './TestCasesPanel';

const mocks = vi.hoisted(() => ({
  generate: vi.fn(),
  approve: vi.fn(),
  create: vi.fn(),
  casesData: [] as unknown[],
  unitsData: [] as unknown[],
  unitsSuccess: true,
  unitsError: null as Error | null,
  planModified: false,
  plans: [{ id: 1, businessRuleId: 7, coveredRuleIds: [7], planCode: 'TP-001', title: 'Valid email', status: 'APPROVED' }],
  generating: false,
  progress: undefined as unknown,
}));
vi.mock('../../../shared/hooks/useGenerationProgress', () => ({ useGenerationProgress: () => ({ data: mocks.progress }) }));
vi.mock('../../test-plans/hooks/useTestPlans', () => ({ useTestPlans: () => ({ data: mocks.plans.map((plan) => ({ ...plan, isModified: mocks.planModified })), isLoading: false, error: null }) }));
vi.mock('../../business-rules/hooks/useBusinessRules', () => ({ useBusinessRules: () => ({ data: [{ id: 7, methodId: 11, ruleCode: 'BR-007', sourceBranchId: 'IF-1-TRUE', status: 'APPROVED' }], error: null }) }));
vi.mock('../../unit-tests/hooks/useUnitTests', () => ({ useUnitTests: () => ({
  data: mocks.unitsData,
  isLoading: false,
  isSuccess: mocks.unitsSuccess,
  error: mocks.unitsError,
}) }));
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
vi.mock('../hooks/useTestCases', () => ({
  useTestCases: () => ({ data: mocks.casesData, isLoading: false, isSuccess: true, error: null }),
  useGenerateTestCases: () => ({ mutate: mocks.generate, isPending: mocks.generating, error: null }),
  useApproveTestCases: () => ({ mutate: mocks.approve, isPending: false, error: null }),
  useCreateTestCase: () => ({ mutate: mocks.create, isPending: false, error: null }),
  useUpdateTestCase: () => ({ mutate: vi.fn(), isPending: false, error: null }),
  useDeleteTestCase: () => ({ mutate: vi.fn(), isPending: false, error: null }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mocks.casesData = [];
  mocks.unitsData = [];
  mocks.unitsSuccess = true;
  mocks.unitsError = null;
  mocks.planModified = false;
  mocks.generating = false;
  mocks.progress = undefined;
  mocks.plans = [{ id: 1, businessRuleId: 7, coveredRuleIds: [7], planCode: 'TP-001', title: 'Valid email', status: 'APPROVED' }];
});

function sampleCase(id: number) {
  return { id, testPlanId: 1, caseCode: `TC-00${id}`, testType: 'HAPPY_PATH', description: 'mo ta', preconditions: 'setup', testData: {}, expectedResult: 'ket qua', priority: 'HIGH', traceSource: 'BR-007 -> TP-001', status: 'APPROVED', isModified: false, createdAt: null };
}

describe('TestCasesPanel', () => {
  it('requires approved plans before generating or creating cases', () => {
    mocks.plans[0].status = 'PENDING_REVIEW';
    render(<MemoryRouter><TestCasesPanel projectId={105} projectStatus="PLAN_PENDING_REVIEW" /></MemoryRouter>);

    expect(screen.getByRole('button', { name: 'AI sinh Case' })).toBeDisabled();
    expect(screen.getByLabelText('Chọn Test Plan')).toBeDisabled();
    expect(screen.getByText('Hãy approve Test Plan trước khi sinh Test Case.')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'AI sinh Case' }));
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it('offers only approved plans and ignores pending plans in remaining generation counts', () => {
    mocks.plans.push({ ...mocks.plans[0], id: 2, planCode: 'TP-002', title: 'Pending plan', status: 'PENDING_REVIEW' });
    mocks.casesData = [sampleCase(1)];
    render(<MemoryRouter><TestCasesPanel projectId={105} projectStatus="PLAN_APPROVED" /></MemoryRouter>);

    expect(screen.getByRole('button', { name: 'AI sinh Case' })).toBeEnabled();
    expect(screen.queryByRole('option', { name: /TP-002/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Tiếp tục sinh/ })).not.toBeInTheDocument();
  });

  it('does not submit a selected plan after it loses approval', () => {
    const { rerender } = render(<MemoryRouter><TestCasesPanel projectId={105} projectStatus="PLAN_APPROVED" /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Chọn Test Plan'), { target: { value: '1' } });
    fireEvent.change(screen.getByPlaceholderText(/Mô tả scenario/), { target: { value: 'Equality' } });
    fireEvent.change(screen.getByPlaceholderText(/Preconditions/), { target: { value: 'Valid account' } });
    fireEvent.change(screen.getByPlaceholderText(/Expected result/), { target: { value: 'Success' } });
    expect(screen.getByRole('button', { name: /Thêm Case/ })).toBeEnabled();

    mocks.plans = [{ ...mocks.plans[0], status: 'PENDING_REVIEW' }, { ...mocks.plans[0], id: 2, planCode: 'TP-002' }];
    rerender(<MemoryRouter><TestCasesPanel projectId={105} projectStatus="PLAN_APPROVED" /></MemoryRouter>);
    expect(screen.getByRole('button', { name: /Thêm Case/ })).toBeDisabled();
    fireEvent.submit(screen.getByRole('button', { name: /Thêm Case/ }).closest('form')!);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it('shows generation progress while Test Cases are being generated', () => {
    mocks.generating = true;
    render(<MemoryRouter><TestCasesPanel projectId={105} projectStatus="PLAN_APPROVED" /></MemoryRouter>);

    expect(screen.getByRole('complementary')).toBeVisible();
  });

  it('keeps the draft label while using pending review colors', () => {
    mocks.casesData = [{ ...sampleCase(1), status: 'PENDING_REVIEW' }];
    render(<MemoryRouter><TestCasesPanel projectId={105} projectStatus="PLAN_APPROVED" /></MemoryRouter>);

    expect(screen.getByText('DRAFT')).toHaveClass('bg-warning-soft', 'text-fg-warning');
    expect(screen.queryByText('PENDING REVIEW')).not.toBeInTheDocument();
  });

  it('calls backend mutations instead of creating local fake cases', () => {
    render(<MemoryRouter><TestCasesPanel projectId={105} projectStatus="PLAN_APPROVED" /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'AI sinh Case' }));
    expect(mocks.generate).toHaveBeenCalledOnce();
    expect(screen.getByText(/lưu trực tiếp về backend/)).toBeInTheDocument();
    expect(screen.getByText('Test Plan đã approve')).toBeVisible();
  });

  it('does not display regeneration banner in TestCasesPanel as it is handled in source update flow', () => {
    mocks.casesData = [sampleCase(1), sampleCase(2)];
    mocks.unitsData = [{ id: 9, testCaseId: 1 }];
    mocks.planModified = true;

    render(<MemoryRouter><TestCasesPanel projectId={105} projectStatus="COVERAGE_ANALYZED" /></MemoryRouter>);

    expect(screen.getAllByText('UserService.createUser')).not.toHaveLength(0);
    expect(screen.getAllByText('IF-1-TRUE TRUE')).not.toHaveLength(0);
    expect(screen.getByRole('button', { name: 'AI sinh Case' })).toBeInTheDocument();
    expect(screen.queryByText('Test Plan cần cập nhật Test Case')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Sinh lại Case/ })).not.toBeInTheDocument();
  });

  it('displays error alert when related queries fail', () => {
    mocks.casesData = [sampleCase(1)];
    mocks.unitsSuccess = false;
    mocks.unitsError = new Error('Unit Test query failed');

    render(<MemoryRouter><TestCasesPanel projectId={105} projectStatus="COVERAGE_ANALYZED" /></MemoryRouter>);

    expect(screen.getByRole('alert')).toHaveTextContent('Có lỗi xảy ra');
  });

  it('creates a manual test case with auto trace source', () => {
    render(<MemoryRouter><TestCasesPanel projectId={105} projectStatus="PLAN_APPROVED" /></MemoryRouter>);

    fireEvent.change(screen.getByLabelText('Chọn Test Plan'), { target: { value: '1' } });
    fireEvent.change(screen.getByPlaceholderText(/Mô tả scenario/), { target: { value: 'Tao user hop le' } });
    fireEvent.change(screen.getByPlaceholderText(/Preconditions/), { target: { value: 'Mock repository' } });
    fireEvent.change(screen.getByPlaceholderText(/Expected result/), { target: { value: 'Tra ve user co ID' } });
    fireEvent.click(screen.getByRole('button', { name: /Thêm Case/ }));

    expect(mocks.create).toHaveBeenCalledOnce();
    expect(mocks.create.mock.calls[0][0]).toMatchObject({
      testPlanId: 1,
      description: 'Tao user hop le',
      traceSource: 'BR-007 [IF-1-TRUE] -> TP-001',
      testData: {},
    });
  });
});
