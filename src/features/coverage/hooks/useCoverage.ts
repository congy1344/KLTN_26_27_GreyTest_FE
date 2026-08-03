import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchCoverageReport, startCoverageRefinement, uploadCoverage } from '../api/coverage-api';

function coverageKey(projectId: number) {
  return ['coverage', projectId];
}

export function useCoverageReport(projectId: number) {
  return useQuery({
    queryKey: coverageKey(projectId),
    queryFn: () => fetchCoverageReport(projectId),
    enabled: projectId > 0,
  });
}

export function useUploadCoverage(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => uploadCoverage(projectId, file),
    onSuccess: (report) => {
      queryClient.setQueryData(coverageKey(projectId), report);
      // Upload đổi status project sang COVERAGE_ANALYZED → mở khóa tab Report
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
}

export function useStartCoverageRefinement(projectId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => startCoverageRefinement(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['test-cases', projectId] });
      queryClient.invalidateQueries({ queryKey: ['unit-tests', projectId] });
      queryClient.invalidateQueries({ queryKey: ['unit-test-files', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
}
