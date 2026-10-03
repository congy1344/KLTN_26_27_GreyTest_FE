import axios from 'axios';
import { getLanguage } from '../i18n/language';

// baseURL '/api' -> Vite proxy chuyển sang backend http://localhost:8080
export const apiClient = axios.create({
  baseURL: '/api',
});

apiClient.interceptors.request.use((config) => {
  config.headers['Accept-Language'] = getLanguage();
  const token = localStorage.getItem('greytest.token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error)) {
      const code = error.response?.data?.code;
      const message = String(error.response?.data?.message || '').toLowerCase();
      const status = error.response?.status;

      // Xử lý vượt quota tháng
      if (status === 429 || code === 'USAGE_QUOTA_EXCEEDED') {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('quota-exceeded'));
        }
      }

      // Xử lý tài khoản bị khóa / vô hiệu hóa
      const isAccountDisabled =
        code === 'ACCOUNT_DISABLED' ||
        message.includes('vo hieu hoa') ||
        message.includes('vô hiệu hóa') ||
        message.includes('account_disabled');

      if (isAccountDisabled) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('greytest.token');
          window.dispatchEvent(
            new CustomEvent('account-disabled', {
              detail: {
                message:
                  error.response?.data?.message ||
                  (getLanguage() === 'vi'
                    ? 'Tài khoản của bạn đã bị vô hiệu hóa.'
                    : 'Your account has been disabled.'),
              },
            })
          );
        }
      }
    }
    return Promise.reject(error);
  }
);

export function getErrorMessage(error: unknown, includeErrorMessage = false): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message ?? error.message;
  }
  if (includeErrorMessage && error instanceof Error) {
    return error.message || (getLanguage() === 'vi' ? 'Có lỗi xảy ra' : 'An error occurred');
  }
  return getLanguage() === 'vi' ? 'Có lỗi xảy ra' : 'An error occurred';
}
