import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { activityService } from "@/services/activityService";

interface DayData {
  date: string;
  count: number;
  dayOfWeek: number; // 0=Sun
  weekIndex: number;
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

function getIntensity(count: number, maxCount: number): string {
  if (count === 0) return "bg-muted/30";
  const ratio = count / (maxCount || 1);
  if (ratio <= 0.25) return "bg-accent/25";
  if (ratio <= 0.5) return "bg-accent/45";
  if (ratio <= 0.75) return "bg-accent/65";
  return "bg-accent/85";
}

export function ContributionGraph({ userId }: { userId?: string }) {
  const [data, setData] = useState<{ date: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState<{ date: string; count: number; x: number; y: number } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const result = userId
          ? await activityService.getContributionsByUser(userId)
          : await activityService.getContributions();
        setData(result);
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, [userId]);

  const { days, maxCount, totalContributions } = useMemo(() => {
    // Build a grid of 365 days
    const today = new Date();
    const grid: DayData[] = [];
    const countMap = new Map(data.map((d) => [d.date, d.count]));
    let max = 0;
    let total = 0;

    for (let i = 364; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const count = countMap.get(dateStr) || 0;
      max = Math.max(max, count);
      total += count;
      grid.push({
        date: dateStr,
        count,
        dayOfWeek: d.getDay(),
        weekIndex: Math.floor(i / 7),
      });
    }
    return { days: grid, maxCount: max, totalContributions: total };
  }, [data]);

  const weeks = useMemo(() => {
    const w: DayData[][] = [];
    // Group by weekIndex
    const map = new Map<number, DayData[]>();
    for (const d of days) {
      if (!map.has(d.weekIndex)) map.set(d.weekIndex, []);
      map.get(d.weekIndex)!.push(d);
    }
    // Sort weeks descending (oldest first is rightmost)
    const sortedKeys = Array.from(map.keys()).sort((a, b) => a - b);
    for (const key of sortedKeys) {
      w.push(map.get(key)!);
    }
    return w;
  }, [days]);

  if (loading) {
    return (
      <div className="h-32 bg-muted/20 rounded-xl animate-pulse" />
    );
  }

  const cellSize = 12;
  const cellGap = 2;
  const colWidth = cellSize + cellGap;

  return (
    <div className="bg-card border border-border/50 rounded-xl p-4 md:p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-sm bg-accent/40" />
          Contributions
        </h3>
        <span className="text-xs text-muted-foreground">
          {totalContributions.toLocaleString()} contributions in the last year
        </span>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="flex gap-0.5 relative" style={{ minWidth: weeks.length * colWidth }}>
          {/* Month labels */}
          <div className="flex gap-0.5 mb-1" style={{ marginLeft: DAY_LABELS.filter(l => l).length * colWidth }}>
            {weeks.map((week, wi) => {
              const firstDay = week[0];
              const month = new Date(firstDay.date).getMonth();
              const prevWeek = weeks[wi - 1];
              const prevMonth = prevWeek ? new Date(prevWeek[0].date).getMonth() : -1;
              if (month !== prevMonth) {
                return (
                  <span
                    key={wi}
                    className="text-[9px] text-muted-foreground"
                    style={{ width: colWidth, marginRight: colWidth * (week.length - 1) }}
                  >
                    {MONTH_LABELS[month]}
                  </span>
                );
              }
              return null;
            })}
          </div>

          <div className="flex gap-0.5">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-0.5">
                {week.map((day) => (
                  <motion.div
                    key={day.date}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2, delay: Math.random() * 0.3 }}
                    className={`w-3 h-3 rounded-sm ${getIntensity(day.count, maxCount)} relative cursor-pointer transition-colors duration-200 hover:ring-1 hover:ring-accent/50`}
                    onMouseEnter={(e) => {
                      const rect = (e.target as HTMLElement).getBoundingClientRect();
                      setTooltip({ date: day.date, count: day.count, x: rect.left, y: rect.top - 8 });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-popover text-popover-foreground text-[10px] font-medium px-2 py-1 rounded-md border border-border shadow-sm pointer-events-none whitespace-nowrap"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.count} contribution{tooltip.count !== 1 ? "s" : ""} on{" "}
          {new Date(tooltip.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-1.5 mt-3 text-[10px] text-muted-foreground justify-end">
        <span>Less</span>
        {["bg-muted/30", "bg-accent/25", "bg-accent/45", "bg-accent/65", "bg-accent/85"].map((cls) => (
          <div key={cls} className={`w-3 h-3 rounded-sm ${cls}`} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
