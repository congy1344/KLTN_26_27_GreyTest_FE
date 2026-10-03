// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountDisabledModal } from './AccountDisabledModal';

describe('AccountDisabledModal', () => {
  beforeEach(() => {
    localStorage.setItem('greytest.token', 'active-token');
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('remains hidden by default and opens on account-disabled event, clearing token', () => {
    render(<AccountDisabledModal />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(localStorage.getItem('greytest.token')).toBe('active-token');

    // Dispatch event inside act
    act(() => {
      window.dispatchEvent(
        new CustomEvent('account-disabled', {
          detail: { message: 'Tài khoản của bạn đã bị vô hiệu hóa.' },
        })
      );
    });

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Tài khoản đã bị vô hiệu hóa')).toBeInTheDocument();
    expect(screen.getByText('Tài khoản của bạn đã bị vô hiệu hóa.')).toBeInTheDocument();
    expect(localStorage.getItem('greytest.token')).toBeNull();
  });

  it('clears token and redirects to /login on button click', () => {
    const originalLocation = window.location;
    // @ts-ignore
    delete window.location;
    window.location = { ...originalLocation, href: '' } as any;

    render(<AccountDisabledModal />);

    act(() => {
      window.dispatchEvent(new CustomEvent('account-disabled'));
    });

    const logoutButton = screen.getByRole('button', { name: /Đăng xuất/i });
    fireEvent.click(logoutButton);

    expect(localStorage.getItem('greytest.token')).toBeNull();
    expect(window.location.href).toContain('/login?disabled=true');

    (window as any).location = originalLocation;
  });
});
