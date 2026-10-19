import { apiClient } from '../../../shared/api/api-client';
import type { UserTier } from '../../auth/types';

export interface PaymentUrlResponse {
  paymentUrl: string;
  orderId: string;
  amount: number;
}

export interface PaymentCallbackResponse {
  status: 'SUCCESS' | 'FAILED';
  message: string;
  orderId?: string;
  tier?: UserTier;
  amount?: number;
  transactionNo?: string;
}

export interface PaymentTransactionDto {
  id: number;
  userId: number;
  orderId: string;
  tier: UserTier;
  amount: number;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  vnpTxnRef?: string;
  vnpTransactionNo?: string;
  vnpBankCode?: string;
  vnpResponseCode?: string;
  createdAt: string;
  updatedAt?: string;
}

export async function createVnpayPaymentUrl(tier: 'PLUS' | 'PRO'): Promise<PaymentUrlResponse> {
  const { data } = await apiClient.post<PaymentUrlResponse>('/payment/create-vnpay-url', { tier });
  return data;
}

export async function verifyVnpayCallback(params: Record<string, string>): Promise<PaymentCallbackResponse> {
  const searchParams = new URLSearchParams(params);
  const { data } = await apiClient.get<PaymentCallbackResponse>(`/payment/vnpay-callback?${searchParams.toString()}`);
  return data;
}

export async function fetchPaymentHistory(): Promise<PaymentTransactionDto[]> {
  const { data } = await apiClient.get<PaymentTransactionDto[]>('/payment/history');
  return data;
}
