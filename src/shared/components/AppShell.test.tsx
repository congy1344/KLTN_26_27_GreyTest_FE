// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppShell } from './AppShell';

vi.mock('./QuotaMeter', () => ({ QuotaMeter: () => <button>Quota</button> }));
vi.mock('./UserDropdownMenu', () => ({ UserDropdownMenu: () => <button>Account</button> }));
afterEach(cleanup);

describe('AppShell project navigation', () => {
  it.each(['/projects', '/projects/new', '/projects/7/test-plans', '/settings'])('keeps only the logo, quota and account at %s', (path) => {
    render(<MemoryRouter initialEntries={[path]}><AppShell><p>Content</p></AppShell></MemoryRouter>);
    const nav = within(screen.getByRole('navigation'));
    expect(nav.getAllByRole('link')).toHaveLength(1);
    expect(nav.getByRole('link', { name: 'GreyTest' })).toHaveAttribute('href', '/projects');
    expect(nav.getAllByRole('button').map(button => button.textContent)).toEqual(['Quota', 'Account']);
    expect(screen.queryByTestId('nav-projects-link')).not.toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('lets the workspace fill the viewport while retaining the header margins', () => {
    const view = render(<MemoryRouter><AppShell maxWidth="bleed"><p>Workspace</p></AppShell></MemoryRouter>);
    expect(screen.getByRole('main')).toHaveClass('w-full');
    expect(screen.getByRole('main').className).not.toMatch(/mx-auto|max-w-|px-/);
    expect(view.container.querySelector('nav > div')).toHaveClass('mx-auto', 'max-w-[96%]', 'px-4', 'sm:px-6');
  });
});
