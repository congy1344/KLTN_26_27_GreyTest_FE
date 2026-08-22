// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RequireAdmin } from '../../App';

const auth = vi.hoisted(() => ({ role: 'USER' as 'USER' | 'ADMIN' }));
vi.mock('../auth/hooks/useAuth', () => ({
  useCurrentUser: () => ({ data: { id: 1, email: 'user@test.dev', fullName: 'User', role: auth.role }, isLoading: false }),
}));

afterEach(() => { cleanup(); localStorage.clear(); auth.role = 'USER'; });

function renderRoute() {
  localStorage.setItem('greytest.token', 'token');
  return render(<MemoryRouter initialEntries={['/admin']}><Routes>
    <Route path="/admin" element={<RequireAdmin><div>Admin content</div></RequireAdmin>} />
    <Route path="/admin/login" element={<div>Admin login</div>} />
  </Routes></MemoryRouter>);
}

describe('RequireAdmin', () => {
  it('redirects regular users away from the admin area', () => {
    renderRoute();
    expect(screen.getByText('Admin login')).toBeInTheDocument();
  });

  it('allows users with ADMIN role', () => {
    auth.role = 'ADMIN';
    renderRoute();
    expect(screen.getByText('Admin content')).toBeInTheDocument();
  });
});
