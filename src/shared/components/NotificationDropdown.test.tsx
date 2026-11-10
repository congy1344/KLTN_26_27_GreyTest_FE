// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NotificationDropdown } from './NotificationDropdown';
import * as notificationApi from '../../features/notifications/api/notification-api';
import { ThemeProvider } from '../theme/theme';
import { LanguageProvider } from '../i18n/language';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('../../features/notifications/api/notification-api', () => ({
  fetchUserNotifications: vi.fn(),
}));

const mockNotifications = [
  {
    id: 'n-admin-1',
    type: 'ADMIN',
    title: 'Phản hồi từ Quản trị viên (Đã giải quyết)',
    message: 'Lỗi sinh test đã được cập nhật bản vá mới.',
    link: '/settings?tab=feedback',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    read: false,
  },
  {
    id: 'n-pay-1',
    type: 'PAYMENT',
    title: 'Thanh toán gói PRO thành công',
    message: 'Mã đơn hàng: GT_1002 (20.000 đ qua VNPay)',
    link: '/settings?tab=subscription',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    read: false,
  },
  {
    id: 'n-task-1',
    type: 'TASK',
    title: 'Sinh Unit Test (JUnit 5) hoàn thành',
    message: 'Bộ mã kiểm thử Unit Test đã được sinh cho dự án Demo.',
    link: '/projects/42',
    createdAt: new Date(Date.now() - 10800000).toISOString(),
    read: false,
  },
];

describe('NotificationDropdown', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('greytest.token', 'test-token');
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  function renderComponent() {
    return render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <LanguageProvider>
            <MemoryRouter>
              <NotificationDropdown />
            </MemoryRouter>
          </LanguageProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );
  }

  it('renders notification bell with unread badge count', async () => {
    vi.mocked(notificationApi.fetchUserNotifications).mockResolvedValue(mockNotifications);

    renderComponent();

    expect(screen.getByTestId('notification-bell-btn')).toBeInTheDocument();

    const badge = await screen.findByTestId('unread-badge');
    expect(badge).toHaveTextContent('3');
  });

  it('toggles dropdown and displays all notifications directly without filter tabs', async () => {
    vi.mocked(notificationApi.fetchUserNotifications).mockResolvedValue(mockNotifications);

    renderComponent();

    // Open dropdown
    fireEvent.click(screen.getByTestId('notification-bell-btn'));
    expect(screen.getByTestId('notification-dropdown-menu')).toBeInTheDocument();

    // All 3 notifications displayed directly
    expect(await screen.findByText('Phản hồi từ Quản trị viên (Đã giải quyết)')).toBeInTheDocument();
    expect(screen.getByText('Thanh toán gói PRO thành công')).toBeInTheDocument();
    expect(screen.getByText('Sinh Unit Test (JUnit 5) hoàn thành')).toBeInTheDocument();

    // Confirm filter buttons are absent
    expect(screen.queryByTestId('filter-all-btn')).not.toBeInTheDocument();
    expect(screen.queryByTestId('filter-admin-btn')).not.toBeInTheDocument();
    expect(screen.queryByTestId('filter-payment-btn')).not.toBeInTheDocument();
    expect(screen.queryByTestId('filter-task-btn')).not.toBeInTheDocument();
  });

  it('marks all notifications as read when clicking mark all read button', async () => {
    vi.mocked(notificationApi.fetchUserNotifications).mockResolvedValue(mockNotifications);

    renderComponent();

    fireEvent.click(screen.getByTestId('notification-bell-btn'));

    const markAllBtn = await screen.findByTestId('mark-all-read-btn');
    fireEvent.click(markAllBtn);

    // Unread badge should disappear
    await waitFor(() => {
      expect(screen.queryByTestId('unread-badge')).not.toBeInTheDocument();
    });
  });

  it('marks individual notification as read and navigates to target link on click', async () => {
    vi.mocked(notificationApi.fetchUserNotifications).mockResolvedValue(mockNotifications);

    renderComponent();

    fireEvent.click(screen.getByTestId('notification-bell-btn'));

    const adminItem = await screen.findByTestId('notification-item-n-admin-1');
    fireEvent.click(adminItem);

    expect(navigateMock).toHaveBeenCalledWith('/settings?tab=feedback');
    expect(screen.queryByTestId('notification-dropdown-menu')).not.toBeInTheDocument();
  });

  it('renders empty state message when there are no notifications', async () => {
    vi.mocked(notificationApi.fetchUserNotifications).mockResolvedValue([]);

    renderComponent();

    fireEvent.click(screen.getByTestId('notification-bell-btn'));

    expect(await screen.findByText(/Không có thông báo nào/i)).toBeInTheDocument();
  });
});
