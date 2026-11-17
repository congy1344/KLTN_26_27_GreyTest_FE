// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminShell } from './AdminShell';
import { LanguageProvider } from '../../../shared/i18n/language';
import { ThemeProvider } from '../../../shared/theme/theme';

const authUser = vi.hoisted(() => ({
  data: { id: 1, email: 'admin@greytest.dev', fullName: '', role: 'ADMIN' },
}));

vi.mock('../../auth/hooks/useAuth', () => ({
  useCurrentUser: () => authUser,
  useLogout: () => vi.fn(),
}));

vi.mock('../hooks/useAdmin', () => ({
  useServiceHealth: () => ({ data: { application: 'UP' }, isFetching: false, refetch: vi.fn() }),
}));

afterEach(() => {
  cleanup();
});

describe('AdminShell', () => {
  it('handles empty fullName gracefully with email fallback for avatar and name', () => {
    authUser.data = { id: 1, email: 'ops@greytest.dev', fullName: '', role: 'ADMIN' };

    render(
      <MemoryRouter>
        <ThemeProvider>
          <LanguageProvider>
            <AdminShell>
              <div>Admin Page Content</div>
            </AdminShell>
          </LanguageProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    // Initial should be 'O' from 'ops@greytest.dev'
    expect(screen.getByText('O')).toBeInTheDocument();
    expect(screen.getByText('ops@greytest.dev')).toBeInTheDocument();
    expect(screen.getByText('Admin Page Content')).toBeInTheDocument();
  });

  it('toggles mobile menu on hamburger click', () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <LanguageProvider>
            <AdminShell>
              <div>Content</div>
            </AdminShell>
          </LanguageProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    const hamburger = screen.getByLabelText(/Mở menu quản trị/i);
    fireEvent.click(hamburger);

    expect(screen.getByLabelText(/Đóng menu quản trị/i)).toBeInTheDocument();
  });
});

