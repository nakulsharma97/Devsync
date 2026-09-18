import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { CommandPalette } from "@/components/CommandPalette";
import { NotificationBell } from "@/components/NotificationBell";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/UserMenu";
import { notificationService } from "@/services/notificationService";
import { conversationService } from "@/services/conversationService";
import { wsService } from "@/services/websocketService";
import { cn } from "@/lib/utils";
import { prefetchRoute } from "@/lib/routePrefetch";
import {
  LayoutDashboard,
  FolderKanban,
  MessageSquare,
  Bell,
  User,
  Settings,
  LogOut,
  Menu,
  X,
  Search,
  Rss,
  Users,
  TrendingUp,
  ChevronRight,
  Command,
  Headphones,
  Bookmark,
  type LucideIcon,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { WifiOff, Check } from "lucide-react";
import { LogoMark } from "@/components/Logo";

// ── Navigation config ─────────────────────────────────────

interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
}

const mainNavItems: NavItem[] = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/projects", icon: FolderKanban, label: "Projects" },
  { to: "/feed", icon: Rss, label: "Feed" },
  { to: "/bookmarks", icon: Bookmark, label: "Bookmarks" },
  { to: "/messages", icon: MessageSquare, label: "Messages" },
];

const discoverNavItems: NavItem[] = [
  { to: "/analytics", icon: TrendingUp, label: "Analytics" },
  { to: "/search", icon: Search, label: "Search" },
  { to: "/network", icon: Users, label: "Network" },
];

