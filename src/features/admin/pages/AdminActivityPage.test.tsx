// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminActivityPage } from './AdminActivityPage';
import { LanguageProvider } from '../../../shared/i18n/language';
import { ThemeProvider } from '../../../shared/theme/theme';

const mockActivities = [
  {
    id: 1,
    userId: 10,
    userEmail: 'dev@greytest.dev',
    actionType: 'GENERATE_TEST_PLAN' as const,
    projectId: 1,
    createdAt: '2026-11-07T14:00:00Z',
    metadata: { items: 3 },
  },
  {
    id: 2,
    userId: 1,
    userEmail: 'admin@greytest.dev',
    actionType: 'ADMIN_STATUS_CHANGE' as const,
    projectId: undefined,
    createdAt: '2026-11-07T15:00:00Z',
    metadata: { targetUserId: 10, enabled: true },
  },
];

vi.mock('../../auth/hooks/useAuth', () => ({
  useCurrentUser: () => ({ data: { id: 1, email: 'admin@greytest.dev', fullName: 'Admin', role: 'ADMIN' } }),
  useLogout: () => vi.fn(),
}));

let capturedFilters: unknown = null;

vi.mock('../hooks/useAdmin', () => ({
  useActivities: (filters: unknown) => {
    capturedFilters = filters;
    return {
      data: {
        content: mockActivities,
        page: 0,
        size: 20,
        totalElements: 2,
        totalPages: 1,
      },
      isLoading: false,
      error: null,
    };
  },
  useServiceHealth: () => ({ data: { application: 'UP' }, isFetching: false }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('AdminActivityPage', () => {
  it('renders activities and allows searching user by name, email or ID', () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <LanguageProvider>
            <AdminActivityPage />
          </LanguageProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText('Nhật ký hoạt động')).toBeInTheDocument();
    expect(screen.getByText('dev@greytest.dev')).toBeInTheDocument();
    expect(screen.getByText('admin@greytest.dev')).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText('Tìm theo tên, email, ID...');
    expect(searchInput).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: 'dev@greytest' } });
    expect(capturedFilters).toEqual(
      expect.objectContaining({
        userSearch: 'dev@greytest',
      }),
    );
  });

  it('allows filtering by login history quick tab', () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <LanguageProvider>
            <AdminActivityPage />
          </LanguageProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    const loginTab = screen.getByRole('button', { name: /Nhật ký đăng nhập/i });
    expect(loginTab).toBeInTheDocument();

    fireEvent.click(loginTab);
    expect(capturedFilters).toEqual(
      expect.objectContaining({
        action: 'USER_LOGIN',
      }),
    );

    const allTab = screen.getByRole('button', { name: /Tất cả hoạt động/i });
    fireEvent.click(allTab);
    expect(capturedFilters).toEqual(
      expect.objectContaining({
        action: '',
      }),
    );
  });
});

