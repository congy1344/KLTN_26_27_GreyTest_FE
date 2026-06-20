import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ProjectsPage } from './features/projects/pages/ProjectsPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="*" element={<Navigate to="/projects" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
