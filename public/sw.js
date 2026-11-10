// Self-unregistering Service Worker để chiếm quyền điều khiển (claim) và gỡ bỏ triệt để
// mọi Service Worker cũ còn lưu trong trình duyệt trên cùng origin (http://localhost:3000).
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        await self.clients.claim();
      } catch {
        // Bỏ qua lỗi claim
      }
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      } catch {
        // Bỏ qua lỗi xóa cache
      }
      try {
        await self.registration.unregister();
      } catch {
        // Bỏ qua lỗi hủy đăng ký
      }
    })()
  );
});
