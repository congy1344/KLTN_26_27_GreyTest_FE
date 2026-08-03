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

function RequireAuth({ children }: { children: ReactNode }) {
  if (!localStorage.getItem('greytest.token')) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/projects" element={<RequireAuth><ProjectsPage /></RequireAuth>} />
        <Route path="/projects/:id" element={<RequireAuth><ProjectDetailPage /></RequireAuth>} />
        <Route path="/projects/:id/test-plans" element={<RequireAuth><TestPlansPage /></RequireAuth>} />
        <Route path="/projects/:id/test-cases" element={<RequireAuth><TestCasesPage /></RequireAuth>} />
        <Route path="/projects/:id/unit-tests" element={<RequireAuth><UnitTestsPage /></RequireAuth>} />
        <Route path="/projects/:id/coverage" element={<RequireAuth><CoveragePage /></RequireAuth>} />
        <Route path="/projects/:id/traceability" element={<RequireAuth><TraceabilityPage /></RequireAuth>} />
        <Route path="/projects/:id/report" element={<RequireAuth><ReportPage /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/projects" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
