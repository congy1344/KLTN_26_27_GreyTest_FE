import { apiClient } from '../../../shared/api/api-client';

export type FeedbackCategory =
  | 'BUG_GENERATION'
  | 'COVERAGE_TESTPLAN'
  | 'ACCOUNT_QUOTA'
  | 'FEATURE_REQUEST'
  | 'OTHER';

export type FeedbackStatus = 'NEW' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface UserFeedbackItem {
  id: number;
  userId?: number;
  userEmail?: string;
  userName?: string;
  category: FeedbackCategory | string;
  title: string;
  content: string;
  status: FeedbackStatus | string;
  adminNote?: string | null;
  createdAt?: string | null;
  resolvedAt?: string | null;
  projectName?: string | null;
}

export interface CreateFeedbackPayload {
  category: string;
  title: string;
  content: string;
  projectName?: string;
}

export async function fetchMyFeedbacks(): Promise<UserFeedbackItem[]> {
  const response = await apiClient.get<UserFeedbackItem[]>('/user/feedbacks');
  return response.data;
}

export async function submitFeedback(payload: CreateFeedbackPayload): Promise<UserFeedbackItem> {
  const response = await apiClient.post<UserFeedbackItem>('/user/feedback', payload);
  return response.data;
}

