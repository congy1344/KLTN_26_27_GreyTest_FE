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
