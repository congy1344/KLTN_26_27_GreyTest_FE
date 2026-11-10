// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
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
});
