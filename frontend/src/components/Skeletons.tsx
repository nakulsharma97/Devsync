import { cn } from "@/lib/utils";

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

/** Skeleton for a notification item */
export function SkeletonNotification() {
  return (
    <div className="flex items-start gap-3 p-3 border-b border-border/20">
      <Skeleton className="w-8 h-8 rounded-full shrink-0" />
      <div className="space-y-1.5 flex-1">
        <Skeleton className="h-3 w-48" />
        <Skeleton className="h-2.5 w-32" />
        <Skeleton className="h-2 w-16" />
      </div>
    </div>
  );
}

/** Full-page loading state with centered spinner */
export function LoadingPage() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}
