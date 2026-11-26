import { useEffect, useRef, useState } from 'react';
import { type QueryClient, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  cancelGenerationProgress,
  fetchGenerationProgress,
  pauseGenerationOnUnload,
  pauseGenerationProgress,
} from '../api/generation-progress-api';
import type { GenerationProgress, GenerationProgressLog, GenerationProgressStage, GenerationProgressStep } from '../types/generation-progress';

const TERMINAL_DISPLAY_MS = 5_000;
const NO_PROGRESS_GRACE_MS = 1_500;
const ALL_STAGES: GenerationProgressStage[] = ['BUSINESS_RULE', 'TEST_PLAN', 'TEST_CASE', 'UNIT_TEST'];
const GENERATION_AFFECTED_KEYS = new Set([
  'project',
  'project-services',
  'business-rules',
  'test-plans',
  'test-cases',
  'unit-tests',
  'unit-test-files',
  'coverage',
  'coverage-run',
  'traceability',
  'user',
]);

type ClientProgressState = { activeStages: Set<string>; refreshedCompletions: Set<string> };
const progressStateByClient = new WeakMap<QueryClient, ClientProgressState>();

function getClientProgressState(queryClient: QueryClient): ClientProgressState {
  let state = progressStateByClient.get(queryClient);
  if (!state) {
    state = { activeStages: new Set(), refreshedCompletions: new Set() };
    progressStateByClient.set(queryClient, state);
  }
  return state;
}

function markStageActive(state: ClientProgressState, projectId: number, stage: GenerationProgressStage) {
  const prefix = `${projectId}:${stage}:`;
  state.refreshedCompletions.forEach((id) => {
    if (id.startsWith(prefix)) state.refreshedCompletions.delete(id);
  });
  state.activeStages.add(`${projectId}:${stage}`);
}

const isActiveStatus = (status?: string, busy?: boolean) =>
  status === 'QUEUED' || status === 'RUNNING' || (status === 'PAUSED' && Boolean(busy));

