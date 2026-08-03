import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Search, TableProperties } from 'lucide-react';
import { EmptyState } from '../../../shared/components/EmptyState';
import { ErrorState } from '../../../shared/components/ErrorState';
import { LoadingState } from '../../../shared/components/LoadingState';
import { useLanguage } from '../../../shared/i18n/language';
import { useTraceability } from '../hooks/useTraceability';
import type { TraceabilityRow } from '../types';

/** Gom các dòng theo ruleCode, lọc theo từ khóa (match mọi cột). Export để test. */
export function groupRows(rows: TraceabilityRow[], search: string): Map<string, TraceabilityRow[]> {
  const keyword = search.trim().toLowerCase();
  const matches = (row: TraceabilityRow) =>
    !keyword ||
    [row.ruleCode, row.ruleDescription, row.planCode, row.planTitle, row.testType, row.caseCode, row.caseDescription, row.unitTestName]
      .some((field) => field?.toLowerCase().includes(keyword));
  const groups = new Map<string, TraceabilityRow[]>();
  for (const row of rows) {
    if (!matches(row)) continue;
    const group = groups.get(row.ruleCode) ?? [];
    group.push(row);
    groups.set(row.ruleCode, group);
  }
  return groups;
}

export function TraceabilityMatrix({ projectId }: { projectId: number }) {
  const { t } = useLanguage();
  const { data, isLoading, isError, error, refetch } = useTraceability(projectId);
  const [search, setSearch] = useState('');
  const rows = useMemo(() => data?.rows ?? [], [data]);
  const groups = useMemo(() => groupRows(rows, search), [rows, search]);

  if (isLoading) {
    return <LoadingState label={t('Đang tải traceability...', 'Loading traceability...')} minHeight="min-h-[360px]" />;
  }
  if (isError) {
    return <ErrorState error={error} onRetry={() => refetch()} />;
  }

  const ruleCodes = [...new Set(rows.map((row) => row.ruleCode))];
  const uncoveredCodes = new Set((data?.uncoveredRules ?? []).map((row) => row.ruleCode));
  const tracePaths = rows.filter((row) => row.unitTestId != null).length;

  return (
    <section className="mt-8 animate-fade-in">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-heading">Traceability Matrix</h3>
          <p className="mt-1 text-xs text-body-subtle">
            {t('Ma trận truy vết Business Rule → Test Plan → Test Case → Unit Test.', 'Requirement traceability from Business Rule → Test Plan → Test Case → Unit Test.')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SummaryChip label={t(`${ruleCodes.length} Business Rule`, `${ruleCodes.length} Business Rules`)} />
          <SummaryChip tone="success" label={t(`${ruleCodes.length - uncoveredCodes.size} đã cover`, `${ruleCodes.length - uncoveredCodes.size} covered`)} />
          <SummaryChip tone={uncoveredCodes.size > 0 ? 'danger' : 'success'} label={t(`${uncoveredCodes.size} chưa cover`, `${uncoveredCodes.size} uncovered`)} />
          <SummaryChip label={t(`${tracePaths} trace path`, `${tracePaths} trace paths`)} />
        </div>
      </div>

      <div className="rounded-base border border-border-default bg-neutral-primary-soft shadow-sm">
        <div className="border-b border-border-default p-4">
          <label className="relative block">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-body-subtle" />
            <input
              type="search"
              className="form-input pl-9"
              placeholder={t('Tìm theo BR, Plan, Case, Unit Test...', 'Search by BR, Plan, Case, Unit Test...')}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={TableProperties}
            title={t('Chưa có dữ liệu traceability', 'No traceability data yet')}
            hint={t('Matrix hình thành sau khi có Business Rule, Test Plan, Test Case và Unit Test.', 'The matrix forms once Business Rules, Test Plans, Test Cases, and Unit Tests exist.')}
            minHeight="min-h-[300px]"
          />
        ) : groups.size === 0 ? (
          <EmptyState
            icon={Search}
            title={t('Không có kết quả phù hợp', 'No matching results')}
            hint={t('Thử từ khóa khác hoặc xóa ô tìm kiếm.', 'Try a different keyword or clear the search box.')}
            minHeight="min-h-[300px]"
          />
        ) : (
          <div className="max-h-[620px] overflow-auto">
          <table className="w-full min-w-[980px] table-fixed text-sm">
              <caption className="sr-only">
                {t('Ma trận truy vết từ Business Rule đến Unit Test', 'Traceability matrix from Business Rule to Unit Test')}
              </caption>
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-border-default bg-neutral-secondary-soft text-left text-xs text-body-subtle shadow-sm">
                  <th className="w-[24%] px-4 py-3 font-semibold"><span className="mr-2 font-mono text-[10px]">01</span>Business Rule</th>
                  <th className="w-[24%] px-4 py-3 font-semibold"><span className="mr-2 font-mono text-[10px]">02</span>Test Plan</th>
                  <th className="w-[28%] px-4 py-3 font-semibold"><span className="mr-2 font-mono text-[10px]">03</span>Test Case</th>
                  <th className="w-[24%] px-4 py-3 font-semibold"><span className="mr-2 font-mono text-[10px]">04</span>Unit Test</th>
                </tr>
              </thead>
              <tbody>
                {[...groups.entries()].flatMap(([ruleCode, ruleRows]) => {
                  const uncovered = uncoveredCodes.has(ruleCode);
                  return ruleRows.map((row, index) => (
                    <tr
                      key={`${ruleCode}-${row.planId ?? 'no-plan'}-${row.caseId ?? index}-${row.unitTestId ?? 'no-test'}`}
                      className="border-b border-border-default/70 transition-colors last:border-b-0 hover:bg-neutral-secondary-soft/40"
                    >
                      {index === 0 && (
                        <td rowSpan={ruleRows.length} className="border-r border-border-default/70 bg-neutral-secondary-soft/35 px-4 py-4 align-top">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-xs font-bold text-heading">{ruleCode}</span>
                            <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              uncovered ? 'bg-danger-soft text-fg-danger-strong' : 'bg-success-soft text-fg-success-strong'
                            }`}>
                              {uncovered ? <AlertTriangle size={10} /> : <CheckCircle2 size={10} />}
                              {uncovered ? t('Chưa cover', 'Uncovered') : 'Covered'}
                            </span>
                          </div>
                          <p className="mt-2 text-xs leading-relaxed text-body-subtle">{row.ruleDescription}</p>
                        </td>
                      )}
                      <td className="border-r border-border-default/70 px-4 py-4 align-top">
                        <span className="font-mono text-xs font-semibold text-heading">{row.planCode ?? '—'}</span>
                        {row.testType && (
                          <span className="ml-2 rounded-full bg-brand-softer px-2 py-0.5 text-[10px] font-semibold text-fg-brand-strong">{row.testType}</span>
                        )}
                        <p className="mt-1.5 text-xs leading-relaxed text-body-subtle">
                          {row.planTitle ?? t('Chưa có Test Plan', 'No Test Plan')}
                        </p>
                      </td>
                      <td className="border-r border-border-default/70 px-4 py-4 align-top">
                        <span className="font-mono text-xs font-semibold text-heading">{row.caseCode ?? '—'}</span>
                        <p className="mt-1.5 text-xs leading-relaxed text-body-subtle">
                          {row.caseDescription ?? t('Chưa có Test Case', 'No Test Case')}
                        </p>
                      </td>
                      <td className="px-4 py-4 align-top">
                        {row.unitTestName ? (
                          <code className="break-words rounded-default bg-neutral-secondary-medium px-2 py-1 text-xs text-heading">{row.unitTestName}</code>
                        ) : (
                          <span className="text-xs italic text-body-subtle">{t('Chưa sinh Unit Test', 'No Unit Test generated')}</span>
                        )}
                      </td>
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function SummaryChip({ label, tone }: { label: string; tone?: 'success' | 'danger' }) {
  const toneClass = tone === 'success'
    ? 'bg-success-soft text-fg-success-strong'
    : tone === 'danger'
      ? 'bg-danger-soft text-fg-danger-strong'
      : 'bg-neutral-secondary-medium text-body';
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${toneClass}`}>{label}</span>;
}
