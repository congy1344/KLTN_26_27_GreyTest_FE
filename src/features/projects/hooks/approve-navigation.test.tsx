// @vitest-environment jsdom

import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useApproveBusinessRules } from '../../business-rules/hooks/useBusinessRules';
import { useApproveTestPlans } from '../../test-plans/hooks/useTestPlans';
import { useApproveTestCases } from '../../test-cases/hooks/useTestCases';
import { useGenerateUnitTests } from '../../unit-tests/hooks/useUnitTests';

const api = vi.hoisted(() => ({
  approveBusinessRules: vi.fn().mockResolvedValue([]),
  approveTestPlans: vi.fn().mockResolvedValue([]),
  approveTestCases: vi.fn().mockResolvedValue([]),
  generateUnitTests: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../business-rules/api/business-rule-api', async (importOriginal) => ({
  ...(await importOriginal()),
  approveBusinessRules: api.approveBusinessRules,
}));
vi.mock('../../test-plans/api/test-plan-api', async (importOriginal) => ({
  ...(await importOriginal()),
  approveTestPlans: api.approveTestPlans,
}));
vi.mock('../../test-cases/api/test-case-api', async (importOriginal) => ({
  ...(await importOriginal()),
  approveTestCases: api.approveTestCases,
}));
vi.mock('../../unit-tests/api/unit-test-api', async (importOriginal) => ({
  ...(await importOriginal()),
  generateUnitTests: api.generateUnitTests,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function setupRefreshGate() {
  const client = new QueryClient();
  let release = () => {};
  const refresh = new Promise<void>((resolve) => { release = resolve; });
  vi.spyOn(client, 'invalidateQueries').mockImplementation((filters) => {
    const queryKey = filters?.queryKey;
    return queryKey?.[0] === 'project' && queryKey[1] === 7 ? refresh : Promise.resolve();
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, refresh, release, wrapper };
}

describe('approve navigation sequencing', () => {
  it('waits for the project status refresh after approving Business Rules', async () => {
    const gate = setupRefreshGate();
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useApproveBusinessRules(7), { wrapper: gate.wrapper });

    act(() => result.current.mutate(undefined, { onSuccess }));
    await waitFor(() => expect(api.approveBusinessRules).toHaveBeenCalled());
    expect(gate.client.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['project', 7] });
    expect(onSuccess).not.toHaveBeenCalled();

    await act(async () => { gate.release(); await gate.refresh; });
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  it('waits for the project status refresh after approving Test Plans', async () => {
    const gate = setupRefreshGate();
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useApproveTestPlans(7), { wrapper: gate.wrapper });

    act(() => result.current.mutate(undefined, { onSuccess }));
    await waitFor(() => expect(api.approveTestPlans).toHaveBeenCalled());
    expect(gate.client.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['project', 7] });
    expect(onSuccess).not.toHaveBeenCalled();

    await act(async () => { gate.release(); await gate.refresh; });
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  it('waits for the project status refresh after approving Test Cases', async () => {
    const gate = setupRefreshGate();
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useApproveTestCases(7), { wrapper: gate.wrapper });

    act(() => result.current.mutate(undefined, { onSuccess }));
    await waitFor(() => expect(api.approveTestCases).toHaveBeenCalled());
    expect(gate.client.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['project', 7] });
    expect(onSuccess).not.toHaveBeenCalled();

    await act(async () => { gate.release(); await gate.refresh; });
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });

  it('waits for the project status refresh after generating Unit Tests', async () => {
    const gate = setupRefreshGate();
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useGenerateUnitTests(7), { wrapper: gate.wrapper });

    act(() => result.current.mutate(undefined, { onSuccess }));
    await waitFor(() => expect(api.generateUnitTests).toHaveBeenCalled());
    expect(gate.client.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['project', 7] });
    expect(onSuccess).not.toHaveBeenCalled();

    await act(async () => { gate.release(); await gate.refresh; });
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
  });
});
