import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    // Cho phép truy cập qua tunnel (trycloudflare) khi test trên điện thoại — chỉ dùng cho dev
    allowedHosts: true,
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
});
