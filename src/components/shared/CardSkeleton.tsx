'use client';

interface CardSkeletonProps {
  lines?: number;
  className?: string;
}

export function CardSkeleton({ lines = 3, className }: CardSkeletonProps) {
  // Generate widths deterministically based on component props to avoid re-generation on each render
  const widths = Array.from({ length: Math.max(0, lines - 1) }).map((_, i) => {
    // Use a simple seeded random based on index to maintain consistency
    const seed = i + 42; // Offset to avoid always getting the same values
    const random = Math.sin(seed) * 10000;
    return 60 + ((random - Math.floor(random)) * 30);
  });

  return (
    <div className={`rounded-xl border border-border bg-surface-1 p-6 ${className}`}>
      <div className="animate-pulse space-y-3">
        <div className="h-3 w-24 rounded bg-surface-3" />
        <div className="h-8 w-40 rounded bg-surface-3" />
        {widths.map((width, i) => (
          <div key={i} className="h-3 rounded bg-surface-3" style={{ width: `${width}%` }} />
        ))}
      </div>
    </div>
  );
}
