// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { QualityGateCard } from './QualityGateCard';
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
  avgLineCoverage: 84.6,
  avgBranchCoverage: 76.5,
  totalCoverageReports: 2,
};

describe('QualityGateCard', () => {
  it('renders overall quality gate verdict and conditions with live data', () => {
    render(
      <LanguageProvider>
        <QualityGateCard overview={mockOverview} />
      </LanguageProvider>,
    );

    expect(screen.getByText(/Quality Gate/i)).toBeInTheDocument();
    expect(screen.getByText(/ĐẠT TIÊU CHUẨN|PASSED/i)).toBeInTheDocument();
    expect(screen.getAllByText('84.6%')[0]).toBeInTheDocument();
    expect(screen.getAllByText('76.5%')[0]).toBeInTheDocument();
    expect(screen.getAllByText('45 tests')[0]).toBeInTheDocument();
  });

  it('renders pending status when no reports exist', () => {
    render(
      <LanguageProvider>
        <QualityGateCard overview={undefined} />
      </LanguageProvider>,
    );

    expect(screen.getByText(/CHƯA CÓ BÁO CÁO ĐO LƯỜNG|PENDING MEASUREMENT/i)).toBeInTheDocument();
  });

  it('renders failed status when coverage is below threshold', () => {
    const failedOverview: AdminOverview = {
      ...mockOverview,
      avgLineCoverage: 60.0,
      avgBranchCoverage: 50.0,
      totalCoverageReports: 1,
    };

    render(
      <LanguageProvider>
        <QualityGateCard overview={failedOverview} />
      </LanguageProvider>,
    );

    expect(screen.getByText(/CHƯA ĐẠT CHUẨN QUALITY GATE|FAILED QUALITY GATE/i)).toBeInTheDocument();
  });

  it('toggles detailed condition table on button click', () => {
    render(
      <LanguageProvider>
        <QualityGateCard overview={mockOverview} />
      </LanguageProvider>,
    );

    const toggleBtn = screen.getByRole('button', { name: /Chi tiết tiêu chí|View Conditions/i });
    fireEvent.click(toggleBtn);

    expect(screen.getByRole('table')).toBeInTheDocument();
  });
});
