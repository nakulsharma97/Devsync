import { useNavigate } from "react-router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { User, Settings, LogOut, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Account dropdown for the app shell. `showName` widens the trigger into an
 * avatar + first name + chevron pill (used in the dashboard header); the
 * default is the bare avatar used by the admin shell.
 */
export function UserMenu({ showName = false }: { showName?: boolean } = {}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const initials =
    user?.fullName
      ?.split(" ")
      .filter(Boolean)
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";

  const firstName = user?.fullName?.split(" ")[0] || "Account";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Account menu"
          className={cn(
            "flex items-center outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring",
            showName
              ? "h-11 gap-3 rounded-full pl-1 pr-1.5 text-left hover:bg-muted"
              : "h-8 w-8 overflow-hidden rounded-full ring-1 ring-border hover:ring-primary/40"
          )}
        >
          <span
            className={cn(
              "flex shrink-0 items-center justify-center overflow-hidden rounded-full",
              showName ? "h-11 w-11" : "h-8 w-8"
            )}
          >
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.fullName || "Account"}
                className="w-full h-full object-cover"
              />
            ) : (
              <span
                className={cn(
                  "flex h-full w-full items-center justify-center bg-avatar-bg font-semibold text-avatar-fg",
                  showName ? "text-[15px]" : "text-[11px] font-bold"
                )}
              >
                {initials}
              </span>
            )}
          </span>
          {showName && (
            <>
              <span className="hidden max-w-[9rem] truncate text-[15px] font-semibold text-foreground sm:block">
                {firstName}
              </span>
              <ChevronDown className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-medium text-foreground">{user?.fullName || "User"}</p>
          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/profile")}>
          <User /> Profile
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/settings")}>
          <Settings /> Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={logout}>
          <LogOut /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
