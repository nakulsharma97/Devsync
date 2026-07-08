import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isRotating, setIsRotating] = useState(false);

  // Prevent hydration mismatch — only render after mount
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="relative text-muted-foreground hover:text-foreground hover:bg-accent/5"
        disabled
        aria-label="Loading theme toggle"
      >
        <div className="w-4 h-4" />
      </Button>
    );
  }

  const isDark = theme === "dark";

  const handleToggle = () => {
    setIsRotating(true);

    // Brief full-page blur overlay during theme transition
    const html = document.documentElement;
    html.classList.add("theme-switching");

    setTheme(isDark ? "light" : "dark");

    // Remove overlay and reset rotation after animation completes
    setTimeout(() => {
      html.classList.remove("theme-switching");
      setIsRotating(false);
    }, 500);
  };

  return (
    <div className="relative group">
      <Button
        variant="ghost"
        size="icon"
        onClick={handleToggle}
        className="relative text-muted-foreground hover:text-foreground hover:bg-accent/5"
        aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      >
        <Sun
          className={`w-4 h-4 absolute transition-all duration-300 ${
            isDark
              ? "opacity-0 scale-0 rotate-90"
              : "opacity-100 scale-100 rotate-0"
          } ${isRotating ? "rotate-180" : ""}`}
        />
        <Moon
          className={`w-4 h-4 absolute transition-all duration-300 ${
            isDark
              ? "opacity-100 scale-100 rotate-0"
              : "opacity-0 scale-0 -rotate-90"
          } ${isRotating ? "-rotate-180" : ""}`}
        />
      </Button>

      {/* Tooltip */}
      <div className="absolute top-full mt-1.5 right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
        <div className="bg-popover text-popover-foreground text-[11px] font-medium px-2 py-1 rounded-md border border-border shadow-sm whitespace-nowrap">
          {isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        </div>
      </div>
    </div>
  );
}
