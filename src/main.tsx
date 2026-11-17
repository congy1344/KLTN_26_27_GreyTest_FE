import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';
import { LanguageProvider } from './shared/i18n/language';
import { ThemeProvider } from './shared/theme/theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Tắt tự động refetch khi người dùng chuyển qua lại giữa các tab trình duyệt (window focus/visibilitychange)
      refetchOnWindowFocus: false,
      // Giữ dữ liệu hợp lệ trong 30 giây để tránh gửi request dồn dập khi chuyển qua lại giữa các tab/trang nội bộ
      staleTime: 30_000,
    },
  },
});

// Hủy đăng ký Service Worker cũ còn sót lại trên cùng port (ví dụ localhost:3000)
// để tránh chặn SSE stream và gây lỗi "net::ERR_FAILED" / "[Service Worker] Network failed" trên console.
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then(async (registrations) => {
      if (registrations.length === 0) return;
      await Promise.all(registrations.map((r) => r.unregister().catch(() => false)));
      if ('caches' in window) {
        const keys = await caches.keys().catch(() => []);
        await Promise.all(keys.map((k) => caches.delete(k).catch(() => false)));
      }
      if (navigator.serviceWorker.controller && !sessionStorage.getItem('greytest.sw_cleaned')) {
        sessionStorage.setItem('greytest.sw_cleaned', '1');
        window.location.reload();
      }
    })
    .catch(() => {});
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <LanguageProvider>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
      </LanguageProvider>
    </ThemeProvider>
  </React.StrictMode>
);
