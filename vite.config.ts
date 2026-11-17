import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    cache: false,
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
  },
  server: {
    port: 3000,
    // Cho phép truy cập qua tunnel (trycloudflare) khi test trên điện thoại — chỉ dùng cho dev
    allowedHosts: true,
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
});
