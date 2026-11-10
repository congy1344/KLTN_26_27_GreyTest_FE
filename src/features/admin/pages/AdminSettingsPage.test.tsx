// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminSettingsPage } from './AdminSettingsPage';
import { LanguageProvider } from '../../../shared/i18n/language';
import { ThemeProvider } from '../../../shared/theme/theme';

vi.mock('../../auth/hooks/useAuth', () => ({
  useCurrentUser: () => ({ data: { id: 1, email: 'admin@greytest.dev', fullName: 'Admin User', role: 'ADMIN' } }),
  useLogout: () => vi.fn(),
}));

const mockUpdate = vi.fn();
const mockRefetch = vi.fn();

vi.mock('../hooks/useAdmin', () => ({
  useSystemSettings: () => ({
    data: {
      settings: {
        'ai.model': 'gemini-1.5-pro',
        'ai.batch_concurrency': '4',
        'vnpay.tmn_code': 'CGXZLS0Z',
        'vnpay.url': 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
        'log.output_dir': '../log/llm-usage',
        'alert.quota_threshold_percent': '85',
      },
      details: [],
    },
    isLoading: false,
    isFetching: false,
    refetch: mockRefetch,
  }),
  useSystemSettingsMutation: () => ({
    mutate: mockUpdate,
    isPending: false,
  }),
  useServiceHealth: () => ({
    data: {
      application: 'UP',
      database: 'UP',
      llmGateway: 'UP',
      javaParser: 'READY',
      uptimeSeconds: 90000,
    },
    isLoading: false,
    isFetching: false,
    refetch: vi.fn(),
  }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('AdminSettingsPage', () => {
  it('renders system settings form with persisted database values', () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <LanguageProvider>
            <AdminSettingsPage />
          </LanguageProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: /Cấu Hình Hệ Thống/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue('CGXZLS0Z')).toBeInTheDocument();
    expect(screen.getByDisplayValue('4')).toBeInTheDocument();
    expect(screen.getByDisplayValue('85')).toBeInTheDocument();
  });

  it('modifies a setting and submits with confirmation dialog', () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <LanguageProvider>
            <AdminSettingsPage />
          </LanguageProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    const concurrencyInput = screen.getByDisplayValue('4');
    fireEvent.change(concurrencyInput, { target: { value: '5' } });

    const submitBtn = screen.getByRole('button', { name: /Lưu Cấu Hình Hệ Thống/i });
    fireEvent.click(submitBtn);

    expect(screen.getByText('Xác nhận cập nhật cấu hình hệ thống')).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: 'Đồng ý lưu' });
    fireEvent.click(confirmBtn);

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        settings: expect.objectContaining({
          'ai.batch_concurrency': '5',
          'vnpay.tmn_code': 'CGXZLS0Z',
        }),
      }),
      expect.any(Object),
    );
  });

  it('renders settings form without redundant in-page tab switcher', () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <LanguageProvider>
            <AdminSettingsPage />
          </LanguageProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    // Form inputs and submit button are directly present
    expect(screen.getByRole('button', { name: /Lưu Cấu Hình Hệ Thống/i })).toBeInTheDocument();

    // In-page tab button to toggle health is removed
    expect(screen.queryByRole('button', { name: /Trạng thái Dịch vụ/i })).not.toBeInTheDocument();
  });

  it('redirects to /admin/health when tab=health query parameter is present', () => {
    render(
      <MemoryRouter initialEntries={['/admin/settings?tab=health']}>
        <ThemeProvider>
          <LanguageProvider>
            <Routes>
              <Route path="/admin/settings" element={<AdminSettingsPage />} />
              <Route path="/admin/health" element={<div>Service Health View</div>} />
            </Routes>
          </LanguageProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText('Service Health View')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Lưu Cấu Hình Hệ Thống/i })).not.toBeInTheDocument();
  });
});

