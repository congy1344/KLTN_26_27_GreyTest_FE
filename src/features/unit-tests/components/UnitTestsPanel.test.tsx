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
  sourceUpdate: undefined as Record<string, unknown> | undefined,
}));
vi.mock('../../projects/hooks/useSourceUpdateImpact', () => ({ useSourceUpdateImpact: () => ({
  activeUpdate: mocks.sourceUpdate, changesSeen: false, methodDiffMap: {}, getMethodDiff: () => undefined,
  ...Object.fromEntries(['affectedUnitTestIds', 'affectedCaseIds', 'affectedPlanIds', 'affectedRuleIds',
    'addedUnitTestIds', 'modifiedUnitTestIds', 'deletedUnitTestIds', 'addedCaseIds', 'modifiedCaseIds', 'deletedCaseIds',
    'addedPlanIds', 'modifiedPlanIds', 'deletedPlanIds', 'addedRuleIds', 'modifiedRuleIds', 'deletedRuleIds'].map(key => [key, new Set()])),
}) }));
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
    localStorage.clear();
    cleanup();
    vi.clearAllMocks();
    mocks.cases = [{ id: 1, testPlanId: 5, caseCode: 'TC-001', description: 'valid', status: 'APPROVED' }];
    mocks.tests = [];
    mocks.files = [];
    mocks.generating = false;
    mocks.progress = undefined;
    mocks.sourceUpdate = undefined;
  });

  it('does not regenerate cases whose unit tests are already in an unapplied draft', () => {
    mocks.cases.push({ ...mocks.cases[0], id: 2, caseCode: 'TC-002' });
    mocks.tests = [{ id: 11, testCaseId: 1, testMethodName: 'first', testClassName: 'Test' }];
    mocks.sourceUpdate = { status: 'READY_TO_APPLY', items: [{ targetType: 'UNIT_TEST', action: 'CREATE',
      reviewStatus: 'ACCEPTED', afterData: JSON.stringify({ case_id: 2, source_code: 'class Test {}' }) }] };
    renderPanel();
    expect(screen.queryByRole('button', { name: /Tiếp tục sinh/ })).not.toBeInTheDocument();
    expect(screen.getByText(/1 Unit Test đã sinh trong bản cập nhật source/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Sinh lại toàn bộ' })).toBeDisabled();
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it.each(['APPLIED', 'unrelated'])('keeps genuine missing cases visible for %s drafts', (mode) => {
    mocks.cases.push({ ...mocks.cases[0], id: 2, caseCode: 'TC-002' });
    mocks.tests = [{ id: 11, testCaseId: 1, testMethodName: 'first', testClassName: 'Test' }];
    mocks.sourceUpdate = { status: mode === 'APPLIED' ? 'APPLIED' : 'READY_TO_APPLY', items: [{ targetType: 'UNIT_TEST',
      action: 'CREATE', reviewStatus: 'ACCEPTED', afterData: JSON.stringify({ case_id: mode === 'APPLIED' ? 2 : 999, source_code: 'class Test {}' }) }] };
    renderPanel();
    expect(screen.getByRole('button', { name: 'Tiếp tục sinh (1 case)' })).toBeEnabled();
  });

  it('shows generation progress while Unit Tests are being generated', () => {
    mocks.generating = true;
    renderPanel();

    expect(screen.getByRole('complementary')).toBeVisible();
  });

  it('calls the backend generation endpoint', () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'AI sinh Unit Test' }));
    expect(mocks.generate).toHaveBeenCalledOnce();
    expect(screen.getByText(/lưu về backend/)).toBeInTheDocument();
    expect(screen.getByText('Test Case đã approve')).toBeVisible();
  });

  it('requires approved cases before generating unit tests', () => {
    mocks.cases[0].status = 'PENDING_REVIEW';
    renderPanel();

    expect(screen.getByRole('button', { name: 'AI sinh Unit Test' })).toBeDisabled();
    expect(screen.getByText('Hãy approve Test Case trước khi sinh Unit Test.')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'AI sinh Unit Test' }));
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it('uses only approved cases for filters and generation coverage', () => {
    mocks.cases.push({ ...mocks.cases[0], id: 2, caseCode: 'TC-002', description: 'Pending case', status: 'PENDING_REVIEW' });
    mocks.tests = [{ id: 11, testCaseId: 1, testMethodName: 'firstMethod', testClassName: 'UserServiceTest', filePath: 'UserServiceTest.java' }];
    renderPanel();

    expect(screen.getByRole('button', { name: 'Sinh lại toàn bộ' })).toBeEnabled();
    expect(screen.queryByRole('option', { name: /TC-002/ })).not.toBeInTheDocument();
    expect(screen.getByText('1/1')).toBeVisible();
    expect(screen.queryByRole('button', { name: /Tiếp tục sinh/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tiếp tục đến Coverage/ })).toBeEnabled();
  });

  it('disables ZIP download until tests exist', () => {
    renderPanel();
    expect(screen.getByRole('button', { name: /Tải tất cả file/ })).toBeDisabled();
    expect(screen.getByText(/kèm công cụ tạo jacoco\.xml/i)).toBeVisible();
    expect(screen.getByText(/Maven hoặc Gradle/)).toBeVisible();
    expect(screen.getByRole('button', { name: /Tiếp tục đến Coverage/ })).toBeDisabled();
  });

  it('places coverage beside the generation controls', () => {
    renderPanel();

    const buttons = screen.getAllByRole('button');
    const downloadButton = buttons.find((button) => button.textContent?.includes('file'))!;
    const coverageButton = buttons.find((button) => button.textContent?.includes('Coverage') && !button.textContent?.includes('file'))!;
    const generateButton = screen.getByRole('button', { name: 'AI sinh Unit Test' });
    const actionGroup = generateButton.parentElement;

    expect(actionGroup).toHaveClass('flex-wrap', 'items-center', 'gap-2');
    expect(coverageButton.parentElement).toBe(actionGroup);
    expect(downloadButton.parentElement).not.toBe(actionGroup);
  });

  it('continues to Coverage when tests exist and marks coverage as navigated', () => {
    localStorage.clear();
    mocks.tests = [
      { id: 11, testCaseId: 1, testMethodName: 'firstMethod', testClassName: 'UserServiceTest', filePath: 'UserServiceTest.java' },
    ];
    renderPanel();

    fireEvent.click(screen.getByRole('button', { name: /Tiếp tục đến Coverage/ }));

    expect(screen.getByText('Coverage destination')).toBeInTheDocument();
    expect(localStorage.getItem('greytest.unit-tests-coverage-navigated.105')).toBe('true');
  });

  it('shows localized new-test tags, but clears them once coverage is navigated', () => {
    localStorage.clear();
    mocks.tests = [
      { id: 11, testCaseId: 1, testMethodName: 'firstMethod', testClassName: 'UserServiceTest', filePath: 'UserServiceTest.java', generationType: 'NEW_TEST' },
    ];
    const { unmount } = renderPanel();

    expect(screen.getByText('+ Mới thêm')).toBeInTheDocument();
    expect(screen.getByText('Test mới')).toBeInTheDocument();

    // Người dùng ấn nút Tiếp tục đến Coverage
    fireEvent.click(screen.getByRole('button', { name: /Tiếp tục đến Coverage/ }));
    expect(localStorage.getItem('greytest.unit-tests-coverage-navigated.105')).toBe('true');

    unmount();

    // Khi người dùng quay lại hoặc mở lại panel, các tag dấu hiệu mới thêm đã được xóa
    renderPanel();
    expect(screen.queryByText('+ Mới thêm')).not.toBeInTheDocument();
    expect(screen.queryByText('Test mới')).not.toBeInTheDocument();
  });

  it('does not scroll automatically on initial render', () => {
    const scrollIntoView = vi.fn();
    Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, value: scrollIntoView });
    mocks.tests = [
      { id: 11, testCaseId: 1, testMethodName: 'firstMethod', testClassName: 'UserServiceTest', filePath: 'UserServiceTest.java' },
    ];
    mocks.files = [{
      testClassName: 'UserServiceTest',
      filePath: 'UserServiceTest.java',
      sourceCode: 'class UserServiceTest {\n  void firstMethod() {}\n}',
      testCount: 1,
      caseCodes: ['TC-001'],
    }];

    renderPanel();
    expect(scrollIntoView).not.toHaveBeenCalled();
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

  it('opens the matching renamed fixture file when records keep their original path', () => {
    mocks.cases = [
      { id: 1, testPlanId: 5, caseCode: 'TC-001', description: 'first', status: 'APPROVED' },
      { id: 2, testPlanId: 5, caseCode: 'TC-002', description: 'second', status: 'APPROVED' },
    ];
    mocks.tests = [
      { id: 11, testCaseId: 1, testMethodName: 'firstMethod', testClassName: 'ServiceTest', filePath: 'src/test/java/demo/ServiceTest.java' },
      { id: 12, testCaseId: 2, testMethodName: 'secondMethod', testClassName: 'ServiceTest', filePath: 'src/test/java/demo/ServiceTest.java' },
    ];
    mocks.files = [
      {
        testClassName: 'ServiceTest_GreyTest_1', filePath: 'src/test/java/demo/ServiceTest_GreyTest_1.java',
        sourceCode: 'class ServiceTest_GreyTest_1 {\n void firstMethod() {}\n}', testCount: 1, caseCodes: ['TC-001'],
      },
      {
        testClassName: 'ServiceTest_GreyTest_2', filePath: 'src/test/java/demo/ServiceTest_GreyTest_2.java',
        sourceCode: 'class ServiceTest_GreyTest_2 {\n void secondMethod() {}\n}', testCount: 1, caseCodes: ['TC-002'],
      },
    ];

    renderPanel();

    expect(screen.queryByText('Không tìm thấy file test.')).not.toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Generated test code' }))
      .getByText(/class ServiceTest_GreyTest_1/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: /TC-002 secondMethod/ }));
    const code = screen.getByRole('region', { name: 'Generated test code' });
    expect(within(code).getByText(/class ServiceTest_GreyTest_2/)).toBeVisible();
    expect(within(code).getByText(/void secondMethod/).closest('li')).toHaveAttribute('aria-current', 'true');
  });

  it('selects another case inside a renamed merged file', () => {
    mocks.cases = [
      { id: 1, testPlanId: 5, caseCode: 'TC-001', description: 'first', status: 'APPROVED' },
      { id: 2, testPlanId: 5, caseCode: 'TC-002', description: 'second', status: 'APPROVED' },
    ];
    mocks.tests = [
      { id: 11, testCaseId: 1, testMethodName: 'firstMethod', testClassName: 'ServiceTest', filePath: 'ServiceTest.java' },
      { id: 12, testCaseId: 2, testMethodName: 'secondMethod', testClassName: 'ServiceTest', filePath: 'ServiceTest.java' },
    ];
    mocks.files = [{
      testClassName: 'ServiceTest_GreyTest_1', filePath: 'ServiceTest_GreyTest_1.java',
      sourceCode: 'class ServiceTest_GreyTest_1 {\n void firstMethod() {}\n void secondMethod() {}\n}',
      testCount: 2, caseCodes: ['TC-001', 'TC-002'],
    }];

    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'TC-002' }));

    expect(within(screen.getByRole('region', { name: 'Generated test code' }))
      .getByText(/void secondMethod/).closest('li')).toHaveAttribute('aria-current', 'true');
  });

  it('keeps opening legacy files with no case code metadata by their exact path', () => {
    mocks.tests = [
      { id: 11, testCaseId: 1, testMethodName: 'firstMethod', testClassName: 'ServiceTest', filePath: 'ServiceTest.java' },
    ];
    mocks.files = [{
      testClassName: 'ServiceTest', filePath: 'ServiceTest.java',
      sourceCode: 'class ServiceTest {\n void firstMethod() {}\n}', testCount: 1, caseCodes: [],
    }];

    renderPanel();

    expect(within(screen.getByRole('region', { name: 'Generated test code' }))
      .getByText(/void firstMethod/)).toBeVisible();
  });

  it('does not display a file whose case metadata conflicts with the selected record', () => {
    mocks.tests = [
      { id: 11, testCaseId: 1, testMethodName: 'firstMethod', testClassName: 'ServiceTest', filePath: 'ServiceTest.java' },
    ];
    mocks.files = [{
      testClassName: 'ServiceTest', filePath: 'ServiceTest.java',
      sourceCode: 'class ServiceTest {\n void unrelatedMethod() {}\n}', testCount: 1, caseCodes: ['TC-999'],
    }];

    renderPanel();

    expect(screen.getByText('Không tìm thấy file test.')).toBeVisible();
    expect(screen.queryByRole('region', { name: 'Generated test code' })).not.toBeInTheDocument();
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

  it('paginates method list when there are more than 8 methods and allows navigation', () => {
    mocks.cases = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1, testPlanId: 5, caseCode: `TC-00${i + 1}`, description: `desc ${i + 1}`, status: 'APPROVED',
    }));
    mocks.tests = Array.from({ length: 10 }, (_, i) => ({
      id: 100 + i, testCaseId: i + 1, testMethodName: `testMethod_${i + 1}`, testClassName: 'UserServiceTest', packageName: 'demo', filePath: 'UserServiceTest.java',
    }));
    mocks.files = [{
      testClassName: 'UserServiceTest', filePath: 'UserServiceTest.java', sourceCode: 'class UserServiceTest {}',
      testCount: 10, caseCodes: mocks.cases.map((c) => c.caseCode),
    }];

    renderPanel();

    expect(screen.getByText('Trang 1/2')).toBeVisible();
    expect(screen.getByRole('button', { name: /testMethod_1/ })).toBeVisible();
    expect(screen.getByRole('button', { name: /testMethod_8/ })).toBeVisible();
    expect(screen.queryByRole('button', { name: /testMethod_9/ })).not.toBeInTheDocument();

    // Chuyển sang trang 2
    fireEvent.click(screen.getByRole('button', { name: 'Trang sau' }));
    expect(screen.getByText('Trang 2/2')).toBeVisible();
    expect(screen.getByRole('button', { name: /testMethod_9/ })).toBeVisible();
    expect(screen.getByRole('button', { name: /testMethod_10/ })).toBeVisible();
    expect(screen.queryByRole('button', { name: /testMethod_1\b/ })).not.toBeInTheDocument();
  });

  it('jumps to the corresponding page when clicking a case code chip in the file view', () => {
    mocks.cases = Array.from({ length: 10 }, (_, i) => ({
      id: i + 1, testPlanId: 5, caseCode: `TC-00${i + 1}`, description: `desc ${i + 1}`, status: 'APPROVED',
    }));
    mocks.tests = Array.from({ length: 10 }, (_, i) => ({
      id: 100 + i, testCaseId: i + 1, testMethodName: `testMethod_${i + 1}`, testClassName: 'UserServiceTest', packageName: 'demo', filePath: 'UserServiceTest.java',
    }));
    mocks.files = [{
      testClassName: 'UserServiceTest', filePath: 'UserServiceTest.java', sourceCode: 'class UserServiceTest {}',
      testCount: 10, caseCodes: mocks.cases.map((c) => c.caseCode),
    }];

    renderPanel();

    expect(screen.getByText('Trang 1/2')).toBeVisible();
    // Bấm chip TC-009 ở phần file view bên phải
    fireEvent.click(screen.getByRole('button', { name: 'TC-009' }));

    // Tự động chuyển sang Trang 2 và hiển thị testMethod_9
    expect(screen.getByText('Trang 2/2')).toBeVisible();
    expect(screen.getByRole('button', { name: /testMethod_9/ })).toBeVisible();
  });

  it('hides diff badges and generationType indicator when navigated to coverage or project is at COVERAGE_ANALYZED', () => {
    mocks.cases = [{ id: 1, testPlanId: 5, caseCode: 'TC-001', description: 'desc 1', status: 'APPROVED' }];
    mocks.tests = [{
      id: 101,
      testCaseId: 1,
      testMethodName: 'testUpdateMethod',
      testClassName: 'AppointmentServiceTest',
      packageName: 'demo',
      filePath: 'AppointmentServiceTest.java',
      generationType: 'IMPROVE_EXISTING_TEST',
    }];
    mocks.files = [{
      testClassName: 'AppointmentServiceTest',
      filePath: 'AppointmentServiceTest.java',
      sourceCode: 'class AppointmentServiceTest {}',
      testCount: 1,
      caseCodes: ['TC-001'],
    }];

    // Khi chưa sang coverage -> hiện badge và indicator
    const { unmount } = render(
      <MemoryRouter initialEntries={['/projects/105/unit-tests']}>
        <Routes>
          <Route path="/projects/:projectId/unit-tests" element={<UnitTestsPanel projectId={105} projectStatus="TEST_GENERATED" />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getAllByText('Có thay đổi liên quan').length).toBeGreaterThan(0);
    expect(screen.getByText('Cải thiện test có sẵn')).toBeInTheDocument();
    unmount();

    // Khi đã qua bước coverage (COVERAGE_ANALYZED) -> ẩn toàn bộ dấu hiệu
    render(
      <MemoryRouter initialEntries={['/projects/105/unit-tests']}>
        <Routes>
          <Route path="/projects/:projectId/unit-tests" element={<UnitTestsPanel projectId={105} projectStatus="COVERAGE_ANALYZED" />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.queryAllByText('Có thay đổi liên quan')).toHaveLength(0);
    expect(screen.queryByText('Cải thiện test có sẵn')).not.toBeInTheDocument();
  });
});
