import type { ButtonHTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label' | 'type'> & {
  label: string;
  icon: LucideIcon;
  size?: 'sm' | 'default';
};

export function IconButton({ label, icon: Icon, size = 'default', className = '', ...props }: IconButtonProps) {
  return (
    <button {...props} type="button" aria-label={label}
      className={`icon-button inline-flex items-center justify-center rounded-control text-body-subtle ${size === 'sm' ? 'h-8 w-8' : 'h-9 w-9'} ${className}`}>
      <Icon size={size === 'sm' ? 16 : 18} aria-hidden="true" />
    </button>
  );
}
