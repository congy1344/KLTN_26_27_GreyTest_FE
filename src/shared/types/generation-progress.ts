export type GenerationProgressStage = 'BUSINESS_RULE' | 'TEST_PLAN' | 'TEST_CASE' | 'UNIT_TEST';
export type GenerationProgressStatus = 'IDLE' | 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'PARTIAL' | 'FAILED' | 'PAUSED';
export type GenerationProgressStepStatus = 'WAITING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface GenerationProgressLog {
  timestamp: string;
  message: string;
}

export interface GenerationProgressStep {
  order: number;
  label: string;
  status: GenerationProgressStepStatus;
  percent: number;
  errorMessage?: string | null;
}

export interface GenerationProgress {
  stage: GenerationProgressStage;
  status: GenerationProgressStatus;
  percent: number;
  completedSteps: number;
  totalSteps: number;
  steps: GenerationProgressStep[];
  logs: GenerationProgressLog[];
  runMetrics?: GenerationRunMetrics | null;
}

export interface GenerationRunMetrics {
  runId: string;
  startedAt: string;
  finishedAt: string | null;
  elapsedMillis: number;
  recordedCalls: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCalls: number;
}

export interface GenerationJobAccepted {
  stage: GenerationProgressStage;
  status: 'QUEUED';
  message: string;
}
