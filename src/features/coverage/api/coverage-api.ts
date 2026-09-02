import { apiClient } from '../../../shared/api/api-client';
import { serviceParams } from '../../projects/utils/project-service';
import type { CoverageRefinement, CoverageReport } from '../types';

/** Backend trả 204 khi project chưa có coverage report → map thành null. */
export async function fetchCoverageReport(projectId: number, servicePath?: string): Promise<CoverageReport | null> {
  const response = await apiClient.get<CoverageReport>(`/projects/${projectId}/coverage`, { params: serviceParams(servicePath) });
  return response.status === 204 ? null : response.data;
}

export async function uploadCoverage(projectId: number, file: File, servicePath?: string): Promise<CoverageReport> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await apiClient.post<CoverageReport>(`/projects/${projectId}/coverage/upload`, formData, { params: serviceParams(servicePath) });
  return data;
}

export async function startCoverageRefinement(projectId: number, servicePath?: string): Promise<CoverageRefinement> {
  const { data } = await apiClient.post<CoverageRefinement>(`/projects/${projectId}/coverage/refine`, undefined, { params: serviceParams(servicePath) });
  return data;
}
