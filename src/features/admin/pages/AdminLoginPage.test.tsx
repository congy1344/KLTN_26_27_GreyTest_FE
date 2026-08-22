// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminLoginPage } from './AdminLoginPage';

const auth = vi.hoisted(() => ({
  mutate: vi.fn(),
  user: undefined as undefined | { role: 'USER' | 'ADMIN' },
}));

vi.mock('../../auth/hooks/useAuth', () => ({
  useAdminLogin: () => ({ mutate: auth.mutate, isPending: false, error: null }),
  useCurrentUser: () => ({ data: auth.user, isLoading: false }),
}));
vi.mock('../../../shared/components/ThemeToggle', () => ({ ThemeToggle: () => <button>Theme</button> }));
vi.mock('../../../shared/components/LanguageToggle', () => ({ LanguageToggle: () => <button>Language</button> }));

afterEach(() => {
  auth.mutate.mockReset();
  auth.user = undefined;
  localStorage.clear();
});

describe('AdminLoginPage', () => {
  it('uses a dedicated admin-only form without registration', () => {
    render(<MemoryRouter><AdminLoginPage /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: 'Đăng nhập quản trị' })).toBeInTheDocument();
    expect(screen.queryByText('Đăng ký')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Email quản trị'), { target: { value: 'admin@greytest.dev' } });
    fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Vào trang quản trị' }));

    expect(auth.mutate).toHaveBeenCalledWith(
      { email: 'admin@greytest.dev', password: 'secret123' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });
});
