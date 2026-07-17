// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { AnalysisResult } from './AnalysisResult';
import type { AnalysisResult as AnalysisResultType } from '../types';

afterEach(cleanup);

describe('AnalysisResult', () => {
  it('reports existing tests stored as context but excluded from production analysis', () => {
    const result: AnalysisResultType = {
      projectId: 1,
      projectName: 'petclinic',
      status: 'ANALYZED',
      totalClasses: 25,
      totalMethods: 86,
      totalEndpoints: 17,
      totalRelations: 0,
      existingTestFiles: 17,
      classes: [],
      relations: [],
    };

    render(<AnalysisResult data={result} />);

    expect(screen.getByText('Đã phát hiện 17 file test có sẵn')).toBeInTheDocument();
    expect(screen.getByText(/Existing tests khong tinh vao production analysis/)).toBeInTheDocument();
  });

  it('collapses and expands the analysis content', () => {
    const result: AnalysisResultType = {
      projectId: 1,
      projectName: 'petclinic',
      status: 'ANALYZED',
      totalClasses: 25,
      totalMethods: 86,
      totalEndpoints: 17,
      totalRelations: 0,
      existingTestFiles: 0,
      classes: [],
      relations: [],
    };

    render(<AnalysisResult data={result} />);
    fireEvent.click(screen.getByRole('button', { name: 'Thu gọn phần phân tích' }));
    expect(screen.queryByText('Classes')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Mở rộng phần phân tích' }));
    expect(screen.getByText('Classes')).toBeInTheDocument();
  });
});
