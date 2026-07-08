import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router";
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
  Code2,
  Command,
  ArrowRight,
} from "lucide-react";

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  keywords: string[];
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
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

  const filtered = query.trim()
    ? items.filter(
        (item) =>
          item.label.toLowerCase().includes(query.toLowerCase()) ||
          item.keywords.some((kw) =>
            kw.toLowerCase().includes(query.toLowerCase()),
          ),
      )
    : items;

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

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
    [filtered, selectedIndex],
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
          <div className="max-h-72 overflow-y-auto p-2">
            {filtered.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                No results for "<span className="text-foreground">{query}</span>"
              </div>
            ) : (
              filtered.map((item, index) => (
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
              ))
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
