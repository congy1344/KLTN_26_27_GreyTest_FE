import { useEffect, useId, useLayoutEffect, useRef, useState, type ButtonHTMLAttributes, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { useLanguage } from '../i18n/language';
import type { TagTone } from './Tag';

export interface SelectMenuOption<Value extends string = string> {
  value: Value;
  label: string;
  hint?: string;
  tone?: TagTone;
  group?: string;
  title?: string;
}

type SelectMenuProps<Value extends string> = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'value' | 'onChange' | 'children'> & {
  value: Value;
  onChange: (value: Value) => void;
  options: SelectMenuOption<Value>[];
  searchable?: boolean;
};

const DOT_CLASS: Record<TagTone, string> = {
  success: 'bg-fg-success-strong', warning: 'bg-fg-warning', danger: 'bg-fg-danger-strong',
  brand: 'bg-fg-brand-strong', neutral: 'bg-body-subtle',
};

/** Bộ chọn dùng chung: giữ giá trị có kiểm soát, hỗ trợ nhóm, bàn phím và trả focus khi đóng. */
export function SelectMenu<Value extends string>({ value, onChange, options: items, searchable = false, className = '', disabled, ...props }: SelectMenuProps<Value>) {
  const { t } = useLanguage();
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<{ left: number; top?: number; bottom?: number; width: number; maxHeight: number }>({ left: 0, top: 0, width: 0, maxHeight: 420 });
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const allGroups = [...new Set(items.map((option) => option.group))];
  const ordered = allGroups.flatMap((group) => items.filter((option) => option.group === group));
  const filtered = ordered.filter((option) => !searchable || option.label.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const groups = [...new Set(filtered.map((option) => option.group))];
  const options = filtered;
  const active = Math.min(activeIndex, Math.max(0, options.length - 1));
  const selected = items.find((option) => option.value === value);
  const expanded = open && !disabled && items.length > 0;

  useLayoutEffect(() => {
    if (!expanded) return;
    function positionMenu() {
      const rect = triggerRef.current!.getBoundingClientRect();
      const below = window.innerHeight - rect.bottom - 16;
      const above = rect.top - 16;
      const showAbove = below < 240 && above > below;
      const maxHeight = Math.max(0, Math.min(420, showAbove ? above : below));
      const width = Math.min(rect.width, window.innerWidth - 32);
      setMenuStyle({ left: Math.max(16, Math.min(rect.left, window.innerWidth - width - 16)),
        ...(showAbove ? { bottom: window.innerHeight - rect.top + 8 } : { top: rect.bottom + 8 }), width, maxHeight });
    }
    positionMenu();
    window.addEventListener('resize', positionMenu);
    window.addEventListener('scroll', positionMenu, true);
    return () => {
      window.removeEventListener('resize', positionMenu);
      window.removeEventListener('scroll', positionMenu, true);
    };
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return;
    if (searchable) searchRef.current?.focus();
    else listRef.current?.focus();
    function closeOutside(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node) && !menuRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [expanded, searchable]);

  useEffect(() => {
    if (expanded) document.getElementById(`${id}-option-${active}`)?.scrollIntoView?.({ block: 'nearest' });
  }, [expanded, active, id, query]);

  function openMenu() {
    setQuery('');
    setActiveIndex(Math.max(0, ordered.findIndex((option) => option.value === value)));
    setOpen(true);
  }

  function closeMenu() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  function selectOption(option: SelectMenuOption<Value>) {
    onChange(option.value);
    closeMenu();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    const fromSearch = event.target === searchRef.current;
    if (fromSearch && !['ArrowDown', 'ArrowUp', 'Enter', 'Escape', 'Tab'].includes(event.key)) return;
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        event.preventDefault();
        if (options.length) setActiveIndex((active + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length);
        break;
      case 'Home':
      case 'End':
        event.preventDefault();
        setActiveIndex(event.key === 'Home' ? 0 : options.length - 1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (options[active]) selectOption(options[active]);
        break;
      case 'Escape':
        event.preventDefault();
        event.stopPropagation();
        closeMenu();
        break;
      case 'Tab':
        // Trả focus về nút để Tab tiếp tục theo thứ tự của trang.
        closeMenu();
        break;
    }
  }

  function renderOption(option: SelectMenuOption<Value>, index: number) {
    return <div key={option.value} id={`${id}-option-${index}`} role="option" aria-selected={option.value === value} title={option.title}
      aria-label={option.label} onClick={() => selectOption(option)} onMouseMove={() => setActiveIndex(index)}
      className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-control px-3 py-2 text-sm ${option.value === value
        ? 'bg-brand-softer text-fg-brand-strong' : `text-heading hover:bg-neutral-secondary-soft ${active === index ? 'bg-neutral-secondary-soft' : ''}`}`}>
      {option.tone && <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${DOT_CLASS[option.tone]}`} />}
      <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{option.label}</span>
      {option.hint && <span className="text-xs text-body-subtle">{option.hint}</span>}
      <span aria-hidden="true" className="w-4 shrink-0">{option.value === value && <Check size={16} />}</span>
    </div>;
  }

  return <div ref={rootRef} className={`relative min-w-0 ${className}`}
    onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null) && !menuRef.current?.contains(event.relatedTarget as Node | null)) setOpen(false);
    }}>
    <button {...props} id={props.id ?? `${id}-trigger`} ref={triggerRef} type="button" disabled={disabled || items.length === 0}
      aria-haspopup="listbox" aria-expanded={expanded} aria-controls={`${id}-listbox`}
      onClick={() => expanded ? closeMenu() : openMenu()}
      onKeyDown={(event) => {
        if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
          event.preventDefault();
          openMenu();
        }
      }}
      className="form-input flex min-h-10 w-full items-center gap-2 rounded-control bg-neutral-primary-soft px-3 py-2 text-sm text-heading disabled:cursor-not-allowed">
      {selected?.tone && <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${DOT_CLASS[selected.tone]}`} />}
      <span className="min-w-0 flex-1 truncate text-left">{selected?.label ?? value}</span>
      <ChevronDown size={16} aria-hidden="true" className={`shrink-0 text-body-subtle transition-transform ${expanded ? 'rotate-180' : ''}`} />
    </button>
    {/* Portal tránh menu bị cắt bởi panel hoặc hộp thoại có overflow. */}
    {expanded && createPortal(<div ref={menuRef} style={menuStyle} className="fixed z-[60] flex min-w-0 flex-col overflow-hidden rounded-base border border-border-default bg-neutral-primary-soft p-1.5 shadow-lg">
      {searchable && <input ref={searchRef} type="search" className="form-input mb-2 shrink-0 text-sm"
        aria-label={t('Lọc nhanh lựa chọn', 'Filter options')} placeholder={t('Gõ để lọc...', 'Type to filter...')}
        role="combobox" aria-expanded={expanded} aria-controls={`${id}-listbox`}
        aria-activedescendant={options.length ? `${id}-option-${active}` : undefined}
        value={query} onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }} onKeyDown={handleKeyDown} />}
      <div ref={listRef} id={`${id}-listbox`} role="listbox" tabIndex={-1}
      aria-label={props['aria-label']} aria-labelledby={props['aria-labelledby'] ?? (props['aria-label'] ? undefined : props.id ?? `${id}-trigger`)} aria-activedescendant={options.length ? `${id}-option-${active}` : undefined}
      onKeyDown={handleKeyDown}
      className="min-h-0 overflow-y-auto focus:outline-none">
      {groups.map((group, index) => group === undefined
        ? options.map((option, optionIndex) => option.group === undefined ? renderOption(option, optionIndex) : null)
        : <div key={group} role="group" aria-labelledby={`${id}-group-${index}`}>
          <div id={`${id}-group-${index}`} className="px-3 pb-1 pt-3 text-xs font-semibold text-body-subtle">{group}</div>
          {options.map((option, optionIndex) => option.group === group ? renderOption(option, optionIndex) : null)}
        </div>)}
      </div>
      {options.length === 0 && <p role="status" className="px-3 py-2 text-sm text-body">{t('Không có lựa chọn phù hợp', 'No matching options')}</p>}
    </div>, document.body)}
  </div>;
}
