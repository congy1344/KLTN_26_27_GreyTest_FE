import { useEffect, useId, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Hộp xác nhận dùng chung, thay cho confirm mặc định của trình duyệt. */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  pending = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    }
    if (!open && dialog.open) {
      if (typeof dialog.close === 'function') dialog.close();
      else dialog.removeAttribute('open');
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className="m-auto w-[min(92vw,460px)] rounded-base border border-border-default bg-neutral-primary-soft p-0 text-body shadow-xl backdrop:bg-neutral-primary/80 backdrop:backdrop-blur-sm"
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onCancel();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current && !pending) onCancel();
      }}
    >
      <div className="p-5 md:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-default bg-danger-soft text-fg-danger-strong">
            <AlertTriangle size={18} strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <h2 id={titleId} className="text-base font-semibold text-heading">{title}</h2>
            <p id={descriptionId} className="mt-1.5 text-sm leading-relaxed text-body-subtle">{description}</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn btn-secondary" disabled={pending} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className="btn-ghost-danger border border-border-danger-subtle px-4 py-2" disabled={pending} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
