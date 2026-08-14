import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Bell, CheckCheck, ChevronRight, Loader2, Inbox, AlertCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { notificationService, type NotificationDto } from "@/services/notificationService";
import { wsService } from "@/services/websocketService";
import { timeAgo } from "@/lib/format";
import { getNotificationMeta, resolveNotificationUrl } from "@/lib/notificationMeta";

/** How many notifications the dropdown loads (page 0 of the paginated list). */
const DROPDOWN_LIMIT = 20;

export function NotificationBell({
  unreadCount,
  onUnreadCountChange,
}: {
  unreadCount: number;
  onUnreadCountChange: (next: number | ((prev: number) => number)) => void;
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  // Refs guard against duplicate loads without making the callback identity
  // unstable (a state-based guard would re-trigger the open effect on every
  // loading/loaded change — and on the error path both are false, causing an
  // endless retry loop).
  const loadingRef = useRef(false);
  const loadedRef = useRef(false);

  const loadNotifications = useCallback(async () => {
    if (loadingRef.current || loadedRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setLoadError(false);
    try {
      const list = await notificationService.getLatestNotifications(DROPDOWN_LIMIT);
      setNotifications(list);
      loadedRef.current = true;
    } catch {
      setLoadError(true);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  // Load only when the dropdown is first opened.
  useEffect(() => {
    if (open) loadNotifications();
  }, [open, loadNotifications]);

  // Real-time: the backend pushes new notifications over the EXISTING STOMP
  // connection (/user/queue/notifications). No new socket is created.
  useEffect(() => {
    const unsub = wsService.onNotification((data: NotificationDto) => {
      if (!data || !data.id) return;
      setNotifications((prev) =>
        prev.some((n) => n.id === data.id) ? prev : [data, ...prev].slice(0, DROPDOWN_LIMIT)
      );
      if (!data.read) onUnreadCountChange((c) => c + 1);
    });
    return () => {
      unsub();
    };
  }, [onUnreadCountChange]);

  const markRead = useCallback(
    (n: NotificationDto) => {
      if (!n.read) {
        onUnreadCountChange((c) => Math.max(0, c - 1));
        setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
        notificationService.markAsRead(n.id).catch(() => {});
      }
    },
    [onUnreadCountChange]
  );

  const markAllRead = useCallback(async () => {
    if (unreadCount === 0) return;
    onUnreadCountChange(0);
    setNotifications((prev) => prev.map((x) => ({ ...x, read: true })));
    try {
      await notificationService.markAllAsRead();
    } catch {
      // The dashboard's periodic unread poll re-syncs the count.
    }
  }, [unreadCount, onUnreadCountChange]);

  const openNotification = useCallback(
    (n: NotificationDto) => {
      markRead(n);
      setOpen(false);
      navigate(resolveNotificationUrl(n));
    },
    [markRead, navigate]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          aria-label="Notifications"
          className="relative inline-flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 outline-none transition-colors"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center shadow-sm">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-80 max-w-[calc(100vw-1.5rem)] p-0 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border/50">
          <p className="text-sm font-semibold">
            Notifications
            {unreadCount > 0 && (
              <span className="ml-2 text-[10px] font-medium text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">
                {unreadCount} new
              </span>
            )}
          </p>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" /> Mark all read
            </button>
          )}
        </div>

        {/* List — independent scroll area so the page never scrolls with it */}
        <ScrollArea className="max-h-[min(420px,60vh)]">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
            </div>
          ) : loadError ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center px-6">
              <AlertCircle className="w-6 h-6 text-muted-foreground/50" />
              <p className="text-xs text-muted-foreground">Couldn&apos;t load notifications</p>
              <button
                onClick={() => {
                  loadedRef.current = false;
                  setLoadError(false);
                  loadNotifications();
                }}
                className="text-[11px] text-indigo-500 hover:underline"
              >
                Try again
              </button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center px-6">
              <Inbox className="w-6 h-6 text-muted-foreground/50" />
              <p className="text-xs text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <ul className="divide-y divide-border/40">
              {notifications.map((n) => {
                const meta = getNotificationMeta(n.type);
                const Icon = meta.icon;
                return (
                  <li key={n.id}>
                    <button
                      onClick={() => openNotification(n)}
                      className={`w-full text-left flex items-start gap-3 px-4 py-3 transition-colors ${
                        n.read
                          ? "hover:bg-muted/40"
                          : "bg-accent/5 hover:bg-accent/10"
                      }`}
                    >
                      <span
                        className={`relative w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ${meta.colorClass}`}
                      >
                        <Icon className="w-4 h-4" />
                        {!n.read && (
                          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-indigo-500 ring-2 ring-background" />
                        )}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span
                          className={`block text-xs leading-snug ${
                            n.read ? "text-muted-foreground" : "text-foreground font-medium"
                          }`}
                        >
                          {n.title}
                        </span>
                        {n.message && (
                          <span className="block text-[11px] text-muted-foreground/80 mt-0.5 line-clamp-2">
                            {n.message}
                          </span>
                        )}
                        <span className="block text-[10px] text-muted-foreground/60 mt-1">
                          {timeAgo(n.createdAt, "recently")}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="border-t border-border/50 p-1.5">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between text-xs font-medium text-muted-foreground hover:text-foreground"
            onClick={() => {
              setOpen(false);
              navigate("/notifications");
            }}
          >
            View all notifications
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
