// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminUsersPage } from './AdminUsersPage';
import type { AdminUser } from '../types';

const mutations = vi.hoisted(() => ({
  role: vi.fn(), status: vi.fn(), tier: vi.fn(), quota: vi.fn(),
  create: vi.fn(), update: vi.fn(), deleteUser: vi.fn(),
}));
const userState = vi.hoisted(() => ({ user: {} as AdminUser, lastFilters: null as any }));

vi.mock('../components/AdminShell', () => ({ AdminShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock('../../auth/hooks/useAuth', () => ({
  useCurrentUser: () => ({ data: { id: 1, email: 'admin@greytest.dev', fullName: 'Admin', role: 'ADMIN' } }),
}));
vi.mock('../hooks/useAdmin', () => ({
  useAdminUsers: (filters: any) => {
    userState.lastFilters = filters;
    return {
      isLoading: false,
      error: null,
      data: {
        content: [userState.user],
        page: 0,
        size: 10,
        totalElements: 1,
        totalPages: 1,
      },
    };
  },
  useAdminUserMutations: () => ({
    role: { mutate: mutations.role, isPending: false, error: null },
    status: { mutate: mutations.status, isPending: false, error: null },
    tier: { mutate: mutations.tier, isPending: false, error: null },
    quota: { mutate: mutations.quota, isPending: false, error: null },
    create: { mutate: mutations.create, isPending: false, error: null },
    update: { mutate: mutations.update, isPending: false, error: null },
    deleteUser: { mutate: mutations.deleteUser, isPending: false, error: null },
  }),
}));

beforeEach(() => {
  userState.user = {
    id: 9, email: 'user@greytest.dev', fullName: 'Test User', role: 'USER', tier: 'FREE', enabled: true,
    createdAt: '2026-08-22T00:00:00Z', totalGenerationRequests: 2, lastActivityAt: null,
    quota: { limit: 20, used: 3, remaining: 17, periodStart: '2026-08-01', resetDate: '2026-09-01', exceeded: false },
  };
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('AdminUsersPage', () => {
  it.each([true, false])('disables own role and delete controls when enabled is %s', (enabled) => {
    userState.user = { ...userState.user, id: 1, email: 'admin@greytest.dev', role: 'ADMIN', enabled };
    render(<MemoryRouter><AdminUsersPage /></MemoryRouter>);

    expect(screen.getByLabelText('Vai trò của admin@greytest.dev')).toBeDisabled();
    expect(screen.getByTitle('Không thể tự xóa chính mình')).toBeDisabled();
    expect(screen.getByTitle('Không thể tự đổi trạng thái của mình')).toBeDisabled();
  });

  it('renders streamlined columns with user tier badge and detail link', () => {
    render(<MemoryRouter><AdminUsersPage /></MemoryRouter>);
    expect(screen.getByRole('columnheader', { name: 'ID' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Họ và tên' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Email' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Ngày đăng ký' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Trạng thái' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Vai trò' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Gói' })).toBeInTheDocument();
    expect(screen.getByText('FREE')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Chi tiết/i })).toHaveAttribute('href', '/admin/users/9');
  });

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

  it('sorts by headers and select dropdown', () => {
    render(<MemoryRouter><AdminUsersPage /></MemoryRouter>);

    // Click "Email"
    fireEvent.click(screen.getByRole('button', { name: 'Email' }));
    expect(userState.lastFilters).toMatchObject({ sort: 'email', direction: 'desc', page: 0 });

    // Toggle direction
    fireEvent.click(screen.getByRole('button', { name: 'Email' }));
    expect(userState.lastFilters).toMatchObject({ sort: 'email', direction: 'asc', page: 0 });

    // Click "Vai trò"
    fireEvent.click(screen.getByRole('button', { name: 'Vai trò' }));
    expect(userState.lastFilters).toMatchObject({ sort: 'role', direction: 'desc', page: 0 });

    // Click "Gói"
    fireEvent.click(screen.getByRole('button', { name: 'Gói' }));
    expect(userState.lastFilters).toMatchObject({ sort: 'tier', direction: 'desc', page: 0 });

    // Change sort select
    fireEvent.change(screen.getByLabelText('Sắp xếp'), { target: { value: 'totalGenerationRequests:desc' } });
    expect(userState.lastFilters).toMatchObject({ sort: 'totalGenerationRequests', direction: 'desc', page: 0 });
  });

  it('opens create user modal and submits valid request', () => {
    render(<MemoryRouter><AdminUsersPage /></MemoryRouter>);

    fireEvent.click(screen.getByRole('button', { name: /Thêm người dùng/ }));
    expect(screen.getByText('Tạo tài khoản mới')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('user@greytest.dev'), { target: { value: 'alice@greytest.dev' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByPlaceholderText('Nguyễn Văn A'), { target: { value: 'Alice Smith' } });

    fireEvent.click(screen.getByRole('button', { name: 'Tạo tài khoản' }));
    expect(screen.getByText('Xác nhận tạo tài khoản người dùng')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận tạo' }));

    expect(mutations.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'alice@greytest.dev',
        password: 'password123',
        fullName: 'Alice Smith',
      }),
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('confirms and deletes user when not self', () => {
    render(<MemoryRouter><AdminUsersPage /></MemoryRouter>);

    const deleteBtn = screen.getByTitle('Xóa tài khoản');
    expect(deleteBtn).not.toBeDisabled();

    fireEvent.click(deleteBtn);
    expect(screen.getByText('Xác nhận xóa tài khoản người dùng')).toBeInTheDocument();

    const dialog = screen.getByRole('dialog', { name: 'Xác nhận xóa tài khoản người dùng' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Xóa tài khoản' }));
    expect(mutations.deleteUser).toHaveBeenCalledWith(9, expect.objectContaining({ onSuccess: expect.any(Function) }));
  });

  it('confirms and toggles user enabled status when not self', () => {
    render(<MemoryRouter><AdminUsersPage /></MemoryRouter>);

    const lockBtn = screen.getByTitle('Nhấn để khóa tài khoản');
    expect(lockBtn).not.toBeDisabled();

    fireEvent.click(lockBtn);
    expect(screen.getByText('Xác nhận khóa tài khoản')).toBeInTheDocument();

    const dialog = screen.getByRole('dialog', { name: 'Xác nhận khóa tài khoản' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Khóa tài khoản' }));
    expect(mutations.status).toHaveBeenCalledWith(
      expect.objectContaining({ id: 9, enabled: false }),
      expect.objectContaining({ onSettled: expect.any(Function) })
    );
  });
});
