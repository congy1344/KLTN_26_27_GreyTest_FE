// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminDashboardPage } from './AdminDashboardPage';
import { LanguageProvider } from '../../../shared/i18n/language';
import { ThemeProvider } from '../../../shared/theme/theme';

vi.mock('../../auth/hooks/useAuth', () => ({
  useCurrentUser: () => ({ data: { id: 1, email: 'admin@greytest.dev', fullName: 'Admin User', role: 'ADMIN' } }),
  useLogout: () => vi.fn(),
}));

vi.mock('../hooks/useAdmin', () => ({
  useAdminOverview: () => ({
    data: {
      totalUsers: 120,
      newUsers7Days: 15,
      newUsers30Days: 45,
      totalGenerationRequests: 890,
      totalLlmCalls: 2400,
      quotaAlerts: 2,
    },
    isFetching: false,
    refetch: vi.fn(),
  }),
  useAdminTrend: () => ({
    data: [{ bucket: '2026-11-01', total: 40 }],
    isFetching: false,
    refetch: vi.fn(),
  }),
  useTopUsers: () => ({
    data: [{ userId: 1, email: 'tester@greytest.dev', totalLlmCalls: 120 }],
    isFetching: false,
    refetch: vi.fn(),
  }),
  useServiceHealth: () => ({
    data: {
      application: 'UP',
      database: 'UP',
      llmGateway: 'UP',
      javaParser: 'IN_PROCESS',
      jvmHeapUsedMb: 128,
      jvmHeapMaxMb: 2048,
      activeConnections: 5,
      threadCount: 24,
      uptimeSeconds: 3600,
    },
    isFetching: false,
    refetch: vi.fn(),
  }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('AdminDashboardPage', () => {
  it('renders SonarQube-inspired dashboard with quality gate and KPI cards', () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <LanguageProvider>
            <AdminDashboardPage />
          </LanguageProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText(/SonarQube-Inspired Quality & Ops/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Quality Gate/i)[0]).toBeInTheDocument();
    expect(screen.getByText(/BR → TP → TC → UT/i)).toBeInTheDocument();
    expect(screen.getAllByText('120')[0]).toBeInTheDocument();
    expect(screen.getAllByText('890')[0]).toBeInTheDocument();
    expect(screen.getByText('tester@greytest.dev')).toBeInTheDocument();
  });

  it('renders navigable KPI cards pointing to corresponding admin sections', () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <LanguageProvider>
            <AdminDashboardPage />
          </LanguageProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    const userLinks = screen.getAllByRole('link').filter((l) => l.getAttribute('href') === '/admin/users');
    expect(userLinks.length).toBeGreaterThanOrEqual(1);

    const jobsLink = screen.getAllByRole('link').find((l) => l.getAttribute('href') === '/admin/jobs');
    expect(jobsLink).toBeInTheDocument();

    const activityLink = screen.getAllByRole('link').find((l) => l.getAttribute('href') === '/admin/activity');
    expect(activityLink).toBeInTheDocument();

    const quotasLink = screen.getAllByRole('link').find((l) => l.getAttribute('href') === '/admin/quotas');
    expect(quotasLink).toBeInTheDocument();
  });

  it('allows switching trend granularity between day, month and year', () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <LanguageProvider>
            <AdminDashboardPage />
          </LanguageProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText(/Xu hướng Hoạt động Kiểm thử · 30 ngày/i)).toBeInTheDocument();

    const monthBtn = screen.getByRole('button', { name: /Theo tháng/i });
    fireEvent.click(monthBtn);
    expect(screen.getByText(/Xu hướng Hoạt động Kiểm thử · 12 tháng/i)).toBeInTheDocument();

    const yearBtn = screen.getByRole('button', { name: /Theo năm/i });
    fireEvent.click(yearBtn);
    expect(screen.getByText(/Xu hướng Hoạt động Kiểm thử · 5 năm/i)).toBeInTheDocument();
  });

  it('allows filtering trend by custom date range', () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <LanguageProvider>
            <AdminDashboardPage />
          </LanguageProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    const fromInput = screen.getByLabelText(/Từ ngày/i);
    const toInput = screen.getByLabelText(/Đến ngày/i);

    fireEvent.change(fromInput, { target: { value: '2026-11-01' } });
    fireEvent.change(toInput, { target: { value: '2026-11-08' } });

    expect(screen.getByText(/Xu hướng Hoạt động Kiểm thử · 2026-11-01 đến 2026-11-08/i)).toBeInTheDocument();

    const resetBtn = screen.getByRole('button', { name: /Đặt lại/i });
    fireEvent.click(resetBtn);

    expect(screen.getByText(/Xu hướng Hoạt động Kiểm thử · 30 ngày/i)).toBeInTheDocument();
  });
});
