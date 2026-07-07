import { useDevSyncAuth } from "@/contexts/AuthContext";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { Bell, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { notificationService } from "@/services/notificationService";

export function Navbar() {
  const { user, logout } = useDevSyncAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const count = await notificationService.getUnreadCount();
        setUnreadCount(count);
      } catch {
        // Not authenticated or API not available
      }
    };

    fetchCount();
    intervalRef.current = setInterval(fetchCount, 15000); // Poll every 15s

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

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
          onClick={() => navigate("/notifications")}
          className="relative text-muted-foreground hover:text-foreground hover:bg-accent/5"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center shadow-sm">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
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
