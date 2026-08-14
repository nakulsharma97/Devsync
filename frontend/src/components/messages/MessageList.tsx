import { Copy, Check, Loader2, MessageSquare, Pencil, Reply, Trash2 } from "lucide-react";
import { useState } from "react";
import type { MessageDto, ReactionDto } from "@/services/messageService";
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
  /** Reply to a message (opens the reply composer with the parent set). */
  onReply?: (msg: MessageDto) => void;
  /** Open the reply thread for a message. */
  onOpenThread?: (msg: MessageDto) => void;
  /** Toggle the caller's reaction on a message. */
  onToggleReaction?: (msg: MessageDto, emoji: string) => void;
  /** Start editing a message inline. */
  onEdit?: (msg: MessageDto) => void;
  /** Delete (soft-delete) a message. */
  onDelete?: (msg: MessageDto) => void;
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
  onReply,
  onOpenThread,
  onToggleReaction,
  onEdit,
  onDelete,
}: {
  msg: MessageDto;
  myId: string;
  isRoom: boolean;
  highlighted: boolean;
  failed?: boolean;
  onRetry?: (msg: MessageDto) => void;
  registerRef: MessageListProps["onRegisterRef"];
  onReply?: (msg: MessageDto) => void;
  onOpenThread?: (msg: MessageDto) => void;
  onToggleReaction?: (msg: MessageDto, emoji: string) => void;
  onEdit?: (msg: MessageDto) => void;
  onDelete?: (msg: MessageDto) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [reacting, setReacting] = useState(false);
  const own = msg.senderId === myId;
  const optimistic = isOptimistic(msg);
  const reactions = msg.reactions ?? [];
  const replyCount = msg.replyCount ?? 0;

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

  const handleReact = async (emoji: string) => {
    if (!onToggleReaction || optimistic || reacting) return;
    setReacting(true);
    try {
      await onToggleReaction(msg, emoji);
    } finally {
      setReacting(false);
    }
  };

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
            {msg.edited && (
              <span
                className={cn(
                  "block text-[9px] italic mt-0.5",
                  own ? "text-white/60" : "text-muted-foreground/60"
                )}
                title={msg.editedAt ? `Edited ${new Date(msg.editedAt).toLocaleString()}` : "Edited"}
              >
                (edited)
              </span>
            )}
          </div>

          {/* Hover actions */}
          {!optimistic && (
            <div
              className={cn(
                "absolute -top-2.5 flex items-center gap-0.5 rounded-md bg-popover border border-border shadow-md p-0.5",
                own ? "left-0 translate-x-[-50%]" : "right-0 translate-x-[50%]",
                "opacity-0 group-hover/bubble:opacity-100 focus-within:opacity-100 transition-all"
              )}
            >
              {onReply && (
                <button
                  onClick={() => onReply(msg)}
                  aria-label="Reply"
                  title="Reply"
                  className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors"
                >
                  <Reply className="w-3 h-3" />
                </button>
              )}
              {onToggleReaction && (
                <button
                  onClick={() => handleReact("👍")}
                  disabled={reacting}
                  aria-label="React with thumbs up"
                  title="React 👍"
                  className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors disabled:opacity-40"
                >
                  {reacting ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <span className="text-xs leading-none">👍</span>
                  )}
                </button>
              )}
              {own && onEdit && (
                <button
                  onClick={() => onEdit(msg)}
                  aria-label="Edit message"
                  title="Edit message"
                  className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              )}
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
                className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              </button>
              {own && onDelete && (
                <button
                  onClick={() => onDelete(msg)}
                  aria-label="Delete message"
                  title="Delete message"
                  className="p-1.5 rounded text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Reactions */}
        {reactions.length > 0 && !optimistic && (
          <div className="flex items-center gap-1 mt-1 flex-wrap">
            {reactions.map((r: ReactionDto) => (
              <button
                key={r.emoji}
                onClick={() => handleReact(r.emoji)}
                disabled={reacting}
                title={`${r.count} reaction${r.count !== 1 ? "s" : ""}`}
                aria-label={`Toggle ${r.emoji} reaction`}
                className={cn(
                  "inline-flex items-center gap-1 text-[11px] rounded-full border px-1.5 py-0.5 transition-colors",
                  r.reactedByMe
                    ? "bg-indigo-500/15 border-indigo-500/30 text-indigo-500 dark:text-indigo-300"
                    : "bg-muted/40 border-border/40 text-muted-foreground hover:bg-muted/70"
                )}
              >
                <span aria-hidden>{r.emoji}</span>
                <span className="font-medium">{r.count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Thread summary */}
        {replyCount > 0 && onOpenThread && !optimistic && (
          <button
            onClick={() => onOpenThread(msg)}
            className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-medium text-indigo-500 dark:text-indigo-400 hover:underline"
            title="View replies"
          >
            <MessageSquare className="w-3 h-3" />
            {replyCount} {replyCount === 1 ? "reply" : "replies"}
          </button>
        )}

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
  onReply,
  onOpenThread,
  onToggleReaction,
  onEdit,
  onDelete,
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
        onReply={onReply}
        onOpenThread={onOpenThread}
        onToggleReaction={onToggleReaction}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    );
  }
  return <div className="space-y-1.5">{rows}</div>;
}
