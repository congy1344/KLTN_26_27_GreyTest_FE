// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminAiProvidersPage } from './AdminAiProvidersPage';
import { LanguageProvider } from '../../../shared/i18n/language';
import { ThemeProvider } from '../../../shared/theme/theme';

vi.mock('../../auth/hooks/useAuth', () => ({
  useCurrentUser: () => ({ data: { id: 1, email: 'admin@greytest.dev', fullName: 'Admin User', role: 'ADMIN' } }),
  useLogout: () => vi.fn(),
}));

const mockUpdateKeys = vi.fn();
const mockUpdateLimits = vi.fn();
const mockUpdateModel = vi.fn();

const mockAiConfig = {
  provider: 'openai',
  model: 'gpt-6-luna',
  endpoint: 'https://api.openai.com/v1/chat/completions',
  batchConcurrency: 4,
  keys: [
    {
      slot: 0,
      envVar: 'LLM_API_KEY',
      role: 'Khóa mặc định chính (Primary API Key)',
      maskedKey: 'sk-test-mock••••••••demo',
      rawKey: 'sk-test-mock-demo-key-1234567890abcdef',
      configured: true,
    },
    {
      slot: 1,
      envVar: 'LLM_API_KEY1',
      role: 'Khóa phụ xoay vòng 1 (Rotation Pool Slot 1)',
      maskedKey: 'Chưa cấu hình',
      rawKey: '',
      configured: false,
    },
  ],
  stageLimits: {
    'business-rule': 4096,
    'unit-test': 12288,
  },
};

vi.mock('../hooks/useAdmin', () => ({
  useAdminOverview: () => ({ data: { totalLlmCalls: 3259 }, isLoading: false }),
  useTopUsers: () => ({ data: [{ userId: 1, email: 'developer@greytest.dev', totalLlmCalls: 120 }], isLoading: false }),
  useServiceHealth: () => ({ data: { llmGateway: 'UP' }, isFetching: false }),
  useAiRuntimeConfig: () => ({ data: mockAiConfig, isLoading: false }),
  useAiRuntimeMutations: () => ({
    updateKeys: { mutate: mockUpdateKeys, isPending: false, error: null },
    updateLimits: { mutate: mockUpdateLimits, isPending: false, error: null },
    updateModel: { mutate: mockUpdateModel, isPending: false, error: null },
  }),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('AdminAiProvidersPage', () => {
  it('renders live runtime model and key slots without the deleted inference gateway block', () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <LanguageProvider>
            <AdminAiProvidersPage />
          </LanguageProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    // Verifies the live model from runtime
    expect(screen.getByText('gpt-6-luna')).toBeInTheDocument();
    expect(screen.getByText(/3[,.]?259/)).toBeInTheDocument();
    expect(screen.getByText('LLM_API_KEY')).toBeInTheDocument();

    // Verifies the hardcoded "Cấu Hình Cổng Suy Luận" card has been deleted
    expect(screen.queryByText(/Cấu Hình Cổng Suy Luận \(Spring Boot Runtime\)/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Google Gemini Gateway \(Dự phòng\)/i)).not.toBeInTheDocument();
  });

  it('lets admins add or replace keys but never reveals or copies a raw key', () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <LanguageProvider>
            <AdminAiProvidersPage />
          </LanguageProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole('columnheader', { name: 'Thao tác' })).toBeInTheDocument();
    expect(screen.getByText('Đang kích hoạt')).toBeInTheDocument();
    expect(screen.getByText('Trống')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Hiện toàn bộ khóa API/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Sao chép khóa API/i })).not.toBeInTheDocument();
    // Chỉ còn 1 khoá thì không cho xoá, tránh tắt hẳn AI.
    expect(screen.queryByRole('button', { name: /Xoá khoá vị trí/i })).not.toBeInTheDocument();
  });

  it('saves a new key for an empty slot after confirmation', () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <LanguageProvider>
            <AdminAiProvidersPage />
          </LanguageProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Thêm' }));
    const input = screen.getByLabelText(/Khoá API vị trí/);
    expect(input).toHaveAttribute('type', 'password');
    fireEvent.change(input, { target: { value: 'sk-new-rotation-key-0002' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Lưu khoá' }));

    expect(mockUpdateKeys).toHaveBeenCalledWith(
      { slots: [{ slot: expect.any(Number), key: 'sk-new-rotation-key-0002' }] },
      expect.any(Object),
    );
  });

  it('edits stage token limits and saves live to runtime', () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <LanguageProvider>
            <AdminAiProvidersPage />
          </LanguageProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    const editLimitsBtn = screen.getByRole('button', { name: /Chỉnh sửa giới hạn/i });
    fireEvent.click(editLimitsBtn);

    const saveLimitsBtn = screen.getByRole('button', { name: /Lưu giới hạn Token/i });
    expect(saveLimitsBtn).toBeInTheDocument();
    fireEvent.click(saveLimitsBtn);

    expect(screen.getByText("Xác nhận cập nhật giới hạn token?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận lưu' }));

    expect(mockUpdateLimits).toHaveBeenCalledWith(
      expect.objectContaining({
        stageLimits: expect.any(Object),
      }),
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('opens model selection modal and updates active AI model', () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <LanguageProvider>
            <AdminAiProvidersPage />
          </LanguageProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );

    const changeModelBtn = screen.getByRole('button', { name: /Đổi mô hình/i });
    fireEvent.click(changeModelBtn);

    expect(screen.getByText("Chọn mô hình AI hoạt động cho dự án")).toBeInTheDocument();

    const saveModelBtn = screen.getByRole('button', { name: /Lưu & Áp dụng trực tiếp/i });
    fireEvent.click(saveModelBtn);

    expect(screen.getByText("Xác nhận thay đổi mô hình AI?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận áp dụng' }));

    expect(mockUpdateModel).toHaveBeenCalledWith(
      expect.objectContaining({
        model: expect.any(String),
      }),
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });
});
