// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BusinessRulesPanel } from '../../business-rules/components/BusinessRulesPanel';
import { TestPlansPanel } from '../../test-plans/components/TestPlansPanel';
import { TestCasesPanel } from '../../test-cases/components/TestCasesPanel';
import { UnitTestsPanel } from '../../unit-tests/components/UnitTestsPanel';
import type { ProjectStatus } from '../types';

const fixtures = vi.hoisted(() => {
  const labels = ['Old', 'Updated', 'New'];
  return {
    empty: false,
    fetching: false,
    analysisFetching: false,
    rules: labels.map((label, index) => ({
      id: index + 1, projectId: 105, methodId: index + 11, ruleCode: `BR-00${index + 1}`,
      description: `${label} rule`, status: 'APPROVED', source: 'AI_GENERATED', isModified: false,
    })),
    plans: labels.map((label, index) => ({
      id: index + 1, projectId: 105, businessRuleId: index + 1, coveredRuleIds: [index + 1],
      planCode: `TP-00${index + 1}`, title: `${label} plan`, description: `${label} plan description`,
      testType: 'HAPPY_PATH', status: 'APPROVED', isModified: false,
    })),
    cases: labels.map((label, index) => ({
      id: index + 1, testPlanId: index + 1, caseCode: `TC-00${index + 1}`, description: `${label} case`,
      testType: 'HAPPY_PATH', priority: 'HIGH', status: 'APPROVED', isModified: false,
      preconditions: '', testData: {}, expectedResult: 'success',
    })),
    units: labels.map((label, index) => ({
      id: index + 1, testCaseId: index + 1, testMethodName: `${label.toLowerCase()}Test`,
      testClassName: 'PatientServiceTest', filePath: 'PatientServiceTest.java',
      generationType: index === 2 ? 'NEW_TEST' : undefined,
    })),
    analysis: { classes: [{
      id: 10, className: 'PatientService', qualifiedName: 'demo.PatientService', classType: 'SERVICE',
      filePath: 'backend/patient-service/src/main/java/demo/PatientService.java',
      methods: labels.map((label, index) => ({
        id: index + 11, methodName: `${label.toLowerCase()}Method`, parameters: [], branches: [],
        lineStart: index + 1, lineEnd: index + 1, returnType: 'void', visibility: 'PUBLIC', endpoints: [],
      })),
    }] },
  };
});

vi.mock('../../../shared/hooks/useGenerationProgress', () => ({ useGenerationProgress: () => ({}) }));
vi.mock('../hooks/useProjects', () => ({ useAnalysis: () => ({ data: fixtures.analysis, isFetching: fixtures.analysisFetching }) }));
vi.mock('../../business-rules/hooks/useBusinessRules', () => {
  const idle = () => ({ mutate: vi.fn(), isPending: false });
  return {
    useBusinessRules: () => ({ data: fixtures.rules, isFetching: fixtures.fetching }),
    useCreateBusinessRules: idle, useAcceptBusinessRuleSuggestion: idle, useGenerateBusinessRules: idle,
    useReviewBusinessRules: idle, useApproveBusinessRules: idle, useUpdateBusinessRule: idle, useDeleteBusinessRule: idle,
  };
});
vi.mock('../../test-plans/hooks/useTestPlans', () => {
  const idle = () => ({ mutate: vi.fn(), isPending: false });
  return {
    useTestPlans: () => ({ data: fixtures.empty ? [] : fixtures.plans, isFetching: fixtures.fetching }),
    useCreateTestPlan: idle, useGenerateTestPlans: idle, useApproveTestPlans: idle,
    useUpdateTestPlan: idle, useDeleteTestPlan: idle,
  };
});
vi.mock('../../test-cases/hooks/useTestCases', () => {
  const idle = () => ({ mutate: vi.fn(), isPending: false });
  return {
    useTestCases: () => ({ data: fixtures.empty ? [] : fixtures.cases, isFetching: fixtures.fetching }),
    useGenerateTestCases: idle, useApproveTestCases: idle, useCreateTestCase: idle,
    useUpdateTestCase: idle, useDeleteTestCase: idle,
  };
});
vi.mock('../../unit-tests/hooks/useUnitTests', () => ({
  useUnitTests: () => ({ data: fixtures.empty ? [] : fixtures.units, isFetching: fixtures.fetching }),
  useUnitTestFiles: () => ({ data: [] }),
  useGenerateUnitTests: () => ({ mutate: vi.fn(), isPending: false }),
}));

