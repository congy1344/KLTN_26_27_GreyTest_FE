import type { ProjectStatus } from '../types';

// Approval gate: trang sau chỉ mở khi bước trước đã hoàn thành (xem WORKFLOW.md)
const WORKFLOW_LOCKS_DISABLED = false;
export type WorkflowStepId = 'analysis' | 'test-plans' | 'test-cases' | 'unit-tests' | 'coverage' | 'traceability' | 'report';

const WORKFLOW_STEPS: WorkflowStepId[] = [
  'analysis',
  'test-plans',
  'test-cases',
  'unit-tests',
  'coverage',
  'traceability',
  'report',
];

const CURRENT_STEP_BY_STATUS: Record<ProjectStatus, WorkflowStepId> = {
  UPLOADED: 'analysis',
  ANALYZED: 'analysis',
  BR_PENDING_REVIEW: 'analysis',
  BR_APPROVED: 'test-plans',
  PLAN_PENDING_REVIEW: 'test-plans',
  PLAN_APPROVED: 'test-cases',
  CASE_PENDING_REVIEW: 'test-cases',
  CASE_APPROVED: 'unit-tests',
  TEST_GENERATED: 'coverage',
  COVERAGE_ANALYZED: 'traceability',
  COMPLETED: 'report',
  FAILED: 'analysis',
};

const TEST_PLAN_READY_STATUSES: ProjectStatus[] = [
  'BR_APPROVED',
  'PLAN_PENDING_REVIEW',
  'PLAN_APPROVED',
  'CASE_PENDING_REVIEW',
  'CASE_APPROVED',
  'TEST_GENERATED',
  'COVERAGE_ANALYZED',
  'COMPLETED',
];

const TEST_CASE_READY_STATUSES: ProjectStatus[] = [
  'PLAN_APPROVED',
  'CASE_PENDING_REVIEW',
  'CASE_APPROVED',
  'TEST_GENERATED',
  'COVERAGE_ANALYZED',
  'COMPLETED',
];

const UNIT_TEST_READY_STATUSES: ProjectStatus[] = [
  'CASE_APPROVED',
  'TEST_GENERATED',
  'COVERAGE_ANALYZED',
  'COMPLETED',
];

const COVERAGE_READY_STATUSES: ProjectStatus[] = [
  'TEST_GENERATED',
  'COVERAGE_ANALYZED',
  'COMPLETED',
];

const REPORT_READY_STATUSES: ProjectStatus[] = [
  'COVERAGE_ANALYZED',
  'COMPLETED',
];

// Traceability xem được ngay khi đã sinh Unit Test (matrix hình thành dần từ trước đó)
const TRACEABILITY_READY_STATUSES: ProjectStatus[] = [
  'TEST_GENERATED',
  'COVERAGE_ANALYZED',
  'COMPLETED',
];

export function canOpenTestPlans(status: ProjectStatus) {
  return WORKFLOW_LOCKS_DISABLED || TEST_PLAN_READY_STATUSES.includes(status);
}

export function canOpenTestCases(status: ProjectStatus) {
  return WORKFLOW_LOCKS_DISABLED || TEST_CASE_READY_STATUSES.includes(status);
}

export function canOpenUnitTests(status: ProjectStatus) {
  return WORKFLOW_LOCKS_DISABLED || UNIT_TEST_READY_STATUSES.includes(status);
}

export function canOpenCoverage(status: ProjectStatus) {
  return WORKFLOW_LOCKS_DISABLED || COVERAGE_READY_STATUSES.includes(status);
}

export function canOpenReport(status: ProjectStatus) {
  return WORKFLOW_LOCKS_DISABLED || REPORT_READY_STATUSES.includes(status);
}

export function canOpenTraceability(status: ProjectStatus) {
  return WORKFLOW_LOCKS_DISABLED || TRACEABILITY_READY_STATUSES.includes(status);
}

export function isWorkflowStepCompleted(step: WorkflowStepId, status: ProjectStatus) {
  const currentIndex = WORKFLOW_STEPS.indexOf(CURRENT_STEP_BY_STATUS[status]);
  const stepIndex = WORKFLOW_STEPS.indexOf(step);
  return stepIndex < currentIndex || (status === 'COMPLETED' && step === 'report');
}

export function getProjectResumePath(projectId: number, status: ProjectStatus) {
  const step = CURRENT_STEP_BY_STATUS[status];
  return step === 'analysis' ? `/projects/${projectId}` : `/projects/${projectId}/${step}`;
}
