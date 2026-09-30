import { NavLink, useNavigate } from "react-router";
import {
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  LogOut,
  Settings,
  TrendingUp,
  User,
  X,
  type LucideIcon,
} from "lucide-react";
import { LogoMark } from "@/components/Logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  accountNavItems,
  discoverNavItems,
  mainNavItems,
} from "@/components/dashboard/navigation";
import { prefetchRoute } from "@/lib/routePrefetch";
import { cn } from "@/lib/utils";

/** Two-letter initials for the avatar ("Nakul Sharma" → "NS"). */
function initialsOf(name?: string | null): string {
  const parts = (name || "").split(" ").filter(Boolean);
  if (parts.length === 0) return "U";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

// ── Pieces ────────────────────────────────────────────────

function SectionLabel({ children, collapsed }: { children: React.ReactNode; collapsed: boolean }) {
  return (
    <p
      className={cn(
        "px-3.5 pb-2 pt-3 text-[12px] font-medium uppercase leading-4 tracking-[0.08em] text-muted-foreground",
        collapsed && "md:hidden"
      )}
    >
      {children}
    </p>
  );
}

/** Hairline that replaces the section labels when the rail is collapsed. */
function SectionRule({ collapsed }: { collapsed: boolean }) {
  return (
    <div
      aria-hidden
      className={cn("mx-auto mb-1 mt-3 hidden h-px w-6 bg-sidebar-border", collapsed && "md:block")}
    />
  );
}

interface SidebarLinkProps {
  to: string;
  icon: LucideIcon;
  label: string;
  badge?: number;
  collapsed: boolean;
  onNavigate: () => void;
}

function SidebarLink({ to, icon: Icon, label, badge, collapsed, onNavigate }: SidebarLinkProps) {
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      // Rail mode hides the labels, so lean on the native tooltip there.
      title={collapsed ? label : undefined}
      // Warm the page chunk while the pointer is on the link so the click
      // resolves from cache instead of waiting on a download.
      onMouseEnter={() => prefetchRoute(to)}
      onFocus={() => prefetchRoute(to)}
      className={({ isActive }) =>
        cn(
          "group relative flex h-11 items-center gap-3.5 rounded-[11px] border px-3.5 text-[15px] transition-colors duration-150",
          collapsed && "md:justify-center md:px-0",
          isActive
            ? "border-accent-warm-border bg-tint-warm-tile font-semibold text-tint-warm-fg"
            : "border-transparent font-medium text-secondary-foreground hover:bg-muted hover:text-foreground"
        )
      }
    >
      {({ isActive }) => (
        <>
          {/* 3px orange rail — the strongest accent on the active row */}
          <span
            aria-hidden
            className={cn(
              "absolute -left-px top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-tint-warm-fg transition-opacity duration-150",
              isActive ? "opacity-100" : "opacity-0",
              collapsed && "md:hidden"
            )}
          />
          <Icon
            className={cn(
              "h-5 w-5 shrink-0 transition-colors duration-150",
              !isActive && "text-muted-foreground group-hover:text-foreground"
            )}
            strokeWidth={isActive ? 2 : 1.8}
          />
          <span className={cn("flex-1 truncate", collapsed && "md:sr-only")}>{label}</span>
          {badge !== undefined && badge > 0 && (
            <span
              className={cn(
                "flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-muted-foreground/20 px-1.5 text-[11px] font-semibold tabular-nums text-foreground",
                collapsed && "md:absolute md:right-1.5 md:top-1.5 md:h-4 md:min-w-0 md:px-1"
              )}
            >
              {badge > 99 ? "99+" : badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

// ── Sidebar ───────────────────────────────────────────────

export interface SidebarUser {
  fullName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
}

interface SidebarProps {
  user: SidebarUser | null;
  /** Active plan code, rendered as the small pill next to the name. */
  planCode?: string | null;
  unreadCount: number;
  msgUnreadCount: number;
  /** Mobile drawer visibility. */
  open: boolean;
  /** Desktop icon-rail mode. */
  collapsed: boolean;
  onToggleCollapse: () => void;
  onClose: () => void;
  onLogout: () => void;
}

export function Sidebar({
  user,
  planCode,
  unreadCount,
  msgUnreadCount,
  open,
  collapsed,
  onToggleCollapse,
  onClose,
  onLogout,
}: SidebarProps) {
  const navigate = useNavigate();

  const go = (to: string) => {
    navigate(to);
    onClose();
  };

  return (
    // Widths are literals so Tailwind can see them; DashboardLayout offsets its
    // main column by the same two values (w-[324px] / md:w-[76px]).
    <aside
      aria-label="Main navigation"
      className={cn(
        "fixed left-0 top-0 z-50 flex h-full w-[324px] max-w-[85vw] flex-col border-r border-sidebar-border bg-sidebar transition-[transform,width] duration-200 md:translate-x-0 md:max-w-none",
        open ? "translate-x-0" : "-translate-x-full",
        collapsed && "md:w-[76px]"
      )}
    >
      {/* Brand + community badge. Deliberately a vertical stack in normal flow:
          the badge must never collide with the logo or the wordmark. */}
      <div className="shrink-0 px-[18px] pt-4">
        <div className="flex h-[50px] items-center gap-3">
          {collapsed && (
            <button
              onClick={onToggleCollapse}
              aria-label="Expand sidebar"
              className="mx-auto hidden h-10 w-10 items-center justify-center rounded-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:flex"
            >
              <ChevronsRight className="h-5 w-5" />
            </button>
          )}
          <button
            onClick={() => go("/")}
            className={cn("flex min-w-0 items-center gap-3", collapsed && "md:hidden")}
          >
            <LogoMark size={50} />
            <span className="truncate font-display text-[20px] font-bold tracking-tight text-foreground">
              DevSync
            </span>
          </button>
          <button
            onClick={onToggleCollapse}
            aria-label="Collapse sidebar"
            className={cn(
              "ml-auto hidden h-9 w-9 shrink-0 items-center justify-center rounded-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:flex",
              collapsed && "md:hidden"
            )}
          >
            <ChevronsLeft className="h-[18px] w-[18px]" />
          </button>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>

        <div
          className={cn(
            "mt-2.5 flex h-8 w-fit max-w-full items-center gap-[7px] rounded-full border border-chip-border bg-chip-surface px-3 text-[12px] font-medium text-chip-fg",
            collapsed && "md:hidden"
          )}
        >
          <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-tint-green-fg" />
          <span className="truncate">5+ developers already building</span>
        </div>
      </div>

      {/* Navigation. Rows sit flush (no inter-item gap) so all eleven items and
          the profile block fit an 856px-tall viewport without scrolling. */}
      <nav className="flex-1 overflow-y-auto px-[18px] pb-2 pt-5">
        <SectionLabel collapsed={collapsed}>Main</SectionLabel>
        <SectionRule collapsed={collapsed} />
        <div>
          {mainNavItems.map((item) => (
            <SidebarLink
              key={item.to}
              to={item.to}
              icon={item.icon}
              label={item.label}
              badge={item.label === "Messages" ? msgUnreadCount : undefined}
              collapsed={collapsed}
              onNavigate={onClose}
            />
          ))}
        </div>

        <SectionLabel collapsed={collapsed}>Discover</SectionLabel>
        <SectionRule collapsed={collapsed} />
        <div>
          {discoverNavItems.map((item) => (
            <SidebarLink
              key={item.to}
              to={item.to}
              icon={item.icon}
              label={item.label}
              collapsed={collapsed}
              onNavigate={onClose}
            />
          ))}
        </div>

        <SectionLabel collapsed={collapsed}>Account</SectionLabel>
        <SectionRule collapsed={collapsed} />
        <div>
          {accountNavItems.map((item) => (
            <SidebarLink
              key={item.to}
              to={item.to}
              icon={item.icon}
              label={item.label}
              badge={item.label === "Notifications" ? unreadCount : undefined}
              collapsed={collapsed}
              onNavigate={onClose}
            />
          ))}
        </div>
      </nav>

      {/* User — pinned to the bottom of the rail */}
      <div className="shrink-0 border-t border-sidebar-border px-[18px] py-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-1 py-1.5 text-left transition-colors hover:bg-muted",
                collapsed && "md:justify-center md:px-0"
              )}
            >
              <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-avatar-bg text-[15px] font-semibold text-avatar-fg">
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.fullName || ""}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initialsOf(user?.fullName)
                )}
              </span>
              <span className={cn("min-w-0 flex-1", collapsed && "md:hidden")}>
                <span className="flex items-center gap-2">
                  <span className="truncate text-[14px] font-semibold text-foreground">
                    {user?.fullName || "User"}
                  </span>
                  {planCode && (
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-secondary-foreground">
                      {planCode}
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">
                  {user?.email}
                </span>
              </span>
              <ChevronRight
                className={cn("h-4 w-4 shrink-0 text-muted-foreground", collapsed && "md:hidden")}
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <DropdownMenuItem onClick={() => go("/profile")}>
              <User /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => go("/settings")}>
              <Settings /> Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => go("/settings/billing")}>
              <TrendingUp /> {planCode && planCode !== "FREE" ? "Manage plan" : "Upgrade plan"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={onLogout}>
              <LogOut /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}

export default Sidebar;
