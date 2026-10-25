// @vitest-environment jsdom

import { AxiosError, AxiosHeaders } from 'axios';
import type { AxiosAdapter } from 'axios';
import { QueryClient } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient, getErrorMessage } from './api-client';

const originalAdapter = apiClient.defaults.adapter;

afterEach(() => {
  apiClient.defaults.adapter = originalAdapter;
  localStorage.clear();
  vi.restoreAllMocks();
});

function unauthorizedAdapter(beforeResponse?: () => void): AxiosAdapter {
  return async (config) => {
    beforeResponse?.();
    throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined, {
      config, status: 401, statusText: 'Unauthorized', headers: new AxiosHeaders(),
      data: { code: 'AUTH_ERROR', message: 'Token khong hop le hoac da het han' },
    });
  };
}

describe('getErrorMessage', () => {
  it('keeps the generic message for an internal Error by default', () => {
    expect(getErrorMessage(new Error('Unit Test khong hop le'))).toBe('Có lỗi xảy ra');
  });

  it('can expose a validated backend message when the caller opts in', () => {
    expect(getErrorMessage(new Error('Unit Test khong hop le'), true)).toBe('Unit Test khong hop le');
  });
});

describe('JWT session rejection', () => {
  it('clears the rejected current token and emits auth-expired', async () => {
    localStorage.setItem('greytest.token', 'expired-jwt');
    const expired = vi.fn();
    window.addEventListener('auth-expired', expired);
    apiClient.defaults.adapter = unauthorizedAdapter();

    await expect(apiClient.get('/projects')).rejects.toBeInstanceOf(AxiosError);

    expect(localStorage.getItem('greytest.token')).toBeNull();
    expect(expired).toHaveBeenCalledTimes(1);
    window.removeEventListener('auth-expired', expired);
  });

  it('does not discard a newer session when an old request returns 401', async () => {
    localStorage.setItem('greytest.token', 'old-jwt');
    const expired = vi.fn();
    window.addEventListener('auth-expired', expired);
    apiClient.defaults.adapter = unauthorizedAdapter(() => localStorage.setItem('greytest.token', 'new-jwt'));

    await expect(apiClient.get('/auth/me')).rejects.toBeInstanceOf(AxiosError);

    expect(localStorage.getItem('greytest.token')).toBe('new-jwt');
    expect(expired).not.toHaveBeenCalled();
    window.removeEventListener('auth-expired', expired);
  });

  it.each(['/auth/login', '/auth/admin/login', '/auth/register'])
    ('does not treat invalid credentials at %s as session expiry', async (url) => {
      localStorage.setItem('greytest.token', 'active-jwt');
      apiClient.defaults.adapter = unauthorizedAdapter();

      await expect(apiClient.post(url)).rejects.toBeInstanceOf(AxiosError);

      expect(localStorage.getItem('greytest.token')).toBe('active-jwt');
    });

  it.each([null, 'new-jwt'])('prevents a pending mutation restoring private data after session changes to %s', async (nextToken) => {
    const client = new QueryClient();
    const success = vi.fn((data) => client.setQueryData(['test-cases', 1], data));
    let complete!: () => void;
    let notifyStarted!: () => void;
    const started = new Promise<void>((resolve) => { notifyStarted = resolve; });
    apiClient.defaults.adapter = (config) => new Promise((resolve) => {
      complete = () => resolve({ config, status: 200, statusText: 'OK', headers: new AxiosHeaders(),
        data: [{ id: 1, description: 'Previous user private case' }] });
      notifyStarted();
    });
    localStorage.setItem('greytest.token', 'old-jwt');
    const mutation = client.getMutationCache().build(client, {
      mutationFn: () => apiClient.post('/projects/1/test-cases/approve').then((response) => response.data),
      onSuccess: success,
    });
    const pending = mutation.execute(undefined);
    await started;
    if (nextToken) localStorage.setItem('greytest.token', nextToken);
    else localStorage.removeItem('greytest.token');
    client.clear();
    complete();

    await expect(pending).rejects.toMatchObject({ code: 'AUTH_SESSION_CHANGED' });
    expect(success).not.toHaveBeenCalled();
    expect(client.getQueryData(['test-cases', 1])).toBeUndefined();
    expect(localStorage.getItem('greytest.token')).toBe(nextToken);
  });

  it('does not disable a new session from an old account-disabled response', async () => {
    const disabled = vi.fn();
    window.addEventListener('account-disabled', disabled);
    localStorage.setItem('greytest.token', 'old-jwt');
    apiClient.defaults.adapter = async (config) => {
      localStorage.setItem('greytest.token', 'new-jwt');
      throw new AxiosError('Disabled', 'ERR_BAD_REQUEST', config, undefined, {
        config, status: 403, statusText: 'Forbidden', headers: new AxiosHeaders(), data: { code: 'ACCOUNT_DISABLED' },
      });
    };

    await expect(apiClient.get('/projects')).rejects.toMatchObject({ code: 'AUTH_SESSION_CHANGED' });
    expect(localStorage.getItem('greytest.token')).toBe('new-jwt');
    expect(disabled).not.toHaveBeenCalled();
    window.removeEventListener('account-disabled', disabled);
  });
});
