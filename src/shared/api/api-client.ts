import axios, { AxiosError } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';
import { getLanguage } from '../i18n/language';

// baseURL '/api' -> Vite proxy chuyển sang backend http://localhost:8080
export const apiClient = axios.create({
  baseURL: '/api',
});

export interface RequestTelemetryRecord {
  id: string;
  url: string;
  method: string;
  timestamp: number;
  durationMs?: number;
  status?: number;
  isError?: boolean;
}

type TelemetrySubscriber = (record: RequestTelemetryRecord) => void;
const telemetrySubscribers = new Set<TelemetrySubscriber>();

let globalRequestCounter = 0;
const slidingRequestTimestamps: number[] = [];

export function subscribeRequestTelemetry(fn: TelemetrySubscriber) {
  telemetrySubscribers.add(fn);
  return () => {
    telemetrySubscribers.delete(fn);
  };
}

export function getLiveRequestMetrics() {
  const now = Date.now();
  const oneMinuteAgo = now - 60_000;
  while (slidingRequestTimestamps.length > 0 && slidingRequestTimestamps[0] < oneMinuteAgo) {
    slidingRequestTimestamps.shift();
  }
  const oneSecondAgo = now - 1000;
  const requestsLastSecond = slidingRequestTimestamps.filter((t) => t >= oneSecondAgo).length;

  return {
    totalRequests: globalRequestCounter,
    requestsPerMinute: slidingRequestTimestamps.length,
    requestsPerSecond: requestsLastSecond,
  };
}

apiClient.interceptors.request.use((config) => {
  config.headers['Accept-Language'] = getLanguage();
  const token = localStorage.getItem('greytest.token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Ghi nhận telemetry luồng request thực tế tới server (bỏ qua chính các endpoint polling/stream của trang giám sát)
  const reqUrl = config.url || '';
  const isMonitoringInternal =
    reqUrl.includes('/admin/monitoring/') ||
    reqUrl.includes('/admin/system/request-logs') ||
    reqUrl.includes('/admin/system/security/waf-status');

  if (!isMonitoringInternal) {
    globalRequestCounter += 1;
    const now = Date.now();
    const oneMinuteAgo = now - 60_000;
    while (slidingRequestTimestamps.length > 0 && slidingRequestTimestamps[0] < oneMinuteAgo) {
      slidingRequestTimestamps.shift();
    }
    slidingRequestTimestamps.push(now);

    const telemetryMeta = config as InternalAxiosRequestConfig & {
      __startTime?: number;
      __telemetryId?: string;
    };
    telemetryMeta.__startTime = now;
    telemetryMeta.__telemetryId = Math.random().toString(36).slice(2, 9);

    const startRecord: RequestTelemetryRecord = {
      id: telemetryMeta.__telemetryId,
      url: reqUrl,
      method: (config.method || 'GET').toUpperCase(),
      timestamp: now,
    };
    telemetrySubscribers.forEach((fn) => {
      try {
        fn(startRecord);
      } catch {
        // Bỏ qua lỗi listener để không gián đoạn luồng HTTP chính
      }
    });
  }

  return config;
});

function isLoginRequest(config?: InternalAxiosRequestConfig) {
  return ['/auth/login', '/auth/admin/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password'].includes(
    config?.url?.split('?')[0] ?? ''
  );
}

function belongsToPreviousSession(config?: InternalAxiosRequestConfig) {
  const requestToken = config?.headers?.get('Authorization');
  return !isLoginRequest(config) && typeof requestToken === 'string' && requestToken.startsWith('Bearer ')
    && requestToken !== `Bearer ${localStorage.getItem('greytest.token')}`;
}

function sessionChangedError() {
  return new AxiosError(getLanguage() === 'vi'
    ? 'Phiên đăng nhập đã thay đổi. Vui lòng thực hiện lại thao tác.'
    : 'Your session has changed. Please try the action again.', 'AUTH_SESSION_CHANGED');
}

apiClient.interceptors.response.use(
  (response) => {
    const meta = response.config as InternalAxiosRequestConfig & {
      __startTime?: number;
      __telemetryId?: string;
    };
    if (meta.__startTime && meta.__telemetryId) {
      const finishRecord: RequestTelemetryRecord = {
        id: meta.__telemetryId,
        url: response.config.url || '',
        method: (response.config.method || 'GET').toUpperCase(),
        timestamp: meta.__startTime,
        durationMs: Date.now() - meta.__startTime,
        status: response.status,
        isError: false,
      };
      telemetrySubscribers.forEach((fn) => {
        try { fn(finishRecord); } catch { /* ignore */ }
      });
    }

    // Mutation vẫn có thể hoàn tất sau khi clear cache; không giao dữ liệu phiên cũ cho onSuccess.
    if (belongsToPreviousSession(response.config)) throw sessionChangedError();
    return response;
  },
  (error) => {
    if (axios.isAxiosError(error) && error.config) {
      const meta = error.config as InternalAxiosRequestConfig & {
        __startTime?: number;
        __telemetryId?: string;
      };
      if (meta.__startTime && meta.__telemetryId) {
        const finishRecord: RequestTelemetryRecord = {
          id: meta.__telemetryId,
          url: error.config.url || '',
          method: (error.config.method || 'GET').toUpperCase(),
          timestamp: meta.__startTime,
          durationMs: Date.now() - meta.__startTime,
          status: error.response?.status,
          isError: true,
        };
        telemetrySubscribers.forEach((fn) => {
          try { fn(finishRecord); } catch { /* ignore */ }
        });
      }
    }

    if (axios.isAxiosError(error)) {
      if (belongsToPreviousSession(error.config)) return Promise.reject(sessionChangedError());
      const rawCode = error.response?.data?.code || error.response?.data?.error;
      const code = String(rawCode || '').toUpperCase();
      const message = String(error.response?.data?.message || '').toLowerCase();
      const status = error.response?.status;

      const token = localStorage.getItem('greytest.token');
      const requestToken = error.config?.headers?.get('Authorization');
      // Chỉ kết thúc phiên bị từ chối; response cũ không được xóa phiên vừa đăng nhập.
      if (status === 401 && !isLoginRequest(error.config) && token && requestToken === `Bearer ${token}`) {
        localStorage.removeItem('greytest.token');
        window.dispatchEvent(new CustomEvent('auth-expired'));
      }

      // Xử lý vượt hạn mức AI quota (chỉ kích hoạt khi đúng mã USAGE_QUOTA_EXCEEDED, không kích hoạt với 429 Rate Limiting/DDoS hay lỗi validation 400)
      const isQuotaExceeded =
        code === 'USAGE_QUOTA_EXCEEDED' ||
        (status === 429 &&
          code !== 'TOO_MANY_REQUESTS' &&
          code !== 'TOO_MANY_LOGIN_ATTEMPTS' &&
          (message.includes('usage_quota_exceeded') || message.includes('hết quota')));

      if (isQuotaExceeded) {
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
