import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ProjectsPage } from './features/projects/pages/ProjectsPage';
import { ProjectDetailPage } from './features/projects/pages/ProjectDetailPage';
import { TestPlansPage } from './features/test-plans/pages/TestPlansPage';
import { TestCasesPage } from './features/test-cases/pages/TestCasesPage';
import { UnitTestsPage } from './features/unit-tests/pages/UnitTestsPage';
import { CoveragePage } from './features/coverage/pages/CoveragePage';
import { TraceabilityPage } from './features/traceability/pages/TraceabilityPage';
import { ReportPage } from './features/report/pages/ReportPage';
import { LoginPage } from './features/auth/pages/LoginPage';
import { ResetPasswordPage } from './features/auth/pages/ResetPasswordPage';
import { useCurrentUser } from './features/auth/hooks/useAuth';
import { AdminDashboardPage } from './features/admin/pages/AdminDashboardPage';
import { AdminUsersPage } from './features/admin/pages/AdminUsersPage';
import { AdminUserDetailPage } from './features/admin/pages/AdminUserDetailPage';
import { AdminActivityPage } from './features/admin/pages/AdminActivityPage';
import { AdminLoginPage } from './features/admin/pages/AdminLoginPage';
import { AdminJobsPage } from './features/admin/pages/AdminJobsPage';
import { AdminAiProvidersPage } from './features/admin/pages/AdminAiProvidersPage';
import { AdminQuotasPage } from './features/admin/pages/AdminQuotasPage';
import { AdminFeedbackPage } from './features/admin/pages/AdminFeedbackPage';
import { AdminSettingsPage } from './features/admin/pages/AdminSettingsPage';
import { AdminHealthPage } from './features/admin/pages/AdminHealthPage';
import { UpgradeToProModal } from './shared/components/UpgradeToProModal';
import { AccountDisabledModal } from './shared/components/AccountDisabledModal';
import { AuthSessionListener } from './shared/components/AuthSessionListener';
import { ProfilePage } from './features/auth/pages/ProfilePage';
import { SettingsPage } from './features/auth/pages/SettingsPage';
import { VnpayReturnPage } from './features/payment/pages/VnpayReturnPage';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  }, [pathname]);

  return null;
}

function RequireAuth({ children }: { children: ReactNode }) {
  if (!localStorage.getItem('greytest.token')) {
    return <Navigate to="/" replace />;
  }
  return children;
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { data: user, isLoading } = useCurrentUser();
  if (!localStorage.getItem('greytest.token')) return <Navigate to="/admin/login" replace />;
  if (isLoading) return <div className="p-8 text-center text-sm text-body-subtle">Đang kiểm tra quyền quản trị...</div>;
  if (user?.role !== 'ADMIN') return <Navigate to="/admin/login" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ScrollToTop />
      <AuthSessionListener />
      <UpgradeToProModal />
      <AccountDisabledModal />
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
        <Route path="/settings" element={<RequireAuth><SettingsPage /></RequireAuth>} />
        <Route path="/subscription" element={<Navigate to="/settings" replace />} />
        <Route path="/payment/vnpay-return" element={<RequireAuth><VnpayReturnPage /></RequireAuth>} />
        <Route path="/projects" element={<RequireAuth><ProjectsPage /></RequireAuth>} />
        <Route path="/projects/:id" element={<RequireAuth><ProjectDetailPage /></RequireAuth>} />
        <Route path="/projects/:id/test-plans" element={<RequireAuth><TestPlansPage /></RequireAuth>} />
        <Route path="/projects/:id/test-cases" element={<RequireAuth><TestCasesPage /></RequireAuth>} />
        <Route path="/projects/:id/unit-tests" element={<RequireAuth><UnitTestsPage /></RequireAuth>} />
        <Route path="/projects/:id/coverage" element={<RequireAuth><CoveragePage /></RequireAuth>} />
        <Route path="/projects/:id/traceability" element={<RequireAuth><TraceabilityPage /></RequireAuth>} />
        <Route path="/projects/:id/report" element={<RequireAuth><ReportPage /></RequireAuth>} />
        <Route path="/admin" element={<RequireAdmin><AdminDashboardPage /></RequireAdmin>} />
        <Route path="/admin/jobs" element={<RequireAdmin><AdminJobsPage /></RequireAdmin>} />
        <Route path="/admin/ai-providers" element={<RequireAdmin><AdminAiProvidersPage /></RequireAdmin>} />
        <Route path="/admin/quotas" element={<RequireAdmin><AdminQuotasPage /></RequireAdmin>} />
        <Route path="/admin/users" element={<RequireAdmin><AdminUsersPage /></RequireAdmin>} />
        <Route path="/admin/users/:id" element={<RequireAdmin><AdminUserDetailPage /></RequireAdmin>} />
        <Route path="/admin/feedback" element={<RequireAdmin><AdminFeedbackPage /></RequireAdmin>} />
        <Route path="/admin/activity" element={<RequireAdmin><AdminActivityPage /></RequireAdmin>} />
        <Route path="/admin/health" element={<RequireAdmin><AdminHealthPage /></RequireAdmin>} />
        <Route path="/admin/monitoring" element={<RequireAdmin><Navigate to="/admin/health" replace /></RequireAdmin>} />
        <Route path="/admin/settings" element={<RequireAdmin><AdminSettingsPage /></RequireAdmin>} />
        <Route path="*" element={<Navigate to="/projects" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
