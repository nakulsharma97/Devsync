import { useCallback, useEffect, useState } from "react";
import { Loader2, Send, X } from "lucide-react";
import { toast } from "sonner";
import type { MessageDto } from "@/services/messageService";
import { messageService } from "@/services/messageService";
import { MessageList } from "./MessageList";
import { cn } from "@/lib/utils";

interface ThreadPanelProps {
  parent: MessageDto;
  myId: string;
  isRoom: boolean;
  onClose: () => void;
  /** Called after a reply is sent so the main list can refresh the reply count. */
  onReplySent?: () => void;
}

export function ThreadPanel({ parent, myId, isRoom, onClose, onReplySent }: ThreadPanelProps) {
  const [replies, setReplies] = useState<MessageDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setReplies(await messageService.getThread(parent.id));
    } catch {
      toast("Failed to load replies");
    } finally {
      setLoading(false);
    }
  }, [parent.id]);

  useEffect(() => {
    load();
  }, [load]);

  const sendReply = async () => {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      const reply = await messageService.sendMessage({
        roomId: isRoom ? parent.roomId ?? undefined : undefined,
        receiverId: !isRoom
          ? parent.senderId === myId
            ? (parent.receiverId ?? undefined)
            : (parent.senderId ?? undefined)
          : undefined,
        content,
        parentMessageId: parent.id,
      });
      setReplies((prev) => [...prev, reply]);
      setText("");
      onReplySent?.();
    } catch (err) {
      toast(
        err instanceof Error && err.message ? err.message : "Failed to send reply"
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-2 px-3 py-2.5 border-b border-border/40">
        <button
          onClick={onClose}
          aria-label="Close thread"
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">Thread</p>
          <p className="text-[11px] text-muted-foreground truncate">
            {parent.senderName} · {parent.content}
          </p>
        </div>
      </div>

      {/* Parent preview */}
      <div className="shrink-0 px-3 py-2.5 border-b border-border/30 bg-muted/30">
        <div className="flex items-start gap-2.5">
          <span className="w-7 h-7 mt-0.5 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center text-[10px] font-bold text-indigo-400 shrink-0 overflow-hidden">
            {parent.senderAvatar ? (
              <img src={parent.senderAvatar} alt={parent.senderName} className="w-full h-full object-cover" />
            ) : (
              parent.senderName?.charAt(0)?.toUpperCase() || "?"
            )}
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-indigo-500 dark:text-indigo-400">{parent.senderName}</p>
            <p className="text-sm text-foreground/85 break-words">{parent.content}</p>
          </div>
        </div>
      </div>

      {/* Replies */}
      <div className="flex-1 overflow-y-auto min-h-0 px-3 py-3">
        <MessageList
          messages={replies}
          loading={loading}
          myId={myId}
          isRoom={isRoom}
          highlightId={null}
          onRegisterRef={() => {}}
        />
        {!loading && replies.length === 0 && (
          <p className="text-center text-xs text-muted-foreground py-8">
            No replies yet — start the conversation.
          </p>
        )}
      </div>

      {/* Reply composer */}
      <div className="shrink-0 border-t border-border/40 px-3 py-2.5">
        <div className="flex items-end gap-1.5 rounded-xl border border-border/50 bg-muted/30 focus-within:border-indigo-500/50 px-2 py-1.5 transition-all">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendReply();
              }
            }}
            placeholder="Reply to thread..."
            aria-label="Reply to thread"
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm outline-none py-1 max-h-[96px] leading-relaxed placeholder:text-muted-foreground/60"
          />
          <button
            onClick={sendReply}
            disabled={!text.trim() || sending}
            aria-label="Send reply"
            className={cn(
              "w-8 h-8 shrink-0 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white flex items-center justify-center transition-all disabled:opacity-40",
              sending && "opacity-60"
            )}
          >
            {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground/50 mt-1 px-1">
          Enter to send · Shift + Enter for a new line
        </p>
      </div>
    </div>
  );
}
