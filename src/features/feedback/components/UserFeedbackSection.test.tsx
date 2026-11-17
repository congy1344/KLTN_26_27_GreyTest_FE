// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserFeedbackSection } from './UserFeedbackSection';
import * as feedbackApi from '../api/user-feedback-api';
import { LanguageProvider } from '../../../shared/i18n/language';

vi.mock('../api/user-feedback-api', () => ({
  fetchMyFeedbacks: vi.fn(),
  submitFeedback: vi.fn(),
}));

vi.mock('../../projects/hooks/useProjects', () => ({
  useProjects: () => ({ data: [{ id: 1, name: 'Demo Project' }] }),
}));

describe('UserFeedbackSection', () => {
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

  it('renders feedback submission form and empty history state when no feedbacks', async () => {
    vi.mocked(feedbackApi.fetchMyFeedbacks).mockResolvedValue([]);

    render(
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <UserFeedbackSection />
        </LanguageProvider>
      </QueryClientProvider>
    );

    expect(screen.getByText('Gửi phản hồi cho Quản trị viên')).toBeInTheDocument();
    expect(screen.getByTestId('feedback-category-select')).toBeInTheDocument();
    expect(screen.getByTestId('feedback-title-input')).toBeInTheDocument();
    expect(screen.getByTestId('feedback-content-input')).toBeInTheDocument();
    expect(screen.getByTestId('submit-feedback-btn')).toBeInTheDocument();

    expect(await screen.findByText('Bạn chưa gửi phản hồi nào')).toBeInTheDocument();
  });

  it('renders submitted feedbacks list with category, status, and admin note', async () => {
    vi.mocked(feedbackApi.fetchMyFeedbacks).mockResolvedValue([
      {
        id: 1,
        category: 'BUG_GENERATION',
        title: 'Lỗi parse AST Java 17',
        content: 'Không phân tích được record class',
        status: 'RESOLVED',
        adminNote: 'Đã cập nhật parser Javaparser lên bản mới nhất',
        createdAt: '2026-11-10T08:00:00Z',
        projectName: 'Demo Project',
      },
    ]);

    render(
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <UserFeedbackSection />
        </LanguageProvider>
      </QueryClientProvider>
    );

    expect(await screen.findByText('Lỗi parse AST Java 17')).toBeInTheDocument();
    expect(screen.getByText('Demo Project')).toBeInTheDocument();
    expect(screen.getByText('Đã giải quyết')).toBeInTheDocument();
    expect(screen.getByText(/Đã cập nhật parser Javaparser/i)).toBeInTheDocument();
  });

  it('submits feedback successfully and resets form', async () => {
    vi.mocked(feedbackApi.fetchMyFeedbacks).mockResolvedValue([]);
    vi.mocked(feedbackApi.submitFeedback).mockResolvedValue({
      id: 2,
      category: 'FEATURE_REQUEST',
      title: 'Hỗ trợ sinh mockito BDD',
      content: 'Thêm template given/when/then',
      status: 'NEW',
    } as any);

    render(
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <UserFeedbackSection />
        </LanguageProvider>
      </QueryClientProvider>
    );

    fireEvent.change(screen.getByTestId('feedback-title-input'), {
      target: { value: 'Hỗ trợ sinh mockito BDD' },
    });
    fireEvent.change(screen.getByTestId('feedback-content-input'), {
      target: { value: 'Thêm template given/when/then' },
    });

    fireEvent.click(screen.getByTestId('submit-feedback-btn'));

    await waitFor(() => {
      expect(feedbackApi.submitFeedback).toHaveBeenCalledWith({
        category: 'BUG_GENERATION',
        title: 'Hỗ trợ sinh mockito BDD',
        content: 'Thêm template given/when/then',
        projectName: undefined,
      });
    });

    expect(await screen.findByRole('status')).toHaveTextContent(/Phản hồi đã được gửi tới Quản trị viên thành công/i);
  });
});

