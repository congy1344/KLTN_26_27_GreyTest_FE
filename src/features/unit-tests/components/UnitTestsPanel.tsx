import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Bot, CheckCircle2, Copy, Download, FileCode2, Loader2, ListFilter, ShieldCheck } from 'lucide-react';
import { getErrorMessage } from '../../../shared/api/api-client';
import { EmptyState } from '../../../shared/components/EmptyState';
import { InlineAlert } from '../../../shared/components/InlineAlert';
import { LoadingState } from '../../../shared/components/LoadingState';
import { MetricCard } from '../../../shared/components/MetricCard';
import { SourceTrace } from '../../../shared/components/SourceTrace';
import { useTestCases } from '../../test-cases/hooks/useTestCases';
import { useTestPlans } from '../../test-plans/hooks/useTestPlans';
import { useBusinessRules } from '../../business-rules/hooks/useBusinessRules';
import { useAnalysis } from '../../projects/hooks/useProjects';
import { buildRuleSourceIndex } from '../../projects/utils/source-trace';
import { downloadUnitTestsZip } from '../api/unit-test-api';
import { useGenerateUnitTests, useUnitTestFiles, useUnitTests } from '../hooks/useUnitTests';
import type { UnitTestFile } from '../types';
import { useLanguage } from '../../../shared/i18n/language';

export function UnitTestsPanel({ projectId = 0 }: { projectId?: number }) {
  const navigate = useNavigate();
  const cases = useTestCases(projectId);
  const plans = useTestPlans(projectId);
  const rules = useBusinessRules(projectId);
  const analysis = useAnalysis(projectId);
  const tests = useUnitTests(projectId);
  const files = useUnitTestFiles(projectId);
  const generate = useGenerateUnitTests(projectId);
  const [caseId, setCaseId] = useState('');
  const [activeId, setActiveId] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const { t } = useLanguage();
  const approvedCases = useMemo(() => (cases.data ?? []).filter((item) => item.status === 'APPROVED'), [cases.data]);
  const visible = useMemo(() => caseId ? (tests.data ?? []).filter((item) => String(item.testCaseId) === caseId) : (tests.data ?? []), [tests.data, caseId]);
  const active = visible.find((item) => item.id === activeId) ?? visible[0];
  const sourceTraceByRule = useMemo(
    () => buildRuleSourceIndex(analysis.data, rules.data ?? []),
    [analysis.data, rules.data],
  );
  const traceForCase = (testCaseId: number) => {
    const testCase = (cases.data ?? []).find((item) => item.id === testCaseId);
    const plan = (plans.data ?? []).find((item) => item.id === testCase?.testPlanId);
    const ruleIds = plan?.coveredRuleIds?.length
      ? plan.coveredRuleIds
      : plan ? [plan.businessRuleId] : [];
    const sourceRules = ruleIds
      .map((ruleId) => (rules.data ?? []).find((rule) => rule.id === ruleId))
      .filter((rule) => rule != null);
    return {
      label: [
        ...sourceRules.map((rule) => `${rule.ruleCode}${rule.sourceBranchId ? ` [${rule.sourceBranchId}]` : ''}`),
        plan?.planCode,
        testCase?.caseCode,
      ].filter(Boolean).join(' -> '),
      sources: sourceRules.map((rule) => sourceTraceByRule.get(rule.id)).filter((source) => source != null),
    };
  };
  const activeTrace = active ? traceForCase(active.testCaseId) : null;
  // Mỗi record là 1 @Test method; file hiển thị là bản đã gộp các method cùng class
  const activeFile = active ? (files.data ?? []).find((file) => file.filePath === active.filePath) : undefined;
  const error = cases.error ?? plans.error ?? rules.error ?? analysis.error
    ?? tests.error ?? files.error ?? generate.error;

  const handleDownload = async () => {
    try {
      setDownloadError('');
      setDownloading(true);
      await downloadUnitTestsZip(projectId);
    } catch (downloadException) {
      setDownloadError(getErrorMessage(downloadException));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section className="mt-8 animate-fade-in">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><h3 className="text-sm font-semibold text-heading">Unit Tests</h3><p className="mt-1 text-xs text-body-subtle">{t('AI sinh JUnit/Mockito từ Test Case đã approve và lưu về backend.', 'AI generates JUnit/Mockito tests from approved Test Cases and persists them in the backend.')}</p></div>
        <button className="btn btn-brand" disabled={generate.isPending || approvedCases.length === 0} onClick={() => generate.mutate()}>
          {generate.isPending ? <Loader2 size={14} className="animate-spin" /> : <Bot size={14} />} {t('AI sinh Unit Test', 'Generate with AI')}
        </button>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard icon={CheckCircle2} label={t('Test Case đã approve', 'Approved Cases')} value={approvedCases.length} />
        <MetricCard icon={FileCode2} label={t('Test file', 'Test Files')} value={(files.data ?? []).length} />
        <MetricCard icon={ShieldCheck} label={t('Unit test đã sinh', 'Generated Tests')} value={(tests.data ?? []).length} />
      </div>
      <div className="mt-4 rounded-base border border-border-default bg-neutral-primary-soft p-4 shadow-sm">
        {error && <InlineAlert tone="danger">{getErrorMessage(error)}</InlineAlert>}
        {downloadError && <InlineAlert tone="danger">{downloadError}</InlineAlert>}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3"><ListFilter size={16} className="text-fg-brand-strong" /><span className="text-sm font-semibold text-heading">{t('Lọc danh sách theo Test Case', 'Filter list by Test Case')}</span></div>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-secondary shrink-0" disabled={downloading || (tests.data ?? []).length === 0} onClick={handleDownload}>
              {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} {t('Tải tất cả file (.zip)', 'Download all files (.zip)')}
            </button>
            <button
              className="btn btn-brand shrink-0"
              disabled={generate.isPending || (tests.data ?? []).length === 0}
              onClick={() => navigate(`/projects/${projectId}/coverage`, {
                state: { workflowNotice: t('Unit Test đã sẵn sàng. Chuyển sang bước Coverage.', 'Unit Tests are ready. Continue with Coverage.') },
              })}
            >
              {t('Tiếp tục đến Coverage', 'Continue to Coverage')} <ArrowRight size={14} />
            </button>
          </div>
        </div>
        <select aria-label={t('Lọc Test Case', 'Filter by Test Case')} className="form-input mt-4" value={caseId} onChange={(e) => { setCaseId(e.target.value); setActiveId(null); }}>
          <option value="">{t('Tất cả Test Case đã approve', 'All approved Test Cases')}</option>
          {approvedCases.map((item) => <option key={item.id} value={item.id}>{item.caseCode} - {item.description}</option>)}
        </select>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
        <div className="rounded-base border border-border-default bg-neutral-primary-soft shadow-sm">
          {tests.isLoading ? (
            <LoadingState label={t('Đang tải Unit Test...', 'Loading Unit Tests...')} minHeight="min-h-[160px]" />
          ) : visible.length === 0 ? (
            <EmptyState icon={FileCode2} title={t('Chưa có Unit Test', 'No Unit Tests yet')} hint={t('Approve Test Case rồi bấm "AI sinh Unit Test".', 'Approve Test Cases, then select "Generate with AI".')} minHeight="min-h-[200px]" />
          ) : visible.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-current={active?.id === item.id ? 'true' : undefined}
              className={`block w-full border-b border-border-default px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand ${active?.id === item.id ? 'bg-brand-softer' : 'hover:bg-neutral-secondary-soft/40'}`}
              onClick={() => setActiveId(item.id)}
            >
              <span className="block truncate font-mono text-xs font-semibold text-heading">{item.testMethodName}</span>
              <span className="mt-1 block truncate font-mono text-[11px] text-body-subtle">
                {traceForCase(item.testCaseId).label}
              </span>
              <span className="mt-0.5 block truncate text-xs text-body-subtle">{item.testClassName}</span>
            </button>
          ))}
        </div>
        <div className="rounded-base border border-border-default bg-neutral-primary-soft p-4 shadow-sm">
          {!active ? (
            <div className="flex min-h-[360px] items-center justify-center text-sm text-body-subtle">{t('Chọn method để xem file test.', 'Select a method to view its test file.')}</div>
          ) : files.isLoading ? (
            <LoadingState label={t('Đang gộp file test...', 'Merging test files...')} minHeight="min-h-[360px]" />
          ) : activeFile ? (
            <div className="space-y-3">
              <div>
                <p className="mb-2 font-mono text-xs font-semibold text-fg-brand-strong">{activeTrace?.label}</p>
                <div className="grid gap-2 lg:grid-cols-2">
                  {activeTrace?.sources.map((source, index) => (
                    <SourceTrace key={`${source.filePath}:${source.methodName}:${index}`} value={source} compact />
                  ))}
                </div>
              </div>
              <UnitTestFileView file={activeFile} highlightMethod={active.testMethodName} />
            </div>
          ) : (
            <div className="flex min-h-[360px] items-center justify-center text-sm text-body-subtle">{t('Không tìm thấy file test.', 'Test file not found.')}</div>
          )}
        </div>
      </div>
    </section>
  );
}