afterEach(() => { cleanup(); localStorage.clear(); fixtures.empty = false; fixtures.fetching = false; fixtures.analysisFetching = false; });

describe('source update highlights after workflow approval and coverage', () => {
  const stages = [
    { name: 'Business Rules', Panel: BusinessRulesPanel, newLabel: 'New rule', modifiedLabel: 'Updated rule', oldLabel: 'Old rule' },
    { name: 'Test Plans', Panel: TestPlansPanel, newLabel: 'New plan', modifiedLabel: 'Updated plan', oldLabel: 'Old plan' },
    { name: 'Test Cases', Panel: TestCasesPanel, newLabel: 'New case', modifiedLabel: 'Updated case', oldLabel: 'Old case' },
    { name: 'Unit Tests', Panel: UnitTestsPanel, newLabel: 'newTest', modifiedLabel: 'updatedTest', oldLabel: 'oldTest' },
  ];

  for (const stage of stages) {
    for (const pending of stage.name === 'Business Rules' ? ['artifact', 'analysis'] : ['artifact']) {
      it(`${stage.name}: does not consume markers while cached ${pending} rows are refreshing`, () => {
        const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
        client.setQueryData(['source-updates', 105], [{
          id: 240, status: 'APPLIED', totalChangedMethods: 1,
          impactSummary: JSON.stringify({ changedMethods: [{
            qualifiedClassName: 'demo.PatientService', methodName: 'newMethod', signature: 'newMethod()', diffType: 'ADDED',
          }] }), items: [],
        }]);
        fixtures.fetching = pending === 'artifact';
        fixtures.analysisFetching = pending === 'analysis';
        const { Panel } = stage;
        const visit = () => render(<QueryClientProvider client={client}><MemoryRouter>
          <Panel projectId={105} projectStatus="TEST_GENERATED" servicePath="backend/patient-service" />
        </MemoryRouter></QueryClientProvider>);
        visit().unmount();
        fixtures.fetching = false;
        fixtures.analysisFetching = false;
        const loaded = visit();
        expect(screen.getAllByText('+ Mới thêm').length).toBeGreaterThan(0);
        loaded.unmount();
        client.clear();
      });
    }

    it(`${stage.name}: clears viewed indicators on return and restores them for a new update`, () => {
      const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
      client.setQueryData(['auth', 'me'], { id: 41 });
      const cacheUpdate = (id: number) => client.setQueryData(['source-updates', 105], [{
        id, status: 'APPLIED', totalChangedMethods: 2,
        impactSummary: JSON.stringify({ changedMethods: [
          { qualifiedClassName: 'demo.PatientService', methodName: 'updatedMethod', signature: 'updatedMethod()', diffType: 'MODIFIED' },
          { qualifiedClassName: 'demo.PatientService', methodName: 'newMethod', signature: 'newMethod()', diffType: 'ADDED' },
        ] }),
        items: ['BUSINESS_RULE', 'TEST_PLAN', 'TEST_CASE', 'UNIT_TEST'].flatMap((targetType) => [
          { targetType, targetId: 2, action: 'UPDATE' }, { targetType, targetId: 3, action: 'CREATE' },
        ]),
      }]);
      const { Panel } = stage;
      const visit = () => render(<QueryClientProvider client={client}><MemoryRouter>
        <Panel projectId={105} projectStatus="TEST_GENERATED" servicePath="backend/patient-service" />
      </MemoryRouter></QueryClientProvider>);
      cacheUpdate(200);
      const first = visit();
      expect(screen.getAllByText('+ Mới thêm').length).toBeGreaterThan(0);
      first.rerender(<QueryClientProvider client={client}><MemoryRouter>
        <Panel projectId={105} projectStatus="TEST_GENERATED" servicePath="backend/patient-service" />
      </MemoryRouter></QueryClientProvider>);
      expect(screen.getAllByText('+ Mới thêm').length).toBeGreaterThan(0);
      first.unmount();
      const second = visit();
      expect(screen.queryByText('+ Mới thêm')).not.toBeInTheDocument();
      expect(screen.queryByText(/Code liên quan đã thay đổi|Có thay đổi liên quan/)).not.toBeInTheDocument();
      expect(screen.queryByText('Test mới')).not.toBeInTheDocument();
      expect(screen.getAllByText(stage.newLabel).length).toBeGreaterThan(0);
      second.unmount();
      cacheUpdate(201);
      const third = visit();
      expect(screen.getAllByText('+ Mới thêm').length).toBeGreaterThan(0);
      third.unmount();
      client.clear();
    });

    it.each<ProjectStatus>(['COVERAGE_ANALYZED', 'COMPLETED'])(`${stage.name}: ${stage.name === 'Unit Tests' ? 'hides viewed generation indicators' : 'keeps badges and orders new, modified, unchanged'} at %s`, (status) => {
      localStorage.setItem('greytest.unit-tests-coverage-navigated.105', 'true');
      const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
      const changedMethods = [
        { qualifiedClassName: 'demo.PatientService', methodName: 'updatedMethod', signature: 'updatedMethod()', diffType: 'MODIFIED' },
        { qualifiedClassName: 'demo.PatientService', methodName: 'newMethod', signature: 'newMethod()', diffType: 'ADDED' },
      ];
      client.setQueryData(['source-updates', 105], [{
        id: 200, status: 'APPLIED', totalChangedMethods: 2,
        impactSummary: JSON.stringify({ changedMethods }),
        items: ['BUSINESS_RULE', 'TEST_PLAN', 'TEST_CASE', 'UNIT_TEST'].flatMap((targetType) => [
          { targetType, targetId: 2, action: 'UPDATE' },
          { targetType, targetId: 3, action: 'CREATE' },
        ]),
      }]);
      const { Panel } = stage;
      render(<QueryClientProvider client={client}><MemoryRouter>
        <Panel projectId={105} projectStatus={status} />
      </MemoryRouter></QueryClientProvider>);

      if (stage.name === 'Unit Tests') {
        expect(screen.queryByText('+ Mới thêm')).not.toBeInTheDocument();
        expect(screen.queryByText(/Code liên quan đã thay đổi|Có thay đổi liên quan/)).not.toBeInTheDocument();
        expect(screen.queryByText('Test mới')).not.toBeInTheDocument();
      } else {
        expect(screen.getAllByText('+ Mới thêm').length).toBeGreaterThan(0);
        expect(screen.getAllByText(/Code liên quan đã thay đổi|Có thay đổi liên quan/).length).toBeGreaterThan(0);
      }

      const added = screen.getAllByText(stage.newLabel)[0];
      const modified = screen.getAllByText(stage.modifiedLabel)[0];
      const unchanged = screen.getAllByText(stage.oldLabel)[0];
      expect(added.compareDocumentPosition(modified) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(modified.compareDocumentPosition(unchanged) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      client.clear();
    });
  }
});

describe('applied source deletion history in downstream panels', () => {
  const stages = [
    { Panel: TestPlansPanel, target: 'TEST_PLAN', label: 'Test Plan', currentLabel: 'New plan' },
    { Panel: TestCasesPanel, target: 'TEST_CASE', label: 'Test Case', currentLabel: 'New case' },
    { Panel: UnitTestsPanel, target: 'UNIT_TEST', label: 'Unit Test', currentLabel: 'newTest' },
  ];

  for (const { Panel, target, label, currentLabel } of stages) {
    it.each([false, true])(`${label}: shows removed records after Apply, current list empty=%s`, (empty) => {
      fixtures.empty = empty;
      const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
      const item = (id: number, reviewStatus = 'ACCEPTED') => ({
        id, targetType: target, targetId: id, action: 'REMOVE', reviewStatus,
        reason: `${label} thuộc method đã xóa`,
      });
      client.setQueryData(['source-updates', 105], [{
        id: 201, status: 'APPLIED', totalChangedMethods: 1,
        impactSummary: JSON.stringify({ changedMethods: [{
          qualifiedClassName: 'demo.PatientService', methodName: 'countActivePatients',
          signature: 'countActivePatients()', diffType: 'DELETED', servicePath: 'backend/patient-service',
        }] }),
        items: [item(99), item(98, 'REJECTED'), ...(!empty ? [item(1)] : [])],
      }]);
      render(<QueryClientProvider client={client}><MemoryRouter>
        <Panel projectId={105} projectStatus="COMPLETED" servicePath="backend/patient-service" />
      </MemoryRouter></QueryClientProvider>);

      const history = screen.getByRole('region', { name: `${label} đã xóa` });
      expect(history).toHaveTextContent(`${label} #99`);
      expect(history).toHaveTextContent('- ĐÃ XÓA');
      expect(history).toHaveTextContent(`${label} thuộc method đã xóa`);
      expect(history).not.toHaveTextContent(`${label} #98`);
      expect(history).not.toHaveTextContent(`${label} #1`);
      expect(history.querySelector('button')).toBeNull();
      if (!empty) {
        expect(screen.getAllByText(currentLabel)[0].compareDocumentPosition(history)
          & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      }
      client.clear();
    });
  }
});
