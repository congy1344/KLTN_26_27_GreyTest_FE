// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminJobsPage } from './AdminJobsPage';
import { LanguageProvider } from '../../../shared/i18n/language';
import { ThemeProvider } from '../../../shared/theme/theme';

vi.mock('../../auth/hooks/useAuth', () => ({
  useCurrentUser: () => ({ data: { id: 1, email: 'admin@greytest.dev', fullName: 'Admin User', role: 'ADMIN' } }),
  useLogout: () => vi.fn(),
}));

const mockActiveJobs = [
  {
    projectId: 5,
    projectName: 'E-Commerce Core',
    userEmail: 'dev@greytest.dev',
    stage: 'UNIT_TEST' as const,
    status: 'RUNNING' as const,
    percent: 65,
    completedSteps: 2,
    totalSteps: 3,
    message: 'Sinh Unit Test - batch 2/2',
    updatedAt: '2026-11-07T10:00:00Z',
  },
  {
    projectId: 3,
    projectName: 'Auth Service',
    userEmail: 'qa@greytest.dev',
    stage: 'BUSINESS_RULE' as const,
    status: 'QUEUED' as const,
    percent: 0,
    completedSteps: 0,
    totalSteps: 2,
    message: 'Chờ trong hàng đợi',
    updatedAt: '2026-11-07T09:30:00Z',
  },
];

const mockCancel = vi.fn();

const mockRetry = vi.fn();

vi.mock('../hooks/useAdmin', () => ({
  useActiveJobs: () => ({
    data: mockActiveJobs,
    isLoading: false,
    isFetching: false,
    refetch: vi.fn(),
  }),
  useAdminUserMutations: () => ({
    cancelJob: { mutate: mockCancel, isPending: false, error: null },
  }),
  useJobHistory: () => ({
    data: {
      content: [
        {
          id: 101,
          projectId: 5,
          projectName: 'E-Commerce Core',
          userId: 2,
          userEmail: 'dev@greytest.dev',
          stage: 'UNIT_TEST',
          status: 'COMPLETED',
          message: 'Sinh 12 unit tests hoàn tất',
          createdAt: '2026-11-07T09:00:00Z',
        },
      ],
      page: 0,
      size: 15,
      totalElements: 1,
      totalPages: 1,
    },
    isLoading: false,
    isFetching: false,
    refetch: vi.fn(),
  }),
  useJobRetryMutation: () => ({
    mutate: mockRetry,
    isPending: false,
  }),
  useServiceHealth: () => ({ data: { application: 'UP' }, isFetching: false, refetch: vi.fn() }),
}));

afterEach(() => {
  cleanup();
});

describe('AdminJobsPage', () => {
  it('renders active running jobs and back navigation link', () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <LanguageProvider>
            <AdminJobsPage />
          </LanguageProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText('E-Commerce Core')).toBeInTheDocument();
    expect(screen.getByText('dev@greytest.dev')).toBeInTheDocument();
    expect(screen.getByText('Auth Service')).toBeInTheDocument();
    expect(screen.getByText('qa@greytest.dev')).toBeInTheDocument();
    expect(screen.getByText(/Quay lại Dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/Active Queue & History/i)).toBeInTheDocument();
  });

  it('supports stage filter tab selection and renames BR while excluding coverage refinement', () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <LanguageProvider>
            <AdminJobsPage />
          </LanguageProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    // Verify 'Sinh BR' tab exists
    const brTab = screen.getByRole('button', { name: /^Sinh BR$/i });
    expect(brTab).toBeInTheDocument();

    // Verify 'Cải thiện độ bao phủ' is removed
    expect(screen.queryByText(/Cải thiện độ bao phủ/i)).not.toBeInTheDocument();

    const utTab = screen.getByRole('button', { name: /Sinh Unit Test/i });
    fireEvent.click(utTab);
    expect(utTab).toHaveClass('bg-brand');
  });

  it('confirms and cancels an active job', () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <LanguageProvider>
            <AdminJobsPage />
          </LanguageProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    const cancelButtons = screen.getAllByRole('button', { name: /Hủy/i });
    expect(cancelButtons.length).toBeGreaterThan(0);

    fireEvent.click(cancelButtons[0]);
    expect(screen.getByText('Xác nhận hủy tác vụ sinh test')).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: 'Hủy tác vụ' });
    fireEvent.click(confirmBtn);

    expect(mockCancel).toHaveBeenCalledWith(
      { projectId: 5, stage: 'UNIT_TEST' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('switches to execution history view and confirms job retry', () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <LanguageProvider>
            <AdminJobsPage />
          </LanguageProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    const historyTab = screen.getByRole('button', { name: /Lịch sử thực thi/i });
    fireEvent.click(historyTab);

    expect(screen.getByText('Sinh 12 unit tests hoàn tất')).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: /Chạy lại/i });
    fireEvent.click(retryBtn);

    expect(screen.getByText('Xác nhận chạy lại tác vụ')).toBeInTheDocument();

    const confirmRetry = screen.getByRole('button', { name: 'Chạy lại tác vụ' });
    fireEvent.click(confirmRetry);

    expect(mockRetry).toHaveBeenCalledWith(
      { projectId: 5, stage: 'UNIT_TEST' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });
});
