import { ArrowUpRight, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/Skeletons";
import { useCountUp } from "@/hooks/useCountUp";
import { cn } from "@/lib/utils";

/** Accent family for a stat card — surface, hairline border and icon tile. */
export type StatTone = "warm" | "blue" | "green";

const tones: Record<StatTone, { card: string; tile: string }> = {
  warm: {
    card: "border-tint-warm-border bg-tint-warm",
    tile: "bg-tint-warm-tile text-tint-warm-fg",
  },
  blue: {
    card: "border-tint-blue-border bg-tint-blue",
    tile: "bg-tint-blue-tile text-tint-blue-fg",
  },
  green: {
    card: "border-tint-green-border bg-tint-green",
    tile: "bg-tint-green-tile text-tint-green-fg",
  },
};

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  /** Destination opened by clicking anywhere on the card. */
  to: string;
  tone: StatTone;
  onOpen: (to: string) => void;
  /** Big number; ignored when `main` is supplied. */
  value?: number | null;
  loading?: boolean;
  /** Overrides the numeric value (e.g. a text-led card). */
  main?: React.ReactNode;
  sub: React.ReactNode;
  /** Renders the arrow affordance in the top-right corner. */
  linkable?: boolean;
}

/**
 * Summary tile: icon in a tinted square, label beside it, then the headline
 * figure and a quiet caption. The whole card is the hit target, so the number
 * is never a 12px tap area on mobile.
 */
export function StatCard({
  icon: Icon,
  label,
  to,
  tone,
  onOpen,
  value,
  loading = false,
  main,
  sub,
  linkable = false,
}: StatCardProps) {
  const { card, tile } = tones[tone];
  const display = useCountUp(value ?? 0, {
    enabled: value !== undefined && value !== null && !loading,
  });

  return (
    <Card
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={() => onOpen(to)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(to);
        }
      }}
      className={cn(
        "group min-h-[176px] cursor-pointer gap-0 rounded-[15px] p-5 shadow-[var(--shadow-card)] outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.18)]",
        card
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn("flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[14px]", tile)}
        >
          <Icon className="h-6 w-6" strokeWidth={1.9} />
        </span>
        <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-foreground">
          {label}
        </span>
        {linkable && (
          <ArrowUpRight className="h-5 w-5 shrink-0 text-muted-foreground transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
        )}
      </div>

      <div className="mt-4 sm:pl-16">
        {main ??
          (loading || value === null || value === undefined ? (
            <Skeleton className="h-8 w-14" />
          ) : (
            <p className="font-display text-[32px] font-bold leading-none tracking-tight tabular-nums text-foreground">
              {display}
            </p>
          ))}
        <div className="mt-2 text-[13px] text-muted-foreground">{sub}</div>
      </div>
    </Card>
  );
}

export default StatCard;
