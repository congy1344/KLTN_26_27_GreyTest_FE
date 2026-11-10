// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from './ConfirmDialog';

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open');
  };
});

describe('ConfirmDialog', () => {
  it('renders an in-app confirmation and invokes the selected action', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open
        title="Xóa Test Plan?"
        description="Dữ liệu liên quan cũng sẽ bị xóa."
        confirmLabel="Xóa"
        cancelLabel="Hủy"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByRole('dialog')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Xóa' }));
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('supports brand variant for update confirmation', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open
        variant="brand"
        title="Xác nhận lưu thay đổi?"
        description="Thay đổi sẽ được áp dụng trực tiếp."
        confirmLabel="Đồng ý lưu"
        cancelLabel="Hủy"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    const confirmBtn = screen.getByRole('button', { name: 'Đồng ý lưu' });
    expect(confirmBtn).toHaveClass('btn-brand');
    fireEvent.click(confirmBtn);
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('invokes onCancel when cancel button is clicked', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open
        title="Xác nhận?"
        description="Nội dung kiểm tra"
        confirmLabel="Tiếp tục"
        cancelLabel="Hủy bỏ"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Hủy bỏ' }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('disables buttons when pending is true', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open
        pending
        title="Đang xử lý?"
        description="Vui lòng đợi..."
        confirmLabel="Xác nhận"
        cancelLabel="Đóng"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByRole('button', { name: 'Xác nhận' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Đóng' })).toBeDisabled();
  });
});
