// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { afterEach, vi } from 'vitest';
import { groupRows, TraceabilityMatrix } from './TraceabilityMatrix';
import type { TraceabilityRow } from '../types';

const traceabilityData = vi.hoisted(() => ({ rows: [] as TraceabilityRow[] }));
vi.mock('../hooks/useTraceability', () => ({
  useTraceability: () => ({
    data: { rows: traceabilityData.rows, uncoveredRules: [] },
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

afterEach(cleanup);

function row(overrides: Partial<TraceabilityRow>): TraceabilityRow {
  return {
    ruleId: 1,
    ruleCode: 'BR-001',
    ruleDescription: 'Rule mô tả',
    planId: 10,
    planCode: 'TP-001',
    planTitle: 'Happy path',
    testType: 'HAPPY_PATH',
    caseId: 20,
    caseCode: 'TC-001',
    caseDescription: 'Case mô tả',
    unitTestId: 30,
    unitTestName: 'shouldWork',
    ...overrides,
  };
}

describe('groupRows', () => {
  const rows = [
    row({}),
    row({ caseCode: 'TC-002', unitTestName: 'shouldFail' }),
    row({ ruleId: 2, ruleCode: 'BR-002', planId: null, planCode: null, caseCode: null, unitTestName: null }),
  ];

  it('groups rows by rule code', () => {
    const groups = groupRows(rows, '');
    expect([...groups.keys()]).toEqual(['BR-001', 'BR-002']);
    expect(groups.get('BR-001')).toHaveLength(2);
    expect(groups.get('BR-002')).toHaveLength(1);
  });

  it('filters by keyword across all fields, case-insensitive', () => {
    const groups = groupRows(rows, 'shouldfail');
    expect([...groups.keys()]).toEqual(['BR-001']);
    expect(groups.get('BR-001')).toHaveLength(1);
    expect(groupRows(rows, 'br-002').size).toBe(1);
    expect(groupRows(rows, 'khong-ton-tai').size).toBe(0);
  });

  it('renders the trace path in the readable BR to Unit Test order', () => {
    traceabilityData.rows = [row({})];
    render(<TraceabilityMatrix projectId={7} />);

    const headers = screen.getAllByRole('columnheader').map((header) => header.textContent);
    expect(headers).toEqual([
      expect.stringContaining('Business Rule'),
      expect.stringContaining('Test Plan'),
      expect.stringContaining('Test Case'),
      expect.stringContaining('Unit Test'),
    ]);
    expect(screen.getByText('BR-001')).toBeVisible();
    expect(screen.getByText('TP-001')).toBeVisible();
    expect(screen.getByText('TC-001')).toBeVisible();
    expect(screen.getByText('shouldWork')).toBeVisible();
  });
});
