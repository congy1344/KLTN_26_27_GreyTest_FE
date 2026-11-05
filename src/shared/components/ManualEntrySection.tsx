import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight, PlusCircle } from 'lucide-react';

/** Ô tự nhập mặc định thu gọn để danh sách kết quả là nội dung chính của trang. */
export function ManualEntrySection({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const Icon = open ? ChevronDown : ChevronRight;
  return (
    <div className="mb-4 rounded-default border border-border-default bg-neutral-secondary-soft">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-heading"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Icon size={14} className="shrink-0 text-body-subtle" />
        <PlusCircle size={14} className="shrink-0 text-fg-brand-strong" />
        {title}
      </button>
      {open && <div className="border-t border-border-default p-3">{children}</div>}
    </div>
  );
}
