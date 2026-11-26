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

/** Trạng thái lần chạy Unit Test trong sandbox trên server (mirror SandboxTestRunService.RunState). */
export interface SandboxRunState {
  status: 'IDLE' | 'RUNNING' | 'SUCCEEDED' | 'TESTS_FAILED' | 'FAILED';
  message: string;
  tests: number;
  failed: number;
  logTail: string;
  compilationError?: boolean;
  failures?: Array<{
    className: string;
    methodName: string;
    testCaseCode?: string | null;
    message: string;
  }>;
}

export async function startSandboxRun(projectId: number, servicePath?: string, repair = false): Promise<SandboxRunState> {
  const { data } = await apiClient.post<SandboxRunState>(`/projects/${projectId}/coverage/run`, undefined, { params: { ...serviceParams(servicePath), repair } });
  return data;
}

export async function fetchSandboxRun(projectId: number): Promise<SandboxRunState> {
  const { data } = await apiClient.get<SandboxRunState>(`/projects/${projectId}/coverage/run`);
  return data;
}
