// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { ProjectWorkflowTabs } from './ProjectWorkflowTabs';

afterEach(cleanup);

describe('ProjectWorkflowTabs', () => {
  it('links project workflow screens and marks the active tab', () => {
    render(
      <MemoryRouter>
        <ProjectWorkflowTabs projectId={7} active="test-plans" />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /Analysis & BR/ })).toHaveAttribute('href', '/projects/7');
    expect(screen.getByRole('link', { name: /Test Plan/ })).toHaveAttribute('href', '/projects/7/test-plans');
    expect(screen.getByRole('link', { name: /Test Case/ })).toHaveAttribute('href', '/projects/7/test-cases');
    expect(screen.getByRole('link', { name: /Unit Test/ })).toHaveAttribute('href', '/projects/7/unit-tests');
    expect(screen.getByRole('link', { name: /Test Plan/ })).toHaveAttribute('aria-current', 'page');
  });

  it('does not link to test plans before business rules are approved', () => {
    render(
      <MemoryRouter>
        <ProjectWorkflowTabs projectId={7} active="analysis" testPlansEnabled={false} />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('link', { name: /Test Plan/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Test Case/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Unit Test/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Duyệt Business Rule trước/).closest('[aria-disabled]')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('does not link to test cases before test plans are approved', () => {
    render(
      <MemoryRouter>
        <ProjectWorkflowTabs projectId={7} active="test-plans" testCasesEnabled={false} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /Test Plan/ })).toHaveAttribute('href', '/projects/7/test-plans');
    expect(screen.queryByRole('link', { name: /Test Case/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Unit Test/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Duyệt Test Plan trước/).closest('[aria-disabled]')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('does not link to unit tests before test cases are approved', () => {
    render(
      <MemoryRouter>
        <ProjectWorkflowTabs projectId={7} active="test-cases" unitTestsEnabled={false} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /Test Case/ })).toHaveAttribute('href', '/projects/7/test-cases');
    expect(screen.queryByRole('link', { name: /Unit Test/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Duyệt Test Case trước/).closest('[aria-disabled]')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });
});
