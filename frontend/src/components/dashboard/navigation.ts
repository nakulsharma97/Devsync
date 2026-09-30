import {
  BarChart3,
  Bell,
  Bookmark,
  FolderKanban,
  FolderOpen,
  Headphones,
  LayoutDashboard,
  MessageSquare,
  Rss,
  Search,
  Settings,
  TrendingUp,
  User,
  UserRoundPlus,
  Users,
  type LucideIcon,
} from "lucide-react";

// ── Sidebar navigation ────────────────────────────────────
// Grouped exactly as the dashboard reference: MAIN (day-to-day work),
// DISCOVER (exploration) and ACCOUNT (profile, settings, help).

export interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
}

export const mainNavItems: NavItem[] = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/projects", icon: FolderKanban, label: "Projects" },
  { to: "/feed", icon: Rss, label: "Feed" },
  { to: "/bookmarks", icon: Bookmark, label: "Bookmarks" },
  { to: "/messages", icon: MessageSquare, label: "Messages" },
];

export const discoverNavItems: NavItem[] = [
  { to: "/analytics", icon: TrendingUp, label: "Analytics" },
  { to: "/search", icon: Search, label: "Search" },
  { to: "/network", icon: Users, label: "Network" },
];

export const accountNavItems: NavItem[] = [
  { to: "/notifications", icon: Bell, label: "Notifications" },
  { to: "/settings", icon: Settings, label: "Settings" },
  { to: "/support", icon: Headphones, label: "Help & Support" },
  { to: "/profile", icon: User, label: "Profile" },
];

// ── Quick actions ─────────────────────────────────────────

export interface QuickAction {
  label: string;
  icon: LucideIcon;
  to: string;
}

/** Default action list for the dashboard's Quick Actions panel. */
export const defaultQuickActions: QuickAction[] = [
  { label: "Explore Projects", icon: FolderOpen, to: "/projects" },
  { label: "Find Developers", icon: UserRoundPlus, to: "/network" },
  { label: "View Analytics", icon: BarChart3, to: "/analytics" },
  { label: "Search Projects", icon: Search, to: "/search" },
];
