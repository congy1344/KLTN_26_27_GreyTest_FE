// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import { ProjectPageHeader } from './ProjectPageHeader';
import type { Project } from '../types';

afterEach(cleanup);

function mockProject(overrides: Partial<Project> = {}): Project {
  return {
    id: 101,
    name: 'Hospital Management',
    sourceType: 'ZIP',
    sourceUrl: null,
    sourceAvailable: true,
    status: 'COMPLETED',
    createdAt: '2026-10-20T00:00:00Z',
    ownerUserId: null,
    ...overrides,
  };
}

describe('ProjectPageHeader', () => {
  it('renders project name, status and source update button by default', () => {
    render(
      <MemoryRouter>
        <ProjectPageHeader
          project={mockProject()}
          titlePrefix="Test Plan"
          subtitle="Test plan description"
          backTo="/projects/101"
          backLabel="Back to Analysis"
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Test Plan · Hospital Management' })).toBeVisible();
    expect(screen.getByText('Test plan description')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Cập nhật source' })).toBeVisible();
  });

  it('opens source update modal when clicking source update button', () => {
    render(
      <MemoryRouter>
        <ProjectPageHeader
          project={mockProject()}
          subtitle="Subtitle"
          backTo="/projects/101"
          backLabel="Back"
        />
      </MemoryRouter>,
    );

    const updateBtn = screen.getByRole('button', { name: 'Cập nhật source' });
    fireEvent.click(updateBtn);
    expect(screen.getByRole('heading', { name: /Cập nhật Source Code/i })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Đóng modal' })).toBeVisible();
  });

  it('can hide source update button when showSourceUpdate is false', () => {
    render(
      <MemoryRouter>
        <ProjectPageHeader
          project={mockProject()}
          subtitle="Subtitle"
          backTo="/projects/101"
          backLabel="Back"
          showSourceUpdate={false}
        />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('button', { name: 'Cập nhật source' })).not.toBeInTheDocument();
  });
});
