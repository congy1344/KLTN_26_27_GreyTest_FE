import { useState } from 'react';
import { ChevronDown, ChevronUp, History, Eye, Clock } from 'lucide-react';
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

const TECHNICAL_KEYS = new Set([
  'id',
  'projectId',
  'methodId',
  'testPlanId',
  'testCaseId',
  'businessRuleId',
  'createdAt',
  'updatedAt',
  'version',
  'userRevision',
  'status',
  'reviewStatus',
  'targetId',
  'sourceUpdateId',
  'ownerUserId',
  'sourceAvailable',
  'deleted',
  'planId',
  'plan',
  'isModified',
  'generationType',
  'existingTestFilePath',
  'packageName',
  'traceSource',
  'coveredRuleIds',
  'sourceBranchId',
  'testData',
  'caseId',
  'ruleId',
  'testId',
]);

const TARGET_MEANINGFUL_FIELDS: Record<string, string[]> = {
  BUSINESS_RULE: ['ruleCode', 'description', 'condition', 'expectedResult', 'category'],
  TEST_PLAN: ['planCode', 'title', 'name', 'description', 'testType', 'objective', 'scope'],
  TEST_CASE: ['caseCode', 'testCode', 'title', 'description', 'testType', 'priority', 'preconditions', 'preCondition', 'steps', 'expectedResult'],
  UNIT_TEST: ['testClassName', 'testMethodName', 'filePath', 'sourceCode', 'testSourceCode', 'code'],
  METHOD: ['sourceCode', 'code'],
};

const FIELD_LABELS: Record<string, { vi: string; en: string }> = {
  ruleCode: { vi: 'Mã quy tắc', en: 'Rule code' },
  planCode: { vi: 'Mã kế hoạch', en: 'Plan code' },
  caseCode: { vi: 'Mã test case', en: 'Case code' },
  testCode: { vi: 'Mã kiểm thử', en: 'Test code' },
  name: { vi: 'Tên', en: 'Name' },
  title: { vi: 'Tiêu đề', en: 'Title' },
  description: { vi: 'Mô tả', en: 'Description' },
  preconditions: { vi: 'Tiền điều kiện', en: 'Pre-conditions' },
  preCondition: { vi: 'Tiền điều kiện', en: 'Pre-condition' },
  steps: { vi: 'Các bước thực hiện', en: 'Steps' },
  expectedResult: { vi: 'Kết quả kỳ vọng', en: 'Expected result' },
  condition: { vi: 'Điều kiện', en: 'Condition' },
  testType: { vi: 'Loại kiểm thử', en: 'Test type' },
  priority: { vi: 'Mức ưu tiên', en: 'Priority' },
  objective: { vi: 'Mục tiêu', en: 'Objective' },
  scope: { vi: 'Phạm vi', en: 'Scope' },
  category: { vi: 'Phân loại', en: 'Category' },
  testClassName: { vi: 'Class kiểm thử', en: 'Test class' },
  testMethodName: { vi: 'Method kiểm thử', en: 'Test method' },
  filePath: { vi: 'File kiểm thử', en: 'Test file' },
  sourceCode: { vi: 'Mã nguồn kiểm thử', en: 'Test source code' },
  testSourceCode: { vi: 'Mã nguồn kiểm thử', en: 'Test source code' },
  code: { vi: 'Mã nguồn', en: 'Source code' },
};

function toCamelCase(str: string): string {
  return str.replace(/_([a-z0-9])/gi, (_, letter) => letter.toUpperCase());
}

function formatTargetKey(key: string, t: (vi: string, en: string) => string): string {
  if (key.startsWith('case:')) {
    return `${t('Test Case', 'Test Case')} #${key.slice(5)}`;
  }
  if (key.startsWith('plan:')) {
    return `${t('Test Plan', 'Test Plan')} #${key.slice(5)}`;
  }
  if (key.startsWith('rule:')) {
    return `${t('Quy tắc', 'Rule')} #${key.slice(5)}`;
  }
  return key;
}

interface ParsedContent {
  isJson: boolean;
  fields?: Record<string, unknown>;
  codeText?: string;
}

