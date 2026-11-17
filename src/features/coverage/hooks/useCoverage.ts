import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchCoverageReport, fetchSandboxRun, startCoverageRefinement, startSandboxRun, uploadCoverage } from '../api/coverage-api';

function coverageKey(projectId: number, servicePath?: string) {
  return ['coverage', projectId, servicePath ?? 'auto'];
}

export function useCoverageReport(projectId: number, servicePath?: string) {
  return useQuery({
    queryKey: coverageKey(projectId, servicePath),
    queryFn: () => fetchCoverageReport(projectId, servicePath),
    enabled: projectId > 0,
  });
}

export function useUploadCoverage(projectId: number, servicePath?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadCoverage(projectId, file, servicePath),
    onSuccess: (report) => {
      queryClient.setQueryData(coverageKey(projectId, servicePath), report);
      // Upload đổi status project sang COVERAGE_ANALYZED → mở khóa tab Report
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-services', projectId] });
    },
  });
}

export function useStartCoverageRefinement(projectId: number, servicePath?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => startCoverageRefinement(projectId, servicePath),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-cases', projectId] });
      queryClient.invalidateQueries({ queryKey: ['unit-tests', projectId] });
      queryClient.invalidateQueries({ queryKey: ['unit-test-files', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project-services', projectId] });
    },
  });
}

/** Chạy Unit Test trong sandbox trên server; tự hỏi lại trạng thái mỗi 2 giây khi đang chạy. */
export function useSandboxRun(projectId: number, servicePath?: string) {
  const queryClient = useQueryClient();
  const key = ['coverage-run', projectId];
  const state = useQuery({
    queryKey: key,
    queryFn: () => fetchSandboxRun(projectId),
    enabled: projectId > 0,
    refetchInterval: (query) => (query.state.data?.status === 'RUNNING' ? 2000 : false),
  });
  const start = useMutation({
    // repair=true: AI sửa test không đạt rồi chạy lại (tốn quota AI).
    mutationFn: (repair: boolean) => startSandboxRun(projectId, servicePath, repair),
    onSuccess: (data) => queryClient.setQueryData(key, data),
  });
  const status = state.data?.status;
  useEffect(() => {
    // Chạy xong thì coverage và status project đã đổi ở backend.
    if (status !== 'SUCCEEDED' && status !== 'TESTS_FAILED') return;
    queryClient.invalidateQueries({ queryKey: ['coverage', projectId] });
    queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    queryClient.invalidateQueries({ queryKey: ['project-services', projectId] });
  }, [status, projectId, queryClient]);
  return { state: state.data, start };
}
