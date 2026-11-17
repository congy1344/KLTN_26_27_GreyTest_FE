import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Check, ChevronDown, Filter } from 'lucide-react';
import { useLanguage } from '../../../shared/i18n/language';
import type { ProjectStatus } from '../types';
import { STATUS_CONFIG, type Tone } from './StatusBadge';

type FilterValue = 'ALL' | ProjectStatus;

interface StatusFilterProps {
  value: FilterValue;
  onChange: (value: FilterValue) => void;
  counts: Partial<Record<ProjectStatus, number>>;
  total: number;
}

const DOT_CLASS: Record<Tone, string> = {
  action: 'bg-fg-warning',
  next: 'bg-fg-brand-strong',
  done: 'bg-fg-success-strong',
  failed: 'bg-fg-danger-strong',
  idle: 'bg-body-subtle',
};

const GROUPS: { label: [string, string]; statuses: ProjectStatus[] }[] = [
  { label: ['Cần bạn duyệt', 'Needs your review'], statuses: ['BR_PENDING_REVIEW', 'PLAN_PENDING_REVIEW', 'CASE_PENDING_REVIEW'] },
  { label: ['Sẵn sàng bước tiếp', 'Ready for the next step'], statuses: ['ANALYZED', 'BR_APPROVED', 'PLAN_APPROVED', 'CASE_APPROVED', 'TEST_GENERATED', 'COVERAGE_ANALYZED'] },
  { label: ['Kết thúc', 'Finished'], statuses: ['COMPLETED', 'FAILED'] },
  { label: ['Chưa bắt đầu', 'Not started'], statuses: ['UPLOADED'] },
];

/**
 * Lọc dự án theo việc cần làm, dùng chung nhãn và màu với StatusBadge.
 * Hiển thị số lượng sau tìm kiếm và quản lý đóng/mở, focus, điều hướng bàn phím.
 */
export function StatusFilter({ value, onChange, counts, total }: StatusFilterProps) {
  const { t } = useLanguage();
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [activeValue, setActiveValue] = useState<FilterValue>(value);
  const groups = GROUPS.map((group) => ({
    ...group,
    statuses: group.statuses.filter((status) => (counts[status] ?? 0) > 0 || status === value),
  })).filter((group) => group.statuses.length > 0);
  const options: FilterValue[] = ['ALL', ...groups.flatMap((group) => group.statuses)];
  const active = options.includes(activeValue) ? activeValue : value;
  const label = value === 'ALL' ? t('Tất cả trạng thái', 'All statuses') : t(...STATUS_CONFIG[value].label);

  useEffect(() => {
    if (!open) return;
    listRef.current?.focus();
    function closeOutside(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [open]);

  useEffect(() => {
    // Giữ lựa chọn đang điều hướng trong vùng nhìn khi menu phải cuộn.
    if (open) document.getElementById(`${id}-${active}`)?.scrollIntoView?.({ block: 'nearest' });
  }, [open, active, id]);

  function openMenu() {
    setActiveValue(value);
    setOpen(true);
  }

  function closeMenu() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  function selectOption(option: FilterValue) {
    onChange(option);
    closeMenu();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = options.indexOf(active);
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        event.preventDefault();
        setActiveValue(options[(index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length]);
        break;
      case 'Home':
      case 'End':
        event.preventDefault();
        setActiveValue(options[event.key === 'Home' ? 0 : options.length - 1]);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        selectOption(active);
        break;
      case 'Escape':
        event.preventDefault();
        event.stopPropagation();
        closeMenu();
        break;
      case 'Tab':
        // Trả focus về nút trước khi trình duyệt chuyển sang phần tử kế tiếp.
        closeMenu();
        break;
    }
  }

  function renderOption(option: FilterValue) {
    const selected = option === value;
    const config = option === 'ALL' ? undefined : STATUS_CONFIG[option];
    return (
      <div key={option} id={`${id}-${option}`} role="option" aria-selected={selected}
        aria-label={config ? t(...config.label) : t('Tất cả trạng thái', 'All statuses')}
        onClick={() => selectOption(option)} onMouseMove={() => setActiveValue(option)}
        className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-control px-3 py-2 text-sm ${selected
          ? 'bg-brand-softer text-fg-brand-strong'
          : `text-heading hover:bg-neutral-secondary-soft ${active === option ? 'bg-neutral-secondary-soft' : ''}`}`}>
        {config && <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${DOT_CLASS[config.tone]}`} />}
        <span className="flex-1">{config ? t(...config.label) : t('Tất cả trạng thái', 'All statuses')}</span>
        <span className="font-mono text-xs tabular-nums text-body-subtle">{option === 'ALL' ? total : counts[option] ?? 0}</span>
        <span aria-hidden="true" className="w-4 shrink-0">{selected && <Check size={16} />}</span>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative w-full sm:w-[280px] sm:shrink-0"
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false); }}>
      <button ref={triggerRef} type="button" data-testid="project-status-filter"
        aria-haspopup="listbox" aria-expanded={open} aria-controls={`${id}-listbox`}
        aria-label={t(`Lọc trạng thái: ${label}`, `Filter by status: ${label}`)}
        onClick={() => open ? closeMenu() : openMenu()}
        onKeyDown={(event) => {
          if (['Enter', ' ', 'ArrowDown'].includes(event.key)) {
            event.preventDefault();
            openMenu();
          }
        }}
        className="flex h-10 w-full items-center gap-2 rounded-control border border-border-default bg-neutral-primary-soft px-3 text-sm text-heading transition-colors hover:border-border-default-strong">
        <Filter size={16} aria-hidden="true" className="shrink-0 text-body-subtle" />
        {value !== 'ALL' && <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${DOT_CLASS[STATUS_CONFIG[value].tone]}`} />}
        <span className="min-w-0 flex-1 truncate text-left">{label}</span>
        <ChevronDown size={16} aria-hidden="true" className={`shrink-0 text-body-subtle transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div ref={listRef} id={`${id}-listbox`} role="listbox" tabIndex={-1}
        aria-label={t('Lọc trạng thái', 'Filter by status')} aria-activedescendant={`${id}-${active}`}
        onKeyDown={handleKeyDown}
        className="absolute left-0 top-full z-50 mt-2 max-h-[min(420px,60vh)] w-full min-w-[280px] overflow-y-auto rounded-base bg-neutral-primary-soft p-1.5 shadow-lg focus:outline-none">
        {renderOption('ALL')}
        {groups.map((group, index) => <div key={group.label[1]} role="group" aria-labelledby={`${id}-group-${index}`}>
          <div id={`${id}-group-${index}`} className="px-3 pb-1 pt-3 text-xs font-semibold text-body-subtle">{t(...group.label)}</div>
          {group.statuses.map(renderOption)}
        </div>)}
      </div>}
    </div>
  );
}
