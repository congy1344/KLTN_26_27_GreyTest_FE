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

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message ?? error.message;
  }
  return getLanguage() === 'vi' ? 'Có lỗi xảy ra' : 'An error occurred';
}
