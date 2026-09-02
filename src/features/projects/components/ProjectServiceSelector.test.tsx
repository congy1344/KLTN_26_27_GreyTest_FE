// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProjectServiceSelector } from './ProjectServiceSelector';

afterEach(cleanup);

describe('ProjectServiceSelector', () => {
  it('hides the selector when the project has one service', () => {
    render(
      <ProjectServiceSelector
        services={[{ servicePath: '.', name: 'root', status: 'ANALYZED' }]}
        onChange={vi.fn()}
      />,
    );

    expect(screen.queryByRole('combobox', { name: 'Chọn service' })).not.toBeInTheDocument();
  });

  it('requires a module choice and reports the selected service path', () => {
    const onChange = vi.fn();
    render(
      <ProjectServiceSelector
        services={[
          { servicePath: 'account-service', name: 'account-service', status: 'ANALYZED' },
          { servicePath: 'auth-service', name: 'auth-service', status: 'BR_APPROVED' },
        ]}
        onChange={onChange}
      />,
    );

    const selector = screen.getByRole('combobox', { name: 'Chọn service' });
    expect(selector).toHaveValue('');
    expect(screen.getByRole('option', { name: 'account-service (account-service)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'auth-service (auth-service)' })).toBeInTheDocument();

    fireEvent.change(selector, { target: { value: 'auth-service' } });

    expect(onChange).toHaveBeenCalledWith('auth-service');
  });
});