/** Polling tiến độ và giữ kết quả cuối đủ lâu để người dùng đọc phần trăm cùng nhật ký. */
export function useGenerationProgress(
  projectId: number,
  stage: GenerationProgressStage,
  active: boolean,
) {
  const queryClient = useQueryClient();
  const clientState = getClientProgressState(queryClient);
  const wasActive = useRef(false);
  const trackedProjectStage = useRef<GenerationProgressStage | null>(null);
  const [tracking, setTracking] = useState(false);
  const queryKey = ['generation-progress', projectId, stage] as const;

  if (active && projectId > 0) {
    markStageActive(clientState, projectId, stage);
  }

  // Tự động tạm dừng tác vụ ở batch hiện tại khi người dùng đóng tab hoặc thoát trang
  useEffect(() => {
    const isStageRunning = active || isActiveStatus(queryClient.getQueryData<{ status?: string }>(queryKey)?.status);
    if (!isStageRunning || projectId <= 0) return undefined;

    const handleUnload = () => {
      pauseGenerationOnUnload(projectId, stage);
    };

    window.addEventListener('pagehide', handleUnload);
    window.addEventListener('beforeunload', handleUnload);
    return () => {
      window.removeEventListener('pagehide', handleUnload);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [active, projectId, queryClient, queryKey, stage]);

  useEffect(() => {
    if (active && !wasActive.current) {
      queryClient.removeQueries({ queryKey, exact: true });
      trackedProjectStage.current = null;
      setTracking(true);
    }
    wasActive.current = active;
  }, [active, projectId, queryClient, queryKey, stage]);

  // Theo dõi các stage còn lại để khi chuyển stage hoặc Sinh Tất Cả, UI cập nhật tức thì.
  const siblingQueries = useQueries({
    queries: ALL_STAGES.filter((candidate) => candidate !== stage).map((candidate) => ({
      queryKey: ['generation-progress', projectId, candidate] as const,
      queryFn: () => fetchGenerationProgress(projectId, candidate),
      enabled: projectId > 0,
      staleTime: clientState.activeStages.has(`${projectId}:${candidate}`) ? 0 : 3_000,
      refetchInterval: (currentQuery: { state: { data?: { status?: string; busy?: boolean } } }) => {
        const status = currentQuery.state.data?.status;
        const isBusy = Boolean(currentQuery.state.data?.busy);
        // Chỉ bước đang chạy mới hỏi nhanh; các bước khác hỏi thưa để phát hiện chuyển bước (tránh 4 bước x 40 req/phút bị WAF khóa IP).
        if (isActiveStatus(status) || (status === 'PAUSED' && isBusy)) return 1_500;
        return active || tracking ? 3_000 : false;
      },
      retry: false,
    })),
  });
  const siblingProgress = siblingQueries.map((sibling) => sibling.data);
  const activeSibling = siblingProgress
    .find((progress) => isActiveStatus(progress?.status, progress?.busy));
  const isAnySiblingActive = Boolean(activeSibling);

  const query = useQuery({
    queryKey,
    queryFn: () => fetchGenerationProgress(projectId, stage),
    enabled: projectId > 0,
    refetchInterval: (currentQuery) => {
      const status = currentQuery.state.data?.status;
      const isBusy = Boolean(currentQuery.state.data?.busy);
      if (currentQuery.state.status === 'error') return active ? 1_500 : false;
      return status === 'QUEUED' || status === 'RUNNING' || (status === 'PAUSED' && isBusy) || active || tracking || isAnySiblingActive ? 1_500 : false;
    },
    refetchOnMount: 'always',
    retry: false,
  });

  const isStartingStage = active && !wasActive.current;
  const currentStageData = isStartingStage ? undefined : query.data;

  const allProgress = [currentStageData, ...siblingProgress].filter(Boolean) as GenerationProgress[];
  allProgress.forEach((progress) => {
    if (projectId > 0 && isActiveStatus(progress.status, progress.busy)) {
      markStageActive(clientState, projectId, progress.stage);
    }
  });
  const currentlyActive = isActiveStatus(currentStageData?.status, currentStageData?.busy) ? currentStageData : activeSibling;
  if (currentlyActive) trackedProjectStage.current = currentlyActive.stage;

  // Khi không có stage nào RUNNING, tìm stage hoàn thành gần nhất theo thứ tự pipeline
  const latestFinishedByPipeline = [...ALL_STAGES]
    .reverse()
    .map((candidate) => allProgress.find((p) => p?.stage === candidate))
    .find((p) => p && (p.status === 'COMPLETED' || p.status === 'FAILED' || p.status === 'PARTIAL'));

  const trackedProgress = trackedProjectStage.current
    ? allProgress.find((progress) => progress?.stage === trackedProjectStage.current && progress.status !== 'IDLE')
    : undefined;

  const projectProgress = currentlyActive
    ?? trackedProgress
    ?? (currentStageData && currentStageData.status !== 'IDLE' ? currentStageData : undefined)
    ?? (active ? latestFinishedByPipeline : undefined)
    ?? currentStageData;
  const projectRunning = isActiveStatus(projectProgress?.status, projectProgress?.busy);

  useEffect(() => {
    const status = projectProgress?.status ?? currentStageData?.status;
    const terminal = status === 'COMPLETED' || status === 'PARTIAL' || status === 'FAILED';
    if (!tracking || active || !terminal) return undefined;
    const timer = window.setTimeout(() => setTracking(false), TERMINAL_DISPLAY_MS);
    return () => window.clearTimeout(timer);
  }, [active, currentStageData?.status, projectProgress?.status, tracking]);

  useEffect(() => {
    const status = projectProgress?.status ?? currentStageData?.status;
    const didNotStart = status === 'IDLE' || query.isError;
    if (!tracking || active || !didNotStart) return undefined;
    const timer = window.setTimeout(() => setTracking(false), NO_PROGRESS_GRACE_MS);
    return () => window.clearTimeout(timer);
  }, [active, currentStageData?.status, projectProgress?.status, query.isError, tracking]);

  useEffect(() => {
    if (projectId <= 0) return;
    const state = getClientProgressState(queryClient);
    let shouldInvalidate = false;

    // Xét mọi bước vừa kết thúc mà phiên hiện tại từng chứng kiến đang chạy (kể cả khi đổi tab/servicePath).
    for (const progress of allProgress) {
      if (progress.status !== 'COMPLETED' && progress.status !== 'PARTIAL' && progress.status !== 'FAILED') continue;
      const stageKey = `${projectId}:${progress.stage}`;
      if (!state.activeStages.has(stageKey)) continue;
      state.activeStages.delete(stageKey);

      const lastLog = progress.logs[progress.logs.length - 1];
      const completionId = `${stageKey}:${progress.status}:${lastLog?.timestamp ?? 'terminal'}`;
      if (state.refreshedCompletions.has(completionId)) continue;
      state.refreshedCompletions.add(completionId);
      shouldInvalidate = true;

      if (progress.status === 'FAILED') {
        const isQuotaError =
          progress.logs?.some((l: GenerationProgressLog) =>
            /quota/i.test(l.message) || /vượt hạn mức/i.test(l.message) || /hết quota/i.test(l.message)
          ) ||
          progress.steps?.some(
            (s: GenerationProgressStep) =>
              s.status === 'FAILED' &&
              (/quota/i.test(s.errorMessage || '') || /hết quota/i.test(s.errorMessage || ''))
          );
        if (isQuotaError && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('quota-exceeded'));
        }
      }
    }

    if (shouldInvalidate) {
      queryClient.invalidateQueries({
        predicate: (cachedQuery) => GENERATION_AFFECTED_KEYS.has(String(cachedQuery.queryKey[0])),
      });
    }
  }, [allProgress, projectId, queryClient]);

  const pause = async () => {
    const targetStage = currentlyActive?.stage ?? trackedProjectStage.current ?? stage;
    const updated = await pauseGenerationProgress(projectId, targetStage);
    queryClient.setQueryData(['generation-progress', projectId, targetStage], updated);
    return updated;
  };

  const cancel = async () => {
    const targetStage = currentlyActive?.stage ?? trackedProjectStage.current ?? stage;
    const updated = await cancelGenerationProgress(projectId, targetStage);
    queryClient.setQueryData(['generation-progress', projectId, targetStage], updated);
    return updated;
  };

  const isPaused = query.data?.status === 'PAUSED';
  const isDraining = isPaused && Boolean(query.data?.busy);

  return {
    ...query,
    showProgress: active || tracking || isPaused,
    projectProgress,
    projectRunning: projectRunning || isDraining,
    isPaused,
    isDraining,
    pause,
    cancel,
  };
}
