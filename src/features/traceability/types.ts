// Mirror TraceabilityRowDto / TraceabilityMatrixDto phía backend
export interface TraceabilityRow {
  ruleId: number;
  ruleCode: string;
  ruleDescription: string;
  planId: number | null;
  planCode: string | null;
  planTitle: string | null;
  testType: string | null;
  caseId: number | null;
  caseCode: string | null;
  caseDescription: string | null;
  unitTestId: number | null;
  unitTestName: string | null;
}

export interface TraceabilityMatrix {
  projectId: number;
  rows: TraceabilityRow[];
  uncoveredRules: TraceabilityRow[];
}
