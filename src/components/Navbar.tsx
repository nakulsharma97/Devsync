import { useDevSyncAuth } from "@/contexts/AuthContext";
import { Bell, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const { user, logout } = useDevSyncAuth();

  return (
    <header className="fixed top-0 left-56 right-0 h-14 border-b border-border bg-background z-30 flex items-center justify-between px-6">
      {/* Left: Breadcrumb / page title area */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          Welcome back, <span className="font-medium text-foreground">{user?.fullName || "Developer"}</span>
        </span>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon-sm" className="relative text-muted-foreground hover:text-foreground">
          <Bell className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={logout}
          className="text-muted-foreground hover:text-destructive"
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}
