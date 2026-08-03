// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UnitTestsPanel } from './UnitTestsPanel';

const mocks = vi.hoisted(() => ({
  generate: vi.fn(),
  tests: [] as Array<Record<string, unknown>>,
  files: [] as Array<Record<string, unknown>>,
}));
vi.mock('../../test-cases/hooks/useTestCases', () => ({ useTestCases: () => ({ data: [{ id: 1, testPlanId: 5, caseCode: 'TC-001', description: 'valid', status: 'APPROVED' }], error: null }) }));
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
  useGenerateUnitTests: () => ({ mutate: mocks.generate, isPending: false, error: null }),
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
    mocks.tests = [];
    mocks.files = [];
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
    const sourceCode = 'class UserServiceTest {\n  void firstMethod() {}\n\n  @DisplayName("secondMethod")\n  void secondMethod() {}\n}';
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
    fireEvent.click(screen.getByRole('button', { name: /secondMethod/ }));

    expect(screen.getAllByText(/BR-007 \[IF-1-TRUE\].*TP-005.*TC-001/)).not.toHaveLength(0);
    expect(screen.getByText('UserService.createUser')).toBeVisible();
    const code = screen.getByLabelText('Generated test code') as HTMLTextAreaElement;
    const declarationIndex = sourceCode.indexOf('void secondMethod(') + 'void '.length;
    expect(code.selectionStart).toBe(declarationIndex);
    expect(code.selectionEnd).toBe(declarationIndex + 'secondMethod'.length);
  });
});
