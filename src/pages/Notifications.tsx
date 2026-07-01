import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Bell, CheckCheck, Heart, MessageCircle, Users, UserPlus } from "lucide-react";
import { notificationService, type Notification } from "@/services/notificationService";

const typeIcons: Record<string, React.ReactNode> = {
  LIKE: <Heart className="w-4 h-4" />,
  COMMENT: <MessageCircle className="w-4 h-4" />,
  CONNECTION: <UserPlus className="w-4 h-4" />,
  TEAM_INVITE: <Users className="w-4 h-4" />,
};

const typeColors: Record<string, string> = {
  LIKE: "text-red-500",
  COMMENT: "text-blue-500",
  CONNECTION: "text-green-500",
  TEAM_INVITE: "text-purple-500",
};

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const data = await notificationService.getAll();
      setNotifications(data);
    } catch {
      // API not available
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkRead = async (id: number) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">Stay updated with your activity</p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleMarkAllRead} className="text-sm text-muted-foreground">
          <CheckCheck className="w-4 h-4 mr-1.5" />
          Mark all read
        </Button>
      </div>

      {loading && (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="border border-border rounded-lg p-4 animate-pulse">
              <div className="h-2 bg-secondary rounded w-3/4 mb-2" />
              <div className="h-2 bg-secondary rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {!loading && notifications.length === 0 && (
        <div className="border border-border rounded-lg p-12 flex flex-col items-center text-center gap-3">
          <Bell className="w-8 h-8 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">No notifications</h3>
          <p className="text-sm text-muted-foreground">You're all caught up!</p>
        </div>
      )}

      <div className="space-y-1">
        {notifications.map((notif) => (
          <button
            key={notif.id}
            onClick={() => !notif.read && handleMarkRead(notif.id)}
            className={`w-full text-left border border-border rounded-lg p-4 flex items-start gap-3 transition-colors hover:bg-accent/30 ${
              !notif.read ? "bg-accent/20" : ""
            }`}
          >
            <span className={`mt-0.5 ${typeColors[notif.type] || "text-muted-foreground"}`}>
              {typeIcons[notif.type] || <Bell className="w-4 h-4" />}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground">{notif.message}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {new Date(notif.createdAt).toLocaleDateString()}
              </p>
            </div>
            {!notif.read && <span className="w-1.5 h-1.5 rounded-full bg-foreground mt-2 shrink-0" />}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
