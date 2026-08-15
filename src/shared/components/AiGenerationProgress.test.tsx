// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
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
  afterEach(cleanup);

  it('always shows a Log button and reports an empty last run', () => {
    render(<AiGenerationProgress active={false} label="Đang sinh Test Plan" />);

    const button = screen.getByRole('button', { name: 'Log tiến độ' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(button);

    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('dialog', { name: 'Chi tiết tiến độ AI' })).toBeVisible();
    expect(screen.getByText('Chưa có tiến trình nào')).toBeVisible();
  });

  it('shows a queued background job before its worker starts', () => {
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

    expect(screen.getByRole('button', { name: 'Log tiến độ 0%' })).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent('đang chờ worker xử lý');
  });

  it('shows overall percentage and every pipeline step in the popup', () => {
    render(<AiGenerationProgress active label="Đang sinh Test Plan" progress={runningProgress} />);

    fireEvent.click(screen.getByRole('button', { name: 'Log tiến độ 50%' }));

    expect(screen.getByRole('progressbar', { name: 'Tiến độ tổng thể' }))
      .toHaveAttribute('aria-valuenow', '50');
    expect(screen.getByText('1/2 bước')).toBeVisible();
    expect(screen.getByText('Sinh Test Plan - batch 1/1')).toBeVisible();
    expect(screen.getByText('Kiểm tra và lưu Test Plan')).toBeVisible();
    expect(screen.getByText('Hoàn thành')).toBeVisible();
    expect(screen.getByText('Đang chạy')).toBeVisible();
    expect(screen.getByText('Đã nhận 3 Test Plan từ AI.')).toBeVisible();
  });

  it('identifies the failed step and displays its short error', () => {
    render(
      <AiGenerationProgress
        active={false}
        label="Đang sinh Unit Test"
        progress={{
          ...runningProgress,
          stage: 'UNIT_TEST',
          status: 'FAILED',
          steps: [
            { order: 1, label: 'Sinh Unit Test - batch 1/1', status: 'FAILED', percent: 0, errorMessage: 'Gemini tạm thời hết quota.' },
            { order: 2, label: 'Kiểm tra và lưu Unit Test', status: 'WAITING', percent: 0 },
          ],
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Log tiến độ' }));

    expect(screen.getByText('Lỗi')).toBeVisible();
    expect(screen.getByText('Đang chờ')).toBeVisible();
    expect(screen.getByText('Gemini tạm thời hết quota.')).toBeVisible();
  });

  it('does not present a terminal snapshot as still running during the display grace period', () => {
    const { container } = render(
      <AiGenerationProgress
        active
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

    expect(screen.getByRole('button', { name: 'Log tiến độ' })).toBeVisible();
    expect(container.querySelector('.animate-spin')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Đang sinh Test Plan: hoàn tất 100%');
  });

  it('announces a failed terminal snapshot to screen readers', () => {
    render(
      <AiGenerationProgress
        active={false}
        label="Đang sinh Test Plan"
        progress={{ ...runningProgress, status: 'FAILED' }}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Đang sinh Test Plan: thất bại 50%');
  });

  it('closes without blocking the page when clicking outside', () => {
    render(<AiGenerationProgress active label="Đang sinh Test Plan" progress={runningProgress} />);
    const button = screen.getByRole('button', { name: 'Log tiến độ 50%' });
    fireEvent.click(button);
    expect(screen.getByRole('dialog')).toBeVisible();

    fireEvent.pointerDown(document.body);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes with X and returns focus to the Log button', () => {
    render(<AiGenerationProgress active label="Đang sinh Test Plan" progress={runningProgress} />);
    const button = screen.getByRole('button', { name: 'Log tiến độ 50%' });
    fireEvent.click(button);

    fireEvent.click(screen.getByRole('button', { name: 'Đóng log tiến độ' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(button).toHaveFocus();
  });
});
