import { useHighContrast } from "@/hooks/useHighContrast";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export function HighContrastToggle() {
  const { enabled, toggle } = useHighContrast();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="relative text-muted-foreground hover:text-foreground hover:bg-accent/5"
        disabled
        aria-label="Loading high contrast toggle"
      >
        <div className="w-4 h-4" />
      </Button>
    );
  }

  return (
    <div className="relative group">
      <Button
        variant="ghost"
        size="icon"
        onClick={toggle}
        className={`relative transition-all duration-200 ${
          enabled
            ? "text-accent hover:text-accent/80"
            : "text-muted-foreground hover:text-foreground"
        } hover:bg-accent/5`}
        aria-label={
          enabled ? "Disable High Contrast Mode" : "Enable High Contrast Mode"
        }
      >
        {enabled ? (
          <Eye className="w-4 h-4" />
        ) : (
          <EyeOff className="w-4 h-4" />
        )}
      </Button>

      {/* Tooltip */}
      <div className="absolute top-full mt-1.5 right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
        <div className="bg-popover text-popover-foreground text-[11px] font-medium px-2 py-1 rounded-md border border-border shadow-sm whitespace-nowrap">
          {enabled ? "High Contrast: ON" : "High Contrast: OFF"}
        </div>
      </div>
    </div>
  );
}
