import { apiClient } from '../../../shared/api/api-client';
import type { CoverageRefinement, CoverageReport } from '../types';

/** Backend trả 204 khi project chưa có coverage report → map thành null. */
export async function fetchCoverageReport(projectId: number): Promise<CoverageReport | null> {
  const response = await apiClient.get<CoverageReport>(`/projects/${projectId}/coverage`);
  return response.status === 204 ? null : response.data;
}

export async function uploadCoverage(projectId: number, file: File): Promise<CoverageReport> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await apiClient.post<CoverageReport>(`/projects/${projectId}/coverage/upload`, formData);
  return data;
}

export async function startCoverageRefinement(projectId: number): Promise<CoverageRefinement> {
  const { data } = await apiClient.post<CoverageRefinement>(`/projects/${projectId}/coverage/refine`);
  return data;
}