const accountNavItems: NavItem[] = [
  { to: "/notifications", icon: Bell, label: "Notifications" },
  { to: "/support", icon: Headphones, label: "Support" },
  { to: "/profile", icon: User, label: "Profile" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

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

// ── Sidebar link ──────────────────────────────────────────

interface SidebarLinkProps {
  to: string;
  icon: LucideIcon;
  label: string;
  badge?: number;
  onNavigate: () => void;
}

function SidebarLink({ to, icon: Icon, label, badge, onNavigate }: SidebarLinkProps) {
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      // Warm the page chunk while the pointer is on the link so the click
      // resolves from cache instead of waiting on a download.
      onMouseEnter={() => prefetchRoute(to)}
      onFocus={() => prefetchRoute(to)}
      className={({ isActive }) =>
        cn(
          "group relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150",
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
            : "text-sidebar-foreground hover:text-foreground hover:bg-muted"
        )
      }
    >
      {({ isActive }) => (
        <>
          {/* Muted orange indicator bar — the only accent on an active item */}
          <span
            aria-hidden
            className={cn(
              "absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-full bg-primary transition-opacity duration-150",
              isActive ? "opacity-90" : "opacity-0"
            )}
          />
          <Icon
            className={cn(
              "w-4 h-4 shrink-0 transition-colors duration-150",
              isActive
                ? "text-foreground"
                : "text-muted-foreground group-hover:text-foreground"
            )}
          />
          <span className="flex-1 truncate">{label}</span>
          {badge !== undefined && badge > 0 && (
            <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-muted-foreground/20 text-foreground text-[10px] font-semibold flex items-center justify-center tabular-nums">
              {badge > 99 ? "99+" : badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pt-5 pb-1.5 text-[11px] font-medium text-muted-foreground/80 uppercase tracking-wider">
      {children}
    </p>
  );
}

// ── Layout ────────────────────────────────────────────────

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
      return () => { clearTimeout(timer); };
    }
  }, [isOnline, wasOffline]);

  const closeSidebar = () => setSidebarOpen(false);

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
    return () => { unsub(); };
  }, [fetchUnreadCounts, user?.id]);

  const page = getPageMeta(location.pathname);

  const bannerVisible = !isOnline || showReconnected;

  return (
    <div className="min-h-screen bg-background">
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />

      {/* Connection status banner */}
      {bannerVisible && (
        <div
          className={cn(
            "fixed top-0 left-0 right-0 z-[60] flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium transition-colors duration-300",
            !isOnline
              ? "bg-warning text-warning-foreground"
              : "bg-success text-success-foreground"
          )}
        >
          {!isOnline ? (
            <>
              <WifiOff className="w-3.5 h-3.5" />
              You&apos;re offline — changes will sync when you&apos;re back
            </>
          ) : (
            <>
              <Check className="w-3.5 h-3.5" />
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

      {/* Sidebar */}
      <aside
        aria-label="Main navigation"
        className={`fixed top-0 left-0 z-50 flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar transform transition-transform duration-200 md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-sidebar-border">
          <button onClick={() => navigate("/")} className="flex items-center gap-2.5 group">
            <LogoMark size={24} />
            <span className="font-display text-sm font-semibold tracking-tight text-foreground">DevSync</span>
          </button>
          <button
            onClick={closeSidebar}
            aria-label="Close menu"
            className="md:hidden p-1 rounded-md hover:bg-muted"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 px-3 pt-1 pb-4 overflow-y-auto">
          <SectionLabel>Main</SectionLabel>
          <div className="space-y-0.5">
            {mainNavItems.map((item) => (
              <SidebarLink
                key={item.to}
                to={item.to}
                icon={item.icon}
                label={item.label}
                badge={
                  item.label === "Messages" ? msgUnreadCount : undefined
                }
                onNavigate={closeSidebar}
              />
            ))}
          </div>

          <SectionLabel>Discover</SectionLabel>
          <div className="space-y-0.5">
            {discoverNavItems.map((item) => (
              <SidebarLink
                key={item.to}
                to={item.to}
                icon={item.icon}
                label={item.label}
                onNavigate={closeSidebar}
              />
            ))}
          </div>

          <SectionLabel>Account</SectionLabel>
          <div className="space-y-0.5">
            {accountNavItems.map((item) => (
              <SidebarLink
                key={item.to}
                to={item.to}
                icon={item.icon}
                label={item.label}
                badge={
                  item.label === "Notifications" ? unreadCount : undefined
                }
                onNavigate={closeSidebar}
              />
            ))}
          </div>
        </nav>

        {/* User card */}
        <div className="shrink-0 p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-2.5 px-2 py-1.5 mb-1">
            <div className="relative shrink-0">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden ring-1 ring-border">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.fullName || ""} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-semibold text-foreground">
                    {user?.fullName?.charAt(0) || "U"}
                  </span>
                )}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success ring-2 ring-sidebar" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium truncate text-foreground">{user?.fullName || "User"}</p>
                {subscription && (
                  <button
                    onClick={() => { navigate("/settings/billing"); closeSidebar(); }}
                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors hover:opacity-80 ${
                      subscription.planCode === "FREE"
                        ? "bg-muted text-muted-foreground"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    {subscription.planCode}
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { navigate("/settings"); closeSidebar(); }}
              className="justify-start text-muted-foreground hover:text-foreground rounded-lg"
            >
              <Settings className="w-3.5 h-3.5 mr-1.5" /> Settings
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="justify-start text-muted-foreground hover:text-danger hover:bg-danger/10 rounded-lg"
            >
              <LogOut className="w-3.5 h-3.5 mr-1.5" /> Sign out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="md:ml-64 bg-background min-h-screen">
        <header className="sticky top-0 z-30 h-14 border-b border-border bg-background/90 backdrop-blur-sm">
          <div className="flex items-center justify-between h-full px-4 lg:px-6">
            <div className="flex items-center gap-2 min-w-0">
              <button
                onClick={() => setSidebarOpen(true)}
                aria-label="Open menu"
                className="md:hidden p-2 -ml-2 rounded-lg hover:bg-muted transition-colors"
              >
                <Menu className="w-5 h-5 text-muted-foreground" />
              </button>
              {/* Breadcrumb: DevSync / Page */}
              <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-1.5 min-w-0">
                <button
                  onClick={() => navigate("/dashboard")}
                  className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  DevSync
                </button>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
              </nav>
              <h1 className="text-[13px] font-medium text-foreground truncate" data-testid="page-title">
                {page.title}
              </h1>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPaletteOpen(true)}
                aria-label="Open search"
                className="hidden sm:flex items-center gap-2 h-8 w-[180px] lg:w-[240px] px-3 text-muted-foreground hover:text-foreground bg-card border-border hover:border-ring/40 transition-colors rounded-lg font-normal"
              >
                <Search className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[13px] flex-1 text-left">Search projects, people…</span>
                <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground bg-muted rounded border border-border">
                  <Command className="w-2.5 h-2.5" />K
                </kbd>
              </Button>
              {/* Mobile search trigger */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPaletteOpen(true)}
                aria-label="Search"
                className="sm:hidden h-9 w-9 rounded-lg hover:bg-muted transition-colors"
              >
                <Search className="w-[18px] h-[18px] text-muted-foreground" />
              </Button>
              {/* Upgrade CTA — the one deliberate orange button in the shell */}
              <button
                onClick={() => navigate("/settings/billing")}
                aria-label={subscription?.planCode && subscription.planCode !== "FREE" ? "Manage subscription" : "Upgrade plan"}
                className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition-colors duration-150 shrink-0 border ${
                  subscription?.planCode && subscription.planCode !== "FREE"
                    ? "bg-card text-foreground hover:bg-muted border-border"
                    : "bg-primary text-primary-foreground hover:bg-accent-hover border-transparent"
                }`}
              >
                <span className="shrink-0">
                  {subscription?.planCode && subscription.planCode !== "FREE" ? "Manage Plan" : "Upgrade"}
                </span>
              </button>
              {/* Messages badge */}
              <button
                onClick={() => navigate("/messages")}
                aria-label={`Messages${msgUnreadCount > 0 ? ` — ${msgUnreadCount} unread` : ""}`}
                className="relative inline-flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 outline-none transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                {msgUnreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-danger text-[9px] font-bold text-white flex items-center justify-center ring-2 ring-background animate-badge-pop">
                    {msgUnreadCount > 99 ? "99+" : msgUnreadCount}
                  </span>
                )}
              </button>
              <NotificationBell
                unreadCount={unreadCount}
                onUnreadCountChange={setUnreadCount}
              />
              <div className="w-px h-6 bg-border hidden sm:block" />
              <ThemeToggle />
              <UserMenu />
            </div>
          </div>
        </header>
        <main className="p-4 md:p-6 bg-background">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
