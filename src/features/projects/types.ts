export type SourceType = 'ZIP' | 'GITHUB';

export type ProjectStatus =
  | 'UPLOADED'
  | 'ANALYZED'
  | 'BR_PENDING_REVIEW'
  | 'BR_APPROVED'
  | 'PLAN_PENDING_REVIEW'
  | 'PLAN_APPROVED'
  | 'CASE_PENDING_REVIEW'
  | 'CASE_APPROVED'
  | 'TEST_GENERATED'
  | 'COVERAGE_ANALYZED'
  | 'COMPLETED'
  | 'FAILED';

export interface Project {
  id: number;
  name: string;
  sourceType: SourceType;
  sourceUrl: string | null;
  status: ProjectStatus;
  createdAt: string;
}
