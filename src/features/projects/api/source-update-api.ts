import type { AxiosRequestConfig } from 'axios';
import { apiClient } from '../../../shared/api/api-client';
import type {
  SourceUpdateAction,
  SourceUpdateDto,
  SourceUpdateItemDto,
  SourceUpdateReviewStatus,
} from '../types';

export const SOURCE_UPDATE_TIMEOUT_MS = 120_000;

export interface SourceUpdateRequestOptions {
  signal?: AbortSignal;
  onUploadProgress?: (percent: number) => void;
}

function requestConfig(options?: SourceUpdateRequestOptions): AxiosRequestConfig {
  const config: AxiosRequestConfig = { timeout: SOURCE_UPDATE_TIMEOUT_MS };
  if (options?.signal) config.signal = options.signal;
  if (options?.onUploadProgress) {
    config.onUploadProgress = (event) => {
      const percent = event.progress != null
        ? event.progress * 100
        : event.total
          ? (event.loaded / event.total) * 100
          : 0;
      options.onUploadProgress?.(Math.min(100, Math.round(percent)));
    };
  }
  return config;
}

export async function createZipSourceUpdate(
  projectId: number,
  file: File,
  options?: SourceUpdateRequestOptions,
): Promise<SourceUpdateDto> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await apiClient.post<SourceUpdateDto>(
    `/projects/${projectId}/source-updates/zip`,
    formData,
    requestConfig(options),
  );
  return data;
}

export async function createGithubSourceUpdate(
  projectId: number,
  branch: string,
  options?: SourceUpdateRequestOptions,
): Promise<SourceUpdateDto> {
  const { data } = await apiClient.post<SourceUpdateDto>(
    `/projects/${projectId}/source-updates/github`,
    { branch },
    requestConfig(options),
  );
  return data;
}

export async function fetchProjectSourceUpdates(
  projectId: number,
  options?: SourceUpdateRequestOptions,
): Promise<SourceUpdateDto[]> {
  const { data } = await apiClient.get<SourceUpdateDto[]>(
    `/projects/${projectId}/source-updates`,
    requestConfig(options),
  );
  return data;
}

export async function fetchSourceUpdate(
  projectId: number,
  updateId: number,
  options?: SourceUpdateRequestOptions,
): Promise<SourceUpdateDto> {
  const { data } = await apiClient.get<SourceUpdateDto>(
    `/projects/${projectId}/source-updates/${updateId}`,
    requestConfig(options),
  );
  return data;
}

export async function analyzeSourceUpdate(
  projectId: number,
  updateId: number,
  servicePath?: string | null,
  options?: SourceUpdateRequestOptions,
): Promise<SourceUpdateDto> {
  const query = servicePath ? `?servicePath=${encodeURIComponent(servicePath)}` : '';
  const { data } = await apiClient.post<SourceUpdateDto>(
    `/projects/${projectId}/source-updates/${updateId}/analyze${query}`,
    undefined,
    requestConfig(options),
  );
  return data;
}

export async function generateIncrementalSourceUpdate(
  projectId: number,
  updateId: number,
  stage: 'BUSINESS_RULE' | 'TEST_PLAN' | 'TEST_CASE' | 'UNIT_TEST' = 'BUSINESS_RULE',
  options?: SourceUpdateRequestOptions,
): Promise<SourceUpdateDto> {
  const { data } = await apiClient.post<SourceUpdateDto>(
    `/projects/${projectId}/source-updates/${updateId}/generate?stage=${stage}`,
    undefined,
    requestConfig(options),
  );
  return data;
}

export async function patchSourceUpdateItem(
  projectId: number,
  updateId: number,
  itemId: number,
  patch: {
    action?: SourceUpdateAction;
    reviewStatus?: SourceUpdateReviewStatus;
    modifiedAfterData?: string;
    reason?: string;
  },
  options?: SourceUpdateRequestOptions,
): Promise<SourceUpdateItemDto> {
  const { data } = await apiClient.patch<SourceUpdateItemDto>(
    `/projects/${projectId}/source-updates/${updateId}/items/${itemId}`,
    patch,
    requestConfig(options),
  );
  return data;
}

export async function applySourceUpdate(
  projectId: number,
  updateId: number,
  options?: SourceUpdateRequestOptions,
): Promise<SourceUpdateDto> {
  const { data } = await apiClient.post<SourceUpdateDto>(
    `/projects/${projectId}/source-updates/${updateId}/apply`,
    undefined,
    requestConfig(options),
  );
  return data;
}

export async function cancelSourceUpdate(
  projectId: number,
  updateId: number,
  options?: SourceUpdateRequestOptions,
): Promise<void> {
  await apiClient.post(
    `/projects/${projectId}/source-updates/${updateId}/cancel`,
    undefined,
    requestConfig(options),
  );
}
