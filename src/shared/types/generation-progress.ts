export type GenerationProgressStage = 'BUSINESS_RULE' | 'TEST_PLAN' | 'TEST_CASE' | 'UNIT_TEST';
export type GenerationProgressStatus = 'IDLE' | 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
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
}

export interface GenerationJobAccepted {
  stage: GenerationProgressStage;
  status: 'QUEUED';
  message: string;
}
