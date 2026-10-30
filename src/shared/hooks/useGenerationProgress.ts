import { useEffect, useRef, useState } from 'react';
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchGenerationProgress,
  pauseGenerationOnUnload,
  pauseGenerationProgress,
} from '../api/generation-progress-api';
import type { GenerationProgress, GenerationProgressLog, GenerationProgressStage, GenerationProgressStep } from '../types/generation-progress';

const TERMINAL_DISPLAY_MS = 5_000;
const NO_PROGRESS_GRACE_MS = 1_500;
const ALL_STAGES: GenerationProgressStage[] = ['BUSINESS_RULE', 'TEST_PLAN', 'TEST_CASE', 'UNIT_TEST'];

const isActiveStatus = (status?: string) => status === 'QUEUED' || status === 'RUNNING';

/** Polling tiến độ và giữ kết quả cuối đủ lâu để người dùng đọc phần trăm cùng nhật ký. */
export function useGenerationProgress(
  projectId: number,
  stage: GenerationProgressStage,
  active: boolean,
) {
  const queryClient = useQueryClient();
  const wasActive = useRef(false);
  const refreshedCompletion = useRef<string | null>(null);
  const trackedProjectStage = useRef<GenerationProgressStage | null>(null);
  const [tracking, setTracking] = useState(false);
  const queryKey = ['generation-progress', projectId, stage] as const;

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
      ALL_STAGES.forEach((candidate) => {
        queryClient.removeQueries({ queryKey: ['generation-progress', projectId, candidate], exact: true });
      });
      trackedProjectStage.current = null;
      setTracking(true);
    }
    wasActive.current = active;
  }, [active, projectId, queryClient, stage]);

  // Theo dõi các stage còn lại để khi chuyển stage hoặc Sinh Tất Cả, UI cập nhật tức thì.
  const siblingQueries = useQueries({
    queries: ALL_STAGES.filter((candidate) => candidate !== stage).map((candidate) => ({
      queryKey: ['generation-progress', projectId, candidate] as const,
      queryFn: () => fetchGenerationProgress(projectId, candidate),
      enabled: projectId > 0,
      refetchInterval: (currentQuery: { state: { data?: { status?: string } } }) => (
        active || tracking || isActiveStatus(currentQuery.state.data?.status) ? 1_500 : false
      ),
      refetchOnMount: 'always' as const,
      retry: 1,
    })),
  });
  const siblingProgress = siblingQueries.map((sibling) => sibling.data);
  const activeSibling = siblingProgress
    .find((progress) => isActiveStatus(progress?.status));
  const isAnySiblingActive = Boolean(activeSibling);

  const query = useQuery({
    queryKey,
    queryFn: () => fetchGenerationProgress(projectId, stage),
    enabled: projectId > 0,
    refetchInterval: (currentQuery) => {
      const status = currentQuery.state.data?.status;
      if (currentQuery.state.status === 'error') return active ? 1_500 : false;
      return status === 'QUEUED' || status === 'RUNNING' || active || tracking || isAnySiblingActive ? 1_500 : false;
    },
    refetchOnMount: 'always',
    retry: 1,
  });

  const allProgress = [query.data, ...siblingProgress].filter(Boolean) as GenerationProgress[];
  const currentlyActive = isActiveStatus(query.data?.status) ? query.data : activeSibling;
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
    ?? (query.data && query.data.status !== 'IDLE' ? query.data : undefined)
    ?? trackedProgress
    ?? (active ? latestFinishedByPipeline : undefined)
    ?? query.data;
  const projectRunning = isActiveStatus(projectProgress?.status);

  useEffect(() => {
    const status = projectProgress?.status ?? query.data?.status;
    const terminal = status === 'COMPLETED' || status === 'PARTIAL' || status === 'FAILED';
    if (!tracking || active || !terminal) return undefined;
    const timer = window.setTimeout(() => setTracking(false), TERMINAL_DISPLAY_MS);
    return () => window.clearTimeout(timer);
  }, [active, projectProgress?.status, query.data?.status, tracking]);

  useEffect(() => {
    const status = projectProgress?.status ?? query.data?.status;
    const didNotStart = status === 'IDLE' || query.isError;
    if (!tracking || active || !didNotStart) return undefined;
    const timer = window.setTimeout(() => setTracking(false), NO_PROGRESS_GRACE_MS);
    return () => window.clearTimeout(timer);
  }, [active, projectProgress?.status, query.data?.status, query.isError, tracking]);

  useEffect(() => {
    if (projectProgress?.status !== 'COMPLETED' && projectProgress?.status !== 'PARTIAL' && projectProgress?.status !== 'FAILED') return;
    const lastLog = projectProgress.logs[projectProgress.logs.length - 1];
    const completionId = `${projectId}:${projectProgress.stage}:${projectProgress.status}:${lastLog?.timestamp ?? 'terminal'}`;
    if (refreshedCompletion.current === completionId) return;
    refreshedCompletion.current = completionId;

    if (projectProgress.status === 'FAILED') {
      const isQuotaError =
        projectProgress.logs?.some((l: GenerationProgressLog) =>
          /quota/i.test(l.message) || /vượt hạn mức/i.test(l.message) || /hết quota/i.test(l.message)
        ) ||
        projectProgress.steps?.some(
          (s: GenerationProgressStep) =>
            s.status === 'FAILED' &&
            (/quota/i.test(s.errorMessage || '') || /hết quota/i.test(s.errorMessage || ''))
        );
      if (isQuotaError && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('quota-exceeded'));
      }
    }

    queryClient.invalidateQueries({
      predicate: (cachedQuery) => cachedQuery.queryKey[0] !== 'generation-progress',
    });
  }, [projectId, projectProgress, queryClient]);

  const pause = async () => {
    const targetStage = currentlyActive?.stage ?? trackedProjectStage.current ?? stage;
    const updated = await pauseGenerationProgress(projectId, targetStage);
    queryClient.setQueryData(['generation-progress', projectId, targetStage], updated);
    return updated;
  };

  const isPaused = query.data?.status === 'PAUSED';

  return {
    ...query,
    showProgress: active || tracking || isPaused,
    projectProgress,
    projectRunning,
    isPaused,
    pause,
  };
}
