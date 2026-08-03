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
}));
vi.mock('../../test-plans/hooks/useTestPlans', () => ({ useTestPlans: () => ({ data: [{ id: 1, businessRuleId: 7, coveredRuleIds: [7], planCode: 'TP-001', title: 'Valid email', status: 'APPROVED', isModified: mocks.planModified }], isLoading: false, error: null }) }));
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
  useGenerateTestCases: () => ({ mutate: mocks.generate, isPending: false, error: null }),
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
});

function sampleCase(id: number) {
  return { id, testPlanId: 1, caseCode: `TC-00${id}`, testType: 'HAPPY_PATH', description: 'mo ta', preconditions: 'setup', testData: {}, expectedResult: 'ket qua', priority: 'HIGH', traceSource: 'BR-007 -> TP-001', status: 'APPROVED', isModified: false, createdAt: null };
}

describe('TestCasesPanel', () => {
  it('calls backend mutations instead of creating local fake cases', () => {
    render(<MemoryRouter><TestCasesPanel projectId={105} projectStatus="PLAN_APPROVED" /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'AI sinh Case' }));
    expect(mocks.generate).toHaveBeenCalledOnce();
    expect(screen.getByText(/lưu trực tiếp về backend/)).toBeInTheDocument();
    expect(screen.getByText('Test Plan đã approve')).toBeVisible();
  });

  it('regenerates only the modified plan after confirmation', () => {
    mocks.casesData = [sampleCase(1), sampleCase(2)];
    mocks.unitsData = [{ id: 9, testCaseId: 1 }];
    mocks.planModified = true;

    render(<MemoryRouter><TestCasesPanel projectId={105} projectStatus="COVERAGE_ANALYZED" /></MemoryRouter>);

    expect(screen.getAllByText('UserService.createUser')).not.toHaveLength(0);
    expect(screen.getAllByText('IF-1-TRUE TRUE')).not.toHaveLength(0);
    expect(screen.queryByRole('button', { name: 'AI sinh Case' })).not.toBeInTheDocument();
    const generateButton = screen.getByRole('button', { name: 'Sinh lại Case · TP-001' });
    expect(generateButton).toBeEnabled();
    fireEvent.click(generateButton);

    const dialog = screen.getByRole('dialog', { name: /Sinh lại Test Case của plan này/ });
    expect(dialog).toHaveTextContent('2 Test Case');
    expect(dialog).toHaveTextContent('1 Unit Test');
    expect(dialog).toHaveTextContent('Dữ liệu của plan khác được giữ nguyên');
    expect(mocks.generate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Sinh lại' }));
    expect(mocks.generate).toHaveBeenCalledWith(1);
  });

  it('blocks regeneration when related Unit Test data cannot be loaded', () => {
    mocks.casesData = [sampleCase(1)];
    mocks.planModified = true;
    mocks.unitsSuccess = false;
    mocks.unitsError = new Error('Unit Test query failed');

    render(<MemoryRouter><TestCasesPanel projectId={105} projectStatus="COVERAGE_ANALYZED" /></MemoryRouter>);

    expect(screen.getByRole('button', { name: 'Sinh lại Case · TP-001' })).toBeDisabled();
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
