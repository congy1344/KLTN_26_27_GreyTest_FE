interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export function GlassCard({ children, className = '', hover = false }: GlassCardProps) {
  return (
    <div
      className={`bg-neutral-primary-soft border border-border-default rounded-base shadow-xs p-5 transition-all duration-200 ${
        hover ? 'cursor-pointer hover:border-border-default-strong hover:shadow-sm' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}
