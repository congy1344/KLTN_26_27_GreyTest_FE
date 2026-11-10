// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { PipelineStageFlow } from './PipelineStageFlow';
import { LanguageProvider } from '../../../shared/i18n/language';
import type { AdminOverview } from '../types';

afterEach(() => {
  cleanup();
});

const mockOverview: AdminOverview = {
  totalUsers: 10,
  newUsers7Days: 2,
  newUsers30Days: 5,
  totalGenerationRequests: 30,
  totalLlmCalls: 45,
  quotaAlerts: 1,
  totalProjects: 3,
  totalBusinessRules: 24,
  totalTestPlans: 6,
  totalTestCases: 48,
  totalUnitTests: 45,
};

describe('PipelineStageFlow', () => {
  it('renders all 4 Grey-box stages: BR, TP, TC, UT with live counts', () => {
    render(
      <MemoryRouter>
        <LanguageProvider>
          <PipelineStageFlow overview={mockOverview} />
        </LanguageProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText('BR')).toBeInTheDocument();
    expect(screen.getByText('TP')).toBeInTheDocument();
    expect(screen.getByText('TC')).toBeInTheDocument();
    expect(screen.getByText('UT')).toBeInTheDocument();
    expect(screen.getByText('24 rules')).toBeInTheDocument();
    expect(screen.getByText('6 plans')).toBeInTheDocument();
    expect(screen.getByText('48 cases')).toBeInTheDocument();
    expect(screen.getByText('45 tests')).toBeInTheDocument();
    expect(screen.getByText(/Quy trình AI Grey-box|Grey-box AI Pipeline/i)).toBeInTheDocument();
  });

  it('highlights the passed activeStage correctly', () => {
    const { container } = render(
      <MemoryRouter>
        <LanguageProvider>
          <PipelineStageFlow overview={mockOverview} activeStage="TEST_CASE" />
        </LanguageProvider>
      </MemoryRouter>,
    );

    const tcContainer = container.querySelector('.ring-2.ring-brand\\/30');
    expect(tcContainer).toBeInTheDocument();
    expect(tcContainer).toHaveTextContent('TC');
  });
});
