import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { notificationService, type NotificationDto } from "@/services/notificationService";
import { wsService } from "@/services/websocketService";
import { Button } from "@/components/ui/button";
import { Bell, CheckCheck, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { SkeletonNotification } from "@/components/Skeletons";
import { timeAgo } from "@/lib/format";
import { getNotificationMeta, resolveNotificationUrl } from "@/lib/notificationMeta";
import { cn } from "@/lib/utils";

type Filter = "all" | "unread" | "read";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "read", label: "Read" },
];

/** Backend returns the latest 50 (GET /notifications?limit=50 — page 0 only). */
const PAGE_SIZE = 50;

export default function Notifications() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>("all");
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, count] = await Promise.all([
        notificationService.getNotifications(PAGE_SIZE),
        notificationService.getUnreadCount(),
      ]);
      setNotifications(list);
      setUnread(count);
    } catch {
      setError("Failed to load notifications. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Real-time: prepend notifications arriving over the existing STOMP
  // connection (/user/queue/notifications) — no new socket, no page refresh.
  useEffect(() => {
    const unsub = wsService.onNotification((n: NotificationDto) => {
      if (!n || !n.id) return;
      setNotifications((prev) => (prev.some((x) => x.id === n.id) ? prev : [n, ...prev]));
      if (!n.read) setUnread((c) => c + 1);
    });
    return () => {
      unsub();
    };
  }, []);

  const markRead = useCallback(
    async (n: NotificationDto) => {
      if (n.read) return;
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      setUnread((c) => Math.max(0, c - 1));
      try {
        await notificationService.markAsRead(n.id);
      } catch {
        toast("Failed to mark as read");
      }
    },
    []
  );

  const markAllRead = useCallback(async () => {
    if (unread === 0) return;
    setNotifications((prev) => prev.map((x) => ({ ...x, read: true })));
    setUnread(0);
    try {
      await notificationService.markAllAsRead();
      toast("All notifications marked as read");
    } catch {
      toast("Failed to mark all as read");
    }
  }, [unread]);

  const openNotification = useCallback(
    (n: NotificationDto) => {
      markRead(n);
      navigate(resolveNotificationUrl(n));
    },
    [markRead, navigate]
  );

  const visible = notifications.filter((n) =>
    filter === "all" ? true : filter === "unread" ? !n.read : n.read
  );

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {unread > 0 ? `${unread} unread` : "You're all caught up"}
          </p>
        </div>
        {unread > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <CheckCheck className="w-4 h-4 mr-1.5" /> Mark all read
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="inline-flex items-center gap-1 rounded-full border border-border/40 bg-card/60 p-1">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            aria-pressed={filter === f.id}
            className={cn(
              "px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200",
              filter === f.id
                ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {f.label}
            {f.id === "unread" && unread > 0 && (
              <span
                className={cn(
                  "ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold",
                  filter === f.id ? "bg-white/20 text-white" : "bg-indigo-500/10 text-indigo-500 dark:text-indigo-400"
                )}
              >
                {unread}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* States */}
      {loading ? (
        <div className="divide-y divide-border/20 border border-border/40 rounded-xl overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonNotification key={i} />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <AlertCircle className="w-10 h-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={load}>
            Retry
          </Button>
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-16">
          <Bell className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {filter === "all" ? "No notifications" : filter === "unread" ? "No unread notifications" : "No read notifications"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {filter === "all" ? "You're all caught up" : "Try another filter"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((n) => {
            const meta = getNotificationMeta(n.type);
            const Icon = meta.icon;
            return (
              <button
                key={n.id}
                onClick={() => openNotification(n)}
                className={cn(
                  "w-full text-left flex items-start gap-3 p-4 rounded-xl border transition-colors group",
                  n.read
                    ? "border-border/30 bg-card/50 hover:border-border/60"
                    : "border-indigo-500/20 bg-indigo-500/5 hover:border-indigo-500/30"
                )}
              >
                <div className={`relative w-9 h-9 rounded-xl shrink-0 flex items-center justify-center ${meta.colorClass}`}>
                  <Icon className="w-4 h-4" />
                  {!n.read && (
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-indigo-500 ring-2 ring-background" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm", n.read ? "text-muted-foreground" : "text-foreground font-medium")}>
                    {n.title}
                  </p>
                  {n.message && (
                    <p className={cn("text-xs mt-0.5", n.read ? "text-muted-foreground/70" : "text-muted-foreground")}>
                      {n.message}
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo(n.createdAt, "")}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
