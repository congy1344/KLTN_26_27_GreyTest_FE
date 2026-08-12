// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SemanticBadge } from './SemanticBadge';

describe('SemanticBadge', () => {
  it.each([
    ['HAPPY_PATH', 'HAPPY PATH', 'bg-success-soft'],
    ['BOUNDARY', 'BOUNDARY', 'bg-warning-soft'],
    ['EXCEPTION', 'EXCEPTION', 'bg-danger-soft'],
    ['EDGE', 'EDGE CASE', 'bg-purple-soft'],
  ])('maps test type %s to its semantic color', (value, label, colorClass) => {
    render(<SemanticBadge kind="test-type" value={value} />);
    expect(screen.getByText(label)).toHaveClass(colorClass);
  });

  it('uses warning colors for pending review', () => {
    render(<SemanticBadge kind="review-status" value="PENDING_REVIEW" />);
    expect(screen.getByText('PENDING REVIEW')).toHaveClass('bg-warning-soft', 'text-fg-warning');
  });
});
