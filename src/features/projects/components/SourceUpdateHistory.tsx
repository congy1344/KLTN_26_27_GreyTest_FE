import { useState } from 'react';
import { ChevronDown, ChevronUp, History } from 'lucide-react';
import { useLanguage } from '../../../shared/i18n/language';
import { parseApiDate } from '../../../shared/utils/date-time';
import type { ImpactSummaryDto, SourceUpdateDto, SourceUpdateItemDto } from '../types';
import { sourceUpdateHistoryScope } from '../utils/source-update-history';

interface SourceUpdateHistoryProps {
  updates: SourceUpdateDto[];
  loading: boolean;
  error: string | null;
  servicePath?: string | null;
}

const TARGET_LABELS = { METHOD: 'Method', BUSINESS_RULE: 'Business Rule', TEST_PLAN: 'Test Plan', TEST_CASE: 'Test Case', UNIT_TEST: 'Unit Test' };

function readImpact(value: string | null): ImpactSummaryDto | null {
  try { return value ? JSON.parse(value) : null; } catch { return null; }
}

function appliedItems(update: SourceUpdateDto) {
  return update.items.filter((item) => (item.reviewStatus === 'ACCEPTED' || item.reviewStatus === 'MODIFIED')
    && ['CREATE', 'UPDATE', 'REMOVE'].includes(item.action)
    && (item.targetType === 'METHOD' ? Boolean(item.targetKey)
      : item.action === 'REMOVE' ? item.targetId != null : item.targetId != null || item.afterData != null));
}

function updateTime(update: SourceUpdateDto) {
  const value = parseApiDate(update.updatedAt || update.createdAt).getTime();
  return Number.isNaN(value) ? 0 : value;
}

function content(value: string) {
  try { return JSON.stringify(JSON.parse(value), null, 2); } catch { return value; }
}

function itemLabel(item: SourceUpdateItemDto) {
  return item.targetType === 'METHOD' ? item.targetKey
    : `${TARGET_LABELS[item.targetType]}${item.targetId != null ? ` #${item.targetId}` : ''}`;
}

/** Tra cứu các thay đổi đã áp dụng, độc lập với thao tác upload/sinh/duyệt bản nháp. */
export function SourceUpdateHistory({ updates, loading, error, servicePath }: SourceUpdateHistoryProps) {
  const { t, language } = useLanguage();
  const [open, setOpen] = useState(false);
  const [expandedUpdate, setExpandedUpdate] = useState<number | null>(null);
  const [expandedItem, setExpandedItem] = useState<number | null>(null);
  const records = updates.filter((update) => update.status === 'APPLIED')
    .map((update) => ({ update, scope: sourceUpdateHistoryScope(readImpact(update.impactSummary), servicePath), items: appliedItems(update) }))
    .filter((record) => record.scope.visible)
    .sort((a, b) => updateTime(b.update) - updateTime(a.update) || b.update.id - a.update.id);
  const actions = [
    { value: 'CREATE', label: t('Đã thêm', 'Added'), style: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400' },
    { value: 'UPDATE', label: t('Đã sửa', 'Modified'), style: 'border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400' },
    { value: 'REMOVE', label: t('Đã xóa', 'Deleted'), style: 'border-rose-500/30 bg-rose-500/5 text-rose-700 dark:text-rose-400' },
  ];

  return (
    <section aria-label={t('Lịch sử cập nhật', 'Update history')} className="rounded-lg border border-border-default bg-neutral-primary-soft p-4">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}
        className="flex w-full items-center gap-2 text-left text-sm font-semibold text-heading">
        <History size={17} className="text-fg-brand-strong" />
        <span className="flex-1">{t('Lịch sử cập nhật', 'Update history')} ({records.length})</span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {loading && <p role="status" className="mt-2 text-xs text-body-subtle">{t('Đang tải lịch sử...', 'Loading history...')}</p>}
      {error && <p role="alert" className="mt-2 text-xs text-rose-600">{error}</p>}
      {open && !loading && !error && (
        <div className="mt-3 max-h-96 space-y-3 overflow-y-auto">
          {records.length === 0 && <p className="text-xs text-body-subtle">{t('Chưa có bản cập nhật đã áp dụng.', 'No applied updates yet.')}</p>}
          {records.map(({ update, scope, items }) => {
            const expanded = expandedUpdate === update.id;
            return (
              <article key={update.id} className="rounded-lg border border-border-default p-3">
                <button type="button" aria-expanded={expanded} onClick={() => { setExpandedUpdate(expanded ? null : update.id); setExpandedItem(null); }}
                  className="flex w-full flex-wrap items-center justify-between gap-2 text-left">
                  <span className="text-sm font-semibold text-heading">{t('Bản cập nhật', 'Update')} #{update.id}</span>
                  <time className="text-xs text-body-subtle" dateTime={update.updatedAt || update.createdAt}>
                    {updateTime(update) ? new Date(updateTime(update)).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US') : '—'}
                  </time>
                  <span className="flex flex-wrap gap-2 text-xs">
                    {actions.map((action) => <span key={action.value} className={`rounded border px-2 py-0.5 ${action.style}`}>
                      {action.label}: {items.filter((item) => item.action === action.value).length}
                    </span>)}
                  </span>
                </button>
                {scope.projectWide && <p className="mt-2 text-xs text-body-subtle">{t('Phạm vi: toàn project', 'Scope: entire project')}</p>}
                {expanded && <div className="mt-3 space-y-3">
                  {actions.map((action) => {
                    const group = items.filter((item) => item.action === action.value);
                    return <section key={action.value} className={`rounded border p-3 ${action.style}`}>
                      <h4 className="text-xs font-semibold">{action.label} ({group.length})</h4>
                      {group.map((item) => <div key={item.id} className="mt-2 rounded border border-current/10 bg-neutral-primary-soft p-2 text-xs text-body">
                        <p className="break-words font-mono font-semibold text-heading">{itemLabel(item)}</p>
                        {item.reason && <p className="mt-1">{item.reason}</p>}
                        {(item.beforeData || item.afterData) && <button type="button" aria-expanded={expandedItem === item.id}
                          onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)} className="mt-2 text-fg-brand-strong underline">
                          {t('Xem nội dung trước/sau', 'View before/after')}
                        </button>}
                        {expandedItem === item.id && <div className="mt-2 grid gap-2 lg:grid-cols-2">
                          {[[t('Trước cập nhật', 'Before'), item.beforeData], [t('Sau cập nhật', 'After'), item.afterData]].map(([label, value]) => value && <div key={label}>
                            <p className="mb-1 font-semibold">{label}</p>
                            <pre className="max-h-60 overflow-auto whitespace-pre-wrap break-words rounded bg-neutral-secondary-soft p-2">{content(value)}</pre>
                          </div>)}
                        </div>}
                      </div>)}
                    </section>;
                  })}
                </div>}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
