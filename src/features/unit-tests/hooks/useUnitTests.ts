import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchUnitTestFiles, fetchUnitTests, generateUnitTests } from '../api/unit-test-api';

const key = (projectId: number, servicePath?: string) => ['unit-tests', projectId, servicePath ?? 'auto'];
const filesKey = (projectId: number, servicePath?: string) => ['unit-test-files', projectId, servicePath ?? 'auto'];

export function useUnitTests(projectId: number, servicePath?: string) {
  return useQuery({ queryKey: key(projectId, servicePath), queryFn: () => fetchUnitTests(projectId, servicePath), enabled: projectId > 0 });
}

export function useUnitTestFiles(projectId: number, servicePath?: string) {
  return useQuery({ queryKey: filesKey(projectId, servicePath), queryFn: () => fetchUnitTestFiles(projectId, servicePath), enabled: projectId > 0 });
}

export function useGenerateUnitTests(projectId: number, servicePath?: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => generateUnitTests(projectId, servicePath),
    onSuccess: () => client.invalidateQueries({
      queryKey: ['generation-progress', projectId, 'UNIT_TEST'],
    }),
  });
}
