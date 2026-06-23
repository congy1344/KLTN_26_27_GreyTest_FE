interface SkeletonLoaderProps {
  count?: number;
}

export function SkeletonLoader({ count = 3 }: SkeletonLoaderProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-base border border-border-default bg-neutral-primary-soft p-5 shadow-sm animate-fade-in-up"
          style={{ animationDelay: `${i * 0.08}s` }}
        >
          <div className="flex items-center justify-between">
            <div className="space-y-2.5 flex-1">
              <div className="h-4 w-40 rounded-sm bg-neutral-secondary-medium animate-pulse" />
              <div className="flex gap-2">
                <div className="h-3 w-16 rounded-full bg-neutral-secondary-medium animate-pulse" />
                <div className="h-3 w-24 rounded-full bg-neutral-secondary-medium animate-pulse" />
              </div>
            </div>
            <div className="h-7 w-16 rounded-default bg-neutral-secondary-medium animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
