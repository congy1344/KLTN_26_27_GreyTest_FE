// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminHealthPage } from './AdminHealthPage';
import { LanguageProvider } from '../../../shared/i18n/language';
import { ThemeProvider } from '../../../shared/theme/theme';

vi.mock('../../auth/hooks/useAuth', () => ({
  useCurrentUser: () => ({ data: { id: 1, email: 'admin@greytest.dev', fullName: 'Admin User', role: 'ADMIN' } }),
  useLogout: () => vi.fn(),
}));

const mockRefetch = vi.fn();

vi.mock('../hooks/useAdmin', () => ({
  useServiceHealth: () => ({
    data: {
      application: 'UP',
      database: 'UP',
      llmGateway: 'UP',
      javaParser: 'READY',
      uptimeSeconds: 90000,
      threadCount: 25,
      activeConnections: 1,
    },
    isLoading: false,
    isFetching: false,
    refetch: mockRefetch,
  }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('AdminHealthPage', () => {
  it('renders dedicated service health page with core infrastructure status cards and pulse chart', () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <LanguageProvider>
            <AdminHealthPage />
          </LanguageProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    // Page title and breadcrumbs
    expect(screen.getByRole('heading', { level: 1, name: /Trạng Thái Dịch Vụ & Giám Sát Hệ Thống/i })).toBeInTheDocument();
    expect(screen.getByText(/Quay lại Dashboard/i)).toBeInTheDocument();

    // Tab links to switch between parameters and health
    expect(screen.getAllByRole('link', { name: /Cấu hình Tham số/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('link', { name: /Trạng thái Dịch vụ/i }).length).toBeGreaterThanOrEqual(1);

    // Core services cards
    expect(screen.getByText('Spring Boot REST API')).toBeInTheDocument();
    expect(screen.getByText('PostgreSQL Database')).toBeInTheDocument();
    expect(screen.getByText(/Cổng Kết Nối AI/i)).toBeInTheDocument();
    expect(screen.getByText('JavaParser AST Engine')).toBeInTheDocument();

    // Live heartbeat chart & terminal log
    expect(screen.getByText(/server-access\.log/i)).toBeInTheDocument();

    // Operational overview
    expect(screen.getByText(/Tình Trạng Vận Hành Hệ Thống/i)).toBeInTheDocument();
    expect(screen.getByText(/1 ngày 1 giờ/i)).toBeInTheDocument();

    // Reload button trigger (page-level health reload button)
    const reloadBtns = screen.getAllByRole('button', { name: /Làm mới/i });
    expect(reloadBtns.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(reloadBtns[0]);
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });
});
