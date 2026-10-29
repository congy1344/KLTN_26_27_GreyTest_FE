// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ProfilePage } from './ProfilePage';
import { fetchCurrentUser, fetchUserQuota } from '../api/auth-api';
import { apiClient } from '../../../shared/api/api-client';
import { ThemeProvider } from '../../../shared/theme/theme';
import { LanguageProvider } from '../../../shared/i18n/language';
import type { AuthUser, UserTier } from '../types';
import { fetchPaymentHistory } from '../../payment/api/payment-api';

vi.mock('../api/auth-api', async (importOriginal) => ({
  ...await importOriginal<typeof import('../api/auth-api')>(),
  fetchCurrentUser: vi.fn(),
  fetchUserQuota: vi.fn(),
}));

vi.mock('../../payment/api/payment-api', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../payment/api/payment-api')>(),
  fetchPaymentHistory: vi.fn().mockResolvedValue([]),
}));

const freeQuota = {
  tier: 'FREE' as const, limit: 100, used: 25, remaining: 75,
  periodStart: '2026-10-01', resetDate: '2026-11-01', exceeded: false,
};

describe('Profile subscription cancellation', () => {
  let client: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fetchPaymentHistory).mockResolvedValue([]);
    localStorage.setItem('greytest.token', 'test-session');
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn(),
    });
    client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  });

  afterEach(() => {
    cleanup();
    client.clear();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  async function showProfile(tier: UserTier) {
    vi.mocked(fetchCurrentUser).mockResolvedValue({
      id: 42, fullName: 'Test User', email: 'user@example.com', role: 'USER', tier,
    });
    vi.mocked(fetchUserQuota).mockResolvedValue({
      ...freeQuota, tier, limit: tier === 'PRO' ? 300 : tier === 'PLUS' ? 200 : 100,
    });
    render(<QueryClientProvider client={client}><ThemeProvider><LanguageProvider>
      <MemoryRouter><ProfilePage /></MemoryRouter>
    </LanguageProvider></ThemeProvider></QueryClientProvider>);
    await screen.findByText(`Tài khoản ${tier}`);
  }

  it('does not offer cancellation for FREE', async () => {
    await showProfile('FREE');
    expect(screen.queryByRole('button', { name: 'Hủy gói' })).not.toBeInTheDocument();
  });

  it.each(['PLUS', 'PRO'] as const)('returns %s to FREE and refreshes cached quota', async (tier) => {
    const post = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: freeQuota });
    await showProfile(tier);
    fireEvent.click(screen.getByRole('button', { name: 'Hủy gói' }));
    const dialog = screen.getByRole('dialog', { name: 'Hủy gói hiện tại?' });
    expect(post).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận hủy gói' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Hủy gói' })).not.toBeInTheDocument());
    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith('/user/cancel-subscription');
    expect(client.getQueryData(['auth', 'me'])).toMatchObject({ id: 42, tier: 'FREE' });
    expect(client.getQueryData(['user', 'quota'])).toEqual(freeQuota);
    expect(screen.getByText('Hạn mức gọi AI tháng này')).toBeInTheDocument();
    expect(screen.getByText('75')).toBeInTheDocument();
  });

  it('keeps the plan when the user dismisses confirmation', async () => {
    const post = vi.spyOn(apiClient, 'post');
    await showProfile('PRO');
    fireEvent.click(screen.getByRole('button', { name: 'Hủy gói' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Giữ gói' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
    expect(client.getQueryData(['auth', 'me'])).toMatchObject({ tier: 'PRO' });
  });

  it('shows a failure and retains the current paid plan', async () => {
    vi.spyOn(apiClient, 'post').mockRejectedValue(new Error('Connection lost'));
    await showProfile('PLUS');
    fireEvent.click(screen.getByRole('button', { name: 'Hủy gói' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Xác nhận hủy gói' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(client.getQueryData(['auth', 'me'])).toMatchObject({ tier: 'PLUS' });
    expect(screen.getByRole('button', { name: 'Hủy gói' })).toBeEnabled();
  });

  it('blocks repeated submission while cancellation is pending', async () => {
    let finish!: (response: { data: typeof freeQuota }) => void;
    const post = vi.spyOn(apiClient, 'post').mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    await showProfile('PRO');
    fireEvent.click(screen.getByRole('button', { name: 'Hủy gói' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Xác nhận hủy gói' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Đang hủy...' })).toBeDisabled());
    expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Giữ gói' })).toBeDisabled();
    finish({ data: freeQuota });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('does not restore the paid tier when an older account refresh finishes late', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValue({ data: freeQuota });
    await showProfile('PRO');
    let finish!: (user: AuthUser) => void;
    const refresh = client.fetchQuery({
      queryKey: ['auth', 'me'],
      queryFn: () => new Promise<AuthUser>((resolve) => { finish = resolve; }),
    }).catch(() => undefined);

    fireEvent.click(screen.getByRole('button', { name: 'Hủy gói' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Xác nhận hủy gói' }));
    await waitFor(() => expect(client.getQueryData(['auth', 'me'])).toMatchObject({ tier: 'FREE' }));
    await act(async () => {
      finish({ id: 42, fullName: 'Test User', email: 'user@example.com', role: 'USER', tier: 'PRO' });
      await refresh;
    });
    expect(client.getQueryData(['auth', 'me'])).toMatchObject({ tier: 'FREE' });
    expect(screen.getByText('Tài khoản FREE')).toBeInTheDocument();
  });
});
