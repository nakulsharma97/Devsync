import { useState } from "react";
import { Pin, Loader2 } from "lucide-react";
import { pinnedProjectService } from "@/services/pinnedProjectService";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";
import { cn } from "@/lib/utils";

/**
 * Pin/unpin toggle for a project. Calls the pinned-project backend and lets
 * the parent refresh its list through `onChanged`.
 */
export function PinButton({
  projectId,
  pinned,
  onChanged,
  className,
  size = "sm",
}: {
  projectId: string;
  pinned: boolean;
  onChanged?: (pinned: boolean) => void;
  className?: string;
  size?: "icon" | "sm";
}) {
  const [busy, setBusy] = useState(false);

  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      if (pinned) {
        await pinnedProjectService.unpin(projectId);
      } else {
        await pinnedProjectService.pin(projectId);
      }
      onChanged?.(!pinned);
    } catch (err) {
      toast.error(getErrorMessage(err, "Unable to update pin."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-label={pinned ? "Unpin project" : "Pin project"}
      aria-pressed={pinned}
      title={pinned ? "Unpin project" : "Pin project"}
      className={cn(
        "inline-flex items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40",
        size === "sm" ? "h-6 w-6" : "h-7 w-7",
        pinned
          ? "text-indigo-500 bg-indigo-500/10 hover:bg-indigo-500/20"
          : "text-muted-foreground/40 hover:text-indigo-500 hover:bg-indigo-500/5",
        className
      )}
    >
      {busy ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Pin className={cn("w-3.5 h-3.5", pinned && "fill-current")} />
      )}
    </button>
  );
}
