import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/UserMenu";
import { NotificationBell } from "@/components/NotificationBell";
import { notificationService } from "@/services/notificationService";
import { cn } from "@/lib/utils";
import {
  Shield,
  Users,
  FolderKanban,
  Flag,
  Activity,
  ScrollText,
  CreditCard,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Star,
  MessageSquarePlus,
  Headphones,
  User,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";

// ── Admin Navigation config ─────────────────────────────

interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
}

const adminNavItems: NavItem[] = [
  { to: "/admin/dashboard", icon: Shield, label: "Dashboard" },
  { to: "/admin/users", icon: Users, label: "Users" },
  { to: "/admin/projects", icon: FolderKanban, label: "Projects" },
  { to: "/admin/reports", icon: Flag, label: "Reports" },
  { to: "/admin/billing", icon: CreditCard, label: "Billing" },
];

const monitoringNavItems: NavItem[] = [
  { to: "/admin/support", icon: Headphones, label: "Support" },
  { to: "/admin/activity", icon: Activity, label: "Activity" },
  { to: "/admin/audit-logs", icon: ScrollText, label: "Audit Logs" },
  { to: "/admin/reviews", icon: Star, label: "Reviews" },
  { to: "/admin/feedback", icon: MessageSquarePlus, label: "Feedback" },
];

const accountNavItems: NavItem[] = [
  { to: "/admin/profile", icon: User, label: "My Profile" },
  { to: "/admin/settings", icon: Settings, label: "Settings" },
];

// ── Header page titles ────────────────────────────────────

const pageMeta: Record<string, { title: string; icon: LucideIcon }> = {
  "/admin/dashboard": { title: "Admin Dashboard", icon: Shield },
  "/admin/users": { title: "User Management", icon: Users },
  "/admin/projects": { title: "Project Management", icon: FolderKanban },
  "/admin/reports": { title: "Reports & Moderation", icon: Flag },
  "/admin/billing": { title: "Billing Management", icon: CreditCard },
  "/admin/activity": { title: "Platform Activity", icon: Activity },
  "/admin/audit-logs": { title: "Audit Logs", icon: ScrollText },
  "/admin/reviews": { title: "Review Moderation", icon: Star },
  "/admin/feedback": { title: "Private Feedback", icon: MessageSquarePlus },
  "/admin/support": { title: "Support Tickets", icon: Headphones },
  "/admin/profile": { title: "My Profile", icon: User },
  "/admin/settings": { title: "Settings", icon: Settings },
};

function getPageMeta(pathname: string): { title: string; icon: LucideIcon } {
  const exact = pageMeta[pathname];
  if (exact) return exact;
  const prefix = "/" + pathname.split("/")[1] + "/" + pathname.split("/")[2];
  const match = pageMeta[prefix];
  if (match) return match;
  return { title: "Admin Panel", icon: Shield };
}

// ── Sidebar link ──────────────────────────────────────────

interface SidebarLinkProps {
  to: string;
  icon: LucideIcon;
  label: string;
  onNavigate: () => void;
}

function SidebarLink({ to, icon: Icon, label, onNavigate }: SidebarLinkProps) {
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

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const closeSidebar = () => setSidebarOpen(false);

  // Poll unread notifications every 30s + listen for immediate updates
  const fetchUnreadCount = useCallback(async () => {
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch {
      // Not authenticated or API unavailable
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const id = setInterval(fetchUnreadCount, 30000);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") fetchUnreadCount();
    };
    const handleChanged = () => fetchUnreadCount();
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("devsync:notifications-changed", handleChanged);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("devsync:notifications-changed", handleChanged);
    };
  }, [fetchUnreadCount]);

  const page = getPageMeta(location.pathname);
  const PageIcon = page.icon;

  return (
    <div className="min-h-screen bg-background">
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
        aria-label="Admin navigation"
        className={`fixed top-0 left-0 z-50 flex h-full w-64 flex-col border-r border-border/40 bg-card/80 backdrop-blur-xl transform transition-transform duration-200 md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-border/40">
          <button onClick={() => navigate("/admin/dashboard")} className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-500/20 transition-transform duration-200 group-hover:scale-105">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold tracking-tight">DevSync Admin</span>
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

          <SectionLabel>Monitoring</SectionLabel>
          <div className="space-y-1">
            {monitoringNavItems.map((item) => (
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
                onNavigate={closeSidebar}
              />
            ))}
          </div>

          {/* Link back to normal app */}
          <SectionLabel>Switch</SectionLabel>
          <div className="space-y-1">
            <SidebarLink
              to="/dashboard"
              icon={FolderKanban}
              label="Open User App"
              onNavigate={closeSidebar}
            />
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
              <p className="text-sm font-medium truncate">{user?.fullName || "Admin"}</p>
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
