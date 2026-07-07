import { NavLink, useLocation } from "react-router";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  LayoutDashboard,
  User,
  FolderGit2,
  Rss,
  Users,
  Bell,
  Bookmark,
  Search,
  Settings,
  Code2,
} from "lucide-react";
import { notificationService } from "@/services/notificationService";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/profile", icon: User, label: "Profile" },
  { to: "/projects", icon: FolderGit2, label: "Projects" },
  { to: "/feed", icon: Rss, label: "Feed" },
  { to: "/teams", icon: Users, label: "Teams" },
  { to: "/notifications", icon: Bell, label: "Notifications" },
  { to: "/bookmarks", icon: Bookmark, label: "Bookmarks" },
  { to: "/search", icon: Search, label: "Search" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export function Sidebar() {
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchCount = useCallback(async () => {
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch {
      // Not authenticated or API not available
    }
  }, []);

  // Fetch on mount, on route change, and on visibility change
  useEffect(() => {
    fetchCount();
    intervalRef.current = setInterval(fetchCount, 15000);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") fetchCount();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [fetchCount]);

  // Refetch on route change
  useEffect(() => {
    fetchCount();
  }, [location.pathname, fetchCount]);

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-56 border-r border-border/30 bg-sidebar z-40 flex flex-col">
      {/* Logo */}
      <div className="h-14 flex items-center gap-2.5 px-5 border-b border-border/30">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center shrink-0 shadow-sm">
          <Code2 className="w-4 h-4 text-white" />
        </div>
        <span className="text-sm font-semibold tracking-tight">DevSync</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2.5 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group ${
                isActive
                  ? "bg-gradient-to-r from-accent/15 to-accent/5 text-accent font-medium shadow-sm border border-accent/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/5 border border-transparent"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`w-4 h-4 shrink-0 transition-all duration-200 relative ${
                  isActive ? "text-accent" : "text-muted-foreground group-hover:text-foreground"
                }`}>
                  <item.icon className="w-4 h-4" />
                  {item.label === "Notifications" && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1.5 w-3.5 h-3.5 rounded-full bg-red-500 text-[8px] font-bold text-white flex items-center justify-center shadow-sm">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </div>
                <span>{item.label}</span>
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-accent shadow-sm shadow-accent/50" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-border/30">
        <span className="text-[10px] text-muted-foreground/50">
          &copy; {new Date().getFullYear()} DevSync
        </span>
      </div>
    </aside>
  );
}
