import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchCoverageReport, startCoverageRefinement, uploadCoverage } from '../api/coverage-api';

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
