// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GenerationProgress } from '../types/generation-progress';
import { AiGenerationProgress } from './AiGenerationProgress';

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
            { order: 1, label: 'Sinh Unit Test - batch 1/1', status: 'FAILED', percent: 0, errorMessage: 'Gemini tạm thời hết quota.' },
            { order: 2, label: 'Kiểm tra và lưu Unit Test', status: 'WAITING', percent: 0 },
          ],
        }}
      />,
    );

    const floatingDock = screen.getByRole('complementary');
    expect(within(floatingDock).getByText('Lỗi')).toBeVisible();
    expect(within(floatingDock).getByText('Đang chờ')).toBeVisible();
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
});
