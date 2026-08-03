// Mirror CoverageReportDto / CoverageGapDto phía backend
export interface CoverageGap {
  methodId: number | null;
  className: string;
  methodName: string;
  lineCoverage: number;
  branchCoverage: number;
  missedLines: number[];
  missedBranches: number[];
  risk: 'HIGH' | 'MEDIUM';
  suggestion: string;
  refinable: boolean;
}

export interface CoverageReport {
  id: number;
  projectId: number;
  round: number;
  lineCoverage: number;
  branchCoverage: number;
  requirementCoverage: number;
  previousLineCoverage: number | null;
  previousBranchCoverage: number | null;
  previousRequirementCoverage: number | null;
  totalLines: number;
  coveredLines: number;
  totalBranches: number;
  coveredBranches: number;
  uploadedAt: string;
  gaps: CoverageGap[];
}

export interface CoverageRefinement {
  round: number;
  testCases: Array<{ id: number }>;
  unitTests: Array<{ id: number }>;
}
