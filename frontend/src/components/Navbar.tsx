import { useDevSyncAuth } from "@/contexts/AuthContext";
import { Bell, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";

export function Navbar() {
  const { user, logout } = useDevSyncAuth();

  return (
    <header className="fixed top-0 left-56 right-0 h-14 border-b border-border/50 bg-background/80 backdrop-blur-sm z-30 flex items-center justify-between px-6">
      {/* Left */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          Welcome back,{" "}
          <span className="font-medium text-foreground">
            {user?.fullName || "Developer"}
          </span>
        </span>
      </div>

      {/* Right */}
      <div className="flex items-center gap-0.5">
        <ThemeToggle />
        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground hover:text-foreground hover:bg-accent/5"
        >
          <Bell className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={logout}
          className="text-muted-foreground hover:text-destructive hover:bg-destructive/5"
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}
