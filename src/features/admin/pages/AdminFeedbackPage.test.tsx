// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminFeedbackPage } from './AdminFeedbackPage';
import { LanguageProvider } from '../../../shared/i18n/language';
import { ThemeProvider } from '../../../shared/theme/theme';

const mockCreateMutate = vi.fn();
const mockUpdateStatusMutate = vi.fn();
const mockDeleteMutate = vi.fn();

const mockFeedbacks = [
  {
    id: 1,
    userId: 1,
    userEmail: 'sizngu@gmail.com',
    userName: 'Nguyen ChuTi',
    category: 'FEATURE_REQUEST' as const,
    title: 'Sinh Unit Test JUnit 5 cho Spring Service rất chuẩn',
    content: 'Mô hình sinh test case bao phủ tốt các nhánh if-else.',
    rating: 5,
    status: 'RESOLVED' as const,
    adminNote: 'Đã ghi nhận phản hồi',
    createdAt: '2026-11-05T10:00:00Z',
    resolvedAt: '2026-11-06T10:00:00Z',
    projectName: 'Project #1133',
  },
  {
    id: 2,
    userId: 2,
    userEmail: 'test_dev@greytest.com',
    userName: 'Test Dev',
    category: 'BUG_GENERATION' as const,
    title: 'Lỗi parse AST với record lồng nhau',
    content: 'Khi gặp nested record, parser báo warning.',
    rating: 3,
    status: 'NEW' as const,
    adminNote: '',
    createdAt: '2026-11-06T14:00:00Z',
    resolvedAt: null,
    projectName: 'PaymentService',
  },
];

const mockStats = {
  total: 2,
  pending: 1,
  resolved: 1,
};

vi.mock('../../auth/hooks/useAuth', () => ({
  useCurrentUser: () => ({ data: { id: 1, email: 'admin@greytest.dev', fullName: 'Admin', role: 'ADMIN' } }),
  useLogout: () => vi.fn(),
}));

vi.mock('../hooks/useAdmin', () => ({
  useFeedbacks: () => ({
    data: mockFeedbacks,
    isLoading: false,
    error: null,
  }),
  useFeedbackStats: () => ({
    data: mockStats,
    isLoading: false,
  }),
  useFeedbackMutations: () => ({
    create: { mutate: mockCreateMutate, isPending: false, error: null },
    updateStatus: { mutate: mockUpdateStatusMutate, isPending: false, error: null },
    deleteFeedback: { mutate: mockDeleteMutate, isPending: false, error: null },
  }),
  useServiceHealth: () => ({ data: { application: 'UP' }, isFetching: false }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('AdminFeedbackPage', () => {
  it('renders feedback overview cards, filters, and list table', () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <LanguageProvider>
            <AdminFeedbackPage />
          </LanguageProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    expect(screen.getByText('Quản Lý Phản Hồi & Ý Kiến Người Dùng')).toBeInTheDocument();
    expect(screen.getByText('Tổng phản hồi')).toBeInTheDocument();
    expect(screen.getByText('Đang chờ xử lý')).toBeInTheDocument();
    expect(screen.getAllByText('Đã giải quyết').length).toBeGreaterThan(0);
    expect(screen.getByText('Sinh Unit Test JUnit 5 cho Spring Service rất chuẩn')).toBeInTheDocument();
    expect(screen.getByText('Lỗi parse AST với record lồng nhau')).toBeInTheDocument();
  });

  it('opens triage modal and updates feedback status with admin note', () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <LanguageProvider>
            <AdminFeedbackPage />
          </LanguageProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    const triageButtons = screen.getAllByRole('button', { name: /Xử lý/i });
    fireEvent.click(triageButtons[0]);

    expect(screen.getByText('Xử Lý Phản Hồi')).toBeInTheDocument();
    const noteInput = screen.getByPlaceholderText(/Ghi chú nguyên nhân hoặc kết quả xử lý/i);
    fireEvent.change(noteInput, { target: { value: 'Đã hoàn tất kiểm tra và vá lỗi.' } });

    fireEvent.click(screen.getByRole('button', { name: 'Lưu Trạng Thái' }));
    expect(screen.getByText('Xác nhận cập nhật trạng thái phản hồi?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận lưu' }));
    expect(mockUpdateStatusMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 1,
        data: expect.objectContaining({
          adminNote: 'Đã hoàn tất kiểm tra và vá lỗi.',
        }),
      }),
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('opens create modal and submits new test feedback', () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <LanguageProvider>
            <AdminFeedbackPage />
          </LanguageProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: /Tạo Phản Hồi Thử Nghiệm/i }));
    expect(screen.getByRole('heading', { name: 'Gửi ý kiến hoặc báo cáo lỗi' })).toBeInTheDocument();

    const titleInput = screen.getByPlaceholderText('VD: Cải thiện prompt sinh JUnit 5');
    fireEvent.change(titleInput, { target: { value: 'Đề xuất thêm mock Kafka' } });

    fireEvent.click(screen.getByRole('button', { name: 'Gửi Phản Hồi' }));
    expect(screen.getByText('Xác nhận gửi phản hồi?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận gửi' }));
    expect(mockCreateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Đề xuất thêm mock Kafka',
      }),
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('confirms and deletes a feedback item', () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <LanguageProvider>
            <AdminFeedbackPage />
          </LanguageProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    const deleteButtons = screen.getAllByRole('button', { name: /Xóa/i });
    fireEvent.click(deleteButtons[0]);

    expect(screen.getByText('Xác nhận xóa phản hồi')).toBeInTheDocument();
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Xóa phản hồi' }));

    expect(mockDeleteMutate).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });
});
