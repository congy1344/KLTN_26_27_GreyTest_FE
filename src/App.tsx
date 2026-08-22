import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
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
import { useCurrentUser } from './features/auth/hooks/useAuth';
import { AdminDashboardPage } from './features/admin/pages/AdminDashboardPage';
import { AdminUsersPage } from './features/admin/pages/AdminUsersPage';
import { AdminUserDetailPage } from './features/admin/pages/AdminUserDetailPage';
import { AdminActivityPage } from './features/admin/pages/AdminActivityPage';
import { AdminLoginPage } from './features/admin/pages/AdminLoginPage';

function RequireAuth({ children }: { children: ReactNode }) {
  if (!localStorage.getItem('greytest.token')) {
    return <Navigate to="/login" replace />;
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
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route path="/projects" element={<RequireAuth><ProjectsPage /></RequireAuth>} />
        <Route path="/projects/:id" element={<RequireAuth><ProjectDetailPage /></RequireAuth>} />
        <Route path="/projects/:id/test-plans" element={<RequireAuth><TestPlansPage /></RequireAuth>} />
        <Route path="/projects/:id/test-cases" element={<RequireAuth><TestCasesPage /></RequireAuth>} />
        <Route path="/projects/:id/unit-tests" element={<RequireAuth><UnitTestsPage /></RequireAuth>} />
        <Route path="/projects/:id/coverage" element={<RequireAuth><CoveragePage /></RequireAuth>} />
        <Route path="/projects/:id/traceability" element={<RequireAuth><TraceabilityPage /></RequireAuth>} />
        <Route path="/projects/:id/report" element={<RequireAuth><ReportPage /></RequireAuth>} />
        <Route path="/admin" element={<RequireAdmin><AdminDashboardPage /></RequireAdmin>} />
        <Route path="/admin/users" element={<RequireAdmin><AdminUsersPage /></RequireAdmin>} />
        <Route path="/admin/users/:id" element={<RequireAdmin><AdminUserDetailPage /></RequireAdmin>} />
        <Route path="/admin/activity" element={<RequireAdmin><AdminActivityPage /></RequireAdmin>} />
        <Route path="*" element={<Navigate to="/projects" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
