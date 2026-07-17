// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BusinessRulesPanel } from './BusinessRulesPanel';

const mocks = vi.hoisted(() => ({ generate: vi.fn() }));

vi.mock('../../projects/hooks/useProjects', () => ({
  useAnalysis: () => ({ data: { classes: [] } }),
}));

vi.mock('../hooks/useBusinessRules', () => {
  const idleMutation = () => ({ isPending: false, error: null, mutate: vi.fn() });
  return {
    useBusinessRules: () => ({
      data: [{
        id: 1,
        projectId: 1,
        methodId: 11,
        ruleCode: 'BR-001',
        description: 'Email phai hop le.',
        reviewNote: null,
        source: 'AI_GENERATED',
        status: 'PENDING_REVIEW',
        isModified: false,
        createdAt: '',
        updatedAt: '',
      }],
      isLoading: false,
      error: null,
    }),
    useCreateBusinessRules: idleMutation,
    useGenerateBusinessRules: () => ({ isPending: false, error: null, mutate: mocks.generate }),
    useReviewBusinessRules: idleMutation,
    useApproveBusinessRules: idleMutation,
    useUpdateBusinessRule: idleMutation,
    useDeleteBusinessRule: idleMutation,
  };
});

describe('BusinessRulesPanel', () => {
  it('shows the empty-generation message while rules are collapsed', () => {
    mocks.generate.mockImplementation((_value, options) => options.onSuccess([]));
    render(<BusinessRulesPanel projectId={1} />);

    fireEvent.click(screen.getByRole('button', { name: 'Thu gon' }));
    fireEvent.click(screen.getByRole('button', { name: 'AI sinh BR' }));

    expect(screen.getByText('Khong con Service method chua co Business Rule.')).toBeVisible();
  });
});
