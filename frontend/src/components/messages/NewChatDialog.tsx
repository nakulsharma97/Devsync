import { useEffect, useRef, useState } from "react";
import { Search, Loader2, MessageSquarePlus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { userService, type UserDto } from "@/services/userService";
import { cn } from "@/lib/utils";

interface NewChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the selected user id; the parent resolves existing vs new. */
  onSelectUser: (userId: string) => void;
}

function presenceColor(status: string | null | undefined): string {
  switch (status) {
    case "ONLINE":
      return "bg-emerald-500";
    case "AWAY":
      return "bg-amber-500";
    default:
      return "bg-muted-foreground/40";
  }
}

export function NewChatDialog({ open, onOpenChange, onSelectUser }: NewChatDialogProps) {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<UserDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the input when the dialog opens; reset state when it closes.
  useEffect(() => {
    if (open) {
      setQuery("");
      setUsers([]);
      setError(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 1) {
      setUsers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(false);
    debounceRef.current = setTimeout(async () => {
      try {
        setUsers(await userService.searchUsers(q));
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/40">
          <DialogTitle className="flex items-center gap-2 text-base">
            <MessageSquarePlus className="w-4 h-4 text-indigo-500" /> New Message
          </DialogTitle>
        </DialogHeader>

        <div className="relative px-5 pt-4">
          <Search className="absolute left-8 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 pointer-events-none" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people..."
            aria-label="Search people"
            className="w-full h-10 pl-9 pr-3 rounded-lg text-sm bg-muted/40 border border-border/50 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all placeholder:text-muted-foreground/60"
          />
        </div>

        <div className="max-h-[320px] overflow-y-auto px-3 py-3 min-h-[120px]">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
            </div>
          ) : error ? (
            <p className="text-sm text-muted-foreground text-center py-10">Couldn&apos;t search people</p>
          ) : query.trim().length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">
              Type a name or username to find someone
            </p>
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No people found</p>
          ) : (
            <ul className="space-y-0.5">
              {users.map((u) => (
                <li key={u.id}>
                  <button
                    onClick={() => onSelectUser(u.id)}
                    className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-accent/5 transition-colors"
                  >
                    <span className="relative shrink-0">
                      <span className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500/20 to-blue-500/20 text-indigo-400 flex items-center justify-center overflow-hidden text-sm font-bold">
                        {u.avatarUrl ? (
                          <img src={u.avatarUrl} alt={u.fullName} className="w-full h-full object-cover" />
                        ) : (
                          u.fullName?.charAt(0)?.toUpperCase() || "?"
                        )}
                      </span>
                      <span
                        className={cn(
                          "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-background",
                          presenceColor(u.presenceStatus ?? "OFFLINE")
                        )}
                      />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium truncate">{u.fullName}</span>
                      <span className="block text-xs text-muted-foreground truncate">@{u.username}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
