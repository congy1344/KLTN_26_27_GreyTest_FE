// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminUsersPage } from './AdminUsersPage';
import type { AdminUser } from '../types';

const mutations = vi.hoisted(() => ({ role: vi.fn(), status: vi.fn(), tier: vi.fn(), quota: vi.fn() }));
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
  it.each([true, false])('disables own role and status controls when enabled is %s', (enabled) => {
    userState.user = { ...userState.user, id: 1, email: 'admin@greytest.dev', role: 'ADMIN', enabled };
    render(<MemoryRouter><AdminUsersPage /></MemoryRouter>);

    expect(screen.getByLabelText('Vai trò của admin@greytest.dev')).toBeDisabled();
    expect(screen.getByRole('button', { name: enabled ? 'Khóa' : 'Mở khóa' })).toBeDisabled();
  });

  it('requires a nonblank reason before submitting a lock request', () => {
    render(<MemoryRouter><AdminUsersPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Khóa' }));
    const confirm = screen.getByRole('button', { name: 'Khóa tài khoản' });
    expect(confirm).toBeDisabled();
    const reason = screen.getByLabelText('Lý do khóa tài khoản');
    expect(reason).toHaveAttribute('maxlength', '500');
    fireEvent.change(reason, { target: { value: '   ' } });
    expect(confirm).toBeDisabled();
    fireEvent.change(reason, { target: { value: '  Tài khoản thử nghiệm  ' } });
    fireEvent.click(confirm);
    expect(mutations.status).toHaveBeenCalledWith(
      { id: 9, enabled: false, reason: 'Tài khoản thử nghiệm' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('unlocks a user without requiring a lock reason', () => {
    userState.user.enabled = false;
    render(<MemoryRouter><AdminUsersPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Mở khóa' }));
    expect(screen.queryByLabelText('Lý do khóa tài khoản')).not.toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Mở khóa tài khoản?' })).getByRole('button', { name: 'Mở khóa' }));
    expect(mutations.status).toHaveBeenCalledWith(
      { id: 9, enabled: true }, expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('shows unlimited quota without a progress bar and can save a finite limit', () => {
    userState.user.quota = { limit: null, used: 34, remaining: null, periodStart: '2026-08-01', resetDate: '2026-09-01', exceeded: false };
    render(<MemoryRouter><AdminUsersPage /></MemoryRouter>);
    expect(screen.getByText('Không giới hạn')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.getByText('Reset ngày 2026-09-01')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Không giới hạn/ }));
    expect(screen.getByLabelText('Không giới hạn')).toBeChecked();
    expect(screen.getByLabelText('Quota LLM mỗi tháng')).toBeDisabled();
    fireEvent.click(screen.getByLabelText('Không giới hạn'));
    fireEvent.change(screen.getByLabelText('Quota LLM mỗi tháng'), { target: { value: '40' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu quota' }));
    expect(mutations.quota).toHaveBeenCalledWith(
      { id: 9, limit: 40 }, expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('submits null for unlimited quota instead of treating zero as unlimited', () => {
    userState.user.quota = { ...userState.user.quota, limit: 0, remaining: -3, exceeded: true };
    render(<MemoryRouter><AdminUsersPage /></MemoryRouter>);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /3\/0 lượt/ }));
    fireEvent.click(screen.getByLabelText('Không giới hạn'));
    fireEvent.click(screen.getByRole('button', { name: 'Lưu quota' }));
    expect(mutations.quota).toHaveBeenCalledWith(
      { id: 9, limit: null }, expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('shows generation totals and missing recent activity explicitly', () => {
    render(<MemoryRouter><AdminUsersPage /></MemoryRouter>);
    expect(screen.getByRole('columnheader', { name: 'Tổng lượt sinh test' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Hoạt động gần nhất' })).toBeInTheDocument();
    expect(screen.getByText('Chưa có')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '3');
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

  it('requires confirmation before changing a user tier', () => {
    render(<MemoryRouter><AdminUsersPage /></MemoryRouter>);

    fireEvent.change(screen.getByLabelText('Gói của user@greytest.dev'), { target: { value: 'PRO' } });
    expect(mutations.tier).not.toHaveBeenCalled();
    expect(screen.getByText('Xác nhận thay đổi gói tài khoản')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Đổi gói' }));
    expect(mutations.tier).toHaveBeenCalledWith(
      { id: 9, tier: 'PRO' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('sorts by generation count, activity, and quota via clickable headers and select dropdown', () => {
    render(<MemoryRouter><AdminUsersPage /></MemoryRouter>);

    // Click "Tổng lượt sinh test"
    fireEvent.click(screen.getByRole('button', { name: 'Tổng lượt sinh test' }));
    expect(userState.lastFilters).toMatchObject({ sort: 'totalGenerationRequests', direction: 'desc', page: 0 });

    // Toggle direction
    fireEvent.click(screen.getByRole('button', { name: 'Tổng lượt sinh test' }));
    expect(userState.lastFilters).toMatchObject({ sort: 'totalGenerationRequests', direction: 'asc', page: 0 });

    // Click "Hoạt động gần nhất"
    fireEvent.click(screen.getByRole('button', { name: 'Hoạt động gần nhất' }));
    expect(userState.lastFilters).toMatchObject({ sort: 'lastActivityAt', direction: 'desc', page: 0 });

    // Click "Quota LLM tháng"
    fireEvent.click(screen.getByRole('button', { name: 'Quota LLM tháng' }));
    expect(userState.lastFilters).toMatchObject({ sort: 'quota', direction: 'desc', page: 0 });

    // Change sort select
    fireEvent.change(screen.getByLabelText('Sắp xếp'), { target: { value: 'totalGenerationRequests:desc' } });
    expect(userState.lastFilters).toMatchObject({ sort: 'totalGenerationRequests', direction: 'desc', page: 0 });
  });
});
