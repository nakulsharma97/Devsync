import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/projects", icon: FolderKanban, label: "Projects" },
  { to: "/messages", icon: MessageSquare, label: "Messages" },
  { to: "/feed", icon: Rss, label: "Feed" },
  { to: "/notifications", icon: Bell, label: "Notifications" },
  { to: "/search", icon: Search, label: "Search" },
  { to: "/profile", icon: User, label: "Profile" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 border-r border-border/40 bg-card/80 backdrop-blur-xl transform transition-transform duration-200 md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-border/40">
          <button onClick={() => navigate("/")} className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 18l6-6-6-6"/><path d="M8 6l-6 6 6 6"/></svg>
            </div>
            <span className="text-sm font-bold">DevSync</span>
          </button>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden p-1 rounded-md hover:bg-accent/10">
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="p-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                  isActive
                    ? "bg-indigo-500/10 text-indigo-400 font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/5"
                }`
              }
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          ))}

          {user?.role === "ADMIN" && (
            <NavLink
              to="/admin/dashboard"
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                  isActive
                    ? "bg-indigo-500/10 text-indigo-400 font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/5"
                }`
              }
            >
              <Shield className="w-4 h-4" />
              Admin Dashboard
            </NavLink>
          )}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-border/40">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
              {user?.fullName?.charAt(0) || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.fullName || "User"}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={logout} className="w-full justify-start text-muted-foreground hover:text-foreground">
            <LogOut className="w-4 h-4 mr-2" /> Sign out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="md:ml-64">
        <header className="sticky top-0 z-30 border-b border-border/40 bg-background/80 backdrop-blur-xl">
          <div className="flex items-center justify-between px-4 py-3">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 rounded-md hover:bg-accent/10">
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex-1" />
          </div>
        </header>
        <main className="p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
