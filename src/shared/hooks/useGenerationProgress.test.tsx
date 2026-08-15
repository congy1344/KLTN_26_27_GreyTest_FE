// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GenerationProgress, GenerationProgressStage } from '../types/generation-progress';
import { useGenerationProgress } from './useGenerationProgress';

const mocks = vi.hoisted(() => ({ fetchProgress: vi.fn() }));

vi.mock('../api/generation-progress-api', () => ({
  fetchGenerationProgress: mocks.fetchProgress,
}));

const running: GenerationProgress = {
  stage: 'TEST_CASE', status: 'RUNNING', percent: 50,
  completedSteps: 1, totalSteps: 2,
  steps: [
    { order: 1, label: 'Sinh Test Case - batch 1/1', status: 'COMPLETED', percent: 100 },
    { order: 2, label: 'Kiểm tra và lưu Test Case', status: 'RUNNING', percent: 0 },
  ],
  logs: [{ timestamp: '2026-08-14T12:00:00Z', message: 'Đã xử lý batch 1/1.' }],
};

const completed: GenerationProgress = {
  ...running, status: 'COMPLETED', percent: 100, completedSteps: 2,
  steps: running.steps.map((step) => ({ ...step, status: 'COMPLETED', percent: 100 })),
  logs: [...running.logs, { timestamp: '2026-08-14T12:00:02Z', message: 'Hoàn tất.' }],
};

const idle = (stage: GenerationProgressStage): GenerationProgress => ({
  stage, status: 'IDLE', percent: 0,
  completedSteps: 0, totalSteps: 0, steps: [], logs: [],
});

describe('useGenerationProgress', () => {
  afterEach(() => vi.clearAllMocks());

  it('continues tracking after the mutation settles and retains the terminal snapshot', async () => {
    let currentStageCalls = 0;
    mocks.fetchProgress.mockImplementation((_projectId: number, stage: GenerationProgressStage) => {
      if (stage !== 'TEST_CASE') return Promise.resolve(idle(stage));
      currentStageCalls += 1;
      return Promise.resolve(currentStageCalls === 1 ? running : completed);
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result, rerender } = renderHook(
      ({ active }) => useGenerationProgress(7, 'TEST_CASE', active),
      { initialProps: { active: true }, wrapper },
    );

    await waitFor(() => expect(result.current.data?.status).toBe('RUNNING'));
    rerender({ active: false });
    expect(result.current.showProgress).toBe(true);

    await act(async () => { await result.current.refetch(); });

    await waitFor(() => expect(result.current.data?.status).toBe('COMPLETED'));
    expect(result.current.showProgress).toBe(true);
    expect(result.current.data?.percent).toBe(100);
  });

  it('stops tracking when the settled mutation never started backend progress', async () => {
    mocks.fetchProgress.mockResolvedValue({
      stage: 'TEST_CASE', status: 'IDLE', percent: 0,
      completedSteps: 0, totalSteps: 0, steps: [], logs: [],
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result, rerender } = renderHook(
      ({ active }) => useGenerationProgress(7, 'TEST_CASE', active),
      { initialProps: { active: true }, wrapper },
    );

    await waitFor(() => expect(result.current.data?.status).toBe('IDLE'));
    rerender({ active: false });

    await waitFor(() => expect(result.current.showProgress).toBe(false), { timeout: 3_000 });
  });

  it('stops tracking after the progress endpoint fails', async () => {
    mocks.fetchProgress.mockRejectedValue(new Error('Network unavailable'));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result, rerender } = renderHook(
      ({ active }) => useGenerationProgress(7, 'TEST_CASE', active),
      { initialProps: { active: true }, wrapper },
    );

    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 3_000 });
    rerender({ active: false });

    await waitFor(() => expect(result.current.showProgress).toBe(false), { timeout: 3_000 });
  });

  it('recovers polling from a temporary progress error while generation is active', async () => {
    let currentStageCalls = 0;
    mocks.fetchProgress.mockImplementation((_projectId: number, stage: GenerationProgressStage) => {
      if (stage !== 'TEST_CASE') return Promise.resolve(idle(stage));
      currentStageCalls += 1;
      return currentStageCalls < 3
        ? Promise.reject(new Error('Temporary error'))
        : Promise.resolve(running);
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(
      () => useGenerationProgress(7, 'TEST_CASE', true),
      { wrapper },
    );

    await waitFor(() => expect(result.current.data?.status).toBe('RUNNING'), { timeout: 4_000 });
    expect(currentStageCalls).toBe(3);
  });

  it('reports an active job from another workflow stage', async () => {
    mocks.fetchProgress.mockImplementation((_projectId: number, stage: GenerationProgressStage) => (
      Promise.resolve(stage === 'TEST_PLAN'
        ? { ...running, stage: 'TEST_PLAN' as const }
        : idle(stage))
    ));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(
      () => useGenerationProgress(7, 'BUSINESS_RULE', false),
      { wrapper },
    );

    await waitFor(() => expect(result.current.projectRunning).toBe(true));
    expect(result.current.projectProgress?.stage).toBe('TEST_PLAN');
  });

  it('retains sibling completion and invalidates artifact queries', async () => {
    let siblingCompleted = false;
    mocks.fetchProgress.mockImplementation((_projectId: number, stage: GenerationProgressStage) => {
      if (stage !== 'TEST_PLAN') return Promise.resolve(idle(stage));
      return Promise.resolve(siblingCompleted
        ? { ...completed, stage: 'TEST_PLAN' as const }
        : { ...running, stage: 'TEST_PLAN' as const });
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(['test-plans', 7], ['stale']);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(
      () => useGenerationProgress(7, 'BUSINESS_RULE', false),
      { wrapper },
    );
    await waitFor(() => expect(result.current.projectProgress?.status).toBe('RUNNING'));

    siblingCompleted = true;
    await act(async () => {
      await client.refetchQueries({ queryKey: ['generation-progress', 7, 'TEST_PLAN'], exact: true });
    });

    await waitFor(() => expect(result.current.projectProgress?.status).toBe('COMPLETED'));
    await waitFor(() => expect(client.getQueryState(['test-plans', 7])?.isInvalidated).toBe(true));
  });
});
