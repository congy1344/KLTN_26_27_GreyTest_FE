import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../../shared/api/api-client';
import { fetchReportExport } from './report-api';

vi.mock('../../../shared/api/api-client', () => ({
  apiClient: { get: vi.fn() },
}));

describe('fetchReportExport', () => {
  beforeEach(() => vi.clearAllMocks());

  it('requests the selected service scope', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: '# report' });

    await fetchReportExport(7, 'markdown', 'billing-service');

    expect(apiClient.get).toHaveBeenCalledWith('/projects/7/export', expect.objectContaining({
      params: { format: 'markdown', servicePath: 'billing-service' },
    }));
  });
});
