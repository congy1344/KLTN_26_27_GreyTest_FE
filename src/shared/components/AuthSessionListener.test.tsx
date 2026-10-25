// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { AuthSessionListener } from './AuthSessionListener';

afterEach(cleanup);

describe('AuthSessionListener', () => {
  it.each([['/projects/1', '/login'], ['/admin/users', '/admin/login']])
    ('clears cached user data and redirects %s to %s', async (from, to) => {
      const client = new QueryClient();
      client.setQueryData(['projects'], [{ id: 1, name: 'Private project' }]);
      client.setQueryData(['auth', 'me'], { id: 1 });
      render(
        <QueryClientProvider client={client}>
          <MemoryRouter initialEntries={[from]}>
            <AuthSessionListener />
            <Routes>
              <Route path={from} element={<div>Protected page</div>} />
              <Route path={to} element={<div>Login required</div>} />
            </Routes>
          </MemoryRouter>
        </QueryClientProvider>,
      );

      act(() => window.dispatchEvent(new CustomEvent('auth-expired')));

      await waitFor(() => expect(screen.getByText('Login required')).toBeInTheDocument());
      expect(client.getQueryCache().getAll()).toHaveLength(0);
    });
});
