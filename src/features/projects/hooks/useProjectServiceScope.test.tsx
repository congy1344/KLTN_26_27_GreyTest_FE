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
});
