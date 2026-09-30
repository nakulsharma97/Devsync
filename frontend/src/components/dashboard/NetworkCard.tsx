import { ArrowRight, UserRoundPlus } from "lucide-react";
import { Card } from "@/components/ui/card";

/** Small nudge card in the right column that funnels into the network page. */
export function NetworkCard({ onExplore }: { onExplore: () => void }) {
  return (
    <Card className="gap-0 rounded-[15px] border-border bg-card p-6 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-[17px] font-semibold tracking-tight text-foreground">
          Stay in the loop
        </h3>
        <UserRoundPlus className="h-5 w-5 shrink-0 text-foreground" strokeWidth={1.8} />
      </div>
      <p className="mt-2 text-[14px] leading-[1.55] text-muted-foreground">
        Collaborate, get feedback, and ship faster with your network.
      </p>
      <button
        onClick={onExplore}
        className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[12px] border border-chip-border bg-surface-input text-[14px] font-semibold text-foreground transition-colors hover:bg-muted"
      >
        Explore Network
        <ArrowRight className="h-[18px] w-[18px]" />
      </button>
    </Card>
  );
}

export default NetworkCard;
