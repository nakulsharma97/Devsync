import { NavLink } from "react-router";
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
  return (
    <aside className="fixed left-0 top-0 bottom-0 w-56 border-r border-border/50 bg-sidebar z-40 flex flex-col">
      {/* Logo */}
      <div className="h-14 flex items-center gap-2.5 px-5 border-b border-border/50">
        <div className="w-7 h-7 rounded-lg bg-foreground flex items-center justify-center shrink-0 shadow-sm">
          <Code2 className="w-4 h-4 text-background" />
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
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
                isActive
                  ? "bg-accent/10 text-accent font-medium shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/5"
              }`
            }
          >
            <item.icon className={`w-4 h-4 shrink-0 transition-colors duration-200`} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-border/50">
        <span className="text-[10px] text-muted-foreground/60">
          &copy; {new Date().getFullYear()} DevSync
        </span>
      </div>
    </aside>
  );
}
