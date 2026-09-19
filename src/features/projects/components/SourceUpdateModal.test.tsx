// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SourceUpdateModal } from './SourceUpdateModal';

const mocks = vi.hoisted(() => ({
  createZip: vi.fn(),
  createGithub: vi.fn(),
  fetchProject: vi.fn(),
  fetch: vi.fn(),
  analyze: vi.fn(),
  generate: vi.fn(),
  patch: vi.fn(),
  apply: vi.fn(),
  cancel: vi.fn(),
}));

vi.mock('../api/source-update-api', () => ({
  SOURCE_UPDATE_TIMEOUT_MS: 120_000,
  createZipSourceUpdate: mocks.createZip,
  createGithubSourceUpdate: mocks.createGithub,
  fetchProjectSourceUpdates: mocks.fetchProject,
  fetchSourceUpdate: mocks.fetch,
  analyzeSourceUpdate: mocks.analyze,
  generateIncrementalSourceUpdate: mocks.generate,
  patchSourceUpdateItem: mocks.patch,
  applySourceUpdate: mocks.apply,
  cancelSourceUpdate: mocks.cancel,
}));

const project = {
  id: 7,
  name: 'hospital-management-demo',
  sourceType: 'ZIP' as const,
  sourceUrl: null,
  status: 'ANALYZED' as const,
  createdAt: '',
  ownerUserId: 1,
  sourceAvailable: true,
};

