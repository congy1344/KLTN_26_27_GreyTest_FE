// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { StatusBadge } from './StatusBadge';
import type { ProjectStatus } from '../types';

afterEach(() => { cleanup(); localStorage.removeItem('greytest.language'); });

describe('StatusBadge', () => {
  it.each<[ProjectStatus, string, string]>([
    ['UPLOADED', 'Chưa phân tích', 'idle'],
    ['ANALYZED', 'Chờ sinh Business Rule', 'next'],
    ['BR_PENDING_REVIEW', 'Cần duyệt Business Rule', 'action'],
    ['PLAN_APPROVED', 'Sẵn sàng sinh Test Case', 'next'],
    ['CASE_PENDING_REVIEW', 'Cần duyệt Test Case', 'action'],
    ['COVERAGE_ANALYZED', 'Đã đo coverage', 'next'],
    ['COMPLETED', 'Hoàn thành', 'done'],
    ['FAILED', 'Thất bại', 'failed'],
  ])('labels %s by what happens next and colours it by group', (status, label, tone) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByText(label)).toHaveAttribute('data-tone', tone);
  });

  it('gives every review-pending status the same "needs action" colour', () => {
    const statuses: ProjectStatus[] = ['BR_PENDING_REVIEW', 'PLAN_PENDING_REVIEW', 'CASE_PENDING_REVIEW'];
    statuses.forEach((status) => render(<StatusBadge status={status} />));
    screen.getAllByText(/^Cần duyệt/).forEach((badge) => expect(badge).toHaveAttribute('data-tone', 'action'));
  });

  it('tells the workflow step in a tooltip', () => {
    render(<StatusBadge status="CASE_PENDING_REVIEW" />);
    expect(screen.getByText('Cần duyệt Test Case')).toHaveAttribute('title', 'Bước 3 trên 7');
  });
});
