// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { UnitTestsPanel } from './UnitTestsPanel';

afterEach(cleanup);

describe('UnitTestsPanel', () => {
  it('shows generation modes supported by backend', () => {
    render(<UnitTestsPanel />);

    const modeSelect = screen.getByRole('combobox', { name: /Generation mode/i });

    expect(modeSelect).toHaveDisplayValue('NEW_TEST');
    expect(screen.getByRole('option', { name: 'NEW_TEST' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'IMPROVE_EXISTING_TEST' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'SUPPLEMENT_EXISTING_TEST' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'EXTEND_EXISTING_TEST' })).not.toBeInTheDocument();
  });
});
