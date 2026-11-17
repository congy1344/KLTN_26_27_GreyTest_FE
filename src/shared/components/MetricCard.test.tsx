// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Activity } from 'lucide-react';
import { afterEach, describe, expect, it } from 'vitest';
import { MetricCard } from './MetricCard';

afterEach(() => {
  cleanup();
});

describe('MetricCard', () => {
  it('renders label and value without trend', () => {
    render(<MetricCard icon={Activity} label="Total Users" value={150} hint="All registered accounts" />);

    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('All registered accounts')).toBeInTheDocument();
  });

  it('renders upward trend with green success styling', () => {
    render(
      <MetricCard
        icon={Activity}
        label="New Users"
        value={25}
        trend={{ value: '+12', direction: 'up', label: 'vs last week' }}
      />,
    );

    expect(screen.getByText('+12')).toBeInTheDocument();
    expect(screen.getByText('vs last week')).toBeInTheDocument();
  });

  it('renders custom tone like danger with upward direction', () => {
    render(
      <MetricCard
        icon={Activity}
        label="Quota Alerts"
        value={3}
        trend={{ value: '+3', direction: 'up', tone: 'danger', label: 'exceeded' }}
      />,
    );

    expect(screen.getByText('+3')).toBeInTheDocument();
    expect(screen.getByText('exceeded')).toBeInTheDocument();
  });

  it('renders neutral trend with minus icon', () => {
    render(
      <MetricCard
        icon={Activity}
        label="Stable Metric"
        value={100}
        trend={{ value: '0', direction: 'neutral', label: 'stable' }}
      />,
    );

    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('stable')).toBeInTheDocument();
  });
});
