// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QuotaMeter } from './QuotaMeter';
import { useUserQuota } from '../../features/auth/hooks/useAuth';
import type { UserQuota } from '../../features/auth/types';

vi.mock('../../features/auth/hooks/useAuth', () => ({ useUserQuota: vi.fn() }));
vi.mock('./UpgradeToProModal', () => ({ UpgradeToProModal: ({ onClose }: { onClose: () => void }) => <div role="dialog"><button onClick={onClose}>Close upgrade</button></div> }));
const quota: UserQuota = { tier: 'PLUS', limit: 300, used: 214, remaining: 86, periodStart: '2026-11-09', resetDate: '2026-11-16', exceeded: false };
function show(values: Partial<UserQuota> = {}) {
  vi.mocked(useUserQuota).mockReturnValue({ data: { ...quota, ...values }, isLoading: false, error: null } as ReturnType<typeof useUserQuota>);
  return render(<MemoryRouter><QuotaMeter /></MemoryRouter>);
}
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 10, 12, 15)); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('QuotaMeter', () => {
  it.each([
    [214, 86, false, 'bg-brand'], [240, 60, false, 'bg-warning'], [300, 0, false, 'bg-danger'], [301, 0, true, 'bg-danger'], [10, 290, true, 'bg-danger'],
  ])('shows remaining quota and its threshold at %s used', (used, remaining, exceeded, tone) => {
    const view = show({ used, remaining, exceeded });
    expect(screen.getByRole('button', { name: `Hạn mức AI: còn ${remaining} trên 300 lượt` })).toHaveTextContent(`${remaining}/300`);
    expect(view.container.querySelector(`.${tone}`)).toBeInTheDocument();
  });
  it('shows unlimited without a progress bar', () => {
    const view = show({ limit: null, remaining: null });
    expect(screen.getByRole('button', { name: 'Hạn mức AI: không giới hạn' })).toHaveTextContent('Không giới hạn');
    expect(view.container.querySelector('.w-\\[72px\\]')).toBeNull();
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Đã dùng').nextElementSibling).toHaveTextContent('214');
  });
  it('opens and closes by mouse, outside click and Escape, returning focus', () => {
    show();
    const button = screen.getByRole('button', { name: /Hạn mức AI:/ });
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('region', { name: 'Hạn mức gọi AI' })).toBeVisible();
    expect(screen.getByText(/15\/11\/2026/)).toBeVisible();
    expect(screen.getByText('sau 4 ngày')).toBeVisible();
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(button);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('region')).toBeNull();
    expect(button).toHaveFocus();
    fireEvent.click(button);
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('region')).toBeNull();
    expect(button).toHaveFocus();
  });
  it('hides a past reset date and includes today', () => {
    const view = show({ resetDate: '2026-11-11' });
    fireEvent.click(screen.getByRole('button'));
    expect(screen.queryByText('Làm mới')).toBeNull();
    view.unmount();
    show({ resetDate: '2026-11-12' });
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('sau 0 ngày')).toBeVisible();
  });
  it('links to settings, opens the existing upgrade dialog and hides upgrade for Pro', () => {
    const view = show();
    const trigger = screen.getByRole('button'); fireEvent.click(trigger);
    expect(screen.getByRole('link', { name: 'Xem chi tiết' })).toHaveAttribute('href', '/settings?tab=subscription');
    fireEvent.click(screen.getByRole('button', { name: 'Nâng cấp gói' }));
    expect(screen.getByRole('dialog')).toBeVisible();
    expect(screen.queryByRole('region')).toBeNull();
    fireEvent.click(screen.getByText('Close upgrade'));
    expect(trigger).toHaveFocus();
    view.unmount(); show({ tier: 'PRO' }); fireEvent.click(screen.getByRole('button'));
    expect(screen.queryByRole('button', { name: 'Nâng cấp gói' })).toBeNull();
  });
  it('reserves loading space and hides on error', () => {
    vi.mocked(useUserQuota).mockReturnValue({ isLoading: true } as ReturnType<typeof useUserQuota>);
    const view = render(<MemoryRouter><QuotaMeter /></MemoryRouter>);
    expect(screen.getByRole('status', { name: 'Đang tải hạn mức AI' })).toBeVisible();
    vi.mocked(useUserQuota).mockReturnValue({ error: new Error('offline') } as ReturnType<typeof useUserQuota>);
    view.rerender(<MemoryRouter><QuotaMeter /></MemoryRouter>);
    expect(view.container).toBeEmptyDOMElement();
  });
});
