// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Check, Loader2 } from 'lucide-react';
import { afterEach, expect, it } from 'vitest';
import { Tag } from './Tag';

afterEach(cleanup);

it('renders metadata as a neutral chip and preserves caller attributes', () => {
  render(<Tag data-testid="count" className="font-mono tabular-nums" title="Services">5</Tag>);
  const tag = screen.getByTestId('count');
  expect(tag).toHaveAttribute('data-tone', 'neutral');
  expect(tag).toHaveAttribute('title', 'Services');
  expect(tag).toHaveClass('rounded-control', 'bg-neutral-secondary-medium', 'text-heading', 'font-mono', 'tabular-nums');
});

it('renders status as a tinted pill with an accessible decorative icon', () => {
  render(<Tag variant="status" tone="success" icon={Check}>Đạt</Tag>);
  const tag = screen.getByText('Đạt');
  expect(tag).toHaveAttribute('data-tone', 'success');
  expect(tag).toHaveClass('rounded-control', 'bg-success-soft', 'text-fg-success-strong');
  expect(tag.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
});

it('animates the running status icon', () => {
  render(<Tag variant="status" tone="brand" icon={Loader2}>Đang chạy</Tag>);
  expect(screen.getByText('Đang chạy').querySelector('svg')).toHaveClass('animate-spin');
});
