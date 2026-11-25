// @vitest-environment jsdom

import { renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useProjectServices } from './useProjects';
import { useProjectServiceScope } from './useProjectServiceScope';

vi.mock('./useProjects', () => ({ useProjectServices: vi.fn() }));

afterEach(() => vi.clearAllMocks());

describe('useProjectServiceScope', () => {
  it('selects the first service automatically when a multi-module project has no query selection', () => {
    vi.mocked(useProjectServices).mockReturnValue({
      data: [
        { servicePath: 'piggymetrics/account-service', name: 'account-service', status: 'ANALYZED' },
        { servicePath: 'piggymetrics/auth-service', name: 'auth-service', status: 'ANALYZED' },
      ],
    } as ReturnType<typeof useProjectServices>);

    const { result } = renderHook(() => useProjectServiceScope(87), {
      wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
    });

    expect(result.current.selected?.servicePath).toBe('piggymetrics/account-service');
    expect(result.current.servicePath).toBe('piggymetrics/account-service');
    expect(result.current.requiresSelection).toBe(false);
  });

  it('uses requestedPath immediately while query is loading to avoid duplicate requests', () => {
    vi.mocked(useProjectServices).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as unknown as ReturnType<typeof useProjectServices>);

    const { result } = renderHook(() => useProjectServiceScope(87), {
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={['/projects/87?servicePath=backend%2Fappointment-service']}>
          {children}
        </MemoryRouter>
      ),
    });

    expect(result.current.selected).toBeUndefined();
    expect(result.current.servicePath).toBe('backend/appointment-service');
    expect(result.current.requiresSelection).toBe(false);
  });

  it('synchronizes servicePath with selected fallback when requestedPath does not exist in loaded services', () => {
    vi.mocked(useProjectServices).mockReturnValue({
      data: [
        { servicePath: 'piggymetrics/account-service', name: 'account-service', status: 'ANALYZED' },
        { servicePath: 'piggymetrics/auth-service', name: 'auth-service', status: 'ANALYZED' },
      ],
      isLoading: false,
    } as unknown as ReturnType<typeof useProjectServices>);

    const { result } = renderHook(() => useProjectServiceScope(87), {
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={['/projects/87?servicePath=invalid%2Fpath']}>
          {children}
        </MemoryRouter>
      ),
    });

    expect(result.current.selected?.servicePath).toBe('piggymetrics/account-service');
    expect(result.current.servicePath).toBe('piggymetrics/account-service');
    expect(result.current.requiresSelection).toBe(false);
  });
});
