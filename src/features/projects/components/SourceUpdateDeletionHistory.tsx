import { Trash2 } from 'lucide-react';
import { Tag } from '../../../shared/components/Tag';
import { useLanguage } from '../../../shared/i18n/language';
import type { ImpactSummaryDto, SourceUpdateDto } from '../types';
import { sourceUpdateHistoryScope } from '../utils/source-update-history';

type HistoryTarget = 'TEST_PLAN' | 'TEST_CASE' | 'UNIT_TEST';
const LABELS: Record<HistoryTarget, string> = {
  TEST_PLAN: 'Test Plan', TEST_CASE: 'Test Case', UNIT_TEST: 'Unit Test',
};

interface SourceUpdateDeletionHistoryProps {
  update?: SourceUpdateDto;
  impact: ImpactSummaryDto | null;
  targetType: HistoryTarget;
  currentIds: number[];
  servicePath?: string;
}

/** Hiển thị lịch sử REMOVE sau Apply, tách khỏi danh sách artifact hiện hành. */
export function SourceUpdateDeletionHistory({ update, impact, targetType, currentIds, servicePath }: SourceUpdateDeletionHistoryProps) {
  const { t } = useLanguage();
  if (update?.status !== 'APPLIED') return null;

  const current = new Set(currentIds);
  const removed = (update.items ?? []).filter((item) => item.targetType === targetType && item.action === 'REMOVE'
    && (item.reviewStatus === 'ACCEPTED' || item.reviewStatus === 'MODIFIED')
    && item.targetId != null && !current.has(item.targetId));
  if (removed.length === 0) return null;

  const scope = sourceUpdateHistoryScope(impact, servicePath);
  if (!scope.visible) return null;
  const label = LABELS[targetType];

  return (
    <section aria-label={t(`${label} đã xóa`, `Deleted ${label}s`)} className="mt-4 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold text-fg-danger-strong dark:text-fg-danger-strong">
          {t(`${label} đã xóa`, `Deleted ${label}s`)} ({removed.length})
        </h2>
        {scope.projectWide && <span className="text-xs text-body-subtle">{t('Phạm vi: toàn dự án', 'Scope: entire project')}</span>}
      </div>
      <p className="text-xs text-body-subtle">{t('Lịch sử của bản cập nhật source đã áp dụng.', 'History from the applied source update.')}</p>
      {removed.map((item) => (
        <article key={item.id} className="rounded-base border-2 border-border-danger-subtle bg-danger/[0.04] p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-semibold text-fg-danger-strong line-through dark:text-fg-danger-strong">
              {label}{item.targetId != null ? ` #${item.targetId}` : ''}
            </span>
            <Tag variant="status" tone="danger" icon={Trash2}>{t('- Đã xóa', '- Deleted')}</Tag>
          </div>
          {item.reason && <p className="mt-1 text-xs text-body-subtle">{item.reason}</p>}
        </article>
      ))}
    </section>
  );
}
