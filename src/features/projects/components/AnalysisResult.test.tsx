// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AnalysisResult } from './AnalysisResult';
import type { AnalysisResult as AnalysisResultType } from '../types';

describe('AnalysisResult', () => {
  it('reports existing tests excluded from analysis', () => {
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
    expect(screen.getByText(/không đưa vào phân tích hoặc context sinh test/)).toBeInTheDocument();
  });
});
