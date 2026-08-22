// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminUsersPage } from './AdminUsersPage';

const mutations = vi.hoisted(() => ({ role: vi.fn(), status: vi.fn(), quota: vi.fn() }));

vi.mock('../components/AdminShell', () => ({ AdminShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('../hooks/useAdmin', () => ({
  useAdminUsers: () => ({
    isLoading: false,
    error: null,
    data: {
      content: [{
        id: 9,
        email: 'user@greytest.dev',
        fullName: 'Test User',
        role: 'USER',
        enabled: true,
        createdAt: '2026-08-22T00:00:00Z',
        totalActivities: 2,
        quota: { limit: 20, used: 3, remaining: 17, periodStart: '2026-08-01', exceeded: false },
      }],
      page: 0,
      size: 10,
      totalElements: 1,
      totalPages: 1,
    },
  }),
  useAdminUserMutations: () => ({
    role: { mutate: mutations.role, isPending: false, error: null },
    status: { mutate: mutations.status, isPending: false, error: null },
    quota: { mutate: mutations.quota, isPending: false, error: null },
  }),
}));

afterEach(() => vi.clearAllMocks());

describe('AdminUsersPage', () => {
  it('requires confirmation before changing a user role', () => {
    render(<MemoryRouter><AdminUsersPage /></MemoryRouter>);

    fireEvent.change(screen.getByLabelText('Vai trò của user@greytest.dev'), { target: { value: 'ADMIN' } });
    expect(mutations.role).not.toHaveBeenCalled();
    expect(screen.getByText('Xác nhận thay đổi vai trò')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Đổi vai trò' }));
    expect(mutations.role).toHaveBeenCalledWith(
      { id: 9, role: 'ADMIN' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );

    const roleDialog = screen.getByText('Xác nhận thay đổi vai trò').closest('dialog');
    act(() => mutations.role.mock.calls[0][1].onError());
    expect(roleDialog).not.toHaveAttribute('open');
  });
});
