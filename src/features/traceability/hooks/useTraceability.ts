import { useQuery } from '@tanstack/react-query';
import { fetchTraceability } from '../api/traceability-api';

export function useTraceability(projectId: number, servicePath?: string) {
  return useQuery({
    queryKey: ['traceability', projectId, servicePath],
    queryFn: () => fetchTraceability(projectId, servicePath),
    enabled: projectId > 0,
  });
}
