import { ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { QuickAction } from "@/components/dashboard/navigation";

interface QuickActionsProps {
  actions: QuickAction[];
  onOpen: (to: string) => void;
}

export function QuickActions({ actions, onOpen }: QuickActionsProps) {
  return (
    <Card className="gap-0 rounded-[15px] border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <h3 className="px-1 font-display text-[18px] font-semibold tracking-tight text-foreground">
        Quick Actions
      </h3>
      <div className="mt-3 space-y-2">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={() => onOpen(action.to)}
            className="flex h-12 w-full items-center gap-3.5 rounded-[10px] border border-border-subtle px-3 text-left text-[14px] font-semibold text-foreground transition-colors hover:border-border hover:bg-muted"
          >
            <action.icon
              className="h-5 w-5 shrink-0 text-muted-foreground"
              strokeWidth={1.8}
            />
            <span className="flex-1 truncate">{action.label}</span>
            <ChevronRight className="h-[18px] w-[18px] shrink-0 text-muted-foreground" />
          </button>
        ))}
      </div>
    </Card>
  );
}

export default QuickActions;
