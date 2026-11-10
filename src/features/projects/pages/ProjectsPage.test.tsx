// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProjectsPage } from './ProjectsPage';
import * as projectHooks from '../hooks/useProjects';
import { ThemeProvider } from '../../../shared/theme/theme';
import { LanguageProvider } from '../../../shared/i18n/language';

vi.mock('../hooks/useProjects', () => ({
  useProjects: vi.fn(),
  useDeleteProject: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useAnalyzeProject: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useUploadProject: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useCloneGithub: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

vi.mock('../../auth/hooks/useAuth', () => ({
  useCurrentUser: vi.fn(() => ({
    data: { id: 1, email: 'test@example.com', fullName: 'Tester', role: 'USER' },
    isLoading: false,
  })),
  useLogout: vi.fn(() => vi.fn()),
}));

describe('ProjectsPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders add project section directly at the top and project list below', () => {
    vi.mocked(projectHooks.useProjects).mockReturnValue({
      data: [
        {
          id: 1,
          name: 'hospital-management-demo-main',
          sourceType: 'ZIP',
          sourceUrl: null,
          status: 'PLAN_APPROVED',
          createdAt: '2026-10-30T10:00:00',
          ownerUserId: 1,
          sourceAvailable: true,
        },
      ],
      isLoading: false,
    } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <LanguageProvider>
            <MemoryRouter>
              <ProjectsPage />
            </MemoryRouter>
          </LanguageProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );

    // Giao diện Thêm dự án mới hiển thị trực tiếp ở đầu trang
    expect(screen.getByText('Thêm dự án mới')).toBeInTheDocument();
    expect(screen.getByText('Tải lên file ZIP hoặc clone từ GitHub public để phân tích và sinh test')).toBeInTheDocument();
    expect(screen.getByText('Upload ZIP')).toBeInTheDocument();
    expect(screen.getByText('GitHub Repository')).toBeInTheDocument();

    // Danh sách dự án hiển thị ở phần dưới
    expect(screen.getByText('Danh sách dự án')).toBeInTheDocument();
    expect(screen.getByText('hospital-management-demo-main')).toBeInTheDocument();
  });

  it('shows empty state when user has no projects yet while keeping upload section at the top', () => {
    vi.mocked(projectHooks.useProjects).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <LanguageProvider>
            <MemoryRouter>
              <ProjectsPage />
            </MemoryRouter>
          </LanguageProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );

    // Form thêm dự án vẫn ở đầu trang
    expect(screen.getByText('Thêm dự án mới')).toBeInTheDocument();
    expect(screen.getByText('Upload ZIP')).toBeInTheDocument();
    expect(screen.getByText('GitHub Repository')).toBeInTheDocument();

    // Danh sách hiển thị empty state
    expect(screen.getByText('Chưa có dự án nào')).toBeInTheDocument();
  });

  it('filters projects by search name and status filter', () => {
    vi.mocked(projectHooks.useProjects).mockReturnValue({
      data: [
        {
          id: 1,
          name: 'hospital-management-demo',
          sourceType: 'ZIP',
          sourceUrl: null,
          status: 'PLAN_APPROVED',
          createdAt: '2026-10-30T10:00:00',
          ownerUserId: 1,
          sourceAvailable: true,
        },
        {
          id: 2,
          name: 'spring-petclinic-microservices',
          sourceType: 'ZIP',
          sourceUrl: null,
          status: 'UPLOADED',
          createdAt: '2026-10-29T10:00:00',
          ownerUserId: 1,
          sourceAvailable: true,
        },
      ],
      isLoading: false,
    } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <LanguageProvider>
            <MemoryRouter>
              <ProjectsPage />
            </MemoryRouter>
          </LanguageProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );

    expect(screen.getByText('hospital-management-demo')).toBeInTheDocument();
    expect(screen.getByText('spring-petclinic-microservices')).toBeInTheDocument();
    // Nút đặt lại bộ lọc set cứng luôn hiển thị ở trạng thái ban đầu (Tất cả trạng thái)
    expect(screen.getByTestId('reset-filter-btn')).toBeInTheDocument();

    // Filter by name
    const searchInput = screen.getByTestId('project-search-input');
    fireEvent.change(searchInput, { target: { value: 'petclinic' } });

    expect(screen.queryByText('hospital-management-demo')).not.toBeInTheDocument();
    expect(screen.getByText('spring-petclinic-microservices')).toBeInTheDocument();

    // Reset search
    fireEvent.change(searchInput, { target: { value: '' } });
    expect(screen.getByText('hospital-management-demo')).toBeInTheDocument();

    // Filter by status
    const statusSelect = screen.getByTestId('project-status-filter');
    fireEvent.change(statusSelect, { target: { value: 'PLAN_APPROVED' } });

    expect(screen.getByText('hospital-management-demo')).toBeInTheDocument();
    expect(screen.queryByText('spring-petclinic-microservices')).not.toBeInTheDocument();

    // Reset filters button
    const resetBtn = screen.getByTestId('reset-filter-btn');
    fireEvent.click(resetBtn);

    expect(screen.getByText('hospital-management-demo')).toBeInTheDocument();
    expect(screen.getByText('spring-petclinic-microservices')).toBeInTheDocument();
    // Nút đặt lại bộ lọc set cứng luôn hiển thị ở trạng thái ban đầu (Tất cả trạng thái)
    expect(screen.getByTestId('reset-filter-btn')).toBeInTheDocument();
  });
});
