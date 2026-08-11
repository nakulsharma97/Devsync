import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router";
import { searchService } from "@/services/searchService";
import {
  LayoutDashboard,
  User,
  FolderGit2,
  Rss,
  Users,
  Bell,
  Bookmark,
  Search,
  Settings,
  MessageCircle,
  Command,
  ArrowRight,
  Loader2,
} from "lucide-react";

/** A search hit from the existing search APIs (users + public projects). */
interface SearchResultItem {
  id: string;
  label: string;
  description?: string;
  type: "user" | "project";
  /** Precomputed destination (existing routes only). */
  to: string;
}

type UserHit = { id: string; fullName?: string; username?: string; email?: string };
type ProjectHit = { id: string; name?: string; title?: string; description?: string };

const RESOURCE_SEARCH_MIN_CHARS = 2;

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  keywords: string[];
}

export function CommandPalette({
  open: openProp,
  onOpenChange,
}: {
  /**
   * Controlled open state (e.g. from a header trigger). Optional — when
   * omitted the palette manages its own state. If `open` is provided you
   * must also provide `onOpenChange`, otherwise the palette can never close.
   */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
} = {}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = useCallback(
    (next: boolean) => {
      // In controlled mode the parent owns the state; skip the internal write.
      if (openProp === undefined) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [onOpenChange, openProp]
  );
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [resourceResults, setResourceResults] = useState<SearchResultItem[]>([]);
  const [resourceStatus, setResourceStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const requestSeq = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const items: CommandItem[] = [
    {
      id: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      action: () => navigate("/dashboard"),
      keywords: ["home", "main", "overview"],
    },
    {
      id: "profile",
      label: "Profile",
      icon: User,
      action: () => navigate("/profile"),
      keywords: ["me", "account", "avatar"],
    },
    {
      id: "projects",
      label: "Projects",
      icon: FolderGit2,
      action: () => navigate("/projects"),
      keywords: ["repos", "code", "repository"],
    },
    {
      id: "feed",
      label: "Feed",
      icon: Rss,
      action: () => navigate("/feed"),
      keywords: ["posts", "activity", "updates"],
    },
    {
      id: "messages",
      label: "Messages",
      icon: MessageCircle,
      action: () => navigate("/messages"),
      keywords: ["chat", "dm", "conversation", "inbox"],
    },
    {
      id: "teams",
      label: "Teams",
      icon: Users,
      action: () => navigate("/teams"),
      keywords: ["group", "collaboration"],
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: Bell,
      action: () => navigate("/notifications"),
      keywords: ["alerts", "bell", "updates"],
    },
    {
      id: "bookmarks",
      label: "Bookmarks",
      icon: Bookmark,
      action: () => navigate("/bookmarks"),
      keywords: ["saved", "favorites"],
    },
    {
      id: "search",
      label: "Search Developers",
      icon: Search,
      action: () => navigate("/search"),
      keywords: ["find", "people", "developers", "users"],
    },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
      action: () => navigate("/settings"),
      keywords: ["preferences", "config", "options"],
    },
    {
      id: "newpost",
      label: "New Post",
      description: "Create a new post",
      icon: Rss,
      action: () => {
        navigate("/feed");
        // Focus the post textarea after navigation
        setTimeout(() => {
          const textarea = document.querySelector("textarea");
          textarea?.focus();
        }, 100);
      },
      keywords: ["create", "write", "share"],
    },
  ];

  const trimmed = query.trim();
  const filtered = trimmed
    ? items.filter(
        (item) =>
          item.label.toLowerCase().includes(trimmed.toLowerCase()) ||
          item.keywords.some((kw) =>
            kw.toLowerCase().includes(trimmed.toLowerCase()),
          ),
      )
    : items;

  // Debounced resource search (users + public projects) reusing the existing
  // search APIs. Stale responses are ignored via a request sequence guard.
  const showResourceSearch = trimmed.length >= RESOURCE_SEARCH_MIN_CHARS;
  useEffect(() => {
    if (!showResourceSearch) {
      setResourceStatus("idle");
      setResourceResults([]);
      return;
    }
    const seq = ++requestSeq.current;
    setResourceStatus("loading");
    const timer = setTimeout(async () => {
      try {
        const [users, projects] = await Promise.all([
          searchService.searchUsers(trimmed),
          searchService.searchProjects(trimmed),
        ]);
        if (seq !== requestSeq.current) return; // stale response
        const results: SearchResultItem[] = [
          ...((users as UserHit[]) || []).map((u) => ({
            id: `user-${u.id}`,
            label: u.fullName || u.username || "User",
            description: u.email || u.username,
            type: "user" as const,
            to: `/messages/dm_${u.id}`,
          })),
          ...((projects as ProjectHit[]) || []).map((p) => ({
            id: `project-${p.id}`,
            label: p.name || p.title || "Project",
            description: p.description || undefined,
            type: "project" as const,
            to: `/board/${p.id}`,
          })),
        ];
        setResourceResults(results);
        setResourceStatus("success");
      } catch {
        if (seq !== requestSeq.current) return;
        setResourceResults([]);
        setResourceStatus("error");
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [showResourceSearch, trimmed]);

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(!open);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, setOpen]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter" && filtered[selectedIndex]) {
        e.preventDefault();
        filtered[selectedIndex].action();
        setOpen(false);
      }
    },
    [filtered, selectedIndex, setOpen],
  );

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Palette */}
      <div className="fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-lg z-50 animate-in fade-in slide-in-from-top-4 duration-200">
        <div className="bg-popover border border-border rounded-2xl shadow-2xl overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50">
            <Command className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Type a command or search..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
            />
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground bg-muted rounded border border-border/50">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto p-2">
            {filtered.length > 0 && (
              <>
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  Navigate
                </div>
                {filtered.map((item, index) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      item.action();
                      setOpen(false);
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                      index === selectedIndex
                        ? "bg-accent/10 text-accent"
                        : "text-foreground hover:bg-accent/5"
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        index === selectedIndex
                          ? "bg-accent/15 text-accent"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <item.icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium">{item.label}</div>
                      {item.description && (
                        <div className="text-xs text-muted-foreground">
                          {item.description}
                        </div>
                      )}
                    </div>
                    <ArrowRight
                      className={`w-3.5 h-3.5 ${
                        index === selectedIndex
                          ? "text-accent opacity-100"
                          : "text-muted-foreground opacity-0"
                      } transition-opacity`}
                    />
                  </button>
                ))}
              </>
            )}

            {/* Resource search (users + projects) */}
            {showResourceSearch && (
              <>
                {filtered.length > 0 && (
                  <div className="my-1.5 mx-2 border-t border-border/40" />
                )}
                {resourceStatus === "loading" && (
                  <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Searching…
                  </div>
                )}
                {resourceStatus === "error" && (
                  <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                    Search is unavailable right now
                  </div>
                )}
                {resourceStatus === "success" && resourceResults.length === 0 && filtered.length === 0 && (
                  <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                    No results for "<span className="text-foreground">{query}</span>"
                  </div>
                )}
                {resourceStatus === "success" && resourceResults.length > 0 && (
                  <>
                    <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                      Resources
                    </div>
                    {resourceResults.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          navigate(item.to);
                          setOpen(false);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 text-foreground hover:bg-accent/5"
                      >
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-muted text-muted-foreground">
                          {item.type === "user" ? (
                            <User className="w-3.5 h-3.5" />
                          ) : (
                            <FolderGit2 className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <div className="font-medium truncate">{item.label}</div>
                          {item.description && (
                            <div className="text-xs text-muted-foreground truncate">
                              {item.description}
                            </div>
                          )}
                        </div>
                        <span
                          className={`shrink-0 text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                            item.type === "user"
                              ? "bg-indigo-500/10 text-indigo-500 dark:text-indigo-400"
                              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {item.type}
                        </span>
                      </button>
                    ))}
                  </>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-border/50 flex items-center gap-4 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-muted rounded border border-border/30 font-mono">
                ↑↓
              </kbd>{" "}
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-muted rounded border border-border/30 font-mono">
                ↵
              </kbd>{" "}
              Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-muted rounded border border-border/30 font-mono">
                Esc
              </kbd>{" "}
              Close
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
