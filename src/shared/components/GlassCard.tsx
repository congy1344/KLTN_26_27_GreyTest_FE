interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export function GlassCard({ children, className = '', hover = false }: GlassCardProps) {
  return (
    <div
      className={`rounded-base border border-border-default bg-neutral-primary-soft p-5  transition-colors duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
        hover ? 'cursor-pointer  hover:border-border-default-strong ' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}