function UnitTestFileView({ file, highlightMethod }: { file: UnitTestFile; highlightMethod: string }) {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLTextAreaElement>(null);
  const { t } = useLanguage();

  // Tự ẩn trạng thái "Đã copy" sau 2 giây
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  useEffect(() => {
    const code = codeRef.current;
    const declaration = `void ${highlightMethod}(`;
    const declarationIndex = file.sourceCode.indexOf(declaration);
    const methodIndex = declarationIndex >= 0
      ? declarationIndex + 'void '.length
      : file.sourceCode.indexOf(highlightMethod);
    if (!code || methodIndex < 0) return;
    code.focus({ preventScroll: true });
    code.setSelectionRange(methodIndex, methodIndex + highlightMethod.length);
  }, [file.sourceCode, highlightMethod]);

  const copy = async () => {
    if (!navigator.clipboard) return;
    await navigator.clipboard.writeText(file.sourceCode);
    setCopied(true);
  };

  return (
    <>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-heading">{file.testClassName}</p>
          <p className="truncate font-mono text-xs text-body-subtle">{file.filePath}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-neutral-secondary-medium px-2 py-0.5 text-[11px] font-semibold text-body-subtle">
              {t(`${file.testCount} @Test method`, `${file.testCount} @Test methods`)}
            </span>
            {file.caseCodes.map((code) => (
              <span key={code} className="rounded-full bg-brand-softer px-2 py-0.5 text-[11px] font-semibold text-fg-brand-strong">{code}</span>
            ))}
          </div>
        </div>
        <button className="btn btn-secondary px-3 py-2" onClick={copy}><Copy size={14} />{copied ? t('Đã copy', 'Copied') : 'Copy'}</button>
      </div>
      <p className="mb-2 text-[11px] text-body-subtle">
        {t(`File hoàn chỉnh đã gộp mọi @Test method cùng class. Method của case đang chọn: ${highlightMethod}`, `Complete file with all @Test methods of this class. Selected case method: ${highlightMethod}`)}
      </p>
      <textarea ref={codeRef} aria-label="Generated test code" readOnly className="form-input min-h-[360px] resize-y font-mono text-xs leading-relaxed" value={file.sourceCode} />
    </>
  );
}
