import { AlertCircle, CheckCircle2, CircleDot, ShieldCheck } from 'lucide-react';
import { Tag } from '../../../shared/components/Tag';
import { useState } from 'react';
import { useLanguage } from '../../../shared/i18n/language';
import type { AdminOverview } from '../types';

interface QualityGateCardProps {
  overview?: AdminOverview;
}

export function QualityGateCard({ overview }: QualityGateCardProps) {
  const { language } = useLanguage();
  const [expanded, setExpanded] = useState(false);

  const hasReports = (overview?.totalCoverageReports ?? 0) > 0;
  const lineCoverage = overview?.avgLineCoverage;
  const branchCoverage = overview?.avgBranchCoverage;
  const unitTests = overview?.totalUnitTests ?? 0;
  const businessRules = overview?.totalBusinessRules ?? 0;
  const testPlans = overview?.totalTestPlans ?? 0;

  // Đánh giá trạng thái thực tế dựa trên dữ liệu thật của hệ thống
  const isLinePass = lineCoverage != null && lineCoverage >= 80.0;
  const isBranchPass = branchCoverage != null && branchCoverage >= 70.0;
  const hasTests = unitTests > 0;

  const isNoData = !hasReports;
  const isOverallPassed = hasReports && isLinePass && isBranchPass;

  const conditions = [
    {
      id: 'unit-tests',
      name: language === 'vi' ? 'Tổng số Unit Test đã sinh' : 'Unit Tests Generated',
      threshold: language === 'vi' ? '> 0 test' : '> 0 tests',
      actual: hasTests ? `${unitTests.toLocaleString()} tests` : '—',
      status: hasTests ? 'PASSED' : 'PENDING',
      note: hasTests ? (language === 'vi' ? 'Đã tổng hợp' : 'Synthesized') : (language === 'vi' ? 'Chưa sinh' : 'No tests'),
    },
    {
      id: 'line-coverage',
      name: language === 'vi' ? 'Độ bao phủ dòng mã nguồn (JaCoCo Line)' : 'JaCoCo Line Coverage',
      threshold: '≥ 80.0%',
      actual: lineCoverage != null ? `${lineCoverage}%` : '—',
      status: lineCoverage != null ? (isLinePass ? 'PASSED' : 'FAILED') : 'PENDING',
      note: lineCoverage != null ? (isLinePass ? 'Đạt chuẩn' : 'Chưa đạt') : (language === 'vi' ? 'Chưa upload JaCoCo' : 'No JaCoCo report'),
    },
    {
      id: 'branch-coverage',
      name: language === 'vi' ? 'Độ bao phủ rẽ nhánh (JaCoCo Branch)' : 'JaCoCo Branch Coverage',
      threshold: '≥ 70.0%',
      actual: branchCoverage != null ? `${branchCoverage}%` : '—',
      status: branchCoverage != null ? (isBranchPass ? 'PASSED' : 'FAILED') : 'PENDING',
      note: branchCoverage != null ? (isBranchPass ? 'Đạt chuẩn' : 'Chưa đạt') : (language === 'vi' ? 'Chưa upload JaCoCo' : 'No JaCoCo report'),
    },
    {
      id: 'rule-traceability',
      name: language === 'vi' ? 'Độ phủ truy vết Business Rules' : 'Business Rules Traceability',
      threshold: language === 'vi' ? 'Liên kết TP' : 'Traced in TP',
      actual: businessRules > 0 && testPlans > 0
        ? `${businessRules} rules`
        : businessRules > 0
          ? `${businessRules} rules`
          : '—',
      status: businessRules > 0 && testPlans > 0 ? 'PASSED' : businessRules > 0 ? 'WARNING' : 'PENDING',
      note: businessRules > 0 && testPlans > 0
        ? (language === 'vi' ? `${testPlans} Test Plans` : `${testPlans} Plans linked`)
        : businessRules > 0
          ? (language === 'vi' ? 'Chưa lập Test Plan' : 'No Test Plan')
          : (language === 'vi' ? 'Chưa trích xuất' : 'No rules extracted'),
    },
    {
      id: 'generation-requests',
      name: language === 'vi' ? 'Tổng lượt yêu cầu sinh AI' : 'Total Generation Runs',
      threshold: language === 'vi' ? '> 0 lượt' : '> 0 runs',
      actual: overview?.totalGenerationRequests != null ? `${overview.totalGenerationRequests.toLocaleString()}` : '—',
      status: (overview?.totalGenerationRequests ?? 0) > 0 ? 'PASSED' : 'PENDING',
      note: (overview?.totalGenerationRequests ?? 0) > 0
        ? (language === 'vi' ? 'Tác vụ đã thực thi' : 'Runs recorded')
        : (language === 'vi' ? 'Chưa thực thi' : 'No runs'),
    },
  ];

  return (
    <div className="rounded-base border border-border-default bg-neutral-primary-soft p-6 sm:p-8 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-5 border-b border-border-default pb-6">
        <div className="flex items-center gap-5">
          <div
            className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-base transition-colors ${
              isNoData
                ? 'bg-neutral-secondary text-body-subtle border border-border-default'
                : isOverallPassed
                  ? 'bg-success-soft text-fg-success-strong border border-border-success-subtle'
                  : 'bg-danger-soft text-fg-danger-strong border border-border-danger-subtle'
            }`}
          >
            <ShieldCheck size={36} strokeWidth={2.4} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-semibold text-body-subtle">Quality Gate</span>
              <Tag variant="status" tone={isNoData ? "neutral" : isOverallPassed ? "success" : "danger"} icon={isNoData ? CircleDot : isOverallPassed ? CheckCircle2 : AlertCircle}>
                {isNoData
                  ? (language === 'vi' ? 'Chưa có báo cáo đo lường' : 'PENDING MEASUREMENT')
                  : isOverallPassed
                    ? (language === 'vi' ? 'Đạt tiêu chuẩn' : 'PASSED')
                    : (language === 'vi' ? 'Chưa đạt chuẩn Quality Gate' : 'FAILED QUALITY GATE')}
              </Tag>
            </div>
            <h2 className="mt-1.5 text-2xl sm:text-3xl font-extrabold text-heading">
              {language === 'vi' ? 'Đánh giá chất lượng kiểm thử toàn hệ thống' : "Overall Test generation quality verdict"}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="btn btn-secondary rounded-control px-4 py-2 text-xs sm:text-sm font-bold transition-colors"
          >
            {expanded ? (language === 'vi' ? 'Thu gọn' : 'Collapse') : (language === 'vi' ? 'Chi tiết tiêu chí' : 'View Conditions')}
          </button>
        </div>
      </div>

      {/* 5 Prominent Metric Tiles with Large Numbers */}
      <div className="mt-6 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
        {conditions.map((cond) => (
          <div key={cond.id} className="flex flex-col justify-between rounded-base border border-border-default-subtle bg-neutral-secondary-soft/60 p-4 sm:p-5 transition-colors hover:border-border-default hover:shadow-2xs">
            <div>
              <p className="text-xs sm:text-sm font-bold text-heading min-h-[2.5rem] leading-snug" title={cond.name}>
                {cond.name}
              </p>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="font-sans tabular-nums text-2xl sm:text-3xl font-extrabold text-heading">
                  {cond.actual}
                </span>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-1 border-t border-border-default-subtle/80 pt-2 text-xs sm:text-xs text-body-subtle font-medium">
              <span>{language === 'vi' ? 'Chuẩn' : 'Req'}: {cond.threshold}</span>
              <span
                className={`font-sans text-xs sm:text-xs font-bold ${
                  cond.status === 'PASSED'
                    ? 'text-fg-success-strong'
                    : cond.status === 'FAILED'
                      ? 'text-fg-danger-strong'
                      : 'text-body-subtle'
                }`}
              >
                {cond.note}
              </span>
            </div>
          </div>
        ))}
      </div>

      {expanded && (
        <div className="mt-6 overflow-x-auto rounded-base border border-border-default-subtle bg-neutral-primary-soft">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="text-xs border-b border-border-default-subtle bg-neutral-secondary-soft font-semibold text-body-subtle">
              <tr>
                <th className="font-semibold text-body-subtle text-xs p-3.5 sm:p-4">{language === 'vi' ? 'Chỉ số kiểm thử' : 'Metric'}</th>
                <th className="font-semibold text-body-subtle text-xs p-3.5 sm:p-4">{language === 'vi' ? 'Ngưỡng tối thiểu' : "Required threshold"}</th>
                <th className="font-semibold text-body-subtle text-xs p-3.5 sm:p-4">{language === 'vi' ? 'Giá trị thực tế' : "Live value"}</th>
                <th className="font-semibold text-body-subtle text-xs p-3.5 sm:p-4 text-right">{language === 'vi' ? 'Kết luận' : 'Status'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default-subtle">
              {conditions.map((cond) => (
                <tr key={cond.id} className="hover:bg-neutral-secondary-soft/60 transition-colors">
                  <td className="p-3.5 sm:p-4 font-semibold text-heading">{cond.name}</td>
                  <td className="p-3.5 sm:p-4 font-sans tabular-nums text-body">{cond.threshold}</td>
                  <td className="p-3.5 sm:p-4 font-sans tabular-nums font-bold text-heading">{cond.actual}</td>
                  <td className="p-3.5 sm:p-4 text-right font-sans tabular-nums font-bold">
                    <Tag variant="status" tone={cond.status === 'PASSED' ? "success" : cond.status === 'FAILED' ? "danger" : "neutral"} icon={cond.status === 'PASSED' ? CheckCircle2 : cond.status === 'FAILED' ? AlertCircle : CircleDot}>
                      {cond.status}
                    </Tag>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
