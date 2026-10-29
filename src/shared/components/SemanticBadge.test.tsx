// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { formatSemanticLabel, SemanticBadge } from './SemanticBadge';
import { LanguageProvider, useLanguage } from '../i18n/language';
import { LanguageToggle } from './LanguageToggle';

afterEach(() => {
  cleanup();
  localStorage.removeItem('greytest.language');
});

describe('SemanticBadge', () => {
  it.each([
    ['HAPPY_PATH', 'Trường hợp hợp lệ', 'bg-success-soft'],
    ['BOUNDARY', 'Trường hợp biên', 'bg-warning-soft'],
    ['EXCEPTION', 'Trường hợp ngoại lệ', 'bg-danger-soft'],
    ['EDGE', 'Trường hợp đặc biệt', 'bg-purple-soft'],
  ])('maps test type %s to its semantic color', (value, label, colorClass) => {
    render(<SemanticBadge kind="test-type" value={value} />);
    expect(screen.getByText(label)).toHaveClass(colorClass);
  });

  it('uses warning colors for pending review', () => {
    render(<SemanticBadge kind="review-status" value="PENDING_REVIEW" />);
    expect(screen.getByText('Chờ duyệt')).toHaveClass('bg-warning-soft', 'text-fg-warning');
  });

  it('updates labels immediately when the system language changes and preserves colors', () => {
    function Priority() {
      const { language } = useLanguage();
      return <span>{formatSemanticLabel('HIGH', language)}</span>;
    }
    render(<LanguageProvider><LanguageToggle /><Priority />
      <SemanticBadge kind="test-type" value="HAPPY_PATH" />
      <SemanticBadge kind="review-status" value="APPROVED" />
    </LanguageProvider>);
    expect(screen.getByText('Cao')).toBeVisible();
    expect(screen.getByText('Đã duyệt')).toHaveClass('bg-success-soft');
    fireEvent.click(screen.getByRole('button', { name: 'EN' }));
    expect(screen.getByText('High')).toBeVisible();
    expect(screen.getByText('Happy path')).toHaveClass('bg-success-soft');
    expect(screen.getByText('Approved')).toHaveClass('bg-success-soft');
    expect(screen.queryByText('Cao')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'VI' }));
    expect(screen.getByText('Cao')).toBeVisible();
    expect(screen.getByText('Trường hợp hợp lệ')).toBeVisible();
  });

  it('keeps technical identifiers and unknown values readable', () => {
    expect(formatSemanticLabel('BR-002', 'vi')).toBe('BR-002');
    expect(formatSemanticLabel('NEW_STATUS', 'en')).toBe('NEW STATUS');
    expect(formatSemanticLabel('toString', 'vi')).toBe('toString');
    expect(formatSemanticLabel(undefined, 'vi')).toBe('');
    expect(formatSemanticLabel(null, 'en')).toBe('');
  });
});
