import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ProjectsPage } from './features/projects/pages/ProjectsPage';
import { ProjectDetailPage } from './features/projects/pages/ProjectDetailPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:id" element={<ProjectDetailPage />} />
        <Route path="*" element={<Navigate to="/projects" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
