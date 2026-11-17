// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { LanguageProvider } from '../../../shared/i18n/language';
import { ThemeProvider } from '../../../shared/theme/theme';
import { LandingPage } from './LandingPage';

function renderPage() {
  return render(<MemoryRouter><ThemeProvider><LanguageProvider><LandingPage /></LanguageProvider></ThemeProvider></MemoryRouter>);
}

afterEach(() => { cleanup(); localStorage.removeItem('greytest.token'); });

describe('LandingPage', () => {
  it('sends visitors to sign up or sign in', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Test sinh ra từ chính mã nguồn' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Tải dự án đầu tiên' })).toHaveAttribute('href', '/register');
    expect(screen.getAllByRole('link', { name: 'Đăng nhập' })[0]).toHaveAttribute('href', '/login');
    expect(screen.getByRole('region', { name: 'Ví dụ mã nguồn service' })).toHaveTextContent('assertNoResourceConflict');
  });

  it('takes signed-in users straight to their projects', () => {
    localStorage.setItem('greytest.token', 'token');
    render(<MemoryRouter initialEntries={['/']}><ThemeProvider><LanguageProvider><Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/projects" element={<p>Projects page</p>} />
    </Routes></LanguageProvider></ThemeProvider></MemoryRouter>);
    expect(screen.getByText('Projects page')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1, name: 'Test sinh ra từ chính mã nguồn' })).not.toBeInTheDocument();
  });
});
