import type { ReactNode } from 'react';
import { Trash2 } from 'lucide-react';
import { useLanguage } from '../i18n/language';
import { Tag } from './Tag';

/**
 * Khối "… đã xóa" dùng chung cho mọi trang (BR, Test Plan, Test Case, Unit Test, method):
 * tách khỏi danh sách hiện hành, gập/mở được, màu trung tính để không lấn át các mục còn hiệu lực.
 */
export function DeletedItemsSection({ title, count, hint, extra, children }: {
  title: string; count: number; hint?: string; extra?: ReactNode; children: ReactNode;
}) {
  return (
    <section aria-label={title} className="mt-4 rounded-base border border-border-default bg-neutral-primary-soft">
      <details open className="group">
        <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 px-4 py-3 [&::-webkit-details-marker]:hidden">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-danger-soft text-fg-danger-strong">
            <Trash2 size={13} aria-hidden="true" />
          </span>
          <h2 className="text-sm font-semibold text-heading">{title}</h2>
          <span className="rounded-full bg-neutral-secondary-medium px-2 py-0.5 font-mono text-xs tabular-nums text-body">{count}</span>
          {extra}
          <span aria-hidden="true" className="ml-auto text-xs text-body-subtle transition-transform group-open:rotate-180">▾</span>
        </summary>
        <div className="space-y-2 border-t border-border-default px-4 pb-4 pt-3">
          {hint && <p className="text-xs text-body-subtle">{hint}</p>}
          {children}
        </div>
      </details>
    </section>
  );
}

/** Một mục đã xóa: mã gạch ngang, mô tả cũ và lý do xóa. */
export function DeletedItemCard({ code, text, reason }: { code: string; text?: string; reason?: string }) {
  const { t } = useLanguage();
  return (
    <article className="rounded-base border border-dashed border-border-default-strong bg-neutral-secondary-soft px-3.5 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="break-all font-mono text-xs font-semibold text-body-subtle line-through decoration-danger/70">{code}</span>
        <DeletedTag />
      </div>
      {text && <p className="mt-1.5 text-sm text-body">{text}</p>}
      {reason && <p className="mt-1 text-xs text-body-subtle"><span className="font-semibold">{t('Lý do: ', 'Reason: ')}</span>{reason}</p>}
    </article>
  );
}

/** Nhãn "Đã xóa" thống nhất cho mọi dòng/thẻ thuộc phần đã bị xóa. */
export function DeletedTag() {
  const { t } = useLanguage();
  return <Tag variant="status" tone="danger" icon={Trash2}>{t('Đã xóa', 'Deleted')}</Tag>;
}
