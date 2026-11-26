// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AxiosError, AxiosHeaders } from 'axios';
import { ProjectUploadForm } from './ProjectUploadForm';
import { apiClient } from '../../../shared/api/api-client';

let mockCurrentUser: any = {
  id: 4,
  email: 'sizngu@gmail.com',
  fullName: 'Tien Nguyen',
  role: 'USER',
  githubUsername: 'tiennguyen2406',
};
let mockReposError: any = null;
const mockDisconnectMutate = vi.fn();

vi.mock('../hooks/useProjects', () => ({
  useUploadProject: () => ({ mutate: vi.fn(), isPending: false, error: null }),
  useCloneGithub: () => ({ mutate: vi.fn(), isPending: false, error: null }),
}));

vi.mock('../../auth/hooks/useAuth', () => ({
  useCurrentUser: () => ({ data: mockCurrentUser, isLoading: false }),
  useGithubConfig: () => ({
    data: {
      enabled: true,
      clientId: 'Iv23limF38Z6gc0T1CTi',
      redirectUri: 'http://localhost:3000/auth/callback/github',
    },
  }),
  useGithubRepos: () => ({
    data: [],
    isLoading: false,
    error: mockReposError,
  }),
  useImportGithubRepo: () => ({ mutate: vi.fn(), isPending: false, error: null }),
  useDisconnectGithub: () => ({ mutate: mockDisconnectMutate, isPending: false, error: null }),
}));

describe('ProjectUploadForm GitHub Reconnect', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    window.sessionStorage.clear();
    mockReposError = null;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, href: 'http://localhost:3000/projects/new', origin: 'http://localhost:3000' },
    });
  });

  afterEach(() => {
    cleanup();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  it('shows reconnect button in card when GITHUB_TOKEN_EXPIRED occurs even if githubUsername exists', async () => {
    const statePost = vi.spyOn(apiClient, 'post').mockResolvedValue({ data: { state: 'server-state' } });
    mockReposError = new AxiosError(
      'Request failed with status code 400',
      'ERR_BAD_REQUEST',
      undefined,
      undefined,
      {
        status: 400,
        statusText: 'Bad Request',
        headers: new AxiosHeaders(),
        config: { headers: new AxiosHeaders() },
        data: {
          code: 'GITHUB_TOKEN_EXPIRED',
          message: 'Phiên liên kết GitHub đã hết hạn hoặc bị thu hồi. Vui lòng kết nối lại tài khoản GitHub.',
        },
      }
    );

    render(
      <MemoryRouter>
        <ProjectUploadForm />
      </MemoryRouter>
    );

    const reconnectBtn = screen.getByRole('button', { name: /Kết nối lại tài khoản GitHub/i });
    expect(reconnectBtn).toBeInTheDocument();

    fireEvent.click(reconnectBtn);

    expect(window.sessionStorage.getItem('github_oauth_mode')).toBe('link');
    expect(window.sessionStorage.getItem('github_redirect_after')).toBe('/projects/new');
    await waitFor(() => expect(window.location.href).toContain('https://github.com/login/oauth/authorize?'));
    expect(statePost).toHaveBeenCalledWith('/auth/github/state');
    expect(window.location.href).toContain('state=server-state');
    expect(window.sessionStorage.getItem('github_oauth_state')).toBe('server-state');
    statePost.mockRestore();
  });

  it('calls disconnectGithub mutation when clicking Đăng xuất button on GitHub card', () => {
    mockDisconnectMutate.mockClear();
    render(
      <MemoryRouter>
        <ProjectUploadForm />
      </MemoryRouter>
    );

    const signOutBtn = screen.getByRole('button', { name: /Đăng xuất/i });
    expect(signOutBtn).toBeInTheDocument();

    fireEvent.click(signOutBtn);
    expect(mockDisconnectMutate).toHaveBeenCalledTimes(1);
  });
});
