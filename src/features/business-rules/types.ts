export type RuleSource = 'AI_GENERATED' | 'USER_ADDED' | 'USER_MODIFIED' | 'AI_REVIEW_SUGGESTED';
export type ReviewStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';

export interface BusinessRule {
  id: number;
  projectId: number;
  methodId: number | null;
  ruleCode: string;
  description: string;
  reviewNote: string | null;
  source: RuleSource;
  status: ReviewStatus;
  isModified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewedBusinessRule {
  ruleId: number;
  verdict: string;
  suggestedDescription: string;
  reason: string;
}

export interface BusinessRuleReview {
  reviewedRules: ReviewedBusinessRule[];
  suggestedRules: BusinessRule[];
}
