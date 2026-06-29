import axios from 'axios';

// baseURL '/api' -> Vite proxy chuyển sang backend http://localhost:8080
export const apiClient = axios.create({
  baseURL: '/api',
});

apiClient.interceptors.request.use((config) => {
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
  return 'Có lỗi xảy ra';
}
