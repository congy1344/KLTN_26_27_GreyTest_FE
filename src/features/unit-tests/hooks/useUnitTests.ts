import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchUnitTestFiles, fetchUnitTests, generateUnitTests } from '../api/unit-test-api';

const key = (projectId: number) => ['unit-tests', projectId];
const filesKey = (projectId: number) => ['unit-test-files', projectId];

export function useUnitTests(projectId: number) {
  return useQuery({ queryKey: key(projectId), queryFn: () => fetchUnitTests(projectId), enabled: projectId > 0 });
}

export function useUnitTestFiles(projectId: number) {
  return useQuery({ queryKey: filesKey(projectId), queryFn: () => fetchUnitTestFiles(projectId), enabled: projectId > 0 });
}

export function useGenerateUnitTests(projectId: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => generateUnitTests(projectId),
    onSuccess: async (data) => {
      client.setQueryData(key(projectId), data);
      await Promise.all([
        client.invalidateQueries({ queryKey: filesKey(projectId) }),
        client.invalidateQueries({ queryKey: ['project', projectId] }),
      ]);
    },
  });
}
