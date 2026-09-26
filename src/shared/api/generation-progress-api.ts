import { apiClient } from './api-client';
import type { GenerationProgress, GenerationProgressStage } from '../types/generation-progress';

export async function fetchGenerationProgress(
  projectId: number,
  stage: GenerationProgressStage,
): Promise<GenerationProgress> {
  const { data } = await apiClient.get<GenerationProgress>(
    `/projects/${projectId}/generation-progress/${stage}`,
  );
  return data;
}

export async function pauseGenerationProgress(
  projectId: number,
  stage: GenerationProgressStage,
): Promise<GenerationProgress> {
  const { data } = await apiClient.post<GenerationProgress>(
    `/projects/${projectId}/generation-progress/${stage}/pause`,
  );
  return data;
}

/** Gửi yêu cầu tạm dừng ngay cả khi tab bị đóng hoặc chuyển trang qua fetch keepalive. */
export function pauseGenerationOnUnload(projectId: number, stage: GenerationProgressStage): void {
  const token = localStorage.getItem('greytest.token');
  const url = `/api/projects/${projectId}/generation-progress/${stage}/pause`;
  try {
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Ignore errors when window is closing
  }
}
