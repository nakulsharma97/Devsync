const statusStyles: Record<string, string> = {
  ACTIVE: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  COMPLETED: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  ARCHIVED: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  DELETED: "bg-muted text-muted-foreground border-border/50",
};

/** Color-coded status badge shared across the app (Dashboard, Projects, …). */
export function StatusPill({ status }: { status: string }) {
  const label = status.charAt(0) + status.slice(1).toLowerCase();
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium whitespace-nowrap ${
        statusStyles[status] ||
        "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20"
      }`}
    >
      <span className="w-1 h-1 rounded-full bg-current opacity-70" />
      {label}
    </span>
  );
}
