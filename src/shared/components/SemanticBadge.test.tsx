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
    ['HAPPY_PATH', 'Trường hợp hợp lệ', 'success'],
    ['BOUNDARY', 'Trường hợp biên', 'warning'],
    ['EXCEPTION', 'Trường hợp ngoại lệ', 'danger'],
    ['EDGE', 'Trường hợp đặc biệt', 'brand'],
  ])('maps test type %s to its semantic tone', (value, label, tone) => {
    render(<SemanticBadge kind="test-type" value={value} />);
    expect(screen.getByText(label)).toHaveAttribute('data-tone', tone);
  });

  it('uses warning colors for pending review', () => {
    render(<SemanticBadge kind="review-status" value="PENDING_REVIEW" />);
    expect(screen.getByText('Chờ duyệt')).toHaveAttribute('data-tone', 'warning');
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
    expect(screen.getByText('Đã duyệt')).toHaveAttribute('data-tone', 'success');
    fireEvent.click(screen.getByRole('button', { name: 'EN' }));
    expect(screen.getByText('High')).toBeVisible();
    expect(screen.getByText('Happy path')).toHaveAttribute('data-tone', 'success');
    expect(screen.getByText('Approved')).toHaveAttribute('data-tone', 'success');
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
    expect(formatSemanticLabel(128, 'vi')).toBe('128');
    expect(formatSemanticLabel(0, 'en')).toBe('0');
  });

  it('formats target type labels as standard testing terminology (Business Rule, Test Plan, Test Case, Unit Test, Method)', () => {
    expect(formatSemanticLabel('BUSINESS_RULE', 'vi')).toBe('Business Rule');
    expect(formatSemanticLabel('TEST_PLAN', 'vi')).toBe('Test Plan');
    expect(formatSemanticLabel('TEST_CASE', 'vi')).toBe('Test Case');
    expect(formatSemanticLabel('UNIT_TEST', 'vi')).toBe('Unit Test');
    expect(formatSemanticLabel('METHOD', 'vi')).toBe('Method');
  });
});
