import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../../shared/api/api-client';
import { fetchTraceability } from './traceability-api';

vi.mock('../../../shared/api/api-client', () => ({
  apiClient: { get: vi.fn() },
}));

describe('fetchTraceability', () => {
  beforeEach(() => vi.clearAllMocks());

  it('requests the selected service scope', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { projectId: 7, rows: [], uncoveredRules: [] } });

    await fetchTraceability(7, 'billing-service');

    expect(apiClient.get).toHaveBeenCalledWith('/projects/7/traceability', {
      params: { servicePath: 'billing-service' },
    });
  });
});
