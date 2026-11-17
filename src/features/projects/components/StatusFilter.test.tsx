// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../../../shared/i18n/language';
import type { ProjectStatus } from '../types';
import { STATUS_CONFIG, StatusBadge } from './StatusBadge';
import { StatusFilter } from './StatusFilter';

afterEach(() => { cleanup(); localStorage.removeItem('greytest.language'); });

describe('StatusFilter', () => {
  it('hides empty statuses and groups while retaining the selected status with zero projects', () => {
    render(<StatusFilter value="PLAN_APPROVED" onChange={vi.fn()} counts={{ BR_PENDING_REVIEW: 2 }} total={2} />);
    const trigger = screen.getByRole('button', { name: 'Lọc trạng thái: Sẵn sàng sinh Test Case' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    fireEvent.click(trigger);

    expect(screen.getByRole('listbox')).toHaveAttribute('id', trigger.getAttribute('aria-controls'));
    expect(screen.getByRole('option', { name: 'Tất cả trạng thái' })).toHaveTextContent('2');
    expect(screen.getByRole('option', { name: 'Cần duyệt Business Rule' })).toHaveTextContent('2');
    const selected = screen.getByRole('option', { name: 'Sẵn sàng sinh Test Case' });
    expect(selected).toHaveTextContent('0');
    expect(selected).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('group', { name: 'Cần bạn duyệt' })).toBeVisible();
    expect(screen.getByRole('group', { name: 'Sẵn sàng bước tiếp' })).toBeVisible();
    expect(screen.queryByRole('group', { name: 'Kết thúc' })).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Chưa bắt đầu' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Chưa phân tích' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(3);
  });

  it.each(['Enter', ' ', 'ArrowDown'])('opens with %s, then selects with ArrowDown and Enter', (key) => {
    const onChange = vi.fn();
    render(<StatusFilter value="ALL" onChange={onChange} counts={{ UPLOADED: 1 }} total={1} />);
    const trigger = screen.getByTestId('project-status-filter');
    trigger.focus();
    fireEvent.keyDown(trigger, { key });
    const listbox = screen.getByRole('listbox');
    expect(listbox).toHaveFocus();
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    fireEvent.keyDown(listbox, { key: 'ArrowDown' });
    expect(listbox).toHaveAttribute('aria-activedescendant', screen.getByRole('option', { name: 'Chưa phân tích' }).id);
    fireEvent.keyDown(listbox, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('UPLOADED');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('closes with Escape and restores trigger focus without changing the value', () => {
    const onChange = vi.fn();
    render(<StatusFilter value="ALL" onChange={onChange} counts={{ COMPLETED: 1 }} total={1} />);
    const trigger = screen.getByTestId('project-status-filter');
    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('supports Home, End, ArrowUp and selecting with Space', () => {
    const onChange = vi.fn();
    render(<StatusFilter value="ALL" onChange={onChange} counts={{ BR_PENDING_REVIEW: 1, UPLOADED: 1 }} total={2} />);
    fireEvent.click(screen.getByTestId('project-status-filter'));
    const listbox = screen.getByRole('listbox');
    const expectActive = (name: string) => expect(listbox).toHaveAttribute('aria-activedescendant', screen.getByRole('option', { name }).id);
    fireEvent.keyDown(listbox, { key: 'End' });
    expectActive('Chưa phân tích');
    fireEvent.keyDown(listbox, { key: 'Home' });
    expectActive('Tất cả trạng thái');
    fireEvent.keyDown(listbox, { key: 'ArrowUp' });
    expectActive('Chưa phân tích');
    fireEvent.keyDown(listbox, { key: 'ArrowUp' });
    expectActive('Cần duyệt Business Rule');
    fireEvent.keyDown(listbox, { key: ' ' });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('BR_PENDING_REVIEW');
  });

  it('closes on Tab, outside pointer and focus leaving the filter without selecting', () => {
    const onChange = vi.fn();
    render(<><StatusFilter value="ALL" onChange={onChange} counts={{}} total={0} /><button>Outside</button></>);
    const trigger = screen.getByTestId('project-status-filter');
    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole('listbox'), { key: 'Tab' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    fireEvent.click(trigger);
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Outside' }));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    fireEvent.click(trigger);
    fireEvent.blur(screen.getByRole('listbox'), { relatedTarget: screen.getByRole('button', { name: 'Outside' }) });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it.each(['vi', 'en'])('uses the same option labels as StatusBadge in %s', (language) => {
    localStorage.setItem('greytest.language', language);
    const statuses = Object.keys(STATUS_CONFIG) as ProjectStatus[];
    const counts = Object.fromEntries(statuses.map((status) => [status, 1]));
    render(<LanguageProvider>
      <StatusFilter value="ALL" onChange={vi.fn()} counts={counts} total={statuses.length} />
      <div data-testid="badges">{statuses.map((status) => <StatusBadge key={status} status={status} />)}</div>
    </LanguageProvider>);
    const trigger = screen.getByTestId('project-status-filter');
    expect(trigger).toHaveAccessibleName(language === 'vi' ? 'Lọc trạng thái: Tất cả trạng thái' : 'Filter by status: All statuses');
    fireEvent.click(trigger);
    for (const badge of within(screen.getByTestId('badges')).getAllByText(/./)) {
      expect(screen.getByRole('option', { name: badge.textContent! })).toBeVisible();
    }
    expect(screen.getAllByRole('option')).toHaveLength(statuses.length + 1);
  });
});
