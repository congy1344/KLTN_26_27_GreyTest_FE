import { apiClient } from '../../../shared/api/api-client';
import type { TraceabilityMatrix } from '../types';

export async function fetchTraceability(projectId: number): Promise<TraceabilityMatrix> {
  const { data } = await apiClient.get<TraceabilityMatrix>(`/projects/${projectId}/traceability`);
  return data;
}
