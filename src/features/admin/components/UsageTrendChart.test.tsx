// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { UsageTrendChart } from './UsageTrendChart';

afterEach(cleanup);

describe('UsageTrendChart', () => {
  it('shows an empty state without activity', () => {
    render(<UsageTrendChart points={[]} />);
    expect(screen.getByText('Chưa có dữ liệu trong khoảng thời gian này.')).toBeInTheDocument();
  });

  it('renders one accessible bar for every time bucket', () => {
    render(<UsageTrendChart points={[
      { bucket: '2026-08-20T00:00:00', total: 2 },
      { bucket: '2026-08-21T00:00:00', total: 5 },
    ]} />);
    expect(screen.getByLabelText('Biểu đồ xu hướng sử dụng').children).toHaveLength(2);
    expect(screen.getByTitle('2026-08-21T00:00:00: 5')).toBeInTheDocument();
  });

  it('renders line chart with monthly and yearly granularity labels', () => {
    const { rerender } = render(
      <UsageTrendChart
        granularity="month"
        points={[
          { bucket: '2026-09-01T00:00:00', total: 10 },
          { bucket: '2026-10-01T00:00:00', total: 25 },
        ]}
      />
    );
    expect(screen.getByText('T09/26')).toBeInTheDocument();
    expect(screen.getByText('T10/26')).toBeInTheDocument();

    rerender(
      <UsageTrendChart
        granularity="year"
        points={[
          { bucket: '2025-01-01T00:00:00', total: 100 },
          { bucket: '2026-01-01T00:00:00', total: 250 },
        ]}
      />
    );
    expect(screen.getByText('2025')).toBeInTheDocument();
    expect(screen.getByText('2026')).toBeInTheDocument();
  });

  it('handles mouse interactions and prevents default scroll behavior on click', () => {
    render(
      <UsageTrendChart
        points={[
          { bucket: '2026-10-21T00:00:00', total: 10 },
          { bucket: '2026-10-22T00:00:00', total: 30 },
        ]}
      />
    );

    const firstPoint = screen.getByTitle('2026-10-21T00:00:00: 10');
    expect(firstPoint).toBeInTheDocument();

    // Verify mouseDown triggers preventDefault to stop horizontal auto-scroll
    const mouseDownEvent = fireEvent.mouseDown(firstPoint);
    expect(mouseDownEvent).toBe(false); // defaultPrevented returns false for fireEvent when prevented

    // Verify hover interaction
    fireEvent.mouseEnter(firstPoint);
    expect(screen.getByText('10')).toBeInTheDocument();

    fireEvent.mouseLeave(firstPoint);
  });

  it('renders single data point with column pillar representation', () => {
    render(<UsageTrendChart points={[{ bucket: '2026-11-01T00:00:00', total: 195 }]} granularity="month" />);
    expect(screen.getByTitle('2026-11-01T00:00:00: 195')).toBeInTheDocument();
    expect(screen.getByText('T11/26')).toBeInTheDocument();
  });
});
