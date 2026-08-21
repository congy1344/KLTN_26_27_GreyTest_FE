import { useEffect, useRef, useState } from 'react';
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchGenerationProgress } from '../api/generation-progress-api';
import type { GenerationProgressStage } from '../types/generation-progress';

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

  useEffect(() => {
    if (active && !wasActive.current) {
      queryClient.removeQueries({ queryKey, exact: true });
      setTracking(true);
    }
    wasActive.current = active;
  }, [active, projectId, queryClient, stage]);

  const query = useQuery({
    queryKey,
    queryFn: () => fetchGenerationProgress(projectId, stage),
    enabled: projectId > 0,
    refetchInterval: (currentQuery) => {
      const status = currentQuery.state.data?.status;
      if (currentQuery.state.status === 'error') return active ? 1_500 : false;
      return status === 'QUEUED' || status === 'RUNNING' || active || tracking ? 1_500 : false;
    },
    refetchOnMount: 'always',
    retry: 1,
  });

  // Theo dõi các stage còn lại để khi đổi tab, UI vẫn khóa chỉnh sửa và hiển thị đúng job đang chạy.
  const siblingQueries = useQueries({
    queries: ALL_STAGES.filter((candidate) => candidate !== stage).map((candidate) => ({
      queryKey: ['generation-progress', projectId, candidate] as const,
      queryFn: () => fetchGenerationProgress(projectId, candidate),
      enabled: projectId > 0,
      refetchInterval: (currentQuery: { state: { data?: { status?: string } } }) => (
        isActiveStatus(currentQuery.state.data?.status) ? 1_500 : false
      ),
      refetchOnMount: 'always' as const,
      retry: 1,
    })),
  });
  const siblingProgress = siblingQueries.map((sibling) => sibling.data);
  const activeSibling = siblingProgress
    .find((progress) => isActiveStatus(progress?.status));
  const currentlyActive = isActiveStatus(query.data?.status) ? query.data : activeSibling;
  if (currentlyActive) trackedProjectStage.current = currentlyActive.stage;
  const trackedProgress = [query.data, ...siblingProgress]
    .find((progress) => progress?.stage === trackedProjectStage.current);
  // Giữ snapshot terminal của stage đã chạy để effect refresh dữ liệu và popup không nhảy về log cũ.
  const projectProgress = currentlyActive ?? trackedProgress ?? query.data;
  const projectRunning = isActiveStatus(projectProgress?.status);

  useEffect(() => {
    const terminal = query.data?.status === 'COMPLETED' || query.data?.status === 'FAILED';
    if (!tracking || active || !terminal) return undefined;
    const timer = window.setTimeout(() => setTracking(false), TERMINAL_DISPLAY_MS);
    return () => window.clearTimeout(timer);
  }, [active, query.data?.status, tracking]);

  useEffect(() => {
    const didNotStart = query.data?.status === 'IDLE' || query.isError;
    if (!tracking || active || !didNotStart) return undefined;
    const timer = window.setTimeout(() => setTracking(false), NO_PROGRESS_GRACE_MS);
    return () => window.clearTimeout(timer);
  }, [active, query.data?.status, query.isError, tracking]);

  useEffect(() => {
    if (projectProgress?.status !== 'COMPLETED' && projectProgress?.status !== 'FAILED') return;
    const lastLog = projectProgress.logs[projectProgress.logs.length - 1];
    const completionId = `${projectId}:${projectProgress.stage}:${projectProgress.status}:${lastLog?.timestamp ?? 'terminal'}`;
    if (refreshedCompletion.current === completionId) return;
    refreshedCompletion.current = completionId;
    queryClient.invalidateQueries({
      predicate: (cachedQuery) => cachedQuery.queryKey[0] !== 'generation-progress',
    });
  }, [projectId, projectProgress, queryClient]);

  return { ...query, showProgress: active || tracking, projectProgress, projectRunning };
}
