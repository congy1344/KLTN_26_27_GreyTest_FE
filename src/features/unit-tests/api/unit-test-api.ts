import { apiClient } from '../../../shared/api/api-client';
import type { UnitTest, UnitTestFile } from '../types';

export async function fetchUnitTests(projectId: number) {
  const { data } = await apiClient.get<UnitTest[]>(`/projects/${projectId}/unit-tests`);
  return data;
}

export async function fetchUnitTestFiles(projectId: number) {
  const { data } = await apiClient.get<UnitTestFile[]>(`/projects/${projectId}/unit-tests/files`);
  return data;
}

export async function generateUnitTests(projectId: number) {
  const { data } = await apiClient.post<UnitTest[]>(`/projects/${projectId}/unit-tests/generate`);
  return data;
}

/** Tải ZIP toàn bộ file test đã gộp (cần JWT header nên đi qua apiClient thay vì <a href>). */
export async function downloadUnitTestsZip(projectId: number) {
  const { data } = await apiClient.get<Blob>(`/projects/${projectId}/unit-tests/download`, { responseType: 'blob' });
  const url = URL.createObjectURL(data);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'greytest-unit-tests.zip';
  anchor.click();
  URL.revokeObjectURL(url);
}
