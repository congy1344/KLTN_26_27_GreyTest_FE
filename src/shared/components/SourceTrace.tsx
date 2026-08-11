import { GitBranch } from 'lucide-react';
import type { SourceTrace as SourceTraceValue } from '../../features/projects/utils/source-trace';
import { displaySourcePath } from '../utils/source-path';

export function SourceTrace({ value, compact = false }: { value?: SourceTraceValue; compact?: boolean }) {
  if (!value) return null;
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
            {value.branch.outcome ? ` ${value.branch.outcome}` : ''}
          </span>
          <code className="break-all text-body">{value.branch.kind.toLowerCase()} ({value.branch.condition})</code>
          <span className="font-mono text-[11px] text-body-subtle">L{value.branch.lineStart}</span>
        </div>
      )}
    </div>
  );
}
