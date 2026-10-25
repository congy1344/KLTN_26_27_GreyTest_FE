// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SourceUpdateDeletionHistory } from './SourceUpdateDeletionHistory';
import type { ImpactSummaryDto, SourceUpdateDto } from '../types';

afterEach(cleanup);

const update = (status: SourceUpdateDto['status'] = 'APPLIED'): SourceUpdateDto => ({
  id: 216, projectId: 811, baseRevisionId: 227, candidateRevisionId: 228, status,
  totalChangedMethods: 1, impactSummary: null, createdAt: '', updatedAt: '',
  items: [{
    id: 661, sourceUpdateId: 216, targetType: 'TEST_PLAN', targetId: 1907, targetKey: null,
    action: 'REMOVE', reason: 'Test Plan thuộc Business Rule đã bị xóa', beforeData: null,
    afterData: null, reviewStatus: 'ACCEPTED', createdAt: '', updatedAt: '',
  }],
});

const impact = (...paths: Array<string | undefined>): ImpactSummaryDto => ({
  totalChangedMethods: paths.length, addedMethodsCount: 0, modifiedMethodsCount: 0, deletedMethodsCount: paths.length,
  changedMethods: paths.map((servicePath, index) => ({
    className: `Service${index}`, qualifiedClassName: `demo.Service${index}`, methodName: 'removed',
    signature: 'removed()', methodKey: `demo.Service${index}#removed()`, diffType: 'DELETED', reason: '',
    beforeSource: '', afterSource: null, callerMethods: [], isServiceMethod: true, servicePath,
  })),
  affectedServiceMethods: [], affectedBusinessRuleIds: [], affectedTestPlanIds: [], affectedTestCaseIds: [], affectedUnitTestIds: [],
});

describe('SourceUpdateDeletionHistory', () => {
  it.each<SourceUpdateDto['status']>(['DRAFT', 'ANALYZED', 'READY_TO_APPLY', 'CANCELLED', 'FAILED'])(
    'does not describe pending or cancelled removals as deleted at %s', (status) => {
      render(<SourceUpdateDeletionHistory update={update(status)} impact={null} targetType="TEST_PLAN" currentIds={[]} />);
      expect(screen.queryByRole('region')).not.toBeInTheDocument();
    },
  );

  it('keeps removal history out of another service', () => {
    render(<SourceUpdateDeletionHistory update={update()} impact={impact('backend/patient-service')}
      targetType="TEST_PLAN" currentIds={[]} servicePath="backend/doctor-service" />);
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });

  it('supports the old ZIP wrapper after the current module path changes', () => {
    render(<SourceUpdateDeletionHistory update={update()}
      impact={impact('hospital-main/backend/patient-service')} targetType="TEST_PLAN" currentIds={[]}
      servicePath="backend/patient-service" />);
    expect(screen.getByText('Test Plan #1907')).toBeVisible();
    expect(screen.queryByText('Phạm vi: toàn project')).not.toBeInTheDocument();
  });

  it.each([
    ['backend/patient-service', 'backend/doctor-service'],
    ['backend/patient-service', undefined],
    [],
  ])('labels history as project-wide when item ownership cannot be resolved: %j', (...paths) => {
    render(<SourceUpdateDeletionHistory update={update()} impact={impact(...paths)} targetType="TEST_PLAN"
      currentIds={[]} servicePath="backend/patient-service" />);
    expect(screen.getByText('Phạm vi: toàn project')).toBeVisible();
  });

  it('shows a removal with modified review status and without old payload', () => {
    const applied = update();
    applied.items[0].reviewStatus = 'MODIFIED';
    render(<SourceUpdateDeletionHistory update={applied} impact={null} targetType="TEST_PLAN" currentIds={[]} />);
    expect(screen.getByText('Test Plan #1907')).toBeVisible();
  });

  it('does not claim an unsaved draft without targetId was deleted', () => {
    const applied = update();
    applied.items[0].targetId = null;
    render(<SourceUpdateDeletionHistory update={applied} impact={null} targetType="TEST_PLAN" currentIds={[]} />);
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });

  it.each([['.', 'project-main'], ['project-main', '.']])(
    'keeps history visible when wrapper changes from %s to %s', (previous, selected) => {
      render(<SourceUpdateDeletionHistory update={update()} impact={impact(previous)} targetType="TEST_PLAN"
        currentIds={[]} servicePath={selected} />);
      expect(screen.getByText('Test Plan #1907')).toBeVisible();
      expect(screen.getByText('Phạm vi: toàn project')).toBeVisible();
    },
  );
});
