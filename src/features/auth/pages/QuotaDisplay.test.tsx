// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SettingsPage } from './SettingsPage';
import { ProfilePage } from './ProfilePage';
import { UpgradeToProModal } from '../../../shared/components/UpgradeToProModal';
import type { UserQuota } from '../types';

const state = vi.hoisted(() => ({ quota: undefined as UserQuota | undefined, language: 'vi' }));
vi.mock('../hooks/useAuth', () => ({
  useCurrentUser: () => ({ data: { id: 1, email: 'pro@example.com', fullName: 'User', role: 'USER', tier: 'PRO' } }),
  useUserQuota: () => ({ data: state.quota }),
  useCancelSubscription: () => ({}),
  useUpdateProfile: () => ({}),
  useChangePassword: () => ({}),
}));
vi.mock('../../../shared/components/AppShell', () => ({ AppShell: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));
vi.mock('../../../shared/i18n/language', () => ({
  useLanguage: () => ({ t: (vi: string, en: string) => state.language === 'vi' ? vi : en, language: state.language, setLanguage: vi.fn() }),
}));
vi.mock('../../../shared/theme/theme', () => ({ useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }) }));
vi.mock('../../payment/components/PaymentHistory', () => ({ PaymentHistory: () => null }));
vi.mock('../../payment/api/payment-api', () => ({ fetchPublicTierPackages: async () => [] }));

let client: QueryClient;
beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  client.setQueryData(['public-tier-packages'], []);
  state.language = 'vi';
  state.quota = { tier: 'PRO', used: 2020, limit: null, remaining: null, periodStart: '', resetDate: '', exceeded: false };
});
afterEach(() => { cleanup(); client.clear(); });
function show(Page: typeof SettingsPage | typeof ProfilePage) {
  // Trang Cài đặt đặt khối hạn mức ở tab Gói dịch vụ & Hóa đơn.
  const entry = Page === SettingsPage ? '/settings?tab=subscription' : '/';
  render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[entry]}><Page /></MemoryRouter></QueryClientProvider>);
  const heading = screen.getByRole('heading', { name: /Hạn mức sử dụng|Usage quota|Hạn mức gọi AI|AI quota/ });
  return heading.closest('.rounded-base') as HTMLElement;
}

describe.each([['Settings', SettingsPage], ['Profile', ProfilePage]] as const)('%s quota display', (_name, Page) => {
  it.each(['vi', 'en'])('shows usage and unlimited status without remaining or percentage (%s)', (language) => {
    state.language = language;
    const quota = show(Page);
    expect(quota).toHaveTextContent(language === 'vi' ? 'Đã dùng 2020 lượt' : 'Used 2020 credits');
    expect(within(quota).getByText(language === 'vi' ? 'Không giới hạn' : 'Unlimited')).toBeVisible();
    expect(quota).not.toHaveTextContent(/Còn lại|Remaining|%|\//);
    expect(quota.querySelector('[style*="width"]')).not.toBeInTheDocument();
  });

  it.each([17, 0, null])('keeps finite limits and prefers API remaining (%s)', (remaining) => {
    state.quota = { ...state.quota!, used: 30, limit: 100, remaining };
    const quota = show(Page);
    expect(quota).toHaveTextContent('30 / 100 lượt');
    expect(within(quota).getByText('30%')).toBeVisible();
    expect(quota).toHaveTextContent(`Còn lại: ${remaining ?? 70} lượt`);
    expect(quota.querySelector('[style*="width: 30%"]')).toBeInTheDocument();
  });
});

it('stacks theme and language groups, retaining two choices side by side in each', () => {
  render(<QueryClientProvider client={client}><MemoryRouter><SettingsPage /></MemoryRouter></QueryClientProvider>);
  expect(screen.queryByRole('heading', { name: 'Hạn mức sử dụng' })).not.toBeInTheDocument();
  const theme = screen.getByText('Chế độ giao diện').parentElement!;
  const language = screen.getByText('Ngôn ngữ hiển thị').parentElement!;
  expect(theme.parentElement).toBe(language.parentElement);
  expect(theme.parentElement).toHaveClass('grid-cols-1');
  expect(theme.parentElement).not.toHaveClass('sm:grid-cols-2');
  expect(screen.getByTestId('theme-light-btn').parentElement).toHaveClass('grid-cols-2');
  expect(screen.getByTestId('lang-vi-btn').parentElement).toHaveClass('grid-cols-2');
});

it('also handles unlimited quota in the upgrade modal outside admin', () => {
  render(<QueryClientProvider client={client}><UpgradeToProModal open /></QueryClientProvider>);
  const dialog = screen.getByRole('dialog');
  expect(dialog).toHaveTextContent('Đã dùng 2020 lượt');
  expect(within(dialog).getByText('Không giới hạn')).toBeVisible();
  expect(dialog).not.toHaveTextContent('Lượt AI còn lại:');
});
