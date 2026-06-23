interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export function GlassCard({ children, className = '', hover = false }: GlassCardProps) {
  return (
    <div
      className={`rounded-base border border-border-default bg-neutral-primary-soft p-5 shadow-sm transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
        hover ? 'cursor-pointer hover:-translate-y-0.5 hover:border-border-default-strong hover:shadow-md' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}
