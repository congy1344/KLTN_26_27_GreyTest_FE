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

export async function generateUnitTests(projectId: number, servicePath?: string, resume?: boolean) {
  const params: Record<string, string> = { ...serviceParams(servicePath) };
  if (resume) {
    params.resume = 'true';
  }
  const { data } = await apiClient.post<GenerationJobAccepted>(`/projects/${projectId}/unit-tests/generate`, undefined, { params });
  return data;
}

/** Tải ZIP toàn bộ file test đã gộp (cần JWT header nên đi qua apiClient thay vì <a href>). */
export async function downloadUnitTestsZip(projectId: number, servicePath?: string) {
  let data: Blob;
  try {
    ({ data } = await apiClient.get<Blob>(`/projects/${projectId}/unit-tests/download`, { responseType: 'blob', params: serviceParams(servicePath) }));
  } catch (error) {
    const responseData = (error as { response?: { data?: unknown } }).response?.data;
    if (responseData instanceof Blob) {
      const message = await responseData.text();
      let errorMessage = message;
      try {
        const payload = JSON.parse(message) as { message?: string };
        errorMessage = payload.message || message;
      } catch {
        // Giữ nguyên response text nếu backend không trả JSON chuẩn.
      }
      throw new Error(errorMessage || 'Không thể tải Unit Test ZIP');
    }
    throw error;
  }
  const url = URL.createObjectURL(data);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'greytest-unit-tests.zip';
  document.body.appendChild(anchor);
  anchor.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    anchor.remove();
  }, 0);
}
