interface ShimmerProps {
  className?: string;
  count?: number;
  variant?: "card" | "line" | "avatar" | "title" | "button";
}

const variants = {
  card: "h-32 w-full rounded-xl",
  line: "h-3 w-full rounded",
  avatar: "h-8 w-8 rounded-full",
  title: "h-5 w-1/3 rounded",
  button: "h-9 w-24 rounded-lg",
};

export function Shimmer({ className = "", count = 1, variant = "line" }: ShimmerProps) {
  const baseClass = variants[variant];

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`${baseClass} relative overflow-hidden bg-muted/60 ${className}`}
        >
          <div
            className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite]"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)",
            }}
          />
        </div>
      ))}
    </>
  );
}

/** Shimmer card with multiple lines for post skeletons */
export function PostSkeleton() {
  return (
    <div className="border border-border/50 rounded-xl p-5 bg-card">
      <div className="flex items-center gap-2 mb-3">
        <Shimmer variant="avatar" />
        <Shimmer variant="title" className="!w-24" />
      </div>
      <div className="space-y-2">
        <Shimmer variant="line" className="!h-2.5" />
        <Shimmer variant="line" className="!h-2.5 !w-3/4" />
        <Shimmer variant="line" className="!h-2.5 !w-1/2" />
      </div>
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border/50">
        <Shimmer variant="button" />
        <Shimmer variant="button" className="!w-28" />
      </div>
    </div>
  );
}
