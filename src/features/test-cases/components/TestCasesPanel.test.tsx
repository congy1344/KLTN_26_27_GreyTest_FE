// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TestPlan } from '../../test-plans/types';
import { TestCasesPanel } from './TestCasesPanel';

const mocks = vi.hoisted(() => ({
  plans: [] as TestPlan[],
  isLoading: false,
  error: null as Error | null,
}));

vi.mock('../../test-plans/hooks/useTestPlans', () => ({
  useTestPlans: () => ({
    data: mocks.plans,
    isLoading: mocks.isLoading,
    error: mocks.error,
  }),
}));

describe('TestCasesPanel', () => {
  beforeEach(() => {
    mocks.plans = [plan()];
    mocks.isLoading = false;
    mocks.error = null;
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('removes the manual create flow and generates drafts for approved plans', () => {
    mocks.plans = [
      plan(),
      plan({
        id: 11,
        businessRuleId: 8,
        planCode: 'PLAN-002',
        title: 'Duplicate email is rejected',
        testType: 'EXCEPTION',
      }),
    ];

    render(<TestCasesPanel projectId={105} />);

    expect(screen.queryByRole('button', { name: /Them Case|Thêm Case/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'AI sinh Case' }));

    expect(screen.getByText('TC-001')).toBeInTheDocument();
    expect(screen.getByText('TC-002')).toBeInTheDocument();
    expect(screen.getAllByText('DRAFT')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

    expect(screen.queryByText('DRAFT')).not.toBeInTheDocument();
    expect(screen.getAllByText('APPROVED')).toHaveLength(2);
  });

  it('generates a draft only for the selected approved plan', () => {
    mocks.plans = [
      plan(),
      plan({
        id: 11,
        businessRuleId: 8,
        planCode: 'PLAN-002',
        title: 'Duplicate email is rejected',
        testType: 'EXCEPTION',
      }),
    ];

    render(<TestCasesPanel projectId={105} />);

    expect(screen.getByRole('button', { name: 'AI sinh Case' })).toBeEnabled();

    fireEvent.change(screen.getByLabelText('Loc Test Plan'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'AI sinh Case' }));

    expect(screen.getByText('TC-001')).toBeInTheDocument();
    expect(screen.queryByText('TC-002')).not.toBeInTheDocument();
    expect(screen.getAllByText('PLAN-001').length).toBeGreaterThan(0);
  });

  it('keeps approval status when saving an edit after approval', () => {
    render(<TestCasesPanel projectId={105} />);

    generateCase();
    fireEvent.click(screen.getByRole('button', { name: 'Sua TC-001' }));
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    fireEvent.change(screen.getByLabelText('Edit description'), { target: { value: 'Kiem tra email moi' } });
    fireEvent.change(screen.getByLabelText('Edit test data'), { target: { value: '{"email":"new@test.com"}' } });
    fireEvent.click(screen.getByRole('button', { name: 'Luu thay doi' }));

    expect(screen.queryByText('DRAFT')).not.toBeInTheDocument();
    expect(screen.getByText('APPROVED')).toBeInTheDocument();
    expect(screen.getByText('Kiem tra email moi')).toBeInTheDocument();
  });

  it('clears local drafts when the project changes', () => {
    const { rerender } = render(<TestCasesPanel projectId={105} />);

    generateCase();
    expect(screen.getByText('TC-001')).toBeInTheDocument();

    rerender(<TestCasesPanel projectId={106} />);

    expect(screen.queryByText('TC-001')).not.toBeInTheDocument();
  });
});

function generateCase() {
  fireEvent.click(screen.getByRole('button', { name: 'AI sinh Case' }));
}

function plan(overrides: Partial<TestPlan> = {}): TestPlan {
  return {
    id: 10,
    projectId: 105,
    businessRuleId: 7,
    planCode: 'PLAN-001',
    title: 'Valid email registration',
    description: 'User can register with a valid email.',
    testType: 'HAPPY_PATH',
    status: 'APPROVED',
    isModified: false,
    createdAt: '2026-07-19T00:00:00Z',
    ...overrides,
  };
}
