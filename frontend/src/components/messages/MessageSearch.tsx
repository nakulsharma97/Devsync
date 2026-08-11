import { useEffect, useMemo, useState } from "react";
import { Search, X, SearchX, CornerDownRight } from "lucide-react";
import type { MessageDto } from "@/services/messageService";
import { formatChatTime } from "@/lib/format";

interface MessageSearchProps {
  open: boolean;
  messages: MessageDto[];
  onClose: () => void;
  /** Scroll to and highlight the given message id. */
  onJump: (id: string) => void;
}

/** Highlight <em> occurrences of the query inside a message snippet. */
function Highlight({ text, query }: { text: string; query: string }) {
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  if (!q) return <>{text}</>;
  const idx = lower.indexOf(q);
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <em className="not-italic bg-amber-400/30 dark:bg-amber-400/20 text-foreground rounded px-0.5">
        {text.slice(idx, idx + query.length)}
      </em>
      {text.slice(idx + query.length)}
    </>
  );
}

export function MessageSearch({ open, messages, onClose, onJump }: MessageSearchProps) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return messages
      .filter((m) => !m.systemMessage && m.content.toLowerCase().includes(q))
      .slice(-20)
      .reverse();
  }, [messages, query]);

  if (!open) return null;

  return (
    <div className="absolute left-3 right-3 top-14 z-40 rounded-xl border border-border/50 bg-popover/95 backdrop-blur-xl shadow-xl shadow-black/5 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border/40">
        <Search className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search in this conversation..."
          aria-label="Search messages"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
          autoFocus
        />
        <button
          onClick={onClose}
          aria-label="Close search"
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="max-h-72 overflow-y-auto p-1.5">
        {query.trim().length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">Search within this conversation</p>
        ) : results.length === 0 ? (
          <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground text-center py-6">
            <SearchX className="w-3.5 h-3.5" /> No matching messages
          </p>
        ) : (
          <ul className="space-y-0.5">
            {results.map((m) => (
              <li key={m.id}>
                <button
                  onClick={() => onJump(m.id)}
                  className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-accent/5 transition-colors"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium text-indigo-500 dark:text-indigo-400 truncate">
                      {m.senderName}
                    </span>
                    <span className="text-[10px] text-muted-foreground/60 shrink-0">
                      {formatChatTime(m.createdAt)}
                    </span>
                  </span>
                  <span className="block text-xs text-foreground/85 truncate mt-0.5">
                    <Highlight text={m.content} query={query.trim()} />
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground/50 mt-0.5">
                    <CornerDownRight className="w-2.5 h-2.5" /> Jump to message
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
