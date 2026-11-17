// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { UserDropdownMenu } from './UserDropdownMenu';
import { ThemeProvider } from '../theme/theme';
import { LanguageProvider } from '../i18n/language';

const logoutMock = vi.fn();

vi.mock('../../features/auth/hooks/useAuth', () => ({
  useCurrentUser: () => ({
    data: {
      id: 1,
      email: 'khaitien600@gmail.com',
      fullName: 'Nguyen Van Khai Tien',
      role: 'USER',
      tier: 'PRO',
    },
    isLoading: false,
  }),
  useLogout: () => logoutMock,
}));

function renderUserDropdownMenu() {
  return render(
    <ThemeProvider>
      <LanguageProvider>
        <MemoryRouter>
          <UserDropdownMenu />
        </MemoryRouter>
      </LanguageProvider>
    </ThemeProvider>
  );
}

describe('UserDropdownMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders avatar trigger button with user name and PRO tier badge', () => {
    renderUserDropdownMenu();

    expect(screen.getByTestId('user-menu-trigger')).toBeInTheDocument();
    expect(screen.getByText('Nguyen Van Khai Tien')).toBeInTheDocument();
    expect(screen.getByText('PRO')).toBeInTheDocument();
  });

  it('toggles dropdown menu popup on click with Profile, Settings, Help, and Log out items', () => {
    renderUserDropdownMenu();

    expect(screen.queryByTestId('user-dropdown-menu')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('user-menu-trigger'));

    expect(screen.getByTestId('user-dropdown-menu')).toBeInTheDocument();
    expect(screen.getByTestId('user-menu-profile')).toHaveAttribute('href', '/profile');
    expect(screen.getByTestId('user-menu-settings')).toHaveAttribute('href', '/settings');
    expect(screen.getByTestId('user-menu-help')).toBeInTheDocument();
    expect(screen.getByTestId('user-menu-logout')).toBeInTheDocument();
  });

  it('opens Help modal when Help item is clicked and closes on close button click', () => {
    renderUserDropdownMenu();

    fireEvent.click(screen.getByTestId('user-menu-trigger'));
    fireEvent.click(screen.getByTestId('user-menu-help'));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Hướng dẫn & Trợ giúp GreyTest/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Đã hiểu/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes Help modal when clicking backdrop, X button, or pressing Escape', () => {
    renderUserDropdownMenu();

    // 1. Dismiss via backdrop click
    fireEvent.click(screen.getByTestId('user-menu-trigger'));
    fireEvent.click(screen.getByTestId('user-menu-help'));
    const backdrop = screen.getByRole('dialog');
    fireEvent.click(backdrop);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // 2. Dismiss via top-right 'X' button
    fireEvent.click(screen.getByTestId('user-menu-trigger'));
    fireEvent.click(screen.getByTestId('user-menu-help'));
    fireEvent.click(screen.getByLabelText(/Đóng/i));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // 3. Dismiss via Escape key
    fireEvent.click(screen.getByTestId('user-menu-trigger'));
    fireEvent.click(screen.getByTestId('user-menu-help'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('triggers logout when Log out is clicked', () => {
    renderUserDropdownMenu();

    fireEvent.click(screen.getByTestId('user-menu-trigger'));
    fireEvent.click(screen.getByTestId('user-menu-logout'));

    expect(logoutMock).toHaveBeenCalledTimes(1);
  });
});

