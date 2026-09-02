import { apiClient } from '../../../shared/api/api-client';
import { serviceParams } from '../../projects/utils/project-service';
import type { UnitTest, UnitTestFile } from '../types';
import type { GenerationJobAccepted } from '../../../shared/types/generation-progress';

export async function fetchUnitTests(projectId: number, servicePath?: string) {
  const { data } = await apiClient.get<UnitTest[]>(`/projects/${projectId}/unit-tests`, { params: serviceParams(servicePath) });
  return data;
}

export async function fetchUnitTestFiles(projectId: number, servicePath?: string) {
  const { data } = await apiClient.get<UnitTestFile[]>(`/projects/${projectId}/unit-tests/files`, { params: serviceParams(servicePath) });
  return data;
}

export async function generateUnitTests(projectId: number, servicePath?: string) {
  const { data } = await apiClient.post<GenerationJobAccepted>(`/projects/${projectId}/unit-tests/generate`, undefined, { params: serviceParams(servicePath) });
  return data;
}

/** Tải ZIP toàn bộ file test đã gộp (cần JWT header nên đi qua apiClient thay vì <a href>). */
export async function downloadUnitTestsZip(projectId: number, servicePath?: string) {
  const { data } = await apiClient.get<Blob>(`/projects/${projectId}/unit-tests/download`, { responseType: 'blob', params: serviceParams(servicePath) });
  const url = URL.createObjectURL(data);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'greytest-unit-tests.zip';
  anchor.click();
  URL.revokeObjectURL(url);
}
