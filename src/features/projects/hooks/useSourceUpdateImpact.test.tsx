// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it } from 'vitest';
import { useSourceUpdateImpact } from './useSourceUpdateImpact';
import type { SourceUpdateTargetType } from '../types';

afterEach(() => { cleanup(); localStorage.clear(); });

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
  client.setQueryData(['auth', 'me'], { id: 41 });
  const cacheUpdate = (id: number, projectId = 105) => client.setQueryData(['source-updates', projectId], [{
    id, status: 'APPLIED', totalChangedMethods: 1,
    impactSummary: JSON.stringify({ changedMethods: [{
      qualifiedClassName: 'demo.Service', methodName: 'added', signature: 'added()',
      diffType: 'ADDED', servicePath: 'backend/patient-service',
    }] }),
    items: [{ targetType: 'TEST_PLAN', targetId: 7, action: 'CREATE' }],
  }]);
  cacheUpdate(200);
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const visit = (stage: Exclude<SourceUpdateTargetType, 'METHOD'> = 'TEST_PLAN', scope = 'backend/patient-service', projectId = 105) =>
    renderHook(() => useSourceUpdateImpact(projectId, stage, scope), { wrapper });
  return { client, cacheUpdate, visit };
}

describe('source update viewed scope', () => {
  it('keeps stages, services, users and projects independent', () => {
    const { client, cacheUpdate, visit } = setup();
    const first = visit();
    expect(first.result.current.changesSeen).toBe(false);
    first.unmount();
    const otherStage = visit('TEST_CASE');
    expect(otherStage.result.current.changesSeen).toBe(false);
    otherStage.unmount();
    const otherService = visit('TEST_PLAN', 'backend/doctor-service');
    expect(otherService.result.current.changesSeen).toBe(false);
    otherService.unmount();
    cacheUpdate(200, 106);
    const otherProject = visit('TEST_PLAN', 'backend/patient-service', 106);
    expect(otherProject.result.current.changesSeen).toBe(false);
    otherProject.unmount();
    client.setQueryData(['auth', 'me'], { id: 42 });
    const otherUser = visit();
    expect(otherUser.result.current.changesSeen).toBe(false);
    otherUser.unmount();
    client.setQueryData(['auth', 'me'], { id: 41 });
    const returning = visit();
    expect(returning.result.current.changesSeen).toBe(true);
    expect(returning.result.current.addedPlanIds.size).toBe(0);
    expect(returning.result.current.activeUpdate?.id).toBe(200);
    returning.unmount();
    client.clear();
  });

  it('restores markers when a new applied update arrives during a visit', async () => {
    const { client, cacheUpdate, visit } = setup();
    visit().unmount();
    const returning = visit();
    expect(returning.result.current.changesSeen).toBe(true);
    act(() => { cacheUpdate(201); });
    await waitFor(() => expect(returning.result.current.addedPlanIds.has(7)).toBe(true));
    expect(returning.result.current.changesSeen).toBe(false);
    returning.unmount();
    client.clear();
  });
});
