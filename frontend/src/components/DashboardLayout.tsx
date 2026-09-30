import { useAuth } from "@/contexts/AuthContext";
import { CommandPalette } from "@/components/CommandPalette";
import { Header } from "@/components/dashboard/Header";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { notificationService } from "@/services/notificationService";
import { conversationService } from "@/services/conversationService";
import { wsService } from "@/services/websocketService";
import { cn } from "@/lib/utils";
import {
  Bell,
  Bookmark,
  Command,
  FolderKanban,
  Headphones,
  LayoutDashboard,
  MessageSquare,
  Rss,
  Search,
  Settings,
  TrendingUp,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Outlet, useLocation, useNavigate } from "react-router";
import RouteErrorBoundary from "@/components/RouteErrorBoundary";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { WifiOff, Check } from "lucide-react";

// ── Header page titles ────────────────────────────────────

const pageMeta: Record<string, { title: string; icon: LucideIcon }> = {
  "/dashboard": { title: "Dashboard", icon: LayoutDashboard },
  "/projects": { title: "Projects", icon: FolderKanban },
  "/feed": { title: "Feed", icon: Rss },
  "/messages": { title: "Messages", icon: MessageSquare },
  "/notifications": { title: "Notifications", icon: Bell },
  "/search": { title: "Search", icon: Search },
  "/network": { title: "Network", icon: Users },
  "/profile": { title: "Profile", icon: User },
  "/settings": { title: "Settings", icon: Settings },
  "/analytics": { title: "Analytics", icon: TrendingUp },
  "/bookmarks": { title: "Bookmarks", icon: Bookmark },
  "/board": { title: "Board", icon: FolderKanban },
  "/support": { title: "Support", icon: Headphones },
};

function getPageMeta(pathname: string): { title: string; icon: LucideIcon } {
  const exact = pageMeta[pathname];
  if (exact) return exact;
  const prefix = "/" + pathname.split("/")[1];
  const match = pageMeta[prefix];
  if (match) return match;
  return { title: "DevSync", icon: Command };
}

// ── Sidebar collapse persistence ──────────────────────────
// Storage can be unavailable (private mode, embedded webviews), so reads and
// writes are best-effort: a failure just means the preference doesn't stick.

const COLLAPSE_KEY = "devsync:sidebar-collapsed";

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
}

function persistCollapsed(value: boolean) {
  try {
    window.localStorage.setItem(COLLAPSE_KEY, value ? "1" : "0");
  } catch {
    // Preference is session-only when storage is blocked.
  }
}

// ── Layout ────────────────────────────────────────────────

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [msgUnreadCount, setMsgUnreadCount] = useState(0);
  const isOnline = useOnlineStatus();
  const [wasOffline, setWasOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);
  const { subscription } = useSubscription();

  // Track transitions: when coming back online, show a brief confirmation
  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      setShowReconnected(false);
    } else if (wasOffline) {
      // Was offline, now back online — show confirmation
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 3000);
      setWasOffline(false);
      return () => {
        clearTimeout(timer);
      };
    }
  }, [isOnline, wasOffline]);

  const closeSidebar = () => setSidebarOpen(false);

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      persistCollapsed(!prev);
      return !prev;
    });
  };

  // Unread badges for Notifications + Messages
  const fetchUnreadCounts = useCallback(async () => {
    try {
      const [notifs, msgs] = await Promise.all([
        notificationService.getUnreadCount(),
        conversationService.getUnreadCount(),
      ]);
      setUnreadCount(notifs);
      setMsgUnreadCount(msgs);
    } catch {
      // Not authenticated or API unavailable
    }
  }, []);

  useEffect(() => {
    fetchUnreadCounts();
    const id = setInterval(fetchUnreadCounts, 30000);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") fetchUnreadCounts();
    };
    // The Notifications page broadcasts read-state mutations so the bell badge
    // updates immediately instead of waiting for the 30s poll.
    const handleNotifChanged = () => fetchUnreadCounts();
    // Messages page broadcasts read-state mutations for the message badge.
    const handleMsgChanged = () => fetchUnreadCounts();
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("devsync:notifications-changed", handleNotifChanged);
    window.addEventListener("devsync:messages-changed", handleMsgChanged);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("devsync:notifications-changed", handleNotifChanged);
      window.removeEventListener("devsync:messages-changed", handleMsgChanged);
    };
  }, [fetchUnreadCounts]);

  // Real-time: when a message arrives from another user, re-fetch the unread
  // message count so the sidebar badge updates immediately.
  useEffect(() => {
    const unsub = wsService.onAnyMessage((msg) => {
      // Only refresh for messages sent by someone else (not our own echo)
      if (msg.senderId !== user?.id) {
        fetchUnreadCounts();
      }
    });
    return () => {
      unsub();
    };
  }, [fetchUnreadCounts, user?.id]);

  const page = getPageMeta(location.pathname);
  const bannerVisible = !isOnline || showReconnected;
  const onPaidPlan = !!subscription?.planCode && subscription.planCode !== "FREE";

  return (
    <div className="min-h-screen bg-background">
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />

      {/* Connection status banner */}
      {bannerVisible && (
        <div
          className={cn(
            "fixed left-0 right-0 top-0 z-[60] flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium transition-colors duration-300",
            !isOnline
              ? "bg-warning text-warning-foreground"
              : "bg-success text-success-foreground"
          )}
        >
          {!isOnline ? (
            <>
              <WifiOff className="h-3.5 w-3.5" />
              You&apos;re offline — changes will sync when you&apos;re back
            </>
          ) : (
            <>
              <Check className="h-3.5 w-3.5" />
              Back online
            </>
          )}
        </div>
      )}

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          role="presentation"
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={closeSidebar}
        />
      )}

      <Sidebar
        user={user}
        planCode={subscription?.planCode}
        unreadCount={unreadCount}
        msgUnreadCount={msgUnreadCount}
        open={sidebarOpen}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
        onClose={closeSidebar}
        onLogout={logout}
      />

      {/* Main content */}
      <div
        className={cn(
          "min-h-screen bg-background transition-[padding] duration-200",
          collapsed ? "md:pl-[76px]" : "md:pl-[324px]"
        )}
      >
        <Header
          pageTitle={page.title}
          onOpenMenu={() => setSidebarOpen(true)}
          onOpenSearch={() => setPaletteOpen(true)}
          unreadCount={unreadCount}
          onUnreadCountChange={setUnreadCount}
          msgUnreadCount={msgUnreadCount}
          onOpenMessages={() => navigate("/messages")}
          billingLabel={onPaidPlan ? "Manage Plan" : "Upgrade"}
          onOpenBilling={() => navigate("/settings/billing")}
        />
        <main className="p-5 md:p-7 lg:px-8 lg:py-8">
          {/* keyed by pathname so a failed page resets on navigation */}
          <RouteErrorBoundary key={location.pathname}>
            <Outlet />
          </RouteErrorBoundary>
        </main>
      </div>
    </div>
  );
}
