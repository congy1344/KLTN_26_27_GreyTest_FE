// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BusinessRulesPanel } from './BusinessRulesPanel';

const mocks = vi.hoisted(() => ({
  generate: vi.fn(),
  review: vi.fn(),
  update: vi.fn(),
  rules: [{
    id: 1,
    projectId: 1,
    methodId: 11,
    ruleCode: 'BR-001',
    description: 'Email phai hop le.',
    reviewNote: null as string | null,
    suggestedDescription: null as string | null,
    source: 'AI_GENERATED' as const,
    status: 'PENDING_REVIEW' as const,
    isModified: false,
    createdAt: '',
    updatedAt: '',
  }],
}));

vi.mock('../../projects/hooks/useProjects', () => ({
  useAnalysis: () => ({ data: { classes: [] } }),
}));

vi.mock('../hooks/useBusinessRules', () => {
  const idleMutation = () => ({ isPending: false, error: null, mutate: vi.fn() });
  return {
    useBusinessRules: () => ({
      data: mocks.rules,
      isLoading: false,
      error: null,
    }),
    useCreateBusinessRules: idleMutation,
    useAcceptBusinessRuleSuggestion: idleMutation,
    useGenerateBusinessRules: () => ({ isPending: false, error: null, mutate: mocks.generate }),
    useReviewBusinessRules: () => ({ isPending: false, error: null, mutate: mocks.review }),
    useApproveBusinessRules: idleMutation,
    useUpdateBusinessRule: () => ({ isPending: false, error: null, mutate: mocks.update }),
    useDeleteBusinessRule: idleMutation,
  };
});

describe('BusinessRulesPanel', () => {
  afterEach(cleanup);

  beforeEach(() => {
    mocks.rules[0].isModified = false;
    mocks.rules[0].reviewNote = null;
    mocks.rules[0].suggestedDescription = null;
    mocks.review.mockReset();
    mocks.update.mockReset();
  });

  it('shows the empty-generation message while rules are collapsed', () => {
    mocks.generate.mockImplementation((_value, options) => options.onSuccess([]));
    render(<BusinessRulesPanel projectId={1} />);

    fireEvent.click(screen.getByRole('button', { name: 'Thu gon' }));
    fireEvent.click(screen.getByRole('button', { name: 'AI sinh BR' }));

    expect(screen.getByText('Khong con Service method chua co Business Rule.')).toBeVisible();
  });

  it('requires AI review only for user changes', () => {
    mocks.rules[0].isModified = true;
    render(<BusinessRulesPanel projectId={1} />);

    expect(screen.getByRole('button', { name: 'AI review thay doi (1)' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Approve tat ca' })).toBeDisabled();
  });

  it('keeps a persisted AI suggestion actionable after remount', () => {
    mocks.rules[0].reviewNote = 'NEEDS_REVISION: Can noi ro dieu kien.';
    mocks.rules[0].suggestedDescription = 'Email phai dung dinh dang hop le.';

    const { unmount } = render(<BusinessRulesPanel projectId={1} />);
    expect(screen.getByRole('button', { name: 'Dung goi y AI' })).toBeVisible();
    unmount();

    render(<BusinessRulesPanel projectId={1} />);
    expect(screen.getByRole('button', { name: 'Dung goi y AI' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Approve tat ca' })).toBeDisabled();
  });

  it('removes an obsolete review suggestion after a manual edit', () => {
    mocks.rules[0].isModified = true;
    mocks.review.mockImplementation((_value, options) => options.onSuccess({
      reviewedRules: [{
        ruleId: 1,
        verdict: 'NEEDS_REVISION',
        suggestedDescription: 'Email phai dung dinh dang hop le.',
        reason: 'Can noi ro dieu kien.',
      }],
      suggestedRules: [],
    }));
    mocks.update.mockImplementation((_value, options) => options.onSuccess());
    render(<BusinessRulesPanel projectId={1} />);

    fireEvent.click(screen.getByRole('button', { name: 'AI review thay doi (1)' }));
    expect(screen.getByRole('button', { name: 'Dung goi y AI' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Sua rule' }));
    fireEvent.change(screen.getByDisplayValue('Email phai hop le.'), {
      target: { value: 'Email phai co dinh dang hop le.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Luu' }));

    expect(screen.queryByRole('button', { name: 'Dung goi y AI' })).not.toBeInTheDocument();
  });
});
