import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../../shared/api/api-client';
import { analyzeSourceUpdate, generateAllSourceUpdate, generateIncrementalSourceUpdate, SOURCE_UPDATE_TIMEOUT_MS } from './source-update-api';

vi.mock('../../../shared/api/api-client', () => ({ apiClient: { post: vi.fn() } }));

describe('source update request deadlines', () => {
  beforeEach(() => { vi.mocked(apiClient.post).mockReset().mockResolvedValue({ data: {} }); });

  it('lets generation finish beyond the upload deadline and preserves abort support', async () => {
    const signal = new AbortController().signal;
    await generateAllSourceUpdate(1, 2, { signal });
    await generateIncrementalSourceUpdate(1, 2, 'TEST_CASE', { signal });
    expect(apiClient.post).toHaveBeenNthCalledWith(1, '/projects/1/source-updates/2/generate-all', undefined,
      expect.objectContaining({ timeout: 0, signal }));
    expect(apiClient.post).toHaveBeenNthCalledWith(2, '/projects/1/source-updates/2/generate?stage=TEST_CASE', undefined,
      expect.objectContaining({ timeout: 0, signal }));
  });

  it('keeps the analysis deadline bounded', async () => {
    await analyzeSourceUpdate(1, 2);
    expect(apiClient.post).toHaveBeenCalledWith('/projects/1/source-updates/2/analyze', undefined,
      expect.objectContaining({ timeout: SOURCE_UPDATE_TIMEOUT_MS }));
  });
});