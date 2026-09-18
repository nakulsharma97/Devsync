const statusStyles: Record<string, string> = {
  ACTIVE: "bg-primary/10 text-primary border-primary/20",
  COMPLETED: "bg-info/10 text-info-text border-info/20",
  ARCHIVED: "bg-primary/10 text-primary border-primary/20",
  DELETED: "bg-muted text-muted-foreground border-border/50",
};

/** Color-coded status badge shared across the app (Dashboard, Projects, …). */
export function StatusPill({ status }: { status: string }) {
  const label = status.charAt(0) + status.slice(1).toLowerCase();
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium whitespace-nowrap ${
        statusStyles[status] ||
        "bg-primary/10 text-primary border-primary/20"
      }`}
    >
      <span className="w-1 h-1 rounded-full bg-current opacity-70" />
      {label}
    </span>
  );
}
