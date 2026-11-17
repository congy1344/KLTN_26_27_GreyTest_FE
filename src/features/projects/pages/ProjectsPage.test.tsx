// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
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
  useUserQuota: vi.fn(() => ({ data: undefined })),
  useLogout: vi.fn(() => vi.fn()),
}));

function LocationProbe() {
  return <output data-testid="current-url">{useLocation().search}</output>;
}

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

  it('renders the project list with two source-specific creation links', () => {
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

    expect(screen.getByRole('link', { name: 'Tải file ZIP' })).toHaveAttribute('href', '/projects/new?source=zip');
    expect(screen.getByRole('link', { name: 'Clone từ GitHub' })).toHaveAttribute('href', '/projects/new?source=github');
    expect(screen.getByRole('heading', { level: 1, name: 'Dự án của bạn' })).toBeVisible();
    expect(screen.queryByText('Upload ZIP')).not.toBeInTheDocument();
    expect(screen.queryByText('GitHub Repository')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Dự án của bạn' })).toBeInTheDocument();
    expect(screen.getByText('hospital-management-demo-main')).toBeInTheDocument();
  });

  it('keeps creation links above the empty list without duplicating its action', () => {
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

    expect(screen.queryByText('Upload ZIP')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Tạo dự án đầu tiên' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tải file ZIP' })).toHaveAttribute('href', '/projects/new?source=zip');
    expect(screen.getByRole('link', { name: 'Clone từ GitHub' })).toHaveAttribute('href', '/projects/new?source=github');

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
          sourceType: 'GITHUB',
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
            <MemoryRouter initialEntries={['/projects?q=petclinic&status=UPLOADED&view=list']}>
              <LocationProbe />
              <ProjectsPage />
            </MemoryRouter>
          </LanguageProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );

    expect(screen.queryByRole('heading', { name: /Tải lên từ file ZIP/ })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Clone từ GitHub 1' })).toBeVisible();
    expect(screen.queryByText('GitHub')).not.toBeInTheDocument();
    expect(screen.getByTestId('project-search-input')).toHaveValue('petclinic');
    expect(screen.getByText('1 dự án')).toBeVisible();
    expect(screen.getByTestId('project-status-filter')).toHaveTextContent('Chưa phân tích');
    fireEvent.click(screen.getByTestId('project-status-filter'));
    expect(screen.getByRole('group', { name: 'Chưa bắt đầu' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Chưa phân tích' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('option', { name: 'Tất cả trạng thái' })).toHaveTextContent('1');
    expect(screen.queryByRole('option', { name: 'Sẵn sàng sinh Test Case' })).not.toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });
    expect(screen.queryByText('hospital-management-demo')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('reset-filter-btn'));
    expect(screen.getByTestId('current-url')).toHaveTextContent('?view=list');
    expect(screen.getByText('hospital-management-demo')).toBeInTheDocument();
    expect(screen.getByText('spring-petclinic-microservices')).toBeInTheDocument();
    // Bộ lọc mặc định không cần nút đặt lại.
    expect(screen.queryByTestId('reset-filter-btn')).not.toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Tải lên từ file ZIP 1' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Clone từ GitHub 1' })).toBeVisible();
    expect(screen.queryByText('ZIP')).not.toBeInTheDocument();

    // Thu gọn nhóm GitHub thì ẩn dự án của nhóm đó, nhóm ZIP vẫn hiện; mở lại thì hiện lại.
    const githubToggle = screen.getByRole('button', { name: 'Clone từ GitHub 1' });
    fireEvent.click(githubToggle);
    expect(githubToggle).toHaveAttribute('aria-expanded', 'false');
    // Khối thu gọn bằng hiệu ứng: kiểm tra trạng thái và inert thay vì display:none.
    expect(screen.getByText('spring-petclinic-microservices').closest('[data-collapsed]')).toHaveAttribute('data-collapsed', 'true');
    expect(screen.getByText('spring-petclinic-microservices').closest('[inert]')).not.toBeNull();
    expect(screen.getByText('hospital-management-demo')).toBeVisible();
    fireEvent.click(githubToggle);
    expect(screen.getByText('spring-petclinic-microservices')).toBeVisible();

    // Filter by name
    const searchInput = screen.getByTestId('project-search-input');
    fireEvent.change(searchInput, { target: { value: 'petclinic' } });

    expect(screen.queryByText('hospital-management-demo')).not.toBeInTheDocument();
    expect(screen.getByText('spring-petclinic-microservices')).toBeInTheDocument();
    expect(screen.getByTestId('current-url')).toHaveTextContent('q=petclinic');

    // Clear search through the shared icon button, preserving unrelated URL parameters.
    fireEvent.click(screen.getByRole('button', { name: 'Xóa tìm kiếm' }));
    expect(screen.queryByRole('button', { name: 'Xóa tìm kiếm' })).not.toBeInTheDocument();
    expect(screen.getByText('2 dự án')).toBeVisible();
    expect(screen.getByTestId('current-url')).toHaveTextContent('?view=list');
    expect(screen.getByText('hospital-management-demo')).toBeInTheDocument();

    // Filter by status
    const statusFilter = screen.getByTestId('project-status-filter');
    fireEvent.click(statusFilter);
    fireEvent.click(screen.getByRole('option', { name: 'Sẵn sàng sinh Test Case' }));

    expect(screen.getByText('hospital-management-demo')).toBeInTheDocument();
    expect(screen.queryByText('spring-petclinic-microservices')).not.toBeInTheDocument();

    expect(screen.getByTestId('current-url')).toHaveTextContent('status=PLAN_APPROVED');

    // Số đếm bỏ qua trạng thái đang lọc; chọn tất cả chỉ xóa tham số status.
    fireEvent.click(statusFilter);
    expect(screen.getByRole('option', { name: 'Tất cả trạng thái' })).toHaveTextContent('2');
    expect(screen.getByRole('option', { name: 'Chưa phân tích' })).toHaveTextContent('1');
    fireEvent.click(screen.getByRole('option', { name: 'Tất cả trạng thái' }));
    expect(screen.getByTestId('current-url')).toHaveTextContent('?view=list');
    expect(screen.getByText('spring-petclinic-microservices')).toBeInTheDocument();
    fireEvent.click(statusFilter);
    fireEvent.click(screen.getByRole('option', { name: 'Sẵn sàng sinh Test Case' }));

    // Reset filters button
    const resetBtn = screen.getByTestId('reset-filter-btn');
    fireEvent.click(resetBtn);

    expect(screen.getByText('hospital-management-demo')).toBeInTheDocument();
    expect(screen.getByText('spring-petclinic-microservices')).toBeInTheDocument();
    // Bộ lọc mặc định không cần nút đặt lại.
    expect(screen.queryByTestId('reset-filter-btn')).not.toBeInTheDocument();
  });
});
