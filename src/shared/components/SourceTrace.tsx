import { Tag } from './Tag';
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
    <div className={`border-l-2 border-border-brand-subtle bg-brand-softer ${compact ? 'px-2 py-1.5' : 'px-3 py-2'}`}>
      <p className="break-all font-mono text-xs text-body-subtle" title={value.filePath}>
        {displaySourcePath(value.filePath)}
      </p>
      <p className="mt-0.5 text-xs font-semibold text-heading">
        <span className="font-mono">{value.className}.{value.methodName}</span>
        <span className="ml-2 font-normal text-body-subtle">L<span className="font-mono">{value.lineStart}-{value.lineEnd}</span></span>
      </p>
      {value.branch && (
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
          <Tag><GitBranch size={12} aria-hidden="true" />{value.branch.branchId}</Tag>
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
          <span className="text-xs text-body-subtle">
            L<span className="font-mono">{value.branch.lineStart}-{value.branch.lineEnd}</span>
          </span>
        </div>
      )}
    </div>
  );
}
