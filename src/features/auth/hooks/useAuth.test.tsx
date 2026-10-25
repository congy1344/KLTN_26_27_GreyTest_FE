// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAdminLogin, useLogin, useLogout, useRegister } from './useAuth';
import { adminLogin, login, register } from '../api/auth-api';

vi.mock('../api/auth-api', () => ({
  adminLogin: vi.fn(), login: vi.fn(), register: vi.fn(), fetchCurrentUser: vi.fn(),
}));

afterEach(() => { cleanup(); localStorage.clear(); vi.clearAllMocks(); });

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(['projects'], [{ id: 1, name: 'Previous user private project' }]);
  return { client, wrapper: ({ children }: { children: ReactNode }) =>
    <QueryClientProvider client={client}>{children}</QueryClientProvider> };
}

describe('auth session cache isolation', () => {
  it.each([
    ['login', useLogin, login], ['admin login', useAdminLogin, adminLogin], ['register', useRegister, register],
  ] as const)('clears old user projects when %s succeeds', async (_name, useMutation, api) => {
    const { client, wrapper } = setup();
    const response = { token: 'new-jwt', user: { id: 2, email: 'new@greytest.dev', fullName: 'New User', role: 'USER' as const, tier: 'FREE' as const } };
    vi.mocked(api).mockResolvedValue(response);
    const { result } = renderHook(() => useMutation(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ email: 'new@greytest.dev', password: 'correct-password', fullName: 'New User' });
    });

    await waitFor(() => expect(localStorage.getItem('greytest.token')).toBe('new-jwt'));
    expect(client.getQueryData(['projects'])).toBeUndefined();
    expect(client.getQueryData(['auth', 'me'])).toEqual(response.user);
  });

  it('clears all user data when logging out', () => {
    const { client, wrapper } = setup();
    localStorage.setItem('greytest.token', 'old-jwt');
    client.setQueryData(['auth', 'me'], { id: 1 });
    const { result } = renderHook(useLogout, { wrapper });

    act(() => result.current());

    expect(localStorage.getItem('greytest.token')).toBeNull();
    expect(client.getQueryCache().getAll()).toHaveLength(0);
  });
});
