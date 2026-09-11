import { apiClient } from '../../../shared/api/api-client';
import { serviceParams } from '../../projects/utils/project-service';
import type { TraceabilityMatrix } from '../types';

export async function fetchTraceability(projectId: number, servicePath?: string): Promise<TraceabilityMatrix> {
  const { data } = await apiClient.get<TraceabilityMatrix>(`/projects/${projectId}/traceability`, { params: serviceParams(servicePath) });
  return data;
}