describe('SourceUpdateModal', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.fetchProject.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('shows upload progress percentage while the source update is running', async () => {
    mocks.createZip.mockImplementation((_projectId: number, _file: File, options: { onUploadProgress?: (percent: number) => void }) => {
      options.onUploadProgress?.(50);
      return new Promise(() => undefined);
    });

    render(<SourceUpdateModal project={project} isOpen onClose={vi.fn()} onApplied={vi.fn()} />);
    const file = new File(['source'], 'project.zip', { type: 'application/zip' });
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: /Tải lên & Phân tích/i }));

    await act(async () => undefined);

    expect(screen.getByRole('progressbar', { name: 'Tiến trình xử lý source code' })).toHaveAttribute('aria-valuenow', '23');
    expect(screen.getByText(/Đang tải source code/i)).toBeVisible();
  });

  it('shows a timeout error and releases the loading state when upload hangs', async () => {
    mocks.createZip.mockReturnValue(new Promise(() => undefined));

    render(<SourceUpdateModal project={project} isOpen onClose={vi.fn()} onApplied={vi.fn()} />);
    const file = new File(['source'], 'project.zip', { type: 'application/zip' });
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: /Tải lên & Phân tích/i }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(120_000);
    });

    expect(screen.getByText('Tải source code mới quá thời gian chờ 120 giây.')).toBeVisible();
    expect(screen.getByRole('button', { name: /Tải lên & Phân tích/i })).toBeEnabled();
  });

  it('recovers a draft that the server completed after the client timeout', async () => {
    mocks.createZip.mockReturnValue(new Promise(() => undefined));
    mocks.fetchProject.mockResolvedValue([{ id: 11, items: [], impactSummary: null, status: 'DRAFT' }]);

    render(<SourceUpdateModal project={project} isOpen onClose={vi.fn()} onApplied={vi.fn()} />);
    const file = new File(['source'], 'project.zip', { type: 'application/zip' });
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: /AST/i }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(120_000);
    });

    expect(screen.getByRole('button', { name: /Ph/i })).toBeVisible();
    expect(mocks.fetchProject).toHaveBeenCalledWith(7, expect.anything());
  });

  it('ignores a late upload result after the modal is closed and reopened', async () => {
    let resolveCreate!: (value: unknown) => void;
    mocks.createZip.mockReturnValue(new Promise((resolve) => {
      resolveCreate = resolve;
    }));
    mocks.analyze.mockReturnValue(new Promise(() => undefined));
    const onClose = vi.fn();
    const view = render(<SourceUpdateModal project={project} isOpen onClose={onClose} onApplied={vi.fn()} />);
    const file = new File(['source'], 'project.zip', { type: 'application/zip' });
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: /Tải lên & Phân tích/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }));
    await act(async () => {
      view.rerender(<SourceUpdateModal project={project} isOpen={false} onClose={onClose} onApplied={vi.fn()} />);
    });

    await act(async () => {
      resolveCreate({ id: 11, items: [], impactSummary: null });
      await Promise.resolve();
    });
    await act(async () => {
      view.rerender(<SourceUpdateModal project={project} isOpen onClose={onClose} onApplied={vi.fn()} />);
    });

    expect(onClose).toHaveBeenCalledOnce();
    expect(screen.getByText('Nhấp để chọn file ZIP project mới')).toBeVisible();
  });
  it('renders the backend impact summary field names after AST analysis', async () => {
    mocks.createZip.mockResolvedValue({ id: 11, items: [], impactSummary: null });
    mocks.analyze.mockResolvedValue({
      id: 11,
      items: [],
      impactSummary: JSON.stringify({
        totalChangedMethods: 3,
        addedMethodsCount: 2,
        modifiedMethodsCount: 1,
        deletedMethodsCount: 0,
        changedMethods: [{
          className: 'AppointmentService',
          qualifiedClassName: 'com.example.AppointmentService',
          methodName: 'create',
          signature: 'create(AppointmentRequest)',
          methodKey: 'com.example.AppointmentService#create(AppointmentRequest)',
          diffType: 'MODIFIED',
          reason: 'Method changed',
          isServiceMethod: true,
        }],
        affectedServiceMethods: [],
        affectedBusinessRuleIds: [],
        affectedTestPlanIds: [],
        affectedTestCaseIds: [],
        affectedUnitTestIds: [],
      }),
    });

    render(<SourceUpdateModal project={project} isOpen onClose={vi.fn()} onApplied={vi.fn()} />);
    const file = new File(['source'], 'project.zip', { type: 'application/zip' });
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: /AST/i }));

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByText(/^\+2/)).toBeVisible();
    expect(screen.getByText('create(AppointmentRequest)')).toBeVisible();
  });

  it('disables analyze and apply while a single generation stage is running', async () => {
    mocks.createZip.mockResolvedValue({ id: 11, items: [], impactSummary: null });
    mocks.analyze.mockResolvedValue({ id: 11, items: [], impactSummary: null });
    mocks.generate.mockReturnValue(new Promise(() => undefined));

    render(<SourceUpdateModal project={project} isOpen onClose={vi.fn()} onApplied={vi.fn()} />);
    const file = new File(['source'], 'project.zip', { type: 'application/zip' });
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: /AST/i }));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByRole('button', { name: /Ph/i })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: /1\. Sinh BR/i }));

    expect(screen.getByRole('button', { name: /Ph/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Project/i })).toBeDisabled();
  });

  it('clears the generation state when the modal is closed and reopened', async () => {
    mocks.createZip.mockResolvedValue({ id: 11, items: [], impactSummary: null });
    mocks.analyze.mockResolvedValue({ id: 11, items: [], impactSummary: null });
    mocks.generate.mockReturnValue(new Promise(() => undefined));
    const view = render(<SourceUpdateModal project={project} isOpen onClose={vi.fn()} onApplied={vi.fn()} />);
    const file = new File(['source'], 'project.zip', { type: 'application/zip' });

    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: /AST/i }));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    fireEvent.click(screen.getByRole('button', { name: /1\. Sinh BR/i }));

    await act(async () => {
      view.rerender(<SourceUpdateModal project={project} isOpen={false} onClose={vi.fn()} onApplied={vi.fn()} />);
      await Promise.resolve();
    });
    view.rerender(<SourceUpdateModal project={project} isOpen onClose={vi.fn()} onApplied={vi.fn()} />);
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: /AST/i }));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByRole('button', { name: /1\. Sinh BR/i })).toBeEnabled();
  });
});
