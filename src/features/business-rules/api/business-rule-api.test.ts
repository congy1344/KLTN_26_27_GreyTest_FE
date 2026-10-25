import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../../shared/api/api-client';
import { generateBusinessRules } from './business-rule-api';

describe('BR generation request mode', () => {
  afterEach(() => vi.restoreAllMocks());

  it.each([true, false])('sends resume=%s and preserves the selected service', async (resume) => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { status: 'QUEUED' } });
    await generateBusinessRules(825, 'backend/patient-service', resume);
    expect(post).toHaveBeenCalledWith('/projects/825/business-rules/generate', undefined, {
      params: { servicePath: 'backend/patient-service', resume },
    });
  });

  it('defaults older callers to continue rather than regeneration', async () => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { status: 'QUEUED' } });
    await generateBusinessRules(825);
    expect(post).toHaveBeenCalledWith('/projects/825/business-rules/generate', undefined, {
      params: { resume: true },
    });
  });
});
