// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AnalysisStats } from './AnalysisStats';

describe('AnalysisStats', () => {
  it('renders all analysis counters', () => {
    render(
      <AnalysisStats
        totalClasses={4}
        totalMethods={12}
        totalEndpoints={3}
        totalRelations={2}
      />,
    );

    expect(screen.getByText('Classes')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});
