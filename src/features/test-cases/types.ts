export type TestCaseStatus = 'PENDING_REVIEW' | 'APPROVED';
export type TestType = 'HAPPY_PATH' | 'BOUNDARY' | 'EXCEPTION' | 'EDGE';
export type Priority = 'HIGH' | 'MEDIUM' | 'LOW';

export interface CreateTestCaseInput {
  testPlanId: number;
  testType: TestType;
  description: string;
  preconditions: string;
  testData: Record<string, unknown>;
  expectedResult: string;
  priority: Priority;
  traceSource: string;
}

export type UpdateTestCaseInput = Omit<CreateTestCaseInput, 'testPlanId'>;

export interface TestCase {
  id: number;
  testPlanId: number;
  caseCode: string;
  testType: TestType;
  description: string;
  preconditions: string;
  testData: Record<string, unknown>;
  expectedResult: string;
  priority: Priority;
  traceSource: string;
  status: TestCaseStatus;
  isModified: boolean;
  createdAt: string | null;
}
