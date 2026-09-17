import { type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-16",
        className
      )}
    >
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/10 flex items-center justify-center ring-1 ring-primary/20 mb-5">
        <Icon className="w-7 h-7 text-primary" />
      </div>
      <h3 className="text-base font-semibold mb-1.5">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button
          size="sm"
          onClick={onAction}
          className="mt-4 bg-primary text-white hover:from-primary hover:to-primary"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
