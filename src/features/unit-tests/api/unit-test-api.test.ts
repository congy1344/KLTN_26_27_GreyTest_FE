// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../../../shared/api/api-client';
import { downloadUnitTestsZip } from './unit-test-api';

vi.mock('../../../shared/api/api-client', () => ({
  apiClient: { get: vi.fn() },
}));

describe('downloadUnitTestsZip', () => {
  afterEach(() => vi.restoreAllMocks());

  it('keeps the object URL alive until the browser starts the download', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: new Blob(['zip']) } as never);
    const anchor = document.createElement('a');
    const click = vi.spyOn(anchor, 'click').mockImplementation(() => undefined);
    vi.spyOn(document, 'createElement').mockReturnValue(anchor);
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:greytest') });
    const revoke = vi.fn();
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revoke });

    await downloadUnitTestsZip(1);

    expect(click).toHaveBeenCalledOnce();
    expect(revoke).not.toHaveBeenCalled();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(revoke).toHaveBeenCalledWith('blob:greytest');
  });

  it('exposes backend validation errors returned as a Blob', async () => {
    vi.mocked(apiClient.get).mockRejectedValue({
      response: { data: new Blob([JSON.stringify({ message: 'Unit Test khong hop le' })], { type: 'application/json' }) },
    });

    await expect(downloadUnitTestsZip(1)).rejects.toThrow('Unit Test khong hop le');
  });
});