function parseItemContent(raw: string | null | undefined, targetType?: string): ParsedContent | null {
  if (!raw || !raw.trim()) return null;
  const trimmed = raw.trim();
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      const parsed = JSON.parse(trimmed);
      let objToClean: Record<string, unknown> | null = null;
      if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed)) {
          if (parsed.length > 0 && typeof parsed[0] === 'object' && !Array.isArray(parsed[0])) {
            objToClean = parsed[0] as Record<string, unknown>;
          }
        } else {
          const { plan, ...rest } = parsed as Record<string, unknown>;
          objToClean = (plan && typeof plan === 'object' && !Array.isArray(plan))
            ? { ...(plan as Record<string, unknown>), ...rest }
            : (parsed as Record<string, unknown>);
        }
      }

      if (objToClean) {
        const allowedKeys = targetType && TARGET_MEANINGFUL_FIELDS[targetType]
          ? new Set(TARGET_MEANINGFUL_FIELDS[targetType].map(toCamelCase))
          : null;

        const cleaned: Record<string, unknown> = {};
        for (const [rawKey, val] of Object.entries(objToClean)) {
          const camelKey = toCamelCase(rawKey);
          if (TECHNICAL_KEYS.has(camelKey) || TECHNICAL_KEYS.has(rawKey)) continue;
          if (allowedKeys ? !allowedKeys.has(camelKey) : false) continue;
          if (val === null || val === undefined || val === '') continue;
          cleaned[camelKey] = val;
        }
        return { isJson: true, fields: cleaned };
      }
    } catch {
      // Not JSON, treat as raw code
    }
  }
  return { isJson: false, codeText: raw };
}

