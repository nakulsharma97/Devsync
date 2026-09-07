import { cn } from "@/lib/utils";
import { useLocation } from "react-router";

/**
 * Skeleton component with shimmer animation.
 * Replaces loading spinners with content-shaped placeholders.
 */
export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg bg-muted/50 before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-muted/30 before:to-transparent",
        className
      )}
      {...props}
    />
  );
}

/** Skeleton card matching the Card component shape */
export function SkeletonCard() {
  return (
    <div className="border border-border/40 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-9 h-9 rounded-full" />
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-2.5 w-20" />
        </div>
      </div>
      <Skeleton className="h-16 w-full" />
      <div className="flex gap-4">
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-12" />
      </div>
    </div>
  );
}

/** Skeleton for a list of cards */
export function SkeletonCardList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

/** Skeleton for stat cards (numbers) */
export function SkeletonStatCard() {
  return (
    <div className="border border-border/40 rounded-xl p-4 space-y-2">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-2.5 w-20" />
    </div>
  );
}

/** Skeleton for a table row */
export function SkeletonTableRow() {
  return (
    <div className="flex items-center gap-3 p-3 border-b border-border/20">
      <Skeleton className="h-8 w-8 rounded-lg" />
      <div className="space-y-1.5 flex-1">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-2.5 w-24" />
      </div>
      <Skeleton className="h-3 w-16 ml-auto" />
    </div>
  );
}

/** Skeleton for a project card */
export function SkeletonProjectCard() {
  return (
    <div className="border border-border/40 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Skeleton className="w-8 h-8 rounded-lg" />
        <div className="space-y-1 flex-1">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-2.5 w-16" />
        </div>
        <Skeleton className="h-4 w-14 rounded-full" />
      </div>
      <Skeleton className="h-3 w-full" />
      <div className="flex gap-2">
        <Skeleton className="h-7 flex-1 rounded-md" />
        <Skeleton className="h-7 flex-1 rounded-md" />
      </div>
    </div>
  );
}

/** Skeleton for a conversation in Messages */
export function SkeletonConversation() {
  return (
    <div className="flex items-center gap-2 p-3 border-b border-border/20">
      <Skeleton className="w-8 h-8 rounded-full shrink-0" />
      <div className="space-y-1.5 flex-1 min-w-0">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-2.5 w-40" />
      </div>
    </div>
  );
}

/** Skeleton for a chat message bubble */
export function SkeletonMessageBubble() {
  return (
    <div className="flex gap-2 p-3">
      <Skeleton className="w-7 h-7 rounded-full shrink-0" />
      <div className="space-y-1.5 flex-1">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-8 w-48 rounded-2xl" />
      </div>
    </div>
  );
}

/**
 * Content-area skeleton shown while a lazy page chunk loads. Shapes itself
 * roughly like the destination page (using the pathname) so navigation feels
 * instant instead of flashing a centered spinner. Used as the Suspense
 * fallback in main.tsx — renders inside the dashboard layout's <main>.
 */
export function RouteSkeleton() {
  const { pathname } = useLocation();
  const section = pathname.split("/")[1] || "dashboard";

  switch (section) {
    case "messages":
      return (
        <div className="grid md:grid-cols-[280px_1fr] gap-4">
          <div className="border border-border/40 rounded-xl overflow-hidden hidden md:block">
            {[0, 1, 2, 3, 4].map((i) => (
              <SkeletonConversation key={i} />
            ))}
          </div>
          <div className="space-y-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <SkeletonMessageBubble key={i} />
            ))}
          </div>
        </div>
      );

    case "feed":
      return <SkeletonCardList count={3} />;

    case "board":
      return (
        <div className="grid md:grid-cols-3 gap-4">
          {[0, 1, 2].map((col) => (
            <div key={col} className="border border-border/40 rounded-xl p-3 space-y-3">
              <Skeleton className="h-4 w-24" />
              {[0, 1, 2].map((i) => (
                <SkeletonProjectCard key={i} />
              ))}
            </div>
          ))}
        </div>
      );

    case "admin":
      return (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Page title + description */}
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-3.5 w-72" />
          </div>
          {/* Search + filter bar */}
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 flex-1 max-w-sm rounded-xl" />
            <Skeleton className="h-10 w-32 rounded-xl" />
          </div>
          {/* Table header */}
          <div className="border border-border/40 rounded-xl overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border/30 bg-muted/30">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-20 ml-auto" />
              <Skeleton className="h-3 w-16 ml-4" />
            </div>
            {/* Table rows */}
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-3 border-b border-border/20 last:border-b-0"
              >
                <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
                <div className="space-y-1.5 flex-1 min-w-0">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-2.5 w-44" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full shrink-0" />
                <Skeleton className="h-8 w-20 rounded-lg shrink-0" />
              </div>
            ))}
          </div>
        </div>
      );

    case "analytics":
      return (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <SkeletonStatCard key={i} />
            ))}
          </div>
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="border border-border/40 rounded-xl p-6">
              <Skeleton className="h-64 w-full" />
            </div>
            <div className="border border-border/40 rounded-xl p-6">
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        </div>
      );

    case "notifications":
      return (
        <div className="mx-auto w-full max-w-6xl grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] items-start">
          <div className="space-y-5">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-9 w-64 rounded-full" />
            <div className="space-y-2.5">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-3.5 p-4 rounded-2xl border border-border/40">
                  <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-2.5 w-20" />
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-2 w-16" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="hidden lg:block space-y-5">
            <div className="rounded-2xl border border-border/40 p-5 space-y-3">
              <Skeleton className="h-4 w-24" />
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
            <div className="rounded-2xl border border-border/40 p-5 space-y-3">
              <Skeleton className="h-4 w-20" />
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </div>
        </div>
      );

    case "search":
      return (
        <div className="space-y-4 max-w-3xl mx-auto">
          <Skeleton className="h-10 w-full rounded-xl" />
          <SkeletonCardList count={3} />
        </div>
      );

    case "profile":
    case "settings":
      return (
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="flex items-center gap-4 p-4 border border-border/40 rounded-xl">
            <Skeleton className="w-16 h-16 rounded-full shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
          </div>
          {[0, 1, 2].map((i) => (
            <div key={i} className="border border-border/40 rounded-xl p-5 space-y-3">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
      );

    case "projects":
      return (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <SkeletonProjectCard key={i} />
          ))}
        </div>
      );

    default:
      // dashboard + anything else: stats on top, project cards below
      return (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <SkeletonStatCard key={i} />
            ))}
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <SkeletonProjectCard key={i} />
            ))}
          </div>
        </div>
      );
  }
}
