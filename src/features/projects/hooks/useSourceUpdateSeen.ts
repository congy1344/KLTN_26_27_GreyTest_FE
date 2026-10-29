import { useEffect, useMemo } from 'react';

/** Giữ dấu trong lần xem hiện tại, ghi nhận đã xem khi rời bước hoặc tải lại trang. */
export function useSourceUpdateSeen(key: string | null, ready: boolean) {
  const seen = useMemo(() => {
    if (!key) return false;
    try { return localStorage.getItem(key) === 'true'; } catch { return false; }
  }, [key]);

  useEffect(() => {
    if (!key || !ready || seen) return;
    const markSeen = () => {
      try { localStorage.setItem(key, 'true'); } catch { /* Trình duyệt có thể chặn lưu tùy chọn giao diện. */ }
    };
    window.addEventListener('pagehide', markSeen);
    return () => {
      window.removeEventListener('pagehide', markSeen);
      markSeen();
    };
  }, [key, ready, seen]);

  return seen;
}
