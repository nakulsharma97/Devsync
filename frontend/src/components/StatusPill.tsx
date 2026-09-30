import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  ACTIVE: "bg-tint-green-tile text-tint-green-fg border-tint-green-fg/30",
  COMPLETED: "bg-tint-blue-tile text-tint-blue-fg border-tint-blue-fg/30",
  ARCHIVED: "bg-tint-warm-tile text-tint-warm-fg border-tint-warm-fg/30",
  DELETED: "bg-muted text-muted-foreground border-border",
};

/**
 * Color-coded status badge shared across the app (Dashboard, Projects, …).
 *
 * `sm` is the dense default used in tables and list rows; `md` is the roomier
 * variant the dashboard's project cards use.
 */
export function StatusPill({
  status,
  size = "sm",
}: {
  status: string;
  size?: "sm" | "md";
}) {
  const label = status.charAt(0) + status.slice(1).toLowerCase();
  const md = size === "md";
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full border font-medium",
        md ? "h-[30px] gap-2 px-3 text-[13px]" : "gap-1 px-2 py-0.5 text-[10px]",
        statusStyles[status] || "bg-tint-warm-tile text-tint-warm-fg border-tint-warm-fg/30"
      )}
    >
      <span
        aria-hidden
        className={cn("rounded-full bg-current", md ? "h-2 w-2" : "h-1 w-1 opacity-70")}
      />
      {label}
    </span>
  );
}
