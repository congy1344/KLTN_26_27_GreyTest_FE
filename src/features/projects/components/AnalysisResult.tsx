import { useState } from 'react';
import { AnalysisStats } from './AnalysisStats';
import { ClassTree } from './ClassTree';
import type { AnalysisResult as AnalysisResultType, ExistingTestInfo } from '../types';
import { ShieldCheck, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { useLanguage } from '../../../shared/i18n/language';

interface AnalysisResultProps {
  data: AnalysisResultType;
  existingTests?: ExistingTestInfo[];
}

export function AnalysisResult({ data, existingTests = [] }: AnalysisResultProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { t } = useLanguage();

  return (
    <div className="space-y-8 animate-fade-in">
      <section>
        <div className={`${isExpanded ? 'mb-4' : ''} flex items-center justify-between gap-4`}>
          <div>
            <h3 className="text-sm font-semibold text-heading">{t('Tổng quan analysis', 'Analysis overview')}</h3>
            <p className="mt-1 text-xs text-body-subtle">
              {t('Các chỉ số được trích xuất từ production source.', 'Metrics extracted from production source.')}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="hidden text-xs font-mono text-body-subtle sm:inline">Project #{data.projectId}</span>
            <button
              type="button"
              onClick={() => setIsExpanded((value) => !value)}
              aria-expanded={isExpanded}
              aria-label={isExpanded ? t('Thu gọn analysis', 'Collapse analysis') : t('Mở rộng analysis', 'Expand analysis')}
              title={isExpanded ? t('Thu gọn analysis', 'Collapse analysis') : t('Mở rộng analysis', 'Expand analysis')}
              className="btn-ghost"
            >
              {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
          </div>
        </div>

        {isExpanded && (
          <>
            <AnalysisStats
              totalClasses={data.totalClasses}
              totalMethods={data.totalMethods}
              totalEndpoints={data.totalEndpoints}
            />

            {data.existingTestFiles > 0 && (
          <div className="mt-4 flex items-start gap-3 rounded-base border border-border-brand-subtle bg-brand-softer p-4 shadow-xs">
            <ShieldCheck size={16} strokeWidth={1.8} className="mt-0.5 shrink-0 text-fg-brand-strong" />
            <div>
              <p className="text-sm font-semibold text-fg-brand-strong">
                {t(`Đã phát hiện ${data.existingTestFiles} file test có sẵn`, `Found ${data.existingTestFiles} existing test files`)}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-body">
                {t('Existing tests không tính vào production analysis nhưng được lưu làm context để AI cải thiện hoặc bổ sung Unit Test.', 'Existing tests are excluded from production analysis but retained as context for improving or supplementing Unit Tests.')}
              </p>
            </div>
          </div>
            )}

            {(data.failedParseFiles ?? 0) > 0 && (
          <div className="mt-4 flex items-start gap-3 rounded-base border border-border-warning-subtle bg-warning-soft p-4 shadow-xs">
            <AlertTriangle size={16} strokeWidth={1.8} className="mt-0.5 shrink-0 text-warning-strong" />
            <div>
              <p className="text-sm font-semibold text-warning-strong">
                {t(`${data.failedParseFiles} file production Java không parse được`, `${data.failedParseFiles} production Java files could not be parsed`)}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-body">
                {t('Các file này bị bỏ qua khỏi static analysis context nên hệ thống không sinh test trực tiếp cho class/method bên trong.', 'These files are excluded from the static analysis context, so tests will not be generated directly for their classes or methods.')}
              </p>
              {(data.failedParseFilePaths?.length ?? 0) > 0 && (
                <ul className="mt-2 space-y-1">
                  {data.failedParseFilePaths!.slice(0, 5).map((path) => (
                    <li key={path} className="font-mono text-xs text-body-subtle">
                      {path}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
            )}
          </>
        )}
      </section>

      {isExpanded && <section>
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-heading">{t('Cấu trúc source code', 'Source code structure')}</h3>
          <p className="mt-1 text-xs text-body-subtle">{t('Mở từng class và method để xem endpoint, signature và source.', 'Open a class or method to inspect its endpoint, signature, and source.')}</p>
        </div>
        <ClassTree classes={data.classes} existingTests={existingTests} />
      </section>}
    </div>
  );
}
