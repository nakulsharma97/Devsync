import { ArrowRight, Crown, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UpgradeBannerProps {
  onUpgrade: () => void;
  onLearnMore: () => void;
  onDismiss: () => void;
}

/**
 * Free-plan nudge. Dismissible, and deliberately the only warm accent surface
 * in the main column besides the stat tiles — it should read as a nudge, not
 * an error, so it never uses a saturated fill.
 */
export function UpgradeBanner({ onUpgrade, onLearnMore, onDismiss }: UpgradeBannerProps) {
  return (
    <div className="flex min-h-[100px] flex-col gap-4 rounded-[14px] border border-accent-warm-border bg-accent-warm-surface p-5 sm:flex-row sm:items-center sm:gap-4">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-tint-warm-tile text-tint-warm-fg">
        <Crown className="h-[22px] w-[22px]" strokeWidth={1.9} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold text-foreground">You&apos;re on the Free plan</p>
        <p className="mt-1 text-[14px] text-muted-foreground">
          Upgrade to get private projects, more storage, and advanced features.
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button
          onClick={onUpgrade}
          className="h-[42px] min-w-[100px] rounded-[10px] px-4 text-[14px] font-semibold"
        >
          Upgrade
        </Button>
        <button
          onClick={onLearnMore}
          className="inline-flex items-center gap-2 rounded-[10px] px-2 py-2 text-[14px] font-semibold text-tint-warm-fg transition-colors hover:bg-tint-warm-tile"
        >
          Learn more
          <ArrowRight className="h-4 w-4" />
        </button>
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="flex h-9 w-9 items-center justify-center rounded-[10px] text-muted-foreground transition-colors hover:bg-tint-warm-tile hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

export default UpgradeBanner;
