// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UnitTestsPanel } from './UnitTestsPanel';

const mocks = vi.hoisted(() => ({
  generate: vi.fn(),
  cases: [{ id: 1, testPlanId: 5, caseCode: 'TC-001', description: 'valid', status: 'APPROVED' }],
  tests: [] as Array<Record<string, unknown>>,
  files: [] as Array<Record<string, unknown>>,
  generating: false,
  progress: undefined as unknown,
}));
vi.mock('../../../shared/hooks/useGenerationProgress', () => ({ useGenerationProgress: () => ({ data: mocks.progress }) }));
vi.mock('../../test-cases/hooks/useTestCases', () => ({ useTestCases: () => ({ data: mocks.cases, error: null }) }));
vi.mock('../../test-plans/hooks/useTestPlans', () => ({ useTestPlans: () => ({ data: [{ id: 5, businessRuleId: 7, coveredRuleIds: [7], planCode: 'TP-005' }], error: null }) }));
vi.mock('../../business-rules/hooks/useBusinessRules', () => ({ useBusinessRules: () => ({ data: [{ id: 7, methodId: 11, ruleCode: 'BR-007', sourceBranchId: 'IF-1-TRUE' }], error: null }) }));
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
  }] }, error: null }),
}));
vi.mock('../hooks/useUnitTests', () => ({
  useUnitTests: () => ({ data: mocks.tests, isLoading: false, error: null }),
  useUnitTestFiles: () => ({ data: mocks.files, isLoading: false, error: null }),
  useGenerateUnitTests: () => ({ mutate: mocks.generate, isPending: mocks.generating, error: null }),
}));
vi.mock('../api/unit-test-api', () => ({ downloadUnitTestsZip: vi.fn() }));

