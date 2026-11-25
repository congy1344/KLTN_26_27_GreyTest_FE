// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GithubCallbackPage } from './GithubCallbackPage';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockMutate = vi.fn();
let mockMutateAsync: any = undefined;
let mockIsSuccess = false;
let mockIsPending = false;
let mockError: any = null;

vi.mock('../hooks/useAuth', () => ({
  useGithubLogin: () => ({
    mutate: mockMutate,
    mutateAsync: mockMutateAsync,
    isSuccess: mockIsSuccess,
    isPending: mockIsPending,
    error: mockError,
  }),
}));

function renderCallback(initialEntries = ['/auth/callback/github']) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <GithubCallbackPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('GithubCallbackPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    window.localStorage.clear();
    mockMutateAsync = undefined;
    mockIsSuccess = false;
    mockIsPending = false;
    mockError = null;
  });

  afterEach(() => {
    cleanup();
  });

  it('exchanges code and redirects to target stored in sessionStorage', async () => {
    window.sessionStorage.setItem('github_oauth_state', 'valid-state-123');
    window.sessionStorage.setItem('github_redirect_after', '/projects/new');

    mockMutate.mockImplementation((_payload, options) => {
      options?.onSuccess?.();
    });

    renderCallback(['/auth/callback/github?code=github_code_abc&state=valid-state-123']);

    expect(mockMutate).toHaveBeenCalledWith(
      { code: 'github_code_abc' },
      expect.objectContaining({ onSuccess: expect.any(Function) })
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/projects/new', { replace: true });
    });
    expect(window.sessionStorage.getItem('github_redirect_after')).toBeNull();
  });

  it('shows CSRF error when state is missing or mismatched', async () => {
    window.sessionStorage.setItem('github_oauth_state', 'expected-state');

    renderCallback(['/auth/callback/github?code=github_code_abc&state=wrong-state']);

    expect(mockMutate).not.toHaveBeenCalled();
    expect(screen.getByText(/Mã xác thực trạng thái \(state\) không hợp lệ/i)).toBeInTheDocument();
  });

  it('shows error banner on mutation failure and does not redirect', async () => {
    window.sessionStorage.setItem('github_oauth_state', 'expected-state');
    mockError = new Error('Tài khoản GitHub đã liên kết với người dùng khác');

    mockMutate.mockImplementation((_payload, options) => {
      options?.onError?.(mockError);
    });

    renderCallback(['/auth/callback/github?code=github_code_abc&state=expected-state']);

    expect(screen.getByText(/Đăng nhập GitHub thất bại/i)).toBeInTheDocument();
    expect(screen.getByText(/Tài khoản GitHub đã liên kết với người dùng khác/i)).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not show false CSRF error when component re-renders after consuming state', () => {
    window.sessionStorage.setItem('github_oauth_state', 'one-time-state');
    const url = '/auth/callback/github?code=github_code_abc&state=one-time-state';
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const tree = () => (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[url]}>
          <GithubCallbackPage />
        </MemoryRouter>
      </QueryClientProvider>
    );

    const { rerender } = render(tree());

    // Nonce đã được xóa ngay lần chạy effect đầu tiên
    expect(window.sessionStorage.getItem('github_oauth_state')).toBeNull();
    expect(mockMutate).toHaveBeenCalledTimes(1);

    // Mô phỏng TanStack Query chuyển sang trạng thái đang gọi API (gây re-render)
    mockIsPending = true;
    rerender(tree());

    expect(screen.queryByText(/Mã xác thực trạng thái \(state\) không hợp lệ/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Đang xác thực với GitHub/i)).toBeInTheDocument();

    // Nếu API trả lỗi, phải hiển thị đúng lỗi từ server thay vì bị lỗi state đè lên
    mockIsPending = false;
    mockError = new Error('Mã xác thực GitHub đã hết hạn');
    rerender(tree());

    expect(screen.queryByText(/Mã xác thực trạng thái \(state\) không hợp lệ/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Mã xác thực GitHub đã hết hạn/i)).toBeInTheDocument();
  });

  it('displays 400 error via mutateAsync even if MutationObserver state stays idle under StrictMode', async () => {
    window.sessionStorage.setItem('github_oauth_state', 'strict-state');
    window.sessionStorage.setItem('github_oauth_mode', 'link');

    mockMutateAsync = vi.fn().mockRejectedValue(
      new Error('Tài khoản GitHub @tiennguyen2406 đã được liên kết với một tài khoản người dùng khác.')
    );

    renderCallback(['/auth/callback/github?code=github_code_abc&state=strict-state']);

    await waitFor(() => {
      expect(
        screen.getByText(/Tài khoản GitHub @tiennguyen2406 đã được liên kết với một tài khoản người dùng khác/i)
      ).toBeInTheDocument();
    });
    expect(window.sessionStorage.getItem('github_oauth_mode')).toBeNull();
  });
});
