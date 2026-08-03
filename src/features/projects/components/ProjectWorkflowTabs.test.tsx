// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { ProjectWorkflowTabs } from './ProjectWorkflowTabs';
import { getProjectResumePath } from '../utils/project-workflow';

afterEach(cleanup);

// Lưu ý: WORKFLOW_LOCKS_DISABLED đang bật trong project-workflow.ts nên mọi tab
// đều mở; test gating theo status sẽ bổ sung khi flag được tắt lại.
describe('ProjectWorkflowTabs', () => {
  it('links all 7 workflow screens and marks the active tab', () => {
    render(
      <MemoryRouter>
        <ProjectWorkflowTabs projectId={7} active="report" status="COMPLETED" />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /^01.*Analysis & BR/ })).toHaveAttribute('href', '/projects/7');
    expect(screen.getByRole('link', { name: /^02.*Test Plan/ })).toHaveAttribute('href', '/projects/7/test-plans');
    expect(screen.getByRole('link', { name: /^03.*Test Case/ })).toHaveAttribute('href', '/projects/7/test-cases');
    expect(screen.getByRole('link', { name: /^04.*Unit Test/ })).toHaveAttribute('href', '/projects/7/unit-tests');
    expect(screen.getByRole('link', { name: /^05.*Coverage/ })).toHaveAttribute('href', '/projects/7/coverage');
    expect(screen.getByRole('link', { name: /^06.*Traceability/ })).toHaveAttribute('href', '/projects/7/traceability');
    expect(screen.getByRole('link', { name: /^07.*Report/ })).toHaveAttribute('href', '/projects/7/report');
    expect(screen.getByRole('link', { name: /^07.*Report/ })).toHaveAttribute('aria-current', 'page');
    expect(screen.getAllByRole('link').map((link) => link.textContent?.slice(0, 2))).toEqual([
      '01', '02', '03', '04', '05', '06', '07',
    ]);
    expect(screen.getAllByText('Hoàn thành')).toHaveLength(7);
  });

  it('marks only the completed steps before the current step', () => {
    render(
      <MemoryRouter>
        <ProjectWorkflowTabs projectId={7} active="traceability" status="COVERAGE_ANALYZED" />
      </MemoryRouter>,
    );

    expect(screen.getAllByText('Hoàn thành')).toHaveLength(5);
    expect(screen.getByRole('link', { name: /06.*Traceability/ })).toHaveAttribute('aria-current', 'page');
  });

  it('resumes each project at the current workflow step', () => {
    expect(getProjectResumePath(7, 'BR_PENDING_REVIEW')).toBe('/projects/7');
    expect(getProjectResumePath(7, 'PLAN_PENDING_REVIEW')).toBe('/projects/7/test-plans');
    expect(getProjectResumePath(7, 'CASE_PENDING_REVIEW')).toBe('/projects/7/test-cases');
    expect(getProjectResumePath(7, 'CASE_APPROVED')).toBe('/projects/7/unit-tests');
    expect(getProjectResumePath(7, 'TEST_GENERATED')).toBe('/projects/7/coverage');
    expect(getProjectResumePath(7, 'COVERAGE_ANALYZED')).toBe('/projects/7/traceability');
    expect(getProjectResumePath(7, 'COMPLETED')).toBe('/projects/7/report');
  });
});
