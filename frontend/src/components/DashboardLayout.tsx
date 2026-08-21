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
  Crown,
  Bookmark,
  type LucideIcon,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { WifiOff, Check } from "lucide-react";
import logo from "@/assets/logo.svg";

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
      className={({ isActive }) =>
        cn(
          "group relative flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-200 border",
          isActive
            ? "bg-gradient-to-r from-indigo-500/15 to-purple-500/5 text-indigo-600 dark:text-indigo-300 font-medium border-indigo-500/20 shadow-sm"
            : "text-muted-foreground hover:text-foreground hover:bg-accent/5 border-transparent"
        )
      }
    >
      {({ isActive }) => (
        <>
          {/* Left accent bar */}
          <span
            aria-hidden
            className={cn(
              "absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full bg-gradient-to-b from-indigo-500 to-purple-500 transition-all duration-200",
              isActive ? "opacity-100" : "opacity-0"
            )}
          />
          <div
            className={cn(
              "relative w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200",
              isActive
                ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/20"
                : "bg-muted/50 text-muted-foreground group-hover:text-indigo-500 group-hover:bg-indigo-500/10"
            )}
          >
            <Icon className="w-4 h-4" />
            {badge !== undefined && badge > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center shadow-sm ring-2 ring-background animate-badge-pop">
                {badge > 99 ? "99+" : badge}
              </span>
            )}
          </div>
          <span className="flex-1 truncate">{label}</span>
          {isActive && <ChevronRight className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
        </>
      )}
    </NavLink>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pt-5 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/50">
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
  const PageIcon = page.icon;

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
              ? "bg-amber-500/90 text-white"
              : "bg-emerald-500/90 text-white"
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
        className={`fixed top-0 left-0 z-50 flex h-full w-64 flex-col border-r border-border/40 bg-card/80 backdrop-blur-xl transform transition-transform duration-200 md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-border/40">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-500/20 transition-transform duration-200 group-hover:scale-105">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 18l6-6-6-6"/><path d="M8 6l-6 6 6 6"/></svg>
            </div>
            <span className="text-sm font-bold tracking-tight">DevSync</span>
          </button>
          <button
            onClick={closeSidebar}
            aria-label="Close menu"
            className="md:hidden p-1 rounded-md hover:bg-accent/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 px-3 pt-2 pb-4 overflow-y-auto">
          <SectionLabel>Main</SectionLabel>
          <div className="space-y-1">
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
          <div className="space-y-1">
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
          <div className="space-y-1">
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
        <div className="shrink-0 p-3 border-t border-border/40 bg-background/60 backdrop-blur-xl">
          <div className="flex items-center gap-3 px-2 py-2 mb-1">
            <div className="relative shrink-0">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 p-[2px]">
                <div className="w-full h-full rounded-full bg-background flex items-center justify-center overflow-hidden">
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.fullName || ""} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm font-bold bg-gradient-to-br from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                      {user?.fullName?.charAt(0) || "U"}
                    </span>
                  )}
                </div>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-background" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium truncate">{user?.fullName || "User"}</p>
                {subscription && (
                  <button
                    onClick={() => { navigate("/settings/billing"); closeSidebar(); }}
                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider transition-colors hover:opacity-80 ${
                      subscription.planCode === "FREE"
                        ? "bg-muted text-muted-foreground"
                        : subscription.planCode === "PRO"
                          ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
                          : "bg-gradient-to-r from-amber-500 to-orange-600 text-white"
                    }`}
                  >
                    {subscription.planCode}
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-red-500/5"
          >
            <LogOut className="w-4 h-4 mr-2" /> Sign out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="md:ml-64">
        <header className="sticky top-0 z-30 h-16 border-b border-border/40 bg-background/80 backdrop-blur-xl">
          <div className="flex items-center justify-between h-full px-4 lg:px-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                aria-label="Open menu"
                className="md:hidden p-2 rounded-lg hover:bg-accent/10 transition-colors"
              >
                <Menu className="w-5 h-5 text-foreground/80" />
              </button>
              {/* DevSync logo — subtle in the navbar */}
              <button
                onClick={() => navigate("/")}
                className="hidden md:flex items-center gap-2.5 group shrink-0"
                aria-label="Go to landing page"
              >
                <img src={logo} alt="DevSync" className="w-6 h-6 shrink-0" />
                <span className="text-[13px] font-bold tracking-tight text-foreground/70 group-hover:text-foreground transition-colors">
                  DevSync
                </span>
              </button>
              <div className="hidden md:block w-px h-6 bg-border/50" />
              <div className="flex items-center gap-2.5" data-testid="page-title">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                  <PageIcon className="w-4 h-4 text-indigo-500" />
                </div>
                <h1 className="text-sm font-semibold text-foreground">{page.title}</h1>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPaletteOpen(true)}
                aria-label="Open search"
                className="hidden sm:flex items-center gap-2.5 h-9 w-[200px] lg:w-[240px] px-3 text-muted-foreground hover:text-foreground hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all"
              >
                <Search className="w-4 h-4 shrink-0 text-indigo-400" />
                <span className="text-sm flex-1 text-left">Search...</span>
                <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground bg-muted/60 rounded border border-border/40">
                  <Command className="w-2.5 h-2.5" />K
                </kbd>
              </Button>
              {/* Mobile search trigger */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPaletteOpen(true)}
                aria-label="Search"
                className="sm:hidden h-9 w-9 rounded-lg hover:bg-accent/10 transition-colors"
              >
                <Search className="w-[18px] h-[18px] text-muted-foreground" />
              </Button>
              {/* Upgrade CTA */}
              <button
                onClick={() => navigate("/settings/billing")}
                aria-label={subscription?.planCode && subscription.planCode !== "FREE" ? "Manage subscription" : "Upgrade plan"}
                className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium transition-all duration-200 shrink-0 ${
                  subscription?.planCode && subscription.planCode !== "FREE"
                    ? "bg-gradient-to-r from-indigo-500/15 to-purple-500/10 text-indigo-600 dark:text-indigo-300 border border-indigo-500/20 hover:border-indigo-500/40 hover:bg-indigo-500/10"
                    : "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/30 hover:opacity-90"
                }`}
              >
                <Crown className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">
                  {subscription?.planCode && subscription.planCode !== "FREE" ? "Manage Plan" : "Upgrade"}
                </span>
              </button>
              {/* Messages badge */}
              <button
                onClick={() => navigate("/messages")}
                aria-label={`Messages${msgUnreadCount > 0 ? ` — ${msgUnreadCount} unread` : ""}`}
                className="relative inline-flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 outline-none transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                {msgUnreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center shadow-sm ring-2 ring-background animate-badge-pop">
                    {msgUnreadCount > 99 ? "99+" : msgUnreadCount}
                  </span>
                )}
              </button>
              <NotificationBell
                unreadCount={unreadCount}
                onUnreadCountChange={setUnreadCount}
              />
              <div className="w-px h-6 bg-border/50 hidden sm:block" />
              <ThemeToggle />
              <UserMenu />
            </div>
          </div>
        </header>
        <main className="p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
