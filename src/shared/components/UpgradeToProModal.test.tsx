// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UpgradeToProModal } from './UpgradeToProModal';
import { apiClient } from '../api/api-client';

vi.mock('../api/api-client', () => ({
  apiClient: {
    post: vi.fn(),
  },
  getErrorMessage: (err: unknown) => (err instanceof Error ? err.message : 'Error'),
}));

describe('UpgradeToProModal', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('opens when quota-exceeded event is dispatched and allows upgrading to Pro', async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({
      data: {
        tier: 'PRO',
        limit: 1000,
        used: 100,
        remaining: 900,
        periodStart: '2026-10-01',
        resetDate: '2026-11-01',
        exceeded: false,
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <UpgradeToProModal />
      </QueryClientProvider>
    );

    // Initial state: modal is closed
    expect(screen.queryByText('Nâng cấp lên gói PRO')).not.toBeInTheDocument();

    // Trigger event
    act(() => {
      window.dispatchEvent(new CustomEvent('quota-exceeded'));
    });

    // Modal is now open
    expect(screen.getByText('Nâng cấp lên gói PRO')).toBeInTheDocument();
    expect(screen.getByText(/100 lượt gọi AI/i)).toBeInTheDocument();
    expect(screen.getByText('1.000')).toBeInTheDocument();

    // Click upgrade
    const upgradeButton = screen.getByRole('button', { name: /Nâng cấp lên PRO ngay/i });
    fireEvent.click(upgradeButton);

    expect(apiClient.post).toHaveBeenCalledWith('/user/upgrade-pro');

    await waitFor(() => {
      expect(screen.getByText('Nâng cấp thành công!')).toBeInTheDocument();
    });
  });
});
