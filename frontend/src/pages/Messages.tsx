import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import { useApi } from "@/hooks/useApi";
import { useTyping } from "@/hooks/useTyping";
import { messageService, type MessageDto } from "@/services/messageService";
import { wsService } from "@/services/websocketService";
import { TypingIndicator } from "@/components/TypingIndicator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, MessageSquare, Users, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";

export default function Messages() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { data: conversations, loading, refetch } = useApi(() => messageService.getConversations());
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [typers, setTypers] = useState<Set<string>>(new Set());
  const [presence, setPresence] = useState<Record<string, string>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pendingOptimisticRef = useRef(0);
  const typingTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const isRoom = conversationId?.startsWith("room_") ?? false;
  const actualId = conversationId?.replace(/^(room_|dm_)/, "");

  const { markTyping, stopTyping } = useTyping(
    isRoom ? actualId : undefined,
    !isRoom ? actualId : undefined
  );

  // Track WebSocket connection state
  useEffect(() => {
    const unsub = wsService.onConnection((connected) => {
      setWsConnected(connected);
    });
    setWsConnected(wsService.isConnected);
    return () => { unsub(); };
  }, []);

  // Incoming typing indicators, scoped to the open conversation.
  useEffect(() => {
    if (!conversationId) return;
    const convIsRoom = conversationId.startsWith("room_");
    const convActualId = conversationId.replace(/^(room_|dm_)/, "");

    const removeTyper = (userId: string) => {
      setTypers((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    };

    const unsub = wsService.onTyping((data) => {
      if (!data || !data.userId) return;
      if (data.userId === wsService.currentUserId) return; // ignore self
      // Filter to the open conversation: room typing events carry roomId;
      // DM events carry the typer's userId (the other participant).
      if (convIsRoom && data.roomId !== convActualId) return;
      if (!convIsRoom && data.roomId) return;
      if (!convIsRoom && data.userId !== convActualId) return;

      if (data.typing) {
        setTypers((prev) => {
          const next = new Set(prev);
          next.add(data.userId);
          return next;
        });
        // Safety net: if the stop event is lost, hide after 5s.
        const existing = typingTimeoutsRef.current.get(data.userId);
        if (existing) clearTimeout(existing);
        typingTimeoutsRef.current.set(
          data.userId,
          setTimeout(() => removeTyper(data.userId), 5000)
        );
      } else {
        removeTyper(data.userId);
      }
    });

    return () => {
      unsub();
      setTypers(new Set());
      const timeouts = typingTimeoutsRef.current;
      timeouts.forEach((t) => clearTimeout(t));
      timeouts.clear();
    };
  }, [conversationId]);

  // Live presence feed for the conversation sidebar.
  useEffect(() => {
    const unsub = wsService.onPresence((data) => {
      if (!data || !data.userId) return;
      setPresence((prev) => ({ ...prev, [data.userId]: data.status }));
    });
    return () => { unsub(); };
  }, []);

  // Load messages when conversation changes
  useEffect(() => {
    if (!conversationId) return;
    setLoadingMessages(true);
    const isRoom = conversationId.startsWith("room_");
    const actualId = conversationId.replace(/^(room_|dm_)/, "");

    const fetch = isRoom
      ? messageService.getRoomMessages(actualId)
      : messageService.getConversation(actualId);

    fetch
      .then(setMessages)
      .catch(() => toast("Failed to load messages"))
      .finally(() => setLoadingMessages(false));
  }, [conversationId]);

  // Subscribe to real-time messages via WebSocket
  useEffect(() => {
    if (!conversationId) return;
    const isRoom = conversationId.startsWith("room_");
    const actualId = conversationId.replace(/^(room_|dm_)/, "");

    let unsubscribe: (() => void) | undefined;

    const doSubscribe = () => {
      if (unsubscribe) unsubscribe();
      if (!wsService.isConnected) return;

      if (isRoom) {
        unsubscribe = wsService.subscribeToRoom(actualId, (data) => {
          setMessages((prev) => {
            // Dedup by id OR by content + senderId (for optimistic messages)
            if (prev.some((m) => m.id === data.id || (m.content === data.content && m.senderId === data.senderId && !m.id?.toString().startsWith("opt-")))) {
              // Replace optimistic message with real one
              return prev.map((m) =>
                m.id?.toString().startsWith("opt-") && m.content === data.content && m.senderId === data.senderId
                  ? data
                  : m
              );
            }
            return [...prev, data];
          });
        });
      }
    };

    doSubscribe();
    const unsubConnection = wsService.onConnection((connected) => {
      if (connected) doSubscribe();
    });

    return () => {
      if (unsubscribe) unsubscribe();
      unsubConnection();
    };
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversationId) return;
    setSending(true);
    const text = newMessage.trim();
    setNewMessage("");
    stopTyping();

    try {
      const isRoom = conversationId.startsWith("room_");
      const actualId = conversationId.replace(/^(room_|dm_)/, "");

      if (wsService.isConnected) {
        // Optimistic update — show message immediately
        pendingOptimisticRef.current += 1;
        const optId = `opt-${Date.now()}-${pendingOptimisticRef.current}`;
        const optimisticMsg: MessageDto = {
          id: optId as any,
          senderId: "me",
          senderName: "You",
          senderAvatar: null,
          roomId: isRoom ? actualId : null,
          receiverId: !isRoom ? actualId : null,
          content: text,
          messageType: "text",
          systemMessage: false,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, optimisticMsg]);

        wsService.sendMessage({
          roomId: isRoom ? actualId : undefined,
          receiverId: !isRoom ? actualId : undefined,
          content: text,
        });
      } else {
        // Fallback to REST API
        const msg = await messageService.sendMessage({
          roomId: isRoom ? actualId : undefined,
          receiverId: !isRoom ? actualId : undefined,
          content: text,
        });
        setMessages((prev) => [...prev, msg]);
      }
    } catch {
      toast("Failed to send message");
      setNewMessage(text); // Restore text
    } finally {
      setSending(false);
    }
  }, [newMessage, conversationId, stopTyping]);

  return (
    <div className="flex h-[calc(100vh-8rem)] -m-4 md:-m-6">
      {/* Conversations sidebar */}
      <div className="w-72 border-r border-border/40 bg-card/50 overflow-y-auto shrink-0">
        <div className="p-3 border-b border-border/40 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Messages</h2>
          <button
            onClick={refetch}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Refresh
          </button>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-indigo-500" /></div>
        ) : conversations && conversations.length > 0 ? (
          <div className="divide-y divide-border/20">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => navigate(`/messages/${conv.id}`)}
                className={`w-full text-left p-3 hover:bg-accent/5 transition-colors ${
                  conversationId === conv.id ? "bg-indigo-500/10" : ""
                }`}
              >                  <div className="flex items-center gap-2">
                  <div className={`relative w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    conv.type === "room"
                      ? "bg-gradient-to-br from-purple-500/20 to-pink-500/20 text-purple-400"
                      : "bg-gradient-to-br from-indigo-500/20 to-blue-500/20 text-indigo-400"
                  }`}>
                    {conv.type === "room" ? <Users className="w-4 h-4" /> : conv.name?.charAt(0) || "?"}
                    {conv.type === "direct" && conv.otherUserId && (
                      <span
                        title={`Presence: ${presence[conv.otherUserId] ?? conv.otherUserPresence ?? "OFFLINE"}`}
                        className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-background ${
                          (presence[conv.otherUserId] ?? conv.otherUserPresence ?? "OFFLINE") === "ONLINE"
                            ? "bg-emerald-500"
                            : (presence[conv.otherUserId] ?? conv.otherUserPresence ?? "OFFLINE") === "AWAY"
                              ? "bg-amber-500"
                              : "bg-muted-foreground/40"
                        }`}
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{conv.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{conv.lastMessage || "No messages yet"}</p>
                  </div>
                  {(conv.unreadCount || 0) > 0 && (
                    <span className="text-[10px] bg-indigo-500 text-white rounded-full px-1.5 py-0.5 font-medium">
                      {conv.unreadCount}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            No conversations yet
          </div>
        )}
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {/* Connection indicator */}
        <div className="px-4 py-1.5 border-b border-border/30 flex items-center justify-between bg-card/30">
          <div className="flex items-center gap-2">
            {wsConnected ? (
              <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                <Wifi className="w-3 h-3" /> Connected
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[11px] text-amber-400">
                <WifiOff className="w-3 h-3" /> Connecting...
              </span>
            )}
          </div>
          {conversationId && (
            <span className="text-[11px] text-muted-foreground">
              {conversationId.startsWith("room_") ? "Room" : "Direct"}
            </span>
          )}
        </div>

        {conversationId ? (
          <>
            {(() => {
              const currentConv = conversations?.find((c) => c.id === conversationId);
              const typerNames = [...typers].map((id) =>
                !isRoom && currentConv?.otherUserId === id
                  ? currentConv.otherUserName ?? "Someone"
                  : "Someone"
              );
              return typers.size > 0 ? <TypingIndicator names={typerNames} /> : null;
            })()}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingMessages ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-indigo-500" /></div>
              ) : messages.length > 0 ? (
                messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.systemMessage ? "justify-center" : msg.senderId === "me" ? "justify-end" : "justify-start"} gap-2`}>
                    {!msg.systemMessage && msg.senderId !== "me" && (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center text-[10px] font-bold text-indigo-400 shrink-0 mt-0.5">
                        {msg.senderName?.charAt(0) || "?"}
                      </div>
                    )}
                    <div className={`max-w-[70%] ${
                      msg.systemMessage
                        ? "text-xs text-muted-foreground italic"
                        : msg.senderId === "me"
                          ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl px-3 py-2"
                          : "bg-card border border-border/40 rounded-2xl px-3 py-2"
                    }`}>
                      {!msg.systemMessage && msg.senderId !== "me" && (
                        <p className="text-xs font-medium text-indigo-400 mb-0.5">{msg.senderName}</p>
                      )}
                      <p className={`text-sm ${msg.id?.toString().startsWith("opt-") ? "opacity-70" : ""}`}>
                        {msg.content}
                        {msg.id?.toString().startsWith("opt-") && (
                          <span className="text-[10px] ml-2 opacity-60">sending...</span>
                        )}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                  <MessageSquare className="w-5 h-5 mr-2" /> No messages yet
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSend} className="p-3 border-t border-border/40 flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  markTyping();
                }}
                placeholder="Type a message..."
                className="flex-1 h-10 text-sm"
              />
              <Button type="submit" size="icon" disabled={sending || !newMessage.trim()} className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white shrink-0">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40" />
              <p>Select a conversation to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
