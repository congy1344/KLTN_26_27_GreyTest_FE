// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useSandboxRun, useStartCoverageRefinement } from './useCoverage';

const fetchSandboxRun = vi.fn();

vi.mock('../api/coverage-api', () => ({
  fetchSandboxRun: () => fetchSandboxRun(),
  startCoverageRefinement: () => Promise.resolve({ round: 2, testCases: [], unitTests: [] }),
}));

describe('useStartCoverageRefinement', () => {
  it('picks up the automatic server run after supplemental tests are generated', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    fetchSandboxRun.mockResolvedValueOnce({ status: 'SUCCEEDED', message: '', tests: 1, failed: 0, logTail: '' });
    const { result, unmount } = renderHook(() => ({ run: useSandboxRun(7), refine: useStartCoverageRefinement(7) }), { wrapper });
    await waitFor(() => expect(result.current.run.state?.status).toBe('SUCCEEDED'));

    fetchSandboxRun.mockResolvedValue({ status: 'RUNNING', message: '', tests: 0, failed: 0, logTail: '' });
    act(() => result.current.refine.mutate());

    await waitFor(() => expect(result.current.run.state?.status).toBe('RUNNING'));
    unmount();
    client.clear();
  });
});

describe('useSandboxRun', () => {
  it('refreshes the Unit Test list even when verification fails, since it may have removed tests', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    client.setQueryData(['unit-tests', 7], []);
    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    fetchSandboxRun.mockResolvedValue({ status: 'FAILED', message: '', tests: 0, failed: 0, logTail: '' });
    const { unmount } = renderHook(() => useSandboxRun(7), { wrapper });

    await waitFor(() => expect(client.getQueryState(['unit-tests', 7])?.isInvalidated).toBe(true));
    unmount();
    client.clear();
  });
});
