"use client";

import { useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { notificationService, type NotificationDto } from "@/services/notificationService";
import { wsService } from "@/services/websocketService";
import { Heart, MessageCircle, UserPlus, Bell, X } from "lucide-react";

/** Map notification type to icon & color */
const typeMeta: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  LIKE: {
    icon: <Heart className="w-4 h-4 fill-red-500 text-red-500" />,
    color: "text-red-500",
    label: "Like",
  },
  COMMENT: {
    icon: <MessageCircle className="w-4 h-4 text-blue-500" />,
    color: "text-blue-500",
    label: "Comment",
  },
  CONNECTION: {
    icon: <UserPlus className="w-4 h-4 text-green-500" />,
    color: "text-green-500",
    label: "Connection",
  },
  INVITE: {
    icon: <UserPlus className="w-4 h-4 text-purple-500" />,
    color: "text-purple-500",
    label: "Invite",
  },
};

/**
 * Polls for new notifications and shows them as animated sonner toasts.
 * Only active when a valid auth token is present.
 */
export function ToastNotificationProvider() {
  const shownIdsRef = useRef<Set<string>>(new Set());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkForNew = useCallback(async () => {
    try {
      const all = await notificationService.getLatestNotifications(50);
      if (!all || all.length === 0) return;

      const newOnes = all
        .filter((n: NotificationDto) => !n.read && !shownIdsRef.current.has(n.id))
        .slice(0, 5);

      if (newOnes.length === 0) return;

      for (const n of newOnes) {
        shownIdsRef.current.add(n.id);
      }

      newOnes.forEach((n: NotificationDto, i: number) => {
        setTimeout(() => showNotificationToast(n), i * 300);
      });
    } catch {
      // Not authenticated — silently ignore
    }
  }, []);

  useEffect(() => {
    const initialTimer = setTimeout(checkForNew, 2000);
    intervalRef.current = setInterval(checkForNew, 10000);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") checkForNew();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // Real-time: the backend pushes new notifications over the EXISTING STOMP
    // connection (/user/queue/notifications). The shownIdsRef set dedupes with
    // the polling path so a notification never toasts twice.
    const unsubWs = wsService.onNotification((n: NotificationDto) => {
      if (!n || !n.id || n.read) return;
      if (shownIdsRef.current.has(n.id)) return;
      shownIdsRef.current.add(n.id);
      showNotificationToast(n);
    });

    return () => {
      clearTimeout(initialTimer);
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
      unsubWs();
    };
  }, [checkForNew]);

  return null;
}

function showNotificationToast(n: NotificationDto) {
  const meta = typeMeta[n.type] || { icon: <Bell className="w-4 h-4" />, color: "text-muted-foreground", label: "Notification" };

  toast.custom(
    (t) => (
      <div
        className="w-full max-w-sm bg-popover text-popover-foreground border border-border rounded-xl shadow-lg pointer-events-auto flex items-start gap-3 p-4"
        style={{
          animation: "notificationSlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <span className="mt-0.5 shrink-0">{meta.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground mb-0.5">{meta.label}</p>
          <p className="text-sm text-foreground leading-snug line-clamp-2">{n.message}</p>
          <p className="text-[10px] text-muted-foreground mt-1">
            {new Date(n.createdAt).toLocaleTimeString(undefined, {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <button
          onClick={() => toast.dismiss(t)}
          className="shrink-0 p-0.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    ),
    {
      duration: 5000,
      position: "bottom-right",
      className: "!bg-transparent !shadow-none !border-0 !p-0",
    }
  );
}

// Inject the slide-in animation once
if (typeof document !== "undefined") {
  const styleId = "toast-notification-anim";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      @keyframes notificationSlideIn {
        from {
          opacity: 0;
          transform: translateX(100%) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateX(0) scale(1);
        }
      }
    `;
    document.head.appendChild(style);
  }
}
