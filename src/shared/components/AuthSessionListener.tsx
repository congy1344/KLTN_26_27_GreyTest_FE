import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';

/** Kết thúc phiên bị API từ chối và xóa cache dữ liệu của người dùng trước khi chuyển về đăng nhập. */
export function AuthSessionListener() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    const handleExpired = () => {
      void queryClient.cancelQueries();
      queryClient.clear();
      navigate(pathname.startsWith('/admin') ? '/admin/login' : '/login', { replace: true });
    };
    window.addEventListener('auth-expired', handleExpired);
    return () => window.removeEventListener('auth-expired', handleExpired);
  }, [navigate, pathname, queryClient]);

  return null;
}