function renderFields(
  parsed: ParsedContent | null,
  mode: 'RED' | 'GREEN',
  language: string,
  keysToRender?: string[],
) {
  if (!parsed) {
    return <p className="italic text-xs text-body-subtle">Không có dữ liệu</p>;
  }

  const isRed = mode === 'RED';
  if (!parsed.isJson) {
    return (
      <pre
        className={`max-h-60 max-w-full overflow-x-auto whitespace-pre-wrap break-words break-all [overflow-wrap:anywhere] rounded p-2.5 font-mono text-[11px] ${
          isRed
            ? 'border border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-200'
            : 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200'
        }`}
      >
        <code>{parsed.codeText}</code>
      </pre>
    );
  }

  const fields = parsed.fields || {};
  const candidateKeys = keysToRender !== undefined ? keysToRender : Object.keys(fields);
  const activeKeys = candidateKeys.filter((key) => fields[key] !== undefined && fields[key] !== null);

  if (activeKeys.length === 0) {
    const isOneSided = keysToRender !== undefined && keysToRender.length > 0;
    return (
      <p className="italic text-xs text-body-subtle">
        {isOneSided
          ? (isRed
            ? (language === 'vi' ? '(Chưa có trước cập nhật)' : '(None prior to this update)')
            : (language === 'vi' ? '(Không có sau cập nhật)' : '(None after this update)'))
          : (language === 'vi' ? 'Không có nội dung thay đổi' : 'No changes')}
      </p>
    );
  }

  return (
    <div className="min-w-0 space-y-2">
      {activeKeys.map((key) => {
        const val = fields[key];
        const labelObj = FIELD_LABELS[key];
        const label = labelObj ? (language === 'vi' ? labelObj.vi : labelObj.en) : key;
        const isCodeField = key === 'testSourceCode' || key === 'code' || key === 'sourceCode';

        return (
          <div key={key} className="min-w-0 space-y-1">
            <span
              className={`inline-block font-semibold text-[11px] ${
                isRed ? 'text-rose-700 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'
              }`}
            >
              {label}:
            </span>
            {isCodeField ? (
              <pre
                className={`max-h-60 max-w-full overflow-x-auto whitespace-pre-wrap break-words break-all [overflow-wrap:anywhere] rounded p-2 font-mono text-[11px] ${
                  isRed
                    ? 'border border-rose-500/20 bg-rose-500/10 text-rose-800 dark:text-rose-200'
                    : 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200'
                }`}
              >
                <code>{String(val)}</code>
              </pre>
            ) : Array.isArray(val) ? (
              <ol
                className={`list-decimal pl-4 space-y-0.5 text-xs min-w-0 rounded p-2 ${
                  isRed
                    ? 'border border-rose-500/20 bg-rose-500/10 text-rose-800 dark:text-rose-200'
                    : 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200'
                }`}
              >
                {val.map((item, idx) => (
                  <li key={idx} className="min-w-0 break-words break-all [overflow-wrap:anywhere] whitespace-pre-wrap">
                    {typeof item === 'object' ? JSON.stringify(item) : String(item)}
                  </li>
                ))}
              </ol>
            ) : typeof val === 'object' && val !== null ? (
              <pre
                className={`max-h-48 max-w-full overflow-x-auto whitespace-pre-wrap break-words break-all [overflow-wrap:anywhere] rounded p-2 font-mono text-[11px] ${
                  isRed
                    ? 'border border-rose-500/20 bg-rose-500/10 text-rose-800 dark:text-rose-200'
                    : 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200'
                }`}
              >
                <code>{JSON.stringify(val, null, 2)}</code>
              </pre>
            ) : (
              <div
                className={`min-w-0 rounded p-2 text-xs leading-relaxed break-words break-all [overflow-wrap:anywhere] whitespace-pre-wrap ${
                  isRed
                    ? 'border border-rose-500/20 bg-rose-500/10 text-rose-800 dark:text-rose-200 line-through decoration-rose-400/50'
                    : 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 font-medium'
                }`}
              >
                {String(val)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function renderItemDiff(item: SourceUpdateItemDto, t: (vi: string, en: string) => string, language: string) {
  const isCreate = item.action === 'CREATE';
  const isRemove = item.action === 'REMOVE';

  // Với CREATE: payload có thể ở afterData hoặc trước đó backend lưu vào beforeData
  const createRaw = item.afterData || item.beforeData;
  const removeRaw = item.beforeData || item.afterData;

  if (isCreate) {
    const afterParsed = parseItemContent(createRaw, item.targetType);
    return (
      <div className="mt-2.5 min-w-0 space-y-2">
        {item.targetKey && (
          <div className="flex items-center gap-1.5 text-xs text-body-subtle">
            <span className="font-semibold text-heading">{t('Mục tiêu', 'Target')}:</span>
            <span className="rounded-md bg-neutral-secondary-soft px-1.5 py-0.5 font-mono font-medium text-heading break-all">
              {formatTargetKey(item.targetKey, t)}
            </span>
          </div>
        )}
        <div className="grid min-w-0 gap-3 lg:grid-cols-2">
          <div className="min-w-0 overflow-hidden rounded-xl border border-border-default-subtle/70 bg-neutral-secondary-soft/50 p-3">
            <div className="flex items-center gap-1.5 font-semibold text-xs text-body-subtle mb-2">
              <span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-neutral-600" />
              <span>{t('Trước cập nhật', 'Before')}</span>
            </div>
            <p className="italic text-xs text-body-subtle">
              {t('(Chưa có trước khi cập nhật)', '(None prior to this update)')}
            </p>
          </div>

          <div className="min-w-0 overflow-hidden rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
            <div className="flex items-center justify-between gap-1.5 mb-2">
              <div className="flex items-center gap-1.5 font-semibold text-xs text-emerald-700 dark:text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>{t('Sau cập nhật', 'After')}</span>
                <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold">
                  + {t('Đã thêm mới', 'Added')}
                </span>
              </div>
            </div>
            {renderFields(afterParsed, 'GREEN', language)}
          </div>
        </div>
      </div>
    );
  }

  if (isRemove) {
    const beforeParsed = parseItemContent(removeRaw, item.targetType);
    return (
      <div className="mt-2.5 min-w-0 space-y-2">
        {item.targetKey && (
          <div className="flex items-center gap-1.5 text-xs text-body-subtle">
            <span className="font-semibold text-heading">{t('Mục tiêu', 'Target')}:</span>
            <span className="rounded-md bg-neutral-secondary-soft px-1.5 py-0.5 font-mono font-medium text-heading break-all">
              {formatTargetKey(item.targetKey, t)}
            </span>
          </div>
        )}
        <div className="min-w-0 overflow-hidden rounded-xl border border-rose-500/20 bg-rose-500/5 p-3">
          <div className="flex items-center justify-between gap-1.5 mb-2">
            <div className="flex items-center gap-1.5 font-semibold text-xs text-rose-700 dark:text-rose-400">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              <span>{t('Trước cập nhật', 'Before')}</span>
              <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold">
                - {t('Đã xóa', 'Removed')}
              </span>
            </div>
          </div>
          {renderFields(beforeParsed, 'RED', language)}
        </div>
      </div>
    );
  }

  // UPDATE
  const beforeParsed = parseItemContent(item.beforeData, item.targetType);
  const afterParsed = parseItemContent(item.afterData, item.targetType);

  let changedKeys: string[] | undefined;
  let unchangedIdentifier: { key: string; val: unknown } | null = null;

  if (beforeParsed?.isJson && afterParsed?.isJson) {
    const bFields = beforeParsed.fields || {};
    const aFields = afterParsed.fields || {};
    const allKeys = Array.from(new Set([...Object.keys(bFields), ...Object.keys(aFields)]));
    changedKeys = allKeys.filter((k) => JSON.stringify(bFields[k]) !== JSON.stringify(aFields[k]));

    // Tìm trường định danh không đổi (như caseCode, planCode, ruleCode, testCode, testClassName, title, name) để làm tiêu đề ngữ cảnh
    for (const idKey of ['caseCode', 'planCode', 'ruleCode', 'testCode', 'testClassName', 'title', 'name']) {
      if (bFields[idKey] && bFields[idKey] === aFields[idKey] && !changedKeys.includes(idKey)) {
        unchangedIdentifier = { key: idKey, val: bFields[idKey] };
        break;
      }
    }
  }

  return (
    <div className="mt-2.5 min-w-0 space-y-2">
      {item.targetKey && !unchangedIdentifier && (
        <div className="flex items-center gap-1.5 text-xs text-body-subtle">
          <span className="font-semibold text-heading">{t('Mục tiêu', 'Target')}:</span>
          <span className="rounded-md bg-neutral-secondary-soft px-1.5 py-0.5 font-mono font-medium text-heading break-all">
            {formatTargetKey(item.targetKey, t)}
          </span>
        </div>
      )}
      {unchangedIdentifier && (
        <div className="flex items-center gap-1.5 text-xs text-body-subtle">
          <span className="font-semibold text-heading">
            {FIELD_LABELS[unchangedIdentifier.key]?.[language === 'vi' ? 'vi' : 'en'] || unchangedIdentifier.key}:
          </span>
          <span className="rounded-md bg-neutral-secondary-soft px-1.5 py-0.5 font-mono font-medium text-heading break-all">
            {String(unchangedIdentifier.val)}
          </span>
        </div>
      )}
      <div className="grid min-w-0 gap-3 lg:grid-cols-2">
        <div className="min-w-0 overflow-hidden rounded-xl border border-rose-500/20 bg-rose-500/5 p-3">
          <div className="flex items-center justify-between gap-1.5 mb-2">
            <div className="flex items-center gap-1.5 font-semibold text-xs text-rose-700 dark:text-rose-400">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              <span>{t('Trước cập nhật', 'Before')}</span>
              <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold">
                - {t('Giá trị cũ', 'Old value')}
              </span>
            </div>
          </div>
          {renderFields(beforeParsed, 'RED', language, changedKeys)}
        </div>

        <div className="min-w-0 overflow-hidden rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
          <div className="flex items-center justify-between gap-1.5 mb-2">
            <div className="flex items-center gap-1.5 font-semibold text-xs text-emerald-700 dark:text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>{t('Sau cập nhật', 'After')}</span>
              <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold">
                + {t('Giá trị mới', 'New value')}
              </span>
            </div>
          </div>
          {renderFields(afterParsed, 'GREEN', language, changedKeys)}
        </div>
      </div>
    </div>
  );
}

function readImpact(value: string | null): ImpactSummaryDto | null {
  try { return value ? JSON.parse(value) : null; } catch { return null; }
}

function appliedItems(update: SourceUpdateDto) {
  return (update.items ?? []).filter((item) => (item.reviewStatus === 'ACCEPTED' || item.reviewStatus === 'MODIFIED')
    && item.targetType !== 'METHOD'
    && ['CREATE', 'UPDATE', 'REMOVE'].includes(item.action)
    && (item.action === 'REMOVE' ? item.targetId != null : item.targetId != null || item.afterData != null));
}

function updateTime(update: SourceUpdateDto) {
  const value = parseApiDate(update.updatedAt || update.createdAt).getTime();
  return Number.isNaN(value) ? 0 : value;
}

function itemLabel(item: SourceUpdateItemDto) {
  return TARGET_LABELS[item.targetType] || item.targetType;
}

/** Định dạng số giây thực thi (giây -> Xs hoặc Xm Ys). */
function formatDuration(totalSeconds: number): string {
  if (totalSeconds < 0) totalSeconds = 0;
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs.toString().padStart(2, '0')}s`;
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
    { value: 'CREATE', label: t('Đã thêm', 'Added'), style: 'border-emerald-500/20 bg-emerald-500/[0.03] text-emerald-700 dark:text-emerald-400' },
    { value: 'UPDATE', label: t('Đã sửa', 'Modified'), style: 'border-amber-500/20 bg-amber-500/[0.03] text-amber-700 dark:text-amber-400' },
    { value: 'REMOVE', label: t('Đã xóa', 'Deleted'), style: 'border-rose-500/20 bg-rose-500/[0.03] text-rose-700 dark:text-rose-400' },
  ];

  return (
    <section aria-label={t('Lịch sử cập nhật', 'Update history')} className="rounded-xl border border-border-default/80 bg-neutral-primary-soft p-4 shadow-2xs">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}
        className="flex w-full items-center gap-2 text-left text-sm font-semibold text-heading cursor-pointer">
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
              <article key={update.id} className="min-w-0 overflow-hidden rounded-xl border border-border-default/70 bg-neutral-primary/40 p-3.5 transition-colors">
                <button type="button" aria-expanded={expanded} onClick={() => { setExpandedUpdate(expanded ? null : update.id); setExpandedItem(null); }}
                  className="flex w-full flex-wrap items-center justify-between gap-2 text-left cursor-pointer">
                  <span className="text-sm font-semibold text-heading">{t('Bản cập nhật', 'Update')} #{update.id}</span>
                  <time className="text-xs text-body-subtle" dateTime={update.updatedAt || update.createdAt}>
                    {updateTime(update) ? new Date(updateTime(update)).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US') : '—'}
                  </time>
                  {update.createdAt && update.updatedAt && (() => {
                    const durationSec = Math.max(0, Math.round((parseApiDate(update.updatedAt).getTime() - parseApiDate(update.createdAt).getTime()) / 1000));
                    if (!Number.isFinite(durationSec) || durationSec <= 0) return null;
                    return (
                      <span className="inline-flex items-center gap-1 rounded bg-neutral-secondary-soft px-2 py-0.5 text-xs font-medium text-body-subtle" title={t('Tổng thời gian thực hiện', 'Total execution time')}>
                        <Clock size={11} className="text-fg-brand opacity-80" />
                        <span>{t('Tổng thời gian', 'Total time')}: {formatDuration(durationSec)}</span>
                      </span>
                    );
                  })()}
                  <span className="flex flex-wrap gap-2 text-xs">
                    {actions.map((action) => <span key={action.value} className={`rounded-md border px-2 py-0.5 font-medium ${action.style}`}>
                      {action.label}: {items.filter((item) => item.action === action.value).length}
                    </span>)}
                  </span>
                </button>
                {scope.projectWide && <p className="mt-2 text-xs text-body-subtle">{t('Phạm vi: toàn project', 'Scope: entire project')}</p>}
                {expanded && <div className="mt-3.5 space-y-3 min-w-0">
                  {actions.map((action) => {
                    const group = items.filter((item) => item.action === action.value);
                    return <section key={action.value} className={`min-w-0 overflow-hidden rounded-xl border p-3.5 ${action.style}`}>
                      <h4 className="text-xs font-semibold mb-1">{action.label} ({group.length})</h4>
                      {group.map((item) => <div key={item.id} className="mt-2 min-w-0 overflow-hidden rounded-xl border border-border-default-subtle/80 bg-neutral-primary-soft p-3.5 shadow-2xs transition-colors hover:border-border-default">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="break-words font-semibold text-heading text-sm">{itemLabel(item)}</p>
                        </div>
                        {item.reason && (
                          <p className="mt-1 text-xs text-body-subtle break-words [overflow-wrap:anywhere]">
                            {item.reason}
                          </p>
                        )}
                        {(item.beforeData || item.afterData) && (
                          <button
                            type="button"
                            aria-expanded={expandedItem === item.id}
                            onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                            className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-brand/20 bg-brand/5 px-2.5 py-1 text-xs font-semibold text-fg-brand-strong hover:bg-brand/10 transition-colors cursor-pointer"
                          >
                            <Eye size={13} />
                            <span>{t('Xem nội dung trước/sau', 'View before/after')}</span>
                            {expandedItem === item.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          </button>
                        )}
                        {expandedItem === item.id && renderItemDiff(item, t, language)}
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
