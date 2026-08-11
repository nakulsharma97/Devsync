import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { CommandPalette } from "@/components/CommandPalette";
import { NotificationBell } from "@/components/NotificationBell";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/UserMenu";
import { notificationService } from "@/services/notificationService";
import { conversationService } from "@/services/conversationService";
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
  Shield,
  Users,
  Flag,
  Activity,
  ScrollText,
  TrendingUp,
  ChevronRight,
  Command,
  type LucideIcon,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";

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
  { to: "/messages", icon: MessageSquare, label: "Messages" },
];

const discoverNavItems: NavItem[] = [
  { to: "/analytics", icon: TrendingUp, label: "Analytics" },
  { to: "/search", icon: Search, label: "Search" },
];

const accountNavItems: NavItem[] = [
  { to: "/notifications", icon: Bell, label: "Notifications" },
  { to: "/profile", icon: User, label: "Profile" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

// Rendered only for users with the ADMIN role.
const adminNavItems: NavItem[] = [
  { to: "/admin/dashboard", icon: Shield, label: "Admin Dashboard" },
  { to: "/admin/users", icon: Users, label: "Admin Users" },
  { to: "/admin/projects", icon: FolderKanban, label: "Admin Projects" },
  { to: "/admin/reports", icon: Flag, label: "Admin Reports" },
  { to: "/admin/activity", icon: Activity, label: "Admin Activity" },
  { to: "/admin/audit-logs", icon: ScrollText, label: "Admin Audit Logs" },
];

// ── Header page titles ────────────────────────────────────

const pageMeta: Record<string, { title: string; icon: LucideIcon }> = {
  "/dashboard": { title: "Dashboard", icon: LayoutDashboard },
  "/projects": { title: "Projects", icon: FolderKanban },
  "/feed": { title: "Feed", icon: Rss },
  "/messages": { title: "Messages", icon: MessageSquare },
  "/notifications": { title: "Notifications", icon: Bell },
  "/search": { title: "Search", icon: Search },
  "/profile": { title: "Profile", icon: User },
  "/settings": { title: "Settings", icon: Settings },
  "/analytics": { title: "Analytics", icon: TrendingUp },
  "/board": { title: "Board", icon: FolderKanban },
  "/admin": { title: "Admin", icon: Shield },
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
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center shadow-sm">
                {badge > 9 ? "9+" : badge}
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
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [msgUnreadCount, setMsgUnreadCount] = useState(0);

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
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchUnreadCounts]);

  const page = getPageMeta(location.pathname);
  const PageIcon = page.icon;

  return (
    <div className="min-h-screen bg-background">
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />

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

          {isAdmin && (
            <>
              <SectionLabel>Administration</SectionLabel>
              <div className="space-y-1">
                {adminNavItems.map((item) => (
                  <SidebarLink
                    key={item.to}
                    to={item.to}
                    icon={item.icon}
                    label={item.label}
                    onNavigate={closeSidebar}
                  />
                ))}
              </div>
            </>
          )}
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
              <p className="text-sm font-medium truncate">{user?.fullName || "User"}</p>
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
        <header className="sticky top-0 z-30 border-b border-border/40 bg-background/80 backdrop-blur-xl">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSidebarOpen(true)}
                aria-label="Open menu"
                className="md:hidden p-2 rounded-md hover:bg-accent/10"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2" data-testid="page-title">
                <PageIcon className="w-4 h-4 text-indigo-400" />
                <h1 className="text-sm font-semibold">{page.title}</h1>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPaletteOpen(true)}
                aria-label="Open command menu"
                className="gap-2 text-muted-foreground hover:text-foreground"
              >
                <Search className="w-4 h-4" />
                <span className="hidden md:inline text-xs">Search</span>
                <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground bg-muted rounded border border-border/50">
                  <Command className="w-2.5 h-2.5" />K
                </kbd>
              </Button>
              <NotificationBell
                unreadCount={unreadCount}
                onUnreadCountChange={setUnreadCount}
              />
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
