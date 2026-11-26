export type ReportFormat = 'json' | 'markdown';

// Mirror ExportReportDto phía backend (chỉ các field dùng cho metric card)
export interface ReportSummary {
  projectName: string;
  requirementCoverage: number | null;
  lineCoverage: number | null;
  branchCoverage: number | null;
  totalBusinessRules: number;
  totalTestPlans: number;
  totalTestCases: number;
  totalUnitTests: number;
  traceability: unknown[];
  coverageGaps: unknown[];
  uncoveredRuleCodes: string[];
  /** Lượt chạy test trên server gần nhất; null khi chưa chạy. */
  testRun?: { status: string; tests: number; passed: number; failed: number; message: string } | null;
}
