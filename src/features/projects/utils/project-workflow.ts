import type { ProjectStatus } from '../types';

// ponytail: tạm mở khóa để test điều hướng UI; đổi false khi cần bật lại approval gate.
const WORKFLOW_LOCKS_DISABLED = true;

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

export function canOpenTestPlans(status: ProjectStatus) {
  return WORKFLOW_LOCKS_DISABLED || TEST_PLAN_READY_STATUSES.includes(status);
}

export function canOpenTestCases(status: ProjectStatus) {
  return WORKFLOW_LOCKS_DISABLED || TEST_CASE_READY_STATUSES.includes(status);
}

export function canOpenUnitTests(status: ProjectStatus) {
  return WORKFLOW_LOCKS_DISABLED || UNIT_TEST_READY_STATUSES.includes(status);
}
