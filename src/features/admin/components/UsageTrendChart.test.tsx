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
});
