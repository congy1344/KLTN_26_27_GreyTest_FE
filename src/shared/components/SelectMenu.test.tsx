// @vitest-environment jsdom
import { useState } from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { SelectMenu, type SelectMenuOption } from './SelectMenu';

afterEach(cleanup);

const options: SelectMenuOption[] = [
  { value: '', label: 'Tất cả' },
  { value: 'new', label: 'Mới', hint: '3', tone: 'warning', group: 'Cần xử lý' },
  { value: 'done', label: 'Hoàn tất', tone: 'success', group: 'Kết thúc' },
  { value: 'running', label: 'Đang chạy', group: 'Cần xử lý' },
];

describe('SelectMenu', () => {
  it.each([1280, 1440, 1920])('keeps the popup inside a %ipx viewport and opens above when needed', (viewport) => {
    const originalWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: viewport });
    const bounds = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      left: viewport - 100, right: viewport + 180, width: 280,
      top: window.innerHeight - 68, bottom: window.innerHeight - 28, height: 40,
      x: viewport - 100, y: window.innerHeight - 68, toJSON: () => ({}),
    });
    try {
      const { container } = render(<SelectMenu aria-label="Trạng thái" value="" options={options} onChange={vi.fn()} />);
      fireEvent.click(screen.getByRole('button', { name: 'Trạng thái' }));
      const list = screen.getByRole('listbox');
      const popup = list.parentElement!;
      expect(popup.parentElement).toBe(document.body);
      expect(container).not.toContainElement(popup);
      expect(popup).toHaveClass('fixed');
      expect(popup.style.left).toBe(`${viewport - 296}px`);
      expect(popup.style.width).toBe('280px');
      expect(popup.style.bottom).toBe('76px');
      expect(popup.style.maxHeight).toBe('420px');
      expect(list).toHaveClass('overflow-y-auto');
    } finally {
      bounds.mockRestore();
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth });
    }
  });

  it('filters without changing the selection, handles no results, and selects by keyboard', () => {
    const onChange = vi.fn();
    function SearchableSelect() {
      const [value, setValue] = useState('done');
      return <SelectMenu searchable aria-label="Trạng thái" value={value} options={options}
        onChange={(next) => { setValue(next); onChange(next); }} />;
    }
    render(<SearchableSelect />);
    const trigger = screen.getByRole('button', { name: 'Trạng thái' });
    fireEvent.click(trigger);
    const search = screen.getByRole('combobox', { name: 'Lọc nhanh lựa chọn' });
    expect(search).toHaveFocus();
    fireEvent.change(search, { target: { value: '  ĐANG  ' } });
    expect(screen.getAllByRole('option')).toHaveLength(1);
    expect(screen.getByRole('option', { name: 'Đang chạy' })).toBeInTheDocument();
    expect(trigger).toHaveTextContent('Hoàn tất');
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.keyDown(search, { key: ' ' });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.change(search, { target: { value: 'không tồn tại' } });
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Không có lựa chọn phù hợp');
    expect(search).not.toHaveAttribute('aria-activedescendant');
    fireEvent.keyDown(search, { key: 'ArrowDown' });
    fireEvent.keyDown(search, { key: 'Enter' });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.change(search, { target: { value: 'đang' } });
    fireEvent.keyDown(search, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('running');
    expect(trigger).toHaveTextContent('Đang chạy');
    expect(trigger).toHaveFocus();
    fireEvent.click(trigger);
    expect(screen.getByRole('combobox')).toHaveValue('');
    expect(screen.getAllByRole('option')).toHaveLength(4);
    expect(screen.getByRole('option', { name: 'Đang chạy' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('hiện nhóm, giữ giá trị có kiểm soát và chọn bằng chuột', () => {
    const onChange = vi.fn();
    const { rerender } = render(<SelectMenu aria-label="Trạng thái" name="status" data-testid="status-filter" value="" onChange={onChange} options={options} />);
    const trigger = screen.getByRole('button', { name: 'Trạng thái' });
    expect(trigger).toHaveAttribute('name', 'status');
    expect(trigger).toHaveAttribute('data-testid', 'status-filter');
    fireEvent.click(trigger);
    const list = screen.getByRole('listbox', { name: 'Trạng thái' });
    expect(within(screen.getByRole('group', { name: 'Cần xử lý' })).getAllByRole('option')).toHaveLength(2);
    expect(within(list).getByRole('option', { name: 'Mới' })).toHaveTextContent('3');
    fireEvent.click(within(list).getByRole('option', { name: 'Mới' }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('new');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    rerender(<SelectMenu aria-label="Trạng thái" value="new" onChange={onChange} options={options} />);
    expect(trigger).toHaveTextContent('Mới');
    fireEvent.click(trigger);
    expect(screen.getByRole('option', { name: 'Mới' })).toHaveAttribute('aria-selected', 'true');
  });

  it('điều hướng theo thứ tự hiển thị, hỗ trợ Home/End và Enter/Space', () => {
    const onChange = vi.fn();
    render(<SelectMenu aria-label="Trạng thái" value="" onChange={onChange} options={options} />);
    const trigger = screen.getByRole('button', { name: 'Trạng thái' });
    fireEvent.keyDown(trigger, { key: 'ArrowUp' });
    let list = screen.getByRole('listbox');
    expect(list).toHaveFocus();
    fireEvent.keyDown(list, { key: 'End' });
    expect(document.getElementById(list.getAttribute('aria-activedescendant')!)).toHaveTextContent('Hoàn tất');
    fireEvent.keyDown(list, { key: 'ArrowDown' });
    expect(document.getElementById(list.getAttribute('aria-activedescendant')!)).toHaveTextContent('Tất cả');
    fireEvent.keyDown(list, { key: 'ArrowUp' });
    fireEvent.keyDown(list, { key: 'Enter' });
    expect(onChange).toHaveBeenLastCalledWith('done');
    fireEvent.keyDown(trigger, { key: ' ' });
    list = screen.getByRole('listbox');
    fireEvent.keyDown(list, { key: 'Home' });
    fireEvent.keyDown(list, { key: 'ArrowDown' });
    fireEvent.keyDown(list, { key: 'ArrowDown' });
    fireEvent.keyDown(list, { key: ' ' });
    expect(onChange).toHaveBeenLastCalledWith('running');
  });

  it('đóng bằng Escape, Tab, click ngoài và khi focus rời bộ chọn', () => {
    const onChange = vi.fn();
    render(<><SelectMenu aria-label="Trạng thái" value="" onChange={onChange} options={options} /><button>Ngoài</button></>);
    const trigger = screen.getByRole('button', { name: 'Trạng thái' });
    for (const key of ['Escape', 'Tab']) {
      fireEvent.click(trigger);
      fireEvent.keyDown(screen.getByRole('listbox'), { key });
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    }
    fireEvent.click(trigger);
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Ngoài' }));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    fireEvent.click(trigger);
    fireEvent.blur(screen.getByRole('listbox'), { relatedTarget: screen.getByRole('button', { name: 'Ngoài' }) });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('không mở bộ chọn bị vô hiệu hóa hoặc rỗng', () => {
    const { rerender } = render(<SelectMenu aria-label="Trạng thái" value="" onChange={vi.fn()} options={options} disabled />);
    expect(screen.getByRole('button')).toBeDisabled();
    fireEvent.click(screen.getByRole('button'));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    rerender(<SelectMenu aria-label="Trạng thái" value="" onChange={vi.fn()} options={[]} />);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
