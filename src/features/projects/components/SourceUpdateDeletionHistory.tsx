import { DeletedItemCard, DeletedItemsSection } from '../../../shared/components/DeletedItems';
import { useLanguage } from '../../../shared/i18n/language';
import type { ImpactSummaryDto, SourceUpdateDto, SourceUpdateItemDto } from '../types';
import { sourceUpdateHistoryScope } from '../utils/source-update-history';

type HistoryTarget = 'BUSINESS_RULE' | 'TEST_PLAN' | 'TEST_CASE' | 'UNIT_TEST';
const LABELS: Record<HistoryTarget, string> = {
  BUSINESS_RULE: 'Business Rule', TEST_PLAN: 'Test Plan', TEST_CASE: 'Test Case', UNIT_TEST: 'Unit Test',
};

interface SourceUpdateDeletionHistoryProps {
  update?: SourceUpdateDto;
  impact: ImpactSummaryDto | null;
  targetType: HistoryTarget;
  currentIds: number[];
  servicePath?: string;
}

/** Mã và mô tả lưu lúc xóa (beforeData); bản cập nhật cũ không có thì dùng nhãn + ID. */
function removedSnapshot(item: SourceUpdateItemDto, label: string) {
  let data: Record<string, unknown> = {};
  try { data = item.beforeData ? JSON.parse(item.beforeData) : {}; } catch { /* beforeData cũ có thể là source thô. */ }
  const str = (key: string) => (typeof data[key] === 'string' && data[key] ? data[key] as string : undefined);
  const unitTest = str('testClassName') && str('testMethodName') ? `${str('testClassName')}.${str('testMethodName')}` : undefined;
  return {
    code: str('ruleCode') ?? str('planCode') ?? str('caseCode') ?? unitTest ?? `${label} #${item.targetId}`,
    text: str('description') ?? str('title'),
  };
}

/** Hiển thị artifact đã xóa khi áp dụng source mới, tách khỏi danh sách artifact hiện hành. */
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
    <DeletedItemsSection title={t(`${label} đã xóa`, `Deleted ${label}s`)} count={removed.length}
      hint={t('Thuộc method bị sửa hoặc bị xóa trong lần cập nhật source gần nhất.', 'From methods modified or deleted in the latest source update.')}
      extra={scope.projectWide && <span className="text-xs text-body-subtle">{t('Phạm vi: toàn dự án', 'Scope: entire project')}</span>}>
      {removed.map((item) => {
        const snapshot = removedSnapshot(item, label);
        return <DeletedItemCard key={item.id} code={snapshot.code} text={snapshot.text} reason={item.reason ?? undefined} />;
      })}
    </DeletedItemsSection>
  );
}