function renderPanel() {
  return render(
    <MemoryRouter initialEntries={['/projects/105/unit-tests']}>
      <Routes>
        <Route path="/projects/:projectId/unit-tests" element={<UnitTestsPanel projectId={105} />} />
        <Route path="/projects/:projectId/coverage" element={<div>Coverage destination</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('UnitTestsPanel', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    mocks.cases = [{ id: 1, testPlanId: 5, caseCode: 'TC-001', description: 'valid', status: 'APPROVED' }];
    mocks.tests = [];
    mocks.files = [];
    mocks.generating = false;
    mocks.progress = undefined;
  });

  it('shows generation progress while Unit Tests are being generated', () => {
    mocks.generating = true;
    renderPanel();

    expect(screen.getByRole('button', { name: 'Log tiến độ' })).toBeVisible();
  });

  it('calls the backend generation endpoint', () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'AI sinh Unit Test' }));
    expect(mocks.generate).toHaveBeenCalledOnce();
    expect(screen.getByText(/lưu về backend/)).toBeInTheDocument();
    expect(screen.getByText('Test Case đã approve')).toBeVisible();
  });

  it('disables ZIP download until tests exist', () => {
    renderPanel();
    expect(screen.getByRole('button', { name: /Tải tất cả file/ })).toBeDisabled();
    expect(screen.getByText(/kèm công cụ tạo jacoco\.xml/i)).toBeVisible();
    expect(screen.getByRole('button', { name: /Tiếp tục đến Coverage/ })).toBeDisabled();
  });

  it('continues to Coverage when tests exist', () => {
    mocks.tests = [
      { id: 11, testCaseId: 1, testMethodName: 'firstMethod', testClassName: 'UserServiceTest', filePath: 'UserServiceTest.java' },
    ];
    renderPanel();

    fireEvent.click(screen.getByRole('button', { name: /Tiếp tục đến Coverage/ }));

    expect(screen.getByText('Coverage destination')).toBeInTheDocument();
  });

  it('moves the code preview to the selected test method', () => {
    const scrollIntoView = vi.fn();
    Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, value: scrollIntoView });
    const sourceCode = 'class UserServiceTest {\n  void firstMethod() {}\n\n  @DisplayName("secondMethod")\n  void secondMethod () {}\n}';
    mocks.tests = [
      { id: 11, testCaseId: 1, testMethodName: 'firstMethod', testClassName: 'UserServiceTest', filePath: 'UserServiceTest.java' },
      { id: 12, testCaseId: 1, testMethodName: 'secondMethod', testClassName: 'UserServiceTest', filePath: 'UserServiceTest.java' },
    ];
    mocks.files = [{
      testClassName: 'UserServiceTest',
      filePath: 'UserServiceTest.java',
      sourceCode,
      testCount: 2,
      caseCodes: ['TC-001'],
    }];

    renderPanel();
    scrollIntoView.mockClear();
    fireEvent.click(screen.getByRole('button', { name: /secondMethod/ }));

    expect(screen.getAllByText(/BR-007 \[IF-1-TRUE\].*TP-005.*TC-001/)).not.toHaveLength(0);
    expect(screen.getByText('UserService.createUser')).toBeVisible();
    const code = screen.getByRole('region', { name: 'Generated test code' });
    expect(within(code).getByText(/void secondMethod/).closest('li')).toHaveAttribute('aria-current', 'true');
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center', inline: 'nearest' });
  });

  it('shows exact case coverage and filters by method name', () => {
    mocks.tests = [
      { id: 11, testCaseId: 1, testMethodName: 'createUserValid', testClassName: 'UserServiceTest', packageName: 'demo', filePath: 'UserServiceTest.java' },
    ];

    renderPanel();

    expect(screen.getByText('1/1')).toBeVisible();
    expect(screen.getByText(/Đã kiểm chứng đủ/)).toBeVisible();
    const search = screen.getByRole('textbox', { name: 'Tìm Unit Test' });
    fireEvent.change(search, { target: { value: 'missing' } });
    expect(screen.queryByRole('button', { name: /createUserValid/ })).not.toBeInTheDocument();
    fireEvent.change(search, { target: { value: 'createUser' } });
    expect(screen.getByRole('button', { name: /createUserValid/ })).toBeVisible();
  });

  it('reports missing and duplicate tests at the same time', () => {
    mocks.cases = [
      { id: 1, testPlanId: 5, caseCode: 'TC-001', description: 'first', status: 'APPROVED' },
      { id: 2, testPlanId: 5, caseCode: 'TC-002', description: 'second', status: 'APPROVED' },
    ];
    mocks.tests = [
      { id: 11, testCaseId: 1, testMethodName: 'first', testClassName: 'ServiceTest', packageName: 'demo', filePath: 'ServiceTest.java' },
      { id: 12, testCaseId: 1, testMethodName: 'duplicate', testClassName: 'ServiceTest', packageName: 'demo', filePath: 'ServiceTest.java' },
    ];

    renderPanel();

    expect(screen.getByText(/Thiếu 1 case.*Trùng\/thừa 1 test/)).toBeVisible();
    expect(screen.getByRole('button', { name: /Tiếp tục đến Coverage/ })).toBeDisabled();
  });

  it('scrolls again when two files use the same method name and line', () => {
    const scrollIntoView = vi.fn();
    Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, value: scrollIntoView });
    mocks.cases = [
      { id: 1, testPlanId: 5, caseCode: 'TC-001', description: 'first', status: 'APPROVED' },
      { id: 2, testPlanId: 5, caseCode: 'TC-002', description: 'second', status: 'APPROVED' },
    ];
    mocks.tests = [
      { id: 11, testCaseId: 1, testMethodName: 'sameMethod', testClassName: 'FirstTest', packageName: 'demo', filePath: 'FirstTest.java' },
      { id: 12, testCaseId: 2, testMethodName: 'sameMethod', testClassName: 'SecondTest', packageName: 'demo', filePath: 'SecondTest.java' },
    ];
    mocks.files = [
      {
        testClassName: 'FirstTest', filePath: 'FirstTest.java', sourceCode: 'class FirstTest {\n void sameMethod() {}\n}',
        testCount: 1, caseCodes: ['TC-001'],
      },
      {
        testClassName: 'SecondTest', filePath: 'SecondTest.java', sourceCode: 'class SecondTest {\n void sameMethod() {}\n}',
        testCount: 1, caseCodes: ['TC-002'],
      },
    ];

    renderPanel();
    scrollIntoView.mockClear();
    fireEvent.click(screen.getByRole('button', { name: /TC-002 sameMethod/ }));

    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center', inline: 'nearest' });
    expect(within(screen.getByRole('region', { name: 'Generated test code' }))
      .getByText(/class SecondTest/)).toBeVisible();
  });
});
