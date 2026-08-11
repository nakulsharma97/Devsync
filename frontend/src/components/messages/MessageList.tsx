import { Copy, Check, Loader2, MessageSquare } from "lucide-react";
import { useState } from "react";
import type { MessageDto } from "@/services/messageService";
import { formatChatTime, formatDayLabel } from "@/lib/format";
import { MessageAttachment } from "./AttachmentView";
import { cn } from "@/lib/utils";

interface MessageListProps {
  messages: MessageDto[];
  loading: boolean;
  myId: string;
  isRoom: boolean;
  highlightId: string | null;
  /** Optimistic messages that never received a server echo — retryable. */
  failedIds?: Set<string>;
  onRetry?: (msg: MessageDto) => void;
  onRegisterRef: (id: string, el: HTMLDivElement | null) => void;
}

function isOptimistic(msg: MessageDto): boolean {
  return String(msg.id).startsWith("opt-");
}

/** Centered day separator — only rendered when the day changes. */
function DaySeparator({ date }: { date: string }) {
  const label = formatDayLabel(date);
  if (!label) return null;
  return (
    <div className="flex items-center gap-3 my-4">
      <span className="h-px flex-1 bg-border/40" />
      <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/60">
        {label}
      </span>
      <span className="h-px flex-1 bg-border/40" />
    </div>
  );
}

function MessageBubble({
  msg,
  myId,
  isRoom,
  highlighted,
  failed,
  onRetry,
  registerRef,
}: {
  msg: MessageDto;
  myId: string;
  isRoom: boolean;
  highlighted: boolean;
  failed?: boolean;
  onRetry?: (msg: MessageDto) => void;
  registerRef: MessageListProps["onRegisterRef"];
}) {
  const [copied, setCopied] = useState(false);
  const own = msg.senderId === myId;
  const optimistic = isOptimistic(msg);

  if (msg.systemMessage) {
    return (
      <div
        ref={(el) => registerRef(msg.id, el)}
        className={cn(
          "flex justify-center my-2 transition-colors duration-500",
          highlighted && "bg-indigo-500/10 rounded-lg"
        )}
      >
        <span className="text-[11px] text-muted-foreground italic bg-muted/40 rounded-full px-3 py-1">
          {msg.content}
        </span>
      </div>
    );
  }

  return (
    <div
      ref={(el) => registerRef(msg.id, el)}
      className={cn(
        "group flex gap-2.5 px-1 transition-colors duration-500 rounded-lg",
        own ? "justify-end" : "justify-start",
        highlighted && "bg-indigo-500/10"
      )}
    >
      {/* Incoming avatar (rooms only) */}
      {!own && isRoom && (
        <span className="w-7 h-7 mt-1 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-400 dark:text-indigo-300 flex items-center justify-center text-[10px] font-bold shrink-0 overflow-hidden">
          {msg.senderAvatar ? (
            <img src={msg.senderAvatar} alt={msg.senderName} className="w-full h-full object-cover" />
          ) : (
            msg.senderName?.charAt(0)?.toUpperCase() || "?"
          )}
        </span>
      )}

      <div className={cn("max-w-[70%] flex flex-col", own ? "items-end" : "items-start")}>
        {/* Sender name in rooms */}
        {!own && isRoom && (
          <span className="text-[11px] font-medium text-indigo-500 dark:text-indigo-400 mb-1 ml-0.5">
            {msg.senderName}
          </span>
        )}

        <div className="relative group/bubble">
          <div
            className={cn(
              "rounded-2xl px-3.5 py-2 text-sm leading-relaxed break-words",
              failed
                ? "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/30 rounded-br-md"
                : own
                  ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-br-md shadow-sm shadow-indigo-500/20"
                  : "bg-card border border-border/40 rounded-bl-md",
              optimistic && !failed && "opacity-70"
            )}
          >
            {msg.attachment && <MessageAttachment attachment={msg.attachment} />}
            {msg.content && <p>{msg.content}</p>}
          </div>

          {/* Hover copy action */}
          {!optimistic && (
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(msg.content);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1200);
                } catch {
                  // clipboard unavailable
                }
              }}
              aria-label="Copy message"
              title="Copy message"
              className={cn(
                "absolute -top-2.5 p-1.5 rounded-md bg-popover border border-border shadow-md text-muted-foreground hover:text-foreground transition-all",
                own ? "left-0 translate-x-[-50%]" : "right-0 translate-x-[50%]",
                "opacity-0 group-hover/bubble:opacity-100 focus-visible:opacity-100"
              )}
            >
              {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
            </button>
          )}
        </div>

        {/* Meta row */}
        <span
          className={cn(
            "flex items-center gap-1 text-[10px] mt-1 px-1",
            own && "justify-end"
          )}
        >
          {failed ? (
            <button
              onClick={() => onRetry?.(msg)}
              className="text-red-500 hover:underline font-medium"
              title="Resend this message"
            >
              Failed · tap to retry
            </button>
          ) : (
            <>
              <span className="text-muted-foreground/60">{formatChatTime(msg.createdAt)}</span>
              {optimistic && <span className="italic text-muted-foreground/60">sending…</span>}
            </>
          )}
        </span>
      </div>
    </div>
  );
}

export function MessageList({
  messages,
  loading,
  myId,
  isRoom,
  highlightId,
  failedIds,
  onRetry,
  onRegisterRef,
}: MessageListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center px-6">
        <MessageSquare className="w-10 h-10 text-muted-foreground/25" />
        <p className="text-sm font-medium text-foreground/80">No messages yet</p>
        <p className="text-xs text-muted-foreground">Say hello to start the conversation.</p>
      </div>
    );
  }

  let lastDay = "";
  const rows: React.ReactNode[] = [];
  for (const msg of messages) {
    const day = formatDayLabel(msg.createdAt);
    if (day && day !== lastDay) {
      rows.push(<DaySeparator key={`day-${msg.id}`} date={msg.createdAt} />);
      lastDay = day;
    }
    rows.push(
      <MessageBubble
        key={msg.id}
        msg={msg}
        myId={myId}
        isRoom={isRoom}
        highlighted={highlightId === msg.id}
        failed={failedIds?.has(String(msg.id))}
        onRetry={onRetry}
        registerRef={onRegisterRef}
      />
    );
  }
  return <div className="space-y-1.5">{rows}</div>;
}
