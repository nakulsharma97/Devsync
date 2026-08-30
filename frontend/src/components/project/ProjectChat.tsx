import { useCallback, useEffect, useRef, useState } from "react";
import { messageService, type MessageDto } from "@/services/messageService";
import { wsService } from "@/services/websocketService";
import { useTyping } from "@/hooks/useTyping";
import { useAuth } from "@/contexts/AuthContext";
import { Send, Loader2, Wifi, WifiOff, Users } from "lucide-react";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { TeamRoomDto } from "@/services/roomService";

/**
 * Compact team chat for the project workspace. Reuses the existing REST +
 * STOMP services (single connection, same topic routing as the Messages page)
 * — no second WebSocket architecture.
 */
export function ProjectChat({ room }: { room: TeamRoomDto }) {
  const { user } = useAuth();
  const myId = user?.id ?? "";
  const roomId = room.id;
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(wsService.isConnected);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { markTyping, stopTyping } = useTyping(roomId);

  // Pending optimistic sends that have not yet been replaced by the server
  // echo (see the live-subscription effect below). Keyed by the optimistic id.
  const pendingEchoTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const clearPendingEcho = useCallback((optId: string) => {
    const timer = pendingEchoTimers.current.get(optId);
    if (timer) clearTimeout(timer);
    pendingEchoTimers.current.delete(optId);
  }, []);

  // Clear pending timers on unmount so nothing leaks.
  useEffect(() => {
    const timers = pendingEchoTimers.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  // Load history + mark the room read so the Messages-page badge clears.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    messageService
      .getRoomMessages(roomId)
      .then((msgs) => {
        if (!cancelled) setMessages(msgs);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    messageService.markRoomRead(roomId).catch(() => {
      // Non-fatal — the badge corrects itself on the next list refresh.
    });
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  // Live incoming messages on the existing STOMP connection
  useEffect(() => {
    if (!wsService.isConnected) return;
    const unsub = wsService.subscribeToRoom(roomId, (data: MessageDto) => {
      if (!data || !data.id) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.id)) return prev;
        // Replace our optimistic send with the server echo (same content, from
        // me) — otherwise every message appears twice.
        const optIdx = prev.findIndex(
          (m) =>
            String(m.id).startsWith("opt-") &&
            m.senderId === myId &&
            data.senderId === myId &&
            m.content === data.content
        );
        if (optIdx !== -1) {
          clearPendingEcho(String(prev[optIdx].id));
          const next = [...prev];
          next[optIdx] = data;
          return next;
        }
        return [...prev, data];
      });
      // The user is viewing this chat — incoming messages are read immediately.
      messageService.markRoomRead(roomId).catch(() => {});
    });
    return () => unsub();
  }, [roomId, myId, clearPendingEcho]);

  useEffect(() => {
    const unsub = wsService.onConnection(setConnected);
    return () => {
      unsub();
    };
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const handleSend = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const content = text.trim();
      if (!content) return;
      stopTyping();
      setText("");
      setSending(true);
      try {
        if (wsService.isConnected) {
          wsService.sendMessage({ roomId, content });
          // Optimistic echo — replaced by the server echo when it arrives.
          const optId = `opt-${Date.now()}`;
          setMessages((prev) => [
            ...prev,
            {
              id: optId,
              senderId: myId,
              senderName: user?.fullName || "You",
              senderAvatar: user?.avatarUrl ?? null,
              roomId,
              receiverId: null,
              content,
              messageType: "text",
              systemMessage: false,
              attachmentId: null,
              attachment: null,
              createdAt: new Date().toISOString(),
            },
          ]);
          // If the echo never arrives (e.g. socket dropped mid-send), drop the
          // optimistic bubble after a few seconds instead of leaving a ghost.
          pendingEchoTimers.current.set(
            optId,
            setTimeout(() => {
              pendingEchoTimers.current.delete(optId);
              setMessages((prev) => prev.filter((m) => m.id !== optId));
            }, 10000)
          );
        } else {
          const real = await messageService.sendMessage({ roomId, content });
          setMessages((prev) => [...prev, real]);
        }
      } catch {
        // Keep the message in the input so the user can retry.
        setText(content);
      } finally {
        setSending(false);
      }
    },
    [text, stopTyping, roomId, myId, user]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter → send; Shift+Enter → new line.
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const form = (e.target as HTMLTextAreaElement).form;
      form?.requestSubmit();
    }
  };

  return (
    <div className="flex flex-col h-[480px] lg:h-[540px] rounded-xl border border-border/40 bg-card overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-border/40 bg-muted/20">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{room.name}</p>
          <p className="text-xs text-muted-foreground inline-flex items-center gap-1.5 mt-0.5">
            <Users className="w-3.5 h-3.5" />
            {room.participantCount} member{room.participantCount !== 1 ? "s" : ""}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 text-[10px] shrink-0",
            connected ? "text-emerald-500" : "text-amber-500"
          )}
        >
          {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          {connected ? "Live" : "Reconnecting"}
        </span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
            <p className="text-xs text-muted-foreground">Loading messages…</p>
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground py-8">
            No messages yet — start the conversation with your team.
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.senderId === myId;
            return (
              <div key={m.id} className={cn("flex gap-2", mine && "flex-row-reverse")}>
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center shrink-0 overflow-hidden">
                  {m.senderAvatar ? (
                    <img src={m.senderAvatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[10px] font-bold text-indigo-400">
                      {m.senderName?.charAt(0) || "?"}
                    </span>
                  )}
                </div>
                <div className={cn("max-w-[75%]", mine && "text-right")}>
                  <div
                    className={cn(
                      "rounded-xl px-3 py-1.5 text-sm",
                      mine
                        ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
                        : "bg-muted/40 text-foreground border border-border/30"
                    )}
                  >
                    {!mine && (
                      <p className="text-[10px] font-medium text-muted-foreground mb-0.5">
                        {m.senderName}
                      </p>
                    )}
                    <p className="break-words whitespace-pre-wrap">{m.content}</p>
                  </div>
                  <p className="text-[9px] text-muted-foreground/60 mt-0.5">
                    {timeAgo(m.createdAt, "") || "just now"}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Composer */}
      <form onSubmit={handleSend} className="shrink-0 flex items-end gap-2 p-2.5 border-t border-border/40">
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            markTyping();
          }}
          onKeyDown={handleKeyDown}
          onBlur={stopTyping}
          placeholder="Message the team…"
          rows={1}
          className="flex-1 max-h-28 min-h-9 h-9 resize-none text-sm bg-muted/30 border border-border/40 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 placeholder:text-muted-foreground/50 transition-all"
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          aria-label="Send message"
          className="w-9 h-9 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white flex items-center justify-center disabled:opacity-40 hover:from-indigo-600 hover:to-purple-700 transition-all"
        >
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </form>
    </div>
  );
}
