export type TestType = 'HAPPY_PATH' | 'BOUNDARY' | 'EXCEPTION' | 'EDGE';
export type ReviewStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';

export interface TestPlan {
  id: number;
  projectId: number;
  businessRuleId: number;
  planCode: string;
  title: string;
  description: string;
  testType: TestType;
  status: ReviewStatus;
  isModified: boolean;
  createdAt: string | null;
}

export interface CreateTestPlanInput {
  businessRuleId: number;
  title: string;
  description: string;
  testType: TestType;
}
