// @vitest-environment jsdom
import { StrictMode } from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useSourceUpdateSeen } from './useSourceUpdateSeen';

afterEach(() => { cleanup(); vi.restoreAllMocks(); localStorage.clear(); });

describe('useSourceUpdateSeen', () => {
  it('does not mark content still loading as viewed', () => {
    const loading = renderHook(() => useSourceUpdateSeen('first', false));
    loading.unmount();
    const ready = renderHook(() => useSourceUpdateSeen('first', true));
    expect(ready.result.current).toBe(false);
  });

  it('saves on pagehide while keeping markers for the current visit', () => {
    const first = renderHook(() => useSourceUpdateSeen('first', true));
    act(() => window.dispatchEvent(new Event('pagehide')));
    first.rerender();
    expect(first.result.current).toBe(false);
    first.unmount();
    const second = renderHook(() => useSourceUpdateSeen('first', true));
    expect(second.result.current).toBe(true);
  });

  it('keeps a new revision unread while saving the previous revision on key change', () => {
    const visit = renderHook(({ key }) => useSourceUpdateSeen(key, true), { initialProps: { key: 'first' } });
    visit.rerender({ key: 'second' });
    expect(localStorage.getItem('first')).toBe('true');
    expect(localStorage.getItem('second')).toBeNull();
    expect(visit.result.current).toBe(false);
  });

  it('keeps first-visit markers through StrictMode effect replay', () => {
    const visit = renderHook(() => useSourceUpdateSeen('first', true), { wrapper: StrictMode });
    visit.rerender();
    expect(visit.result.current).toBe(false);
  });

  it('still renders and leaves safely when browser storage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('storage blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('storage blocked'); });
    const visit = renderHook(() => useSourceUpdateSeen('first', true));
    expect(visit.result.current).toBe(false);
    expect(() => visit.unmount()).not.toThrow();
  });
});
