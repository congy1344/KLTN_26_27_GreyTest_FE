import { useQuery } from '@tanstack/react-query';
import { fetchTraceability } from '../api/traceability-api';

export function useTraceability(projectId: number) {
  return useQuery({
    queryKey: ['traceability', projectId],
    queryFn: () => fetchTraceability(projectId),
    enabled: projectId > 0,
  });
}
