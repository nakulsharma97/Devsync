import { useApi } from "@/hooks/useApi";
import { notificationService, type NotificationDto } from "@/services/notificationService";
import { Button } from "@/components/ui/button";
import { Bell, Loader2, Check, UserPlus, MessageSquare, FolderKanban } from "lucide-react";
import { toast } from "sonner";

const iconMap: Record<string, any> = {
  INVITE: UserPlus,
  MENTION: MessageSquare,
  PROJECT_UPDATE: FolderKanban,
};

const colorMap: Record<string, string> = {
  INVITE: "text-purple-400 bg-purple-500/10",
  MENTION: "text-blue-400 bg-blue-500/10",
  PROJECT_UPDATE: "text-emerald-400 bg-emerald-500/10",
};

export default function Notifications() {
  const { data: notifications, loading, refetch } = useApi(() => notificationService.getNotifications(50));
  const { data: unreadData, refetch: refetchCount } = useApi(() => notificationService.getUnreadCount());

  const handleMarkRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      refetch();
      refetchCount();
    } catch {
      toast("Failed to mark as read");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      refetch();
      refetchCount();
      toast("All notifications marked as read");
    } catch {
      toast("Failed to mark all as read");
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {unreadData ? `${unreadData} unread` : "Stay updated"}
          </p>
        </div>
        {unreadData && unreadData > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
            <Check className="w-4 h-4 mr-1.5" /> Mark all read
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      ) : notifications && notifications.length > 0 ? (
        <div className="space-y-2">
          {notifications.map((n) => {
            const Icon = iconMap[n.type] || Bell;
            const colorClass = colorMap[n.type] || "text-indigo-400 bg-indigo-500/10";
            return (
              <div
                key={n.id}
                className={`flex items-start gap-3 p-4 rounded-xl border transition-colors ${
                  n.read ? "border-border/30 bg-card/50" : "border-indigo-500/20 bg-indigo-500/5"
                }`}
              >
                <div className={`w-9 h-9 rounded-xl ${colorClass} flex items-center justify-center shrink-0`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{n.title}</p>
                  {n.message && <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>}
                  <p className="text-[10px] text-muted-foreground/60 mt-1">
                    {new Date(n.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {!n.read && (
                  <button
                    onClick={() => handleMarkRead(n.id)}
                    className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors shrink-0"
                  >
                    Mark read
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16">
          <Bell className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No notifications</h3>
          <p className="text-sm text-muted-foreground">You're all caught up</p>
        </div>
      )}
    </div>
  );
}
