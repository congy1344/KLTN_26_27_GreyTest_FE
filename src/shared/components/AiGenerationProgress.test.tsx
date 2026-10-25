// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GenerationProgress } from '../types/generation-progress';
import { AiGenerationProgress, formatHumanLogMessage, getLogMessageColor } from './AiGenerationProgress';

const runningProgress: GenerationProgress = {
  stage: 'TEST_PLAN',
  status: 'RUNNING',
  percent: 50,
  completedSteps: 1,
  totalSteps: 2,
  steps: [
    { order: 1, label: 'Sinh Test Plan - batch 1/1', status: 'COMPLETED', percent: 100 },
    { order: 2, label: 'Kiểm tra và lưu Test Plan', status: 'RUNNING', percent: 0 },
  ],
  logs: [{ timestamp: '2026-08-15T08:00:00Z', message: 'Đã nhận 3 Test Plan từ AI.' }],
};

describe('AiGenerationProgress', () => {
  it('shows partial results as terminal with the blocked reason and no success percentage', () => {
    render(<AiGenerationProgress active label="Sinh Unit Test" progress={{
      ...runningProgress, status: 'PARTIAL', percent: 100,
      logs: [{ timestamp: '2026-08-15T08:00:00Z', message: 'TC-002 bị chặn: random.' }],
    }} />);
    expect(screen.getByRole('status')).toHaveTextContent('hoàn tất một phần');
    expect(screen.getByRole('status')).not.toHaveTextContent('100%');
    expect(screen.getByText('TC-002 bị chặn: random.')).toBeVisible();
    expect(screen.getByText('Hoàn tất một phần')).toBeVisible();
  });
  afterEach(() => {
    cleanup();
    window.sessionStorage.clear();
  });

  it('does not render any idle header button when generation is inactive', () => {
    render(<AiGenerationProgress active={false} label="Đang sinh Test Plan" />);

    expect(screen.queryByRole('button', { name: /Log/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });

  it('shows a queued background job in screen reader announcement and floating dock', () => {
    render(
      <AiGenerationProgress
        active={false}
        label="Đang sinh Test Plan"
        progress={{
          ...runningProgress,
          status: 'QUEUED',
          percent: 0,
          completedSteps: 0,
          totalSteps: 1,
          steps: [{ order: 1, label: 'Đang chờ worker xử lý', status: 'WAITING', percent: 0 }],
        }}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent('đang chờ worker xử lý');
    const floatingDock = screen.getByRole('complementary');
    expect(floatingDock).toBeVisible();
    expect(within(floatingDock).getByText('0%')).toBeVisible();
    expect(within(floatingDock).getByText('Đang chờ worker xử lý')).toBeVisible();
  });

  it('displays percentage, steps and log directly in the floating dock without opening buttons', () => {
    render(<AiGenerationProgress active label="Đang sinh Test Plan" progress={runningProgress} />);

    // Không còn nút Log trong header
    expect(screen.queryByRole('button', { name: /Log/i })).not.toBeInTheDocument();

    // Floating dock hiển thị trực tiếp với đầy đủ thông tin
    const floatingDock = screen.getByRole('complementary');
    expect(floatingDock).toBeVisible();
    expect(within(floatingDock).getByText('50%')).toBeVisible();
    expect(within(floatingDock).getByText('Sinh Test Plan - batch 1/1')).toBeVisible();
    expect(within(floatingDock).getByText('Kiểm tra và lưu Test Plan')).toBeVisible();
    expect(within(floatingDock).getByText('Hoàn thành')).toBeVisible();
    expect(within(floatingDock).getByText('Đang chạy')).toBeVisible();
    expect(within(floatingDock).getByText('Đã nhận 3 Test Plan từ AI.')).toBeVisible();
  });

  it('dismisses the floating dock when clicking X', () => {
    render(<AiGenerationProgress active label="Đang sinh Test Plan" progress={runningProgress} />);

    const closeButton = screen.getByRole('button', { name: /Đóng/i });
    expect(closeButton).toBeVisible();

    fireEvent.click(closeButton);

    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });

  it('shows a restore pill button when dismissed and re-opens dock when clicked', () => {
    render(<AiGenerationProgress active label="Đang sinh Test Plan" progress={runningProgress} />);

    const closeButton = screen.getByRole('button', { name: /Đóng/i });
    fireEvent.click(closeButton);
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();

    const restoreButton = screen.getByRole('button', { name: /Mở lại log AI/i });
    expect(restoreButton).toBeVisible();

    fireEvent.click(restoreButton);
    expect(screen.getByRole('complementary')).toBeVisible();
  });

  it('identifies the failed step and displays it in the floating dock', () => {
    render(
      <AiGenerationProgress
        active
        label="Đang sinh Unit Test"
        progress={{
          ...runningProgress,
          stage: 'UNIT_TEST',
          status: 'RUNNING',
          steps: [
            { order: 1, label: 'Sinh Unit Test - batch 1/1', status: 'FAILED', percent: 0, errorMessage: 'Hệ thống AI tạm thời hết hạn mức.' },
            { order: 2, label: 'Kiểm tra và lưu Unit Test', status: 'WAITING', percent: 0 },
          ],
        }}
      />,
    );

    const floatingDock = screen.getByRole('complementary');
    expect(within(floatingDock).getByText('Lỗi')).toBeVisible();
    expect(within(floatingDock).getByText('Đang chờ')).toBeVisible();
    expect(within(floatingDock).getByText('Hệ thống AI tạm thời hết hạn mức.')).toBeVisible();
  });

  it('announces a failed terminal snapshot to screen readers and keeps dock visible', () => {
    render(
      <AiGenerationProgress
        active={false}
        label="Đang sinh Test Plan"
        progress={{ ...runningProgress, status: 'FAILED' }}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Đang sinh Test Plan: thất bại 50%');
    const floatingDock = screen.getByRole('complementary');
    expect(floatingDock).toBeVisible();
    expect(within(floatingDock).getByText('Thất bại')).toBeVisible();
  });

  it('announces a completed terminal snapshot to screen readers and keeps dock visible', () => {
    render(
      <AiGenerationProgress
        active={false}
        label="Đang sinh Test Plan"
        progress={{
          ...runningProgress,
          status: 'COMPLETED',
          percent: 100,
          completedSteps: 2,
          steps: runningProgress.steps.map((step) => ({ ...step, status: 'COMPLETED', percent: 100 })),
        }}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Đang sinh Test Plan: hoàn tất 100%');
    const floatingDock = screen.getByRole('complementary');
    expect(floatingDock).toBeVisible();
    expect(within(floatingDock).getAllByText('Hoàn thành').length).toBeGreaterThanOrEqual(1);
    expect(within(floatingDock).getByText('100%')).toBeVisible();
  });

  it('keeps dock dismissed when navigating to another feature with the same progress', () => {
    const completedProgress: GenerationProgress = {
      ...runningProgress,
      status: 'COMPLETED',
      percent: 100,
      completedSteps: 2,
    };

    const { unmount } = render(
      <AiGenerationProgress
        projectId={1}
        active={false}
        label="Tiến trình AI"
        progress={completedProgress}
      />,
    );

    const closeButton = screen.getByRole('button', { name: /Đóng/i });
    expect(closeButton).toBeVisible();
    fireEvent.click(closeButton);
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();

    unmount();

    // Giả lập chuyển sang màn hình chức năng khác (component mới mount lại với cùng progress)
    render(
      <AiGenerationProgress
        projectId={1}
        active={false}
        label="Tiến trình AI"
        progress={completedProgress}
      />,
    );

    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });

  it('re-opens the dock when a new generation starts', () => {
    const completedProgress: GenerationProgress = {
      ...runningProgress,
      status: 'COMPLETED',
      percent: 100,
      completedSteps: 2,
    };

    const { unmount } = render(
      <AiGenerationProgress
        projectId={1}
        active={false}
        label="Tiến trình AI"
        progress={completedProgress}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Đóng/i }));
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
    unmount();

    // Bắt đầu đợt sinh mới với active={true}
    render(
      <AiGenerationProgress
        projectId={1}
        active={true}
        label="Tiến trình AI mới"
        progress={{ ...runningProgress, stage: 'UNIT_TEST', status: 'RUNNING' }}
      />,
    );

    expect(screen.getByRole('complementary')).toBeVisible();
  });

  it('preserves minimized state across remounts for the same project', () => {
    const { unmount } = render(
      <AiGenerationProgress
        projectId={1}
        active={true}
        label="Tiến trình AI"
        progress={runningProgress}
      />,
    );

    const minimizeButton = screen.getByRole('button', { name: /Thu nhỏ/i });
    fireEvent.click(minimizeButton);
    expect(screen.getByRole('button', { name: /Mở rộng/i })).toBeVisible();
    unmount();

    // Giả lập chuyển sang màn hình chức năng khác
    render(
      <AiGenerationProgress
        projectId={1}
        active={true}
        label="Tiến trình AI"
        progress={runningProgress}
      />,
    );

    expect(screen.getByRole('button', { name: /Mở rộng/i })).toBeVisible();
  });

  it('renders paused state with badge and resume button, and triggers onResume', () => {
    const handleResume = vi.fn();
    render(
      <AiGenerationProgress
        active={false}
        label="Tiến trình AI"
        progress={{
          ...runningProgress,
          status: 'PAUSED',
          percent: 50,
        }}
        onResume={handleResume}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent('đã tạm dừng');
    expect(screen.getByText('Đã tạm dừng')).toBeVisible();

    const resumeBtn = screen.getByRole('button', { name: /Tiếp tục sinh/i });
    expect(resumeBtn).toBeVisible();
    fireEvent.click(resumeBtn);
    expect(handleResume).toHaveBeenCalledTimes(1);
  });

  it('correctly styles error logs as danger even if they contain success-like substrings like "đã sinh"', () => {
    const errorMsg = "Dừng ở batch 1. Sinh Unit Test thất bại; các batch đã sinh trước đó đã được lưu an toàn. Bạn có thể nhấn 'Tiếp tục sinh' để chạy tiếp.";
    expect(getLogMessageColor(errorMsg)).toBe('text-fg-danger-strong font-medium');

    const quotaMsg = "Bạn đã sử dụng hết quota LLM trong tháng này. Vui lòng nâng cấp lên gói PRO.";
    expect(getLogMessageColor(quotaMsg)).toBe('text-fg-danger-strong font-medium');

    const stopBatchMsg = "Dừng ở batch 2. Đã lưu 1 Business Rule từ các batch trước.";
    expect(getLogMessageColor(stopBatchMsg)).toBe('text-fg-danger-strong font-medium');

    const successMsg = "Đã sinh 3 Test Plan thành công.";
    expect(getLogMessageColor(successMsg)).toBe('text-fg-success-strong font-medium');

    const runningMsg = "Đang phân tích mã nguồn...";
    expect(getLogMessageColor(runningMsg)).toBe('text-fg-brand-strong font-medium');

    const warningNoticeMsg = "[Lưu ý kiểm thử] findUserFeedWithCursor (ArticleQueryService): Method sửa trực tiếp collection articles.";
    expect(getLogMessageColor(warningNoticeMsg)).toBe('text-amber-600 dark:text-amber-400 font-medium');

    const warningBlockedMsg = "[Cảnh báo kiểm thử] Tạm bỏ qua ca kiểm thử TC-40: Chưa đủ điều kiện sinh test.";
    expect(getLogMessageColor(warningBlockedMsg)).toBe('text-amber-600 dark:text-amber-400 font-medium');

    const rawTestabilityMsg = "Testability method 16759: UNKNOWN — COLLECTION_MUTATION @ Service.java:1 execute — detail";
    expect(getLogMessageColor(rawTestabilityMsg)).toBe('text-amber-600 dark:text-amber-400 font-medium');
  });

  it('formats raw testability log messages into human-readable concise Vietnamese descriptions', () => {
    const rawScreenshotLog =
      'Testability method 16759: UNKNOWN — COLLECTION_MUTATION @ realworld-example-app-master/src/main/java/io/spring/application/ArticleQueryService.java:42 findUserFeedWithCursor — Method sửa trực tiếp collection articles.; UNRESOLVED_HELPER_PATH @ spring-boot-realworld-example-app-master/src/main/java/io/spring/application/ArticleQueryService.java:39 findUserFeedWithCursor — Lời gọi helper nội bộ chưa truy vết được đường đi trong MVP: fillExtraInfo. | Tạo collection mutable trong fixture hoặc inject stub.';

    const formatted = formatHumanLogMessage(rawScreenshotLog);
    expect(formatted).toBe('[Lưu ý] findUserFeedWithCursor: Có sửa đổi collection nội bộ.');

    const rawScreenshot2Log =
      'Testability method 16764: READY — COLLECTION_MUTATION @ spring-boot-realworld-example-app-master/src/main/java/io/spring/application/ArticleQueryService.java:137 setFavoriteCount — Method sửa trực tiếp collection fixture: countMap. | Tạo collection mutable thực; lưu bản sao expected trước khi gọi method, không tính expected từ fixture đã bị sửa.';

    expect(formatHumanLogMessage(rawScreenshot2Log)).toBe('[Lưu ý] setFavoriteCount: Có sửa đổi collection nội bộ.');

    const rawBlockedCaseLog =
      'Testability TC-40 (40): BLOCKED: UNCONTROLLED_RANDOM_BRANCH @ src/main/java/Service.java:1 execute — Math.random() của JDK không có đầu vào điều khiển được trong fixture JUnit/Mockito hiện tại.';

    expect(formatHumanLogMessage(rawBlockedCaseLog)).toBe(
      '[Cảnh báo] Tạm bỏ qua ca kiểm thử TC-40: Nhánh Math.random() không thể điều khiển tự động.'
    );

    const normalLog = 'Đã nhận 3 Test Plan từ AI.';
    expect(formatHumanLogMessage(normalLog)).toBe('Đã nhận 3 Test Plan từ AI.');
  });
});
