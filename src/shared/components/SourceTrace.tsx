import { GitBranch } from 'lucide-react';
import { useLanguage } from '../i18n/language';
import type { SourceTrace as SourceTraceValue } from '../../features/projects/utils/source-trace';
import { displaySourcePath } from '../utils/source-path';

const OUTCOME_LABELS: Record<string, [string, string]> = {
  TRUE: ['điều kiện đúng', 'condition true'],
  FALSE: ['điều kiện sai', 'condition false'],
  ENTER: ['vào vòng lặp', 'enters the loop'],
  SKIP: ['không vào vòng lặp', 'skips the loop'],
  REPEAT: ['lặp lại', 'repeats'],
  EXIT: ['thoát vòng lặp', 'exits the loop'],
  DEFAULT: ['nhánh mặc định', 'default branch'],
  NO_MATCH: ['không khớp case nào', 'no case matches'],
  EXECUTABLE: ['câu lệnh', 'statement'],
};

export function SourceTrace({ value, compact = false }: { value?: SourceTraceValue; compact?: boolean }) {
  const { t } = useLanguage();
  if (!value) return null;
  const outcome = value.branch?.outcome ?? null;
  const outcomeLabel = outcome ? OUTCOME_LABELS[outcome] : null;
  // Câu lệnh thường hiện chính code; nhánh rẽ hiện từ khóa kèm điều kiện.
  const statement = value.branch?.kind === 'STATEMENT';
  return (
    <div className={`border-l-2 border-border-brand-subtle bg-brand-softer/40 ${compact ? 'px-2 py-1.5' : 'px-3 py-2'}`}>
      <p className="break-all font-mono text-[11px] text-body-subtle" title={value.filePath}>
        {displaySourcePath(value.filePath)}
      </p>
      <p className="mt-0.5 font-mono text-xs font-semibold text-heading">
        {value.className}.{value.methodName}
        <span className="ml-2 font-normal text-body-subtle">L{value.lineStart}-{value.lineEnd}</span>
      </p>
      {value.branch && (
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1 font-mono font-semibold text-fg-brand-strong">
            <GitBranch size={12} />
            {value.branch.branchId}
          </span>
          {outcome && (
            <span className="text-body-subtle">
              {statement
                ? t('Câu lệnh chạy tuần tự, không rẽ nhánh', 'Plain statement, no branching')
                : outcomeLabel ? t(outcomeLabel[0], outcomeLabel[1]) : `case ${outcome}`}
            </span>
          )}
          <code className="break-all text-body">
            {statement ? value.branch.condition : `${value.branch.kind.toLowerCase()} (${value.branch.condition})`}
          </code>
          <span className="font-mono text-[11px] text-body-subtle">
            L{value.branch.lineStart}-{value.branch.lineEnd}
          </span>
        </div>
      )}
    </div>
  );
}
