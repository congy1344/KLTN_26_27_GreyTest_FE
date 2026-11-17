// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { X } from 'lucide-react';
import { afterEach, expect, it, vi } from 'vitest';
import { IconButton } from './IconButton';

afterEach(cleanup);
it.each(['sm', 'default'] as const)('keeps %s icons centered and labels the button', (size) => {
  const onClick = vi.fn();
  const view = render(<IconButton icon={X} label="Close dialog" size={size} onClick={onClick} />);
  const button = screen.getByRole('button', { name: 'Close dialog' });
  expect(button).toHaveAttribute('type', 'button');
  expect(button).toHaveClass('inline-flex', 'items-center', 'justify-center', 'rounded-control', size === 'sm' ? 'h-8' : 'h-9');
  expect(button.querySelector('svg')).toHaveAttribute('width', size === 'sm' ? '16' : '18');
  expect(button.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  fireEvent.click(button); expect(onClick).toHaveBeenCalledOnce();
  view.rerender(<IconButton icon={X} label="Close dialog" size={size} onClick={onClick} disabled />);
  fireEvent.click(button); expect(onClick).toHaveBeenCalledOnce();
});
