import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, Search, PanelRight, MessageSquare, Wifi, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTyping } from "@/hooks/useTyping";
import { messageService, type ConversationDto, type MessageDto } from "@/services/messageService";
import { wsService } from "@/services/websocketService";
import { userService, type PublicUserDto } from "@/services/userService";
import { roomService, type TeamRoomDto } from "@/services/roomService";
import { TypingIndicator } from "@/components/TypingIndicator";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ConversationList } from "@/components/messages/ConversationList";
import { NewChatDialog } from "@/components/messages/NewChatDialog";
import { MessageList } from "@/components/messages/MessageList";
import { MessageComposer } from "@/components/messages/MessageComposer";
import { MessageSearch } from "@/components/messages/MessageSearch";
import { ConversationDetails } from "@/components/messages/ConversationDetails";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

function presenceStatusText(conv: ConversationDto | null, presence: Record<string, string>, profile: PublicUserDto | null): string {
  if (!conv) return "";
  if (conv.type === "room") return conv.participantCount > 0 ? `${conv.participantCount} members` : "Team chat";
  const status = presence[conv.otherUserId || ""] ?? profile?.presenceStatus ?? conv.otherUserPresence ?? "OFFLINE";
  if (status === "ONLINE") return "Online";
  if (status === "AWAY") return "Away";
  const lastActive = profile?.lastActiveAt ?? conv.otherUserLastActiveAt ?? null;
  return lastActive ? `Active ${timeAgo(lastActive, "")} ago` : "Offline";
}

export default function Messages() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const myId = user?.id ?? "";
  const isMobile = useIsMobile();

  const isRoom = conversationId?.startsWith("room_") ?? false;
  const actualId = conversationId?.replace(/^(room_|dm_)/, "") ?? "";

  // ── State ──────────────────────────────────────────────────
  const [conversations, setConversations] = useState<ConversationDto[] | null>(null);
  const [convLoading, setConvLoading] = useState(true);
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [presence, setPresence] = useState<Record<string, string>>({});
  const [typers, setTypers] = useState<Set<string>>(new Set());
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [profile, setProfile] = useState<PublicUserDto | null>(null);
  const [room, setRoom] = useState<TeamRoomDto | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  /** Optimistic messages that never got a server echo (no ACK channel exists). */
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set());

  // ── Refs ───────────────────────────────────────────────────
  const scrollRef = useRef<HTMLDivElement>(null);
  const nearBottomRef = useRef(true);
  const msgRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const optimisticCounterRef = useRef(0);
  const detailsTokenRef = useRef(0);
  const sendTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const convRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentConv = useMemo(
    () => conversations?.find((c) => c.id === conversationId) ?? null,
    [conversations, conversationId]
  );

  const { markTyping, stopTyping } = useTyping(
    isRoom && conversationId ? actualId : undefined,
    !isRoom && conversationId ? actualId : undefined
  );

  // ── Conversation list ──────────────────────────────────────
  const loadConversations = useCallback(async () => {
    try {
      setConversations(await messageService.getConversations());
    } catch {
      // Auth wall / API unavailable — keep whatever we have.
    } finally {
      setConvLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
    // Refresh the list when the tab becomes visible again (new DMs from others).
    const handleVisibility = () => {
      if (document.visibilityState === "visible") loadConversations();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [loadConversations]);

  // Debounced list refresh — keeps the last-message preview in sync after
  // incoming messages without hammering the API on chatty rooms.
  const refreshConversationsSoon = useCallback(() => {
    if (convRefreshTimerRef.current) clearTimeout(convRefreshTimerRef.current);
    convRefreshTimerRef.current = setTimeout(() => {
      loadConversations();
    }, 1500);
  }, [loadConversations]);

  /** Drop a pending optimistic-message failure timer + failed state. */
  const clearSend = useCallback((optId: string) => {
    const t = sendTimeoutsRef.current.get(optId);
    if (t) {
      clearTimeout(t);
      sendTimeoutsRef.current.delete(optId);
    }
    setFailedIds((prev) => {
      if (!prev.has(optId)) return prev;
      const next = new Set(prev);
      next.delete(optId);
      return next;
    });
  }, []);

  // ── WebSocket connection state ─────────────────────────────
  useEffect(() => {
    const unsub = wsService.onConnection(setWsConnected);
    setWsConnected(wsService.isConnected);
    return () => {
      unsub();
    };
  }, []);

  // ── Live presence feed ─────────────────────────────────────
  useEffect(() => {
    const unsub = wsService.onPresence((data) => {
      if (!data || !data.userId) return;
      setPresence((prev) => ({ ...prev, [data.userId]: data.status }));
    });
    return () => {
      unsub();
    };
  }, []);

  // ── Incoming typing indicators (scoped to the open conversation) ──
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

    const typingTimeouts = typingTimeoutsRef.current;
    const unsub = wsService.onTyping((data) => {
      if (!data || !data.userId) return;
      if (data.userId === wsService.currentUserId) return;
      if (convIsRoom && data.roomId !== convActualId) return;
      if (!convIsRoom && data.roomId) return;
      if (!convIsRoom && data.userId !== convActualId) return;

      if (data.typing) {
        setTypers((prev) => {
          const next = new Set(prev);
          next.add(data.userId);
          return next;
        });
        const existing = typingTimeouts.get(data.userId);
        if (existing) clearTimeout(existing);
        typingTimeouts.set(
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
      typingTimeouts.forEach((t) => clearTimeout(t));
      typingTimeouts.clear();
    };
  }, [conversationId]);

  // ── Details data (fetched once, shared with the composer) ──
  useEffect(() => {
    detailsTokenRef.current += 1;
    const token = detailsTokenRef.current;
    setProfile(null);
    setRoom(null);
    setDetailsLoading(false);
    if (!conversationId) return;

    if (isRoom && actualId) {
      setDetailsLoading(true);
      roomService
        .getRoom(actualId)
        .then((r) => {
          if (token === detailsTokenRef.current) setRoom(r);
        })
        .catch(() => {})
        .finally(() => {
          if (token === detailsTokenRef.current) setDetailsLoading(false);
        });
    } else if (!isRoom && actualId) {
      setDetailsLoading(true);
      userService
        .getUser(actualId)
        .then((u) => {
          if (token === detailsTokenRef.current) setProfile(u);
        })
        .catch(() => {})
        .finally(() => {
          if (token === detailsTokenRef.current) setDetailsLoading(false);
        });
    }
  }, [conversationId, isRoom, actualId]);

  /**
   * The open conversation is being viewed, so mark it read and sync the badge.
   * Backend returns the authoritative remaining unread count.
   */
  const markConversationRead = useCallback((convId: string, targetId: string, isRoomConv: boolean) => {
    const action = isRoomConv
      ? messageService.markRoomRead(targetId)
      : messageService.markDirectRead(targetId);
    action
      .then(({ unreadCount }) => {
        setConversations((prev) => (prev ? prev.map((c) => (c.id === convId ? { ...c, unreadCount } : c)) : prev));
      })
      .catch(() => {
        // Non-fatal — the badge corrects itself on the next list refresh.
      });
  }, []);

  // ── Load messages when the conversation changes ────────────
  useEffect(() => {
    if (!conversationId) return;
    setMsgLoading(true);
    setMessages([]);
    const fetch = isRoom
      ? messageService.getRoomMessages(actualId)
      : messageService.getConversation(actualId);

    fetch
      .then((msgs) => {
        setMessages(msgs);
        // Opening a conversation marks its messages as read.
        markConversationRead(conversationId, actualId, isRoom);
      })
      .catch(() => toast("Failed to load messages"))
      .finally(() => setMsgLoading(false));
  }, [conversationId, isRoom, actualId, markConversationRead]);

  // ── Real-time messages: one subscription for rooms OR DMs on the
  //    EXISTING STOMP connection (no new socket, no duplicates) ──
  useEffect(() => {
    if (!conversationId) return;

    const applyIncoming = (data: MessageDto) => {
      if (!data || !data.id) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.id)) return prev;
        // Replace our optimistic send with the server echo (same content, from me).
        const optIdx = prev.findIndex(
          (m) =>
            String(m.id).startsWith("opt-") &&
            m.senderId === myId &&
            data.senderId === myId &&
            m.content === data.content
        );
        if (optIdx !== -1) {
          const next = [...prev];
          clearSend(String(prev[optIdx].id));
          next[optIdx] = data;
          return next;
        }
        return [...prev, data];
      });
      // The user is viewing this conversation — incoming messages are read
      // immediately, so the badge clears without a page refresh.
      markConversationRead(conversationId, actualId, isRoom);
      // Keep the conversation list preview (last message) fresh.
      refreshConversationsSoon();
    };

    let unsubscribe: (() => void) | undefined;
    const doSubscribe = () => {
      if (unsubscribe) unsubscribe();
      if (!wsService.isConnected) return;
      if (isRoom) {
        unsubscribe = wsService.subscribeToRoom(actualId, applyIncoming);
      } else {
        unsubscribe = wsService.subscribeToDirect(actualId, applyIncoming);
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
  }, [conversationId, isRoom, actualId, myId, clearSend, refreshConversationsSoon, markConversationRead]);

  // ── Scroll management ──────────────────────────────────────
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  useEffect(() => {
    if (conversationId) {
      requestAnimationFrame(() => scrollToBottom("auto"));
    }
  }, [conversationId, scrollToBottom]);

  useEffect(() => {
    if (nearBottomRef.current) scrollToBottom("smooth");
  }, [messages.length, scrollToBottom]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    nearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
  };

  // ── Send (optimistic, dedup via WS echo; REST fallback) ────
  const handleSend = useCallback(
    (text: string, attachmentId?: string, attachment?: MessageDto["attachment"]) => {
      if (!conversationId || !text.trim()) return;
      const content = text.trim();
      stopTyping();

      const optimistic: MessageDto = {
        id: `opt-${Date.now()}-${++optimisticCounterRef.current}`,
        senderId: myId,
        senderName: user?.fullName || "You",
        senderAvatar: user?.avatarUrl ?? null,
        roomId: isRoom ? actualId : null,
        receiverId: !isRoom ? actualId : null,
        content,
        messageType: "text",
        systemMessage: false,
        attachmentId: attachmentId ?? null,
        attachment: attachment ?? null,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimistic]);
      const optId = String(optimistic.id);

      if (wsService.isConnected) {
        wsService.sendMessage({
          roomId: isRoom ? actualId : undefined,
          receiverId: !isRoom ? actualId : undefined,
          content,
          attachmentId,
        });
        // No ACK channel exists on /app/chat.send — if the echo never arrives
        // (rejected send, dropped frame), surface a retryable failure.
        sendTimeoutsRef.current.set(
          optId,
          setTimeout(() => {
            setFailedIds((prev) => (prev.has(optId) ? prev : new Set(prev).add(optId)));
          }, 12000)
        );
      } else {
        messageService
          .sendMessage({
            roomId: isRoom ? actualId : undefined,
            receiverId: !isRoom ? actualId : undefined,
            content,
            attachmentId,
          })
          .then((real) => {
            setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? real : m)));
            clearSend(optId);
          })
          .catch(() => {
            setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
            clearSend(optId);
            toast("Failed to send message");
          });
      }

      // Keep the conversation list preview in sync.
      refreshConversationsSoon();
    },
    [conversationId, isRoom, actualId, myId, user, stopTyping, clearSend, refreshConversationsSoon]
  );

  // ── Message search: jump to a result ───────────────────────
  const jumpToMessage = useCallback((id: string) => {
    setSearchOpen(false);
    const el = msgRefs.current.get(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightId(id);
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => setHighlightId(null), 2000);
  }, []);

  useEffect(() => {
    const sendTimeouts = sendTimeoutsRef.current;
    return () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
      if (convRefreshTimerRef.current) clearTimeout(convRefreshTimerRef.current);
      sendTimeouts.forEach((t) => clearTimeout(t));
      sendTimeouts.clear();
    };
  }, []);

  const registerMsgRef = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) msgRefs.current.set(id, el);
    else msgRefs.current.delete(id);
  }, []);

  // Retry a failed optimistic send: drop the failed bubble and re-send.
  const retryMessage = useCallback(
    (msg: MessageDto) => {
      const id = String(msg.id);
      setMessages((prev) => prev.filter((m) => m.id !== id));
      clearSend(id);
      handleSend(msg.content, msg.attachmentId ?? undefined, msg.attachment ?? undefined);
    },
    [clearSend, handleSend]
  );

  // ── Derived UI state ───────────────────────────────────────
  const typerNames = useMemo(() => {
    return [...typers].map((id) =>
      !isRoom && currentConv?.otherUserId === id ? currentConv.otherUserName || "Someone" : "Someone"
    );
  }, [typers, isRoom, currentConv]);

  const statusLine = presenceStatusText(currentConv, presence, profile);
  const chatHeaderTitle = currentConv?.name || (conversationId ? "Conversation" : "");
  const showList = !isMobile || !conversationId;
  const showChat = isMobile ? !!conversationId : true;

  return (
    <div className="flex h-[calc(100dvh-4rem)] -m-4 md:-m-6 overflow-hidden bg-background">
      {/* ── Conversation list ─────────────────────────────── */}
      <div
        className={cn(
          "flex flex-col min-h-0 bg-card/40 border-r border-border/40",
          !showList && "hidden",
          showChat ? "w-[300px] shrink-0" : "w-full md:w-[300px] md:shrink-0"
        )}
      >
        <ConversationList
          conversations={conversations}
          loading={convLoading}
          activeId={conversationId ?? null}
          presence={presence}
          onSelect={(id) => navigate(`/messages/${id}`)}
          onNewChat={() => setNewChatOpen(true)}
        />
      </div>

      {/* ── Active conversation ───────────────────────────── */}
      <div className={cn("relative flex-1 flex flex-col min-w-0 min-h-0", !showChat && "hidden")}>
        {conversationId ? (
          <>
            <header className="shrink-0 flex items-center gap-2 px-3 py-2.5 border-b border-border/40 bg-background/60 backdrop-blur-xl">
              <button
                onClick={() => navigate("/messages")}
                aria-label="Back to conversations"
                className="md:hidden p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              {/* Avatar + identity */}
              <div className="relative shrink-0">
                <span className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center text-sm font-bold text-indigo-400 overflow-hidden">
                  {isRoom ? (
                    <span className="text-purple-400">
                      <MessageSquare className="w-4 h-4" />
                    </span>
                  ) : currentConv?.avatarUrl ? (
                    <img src={currentConv.avatarUrl} alt={chatHeaderTitle} className="w-full h-full object-cover" />
                  ) : (
                    chatHeaderTitle?.charAt(0)?.toUpperCase() || "?"
                  )}
                </span>
                {!isRoom && currentConv?.otherUserId && (
                  <span
                    className={cn(
                      "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-background",
                      (presence[currentConv.otherUserId] ?? currentConv.otherUserPresence ?? "OFFLINE") === "ONLINE"
                        ? "bg-emerald-500"
                        : (presence[currentConv.otherUserId] ?? currentConv.otherUserPresence ?? "OFFLINE") === "AWAY"
                          ? "bg-amber-500"
                          : "bg-muted-foreground/40"
                    )}
                  />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{chatHeaderTitle}</p>
                <p className="text-[11px] text-muted-foreground truncate">{statusLine}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <span
                  className={cn(
                    "hidden sm:inline-flex items-center gap-1 text-[10px] mr-1",
                    wsConnected ? "text-emerald-500" : "text-amber-500"
                  )}
                  title={wsConnected ? "Connected" : "Reconnecting…"}
                >
                  {wsConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                  {wsConnected ? "Connected" : "Reconnecting"}
                </span>
                <button
                  onClick={() => setSearchOpen((v) => !v)}
                  aria-label="Search in conversation"
                  title="Search messages"
                  className={cn(
                    "p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors",
                    searchOpen && "bg-accent/10 text-foreground"
                  )}
                >
                  <Search className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDetailsOpen(true)}
                  aria-label="Show conversation details"
                  title="Details"
                  className="lg:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors"
                >
                  <PanelRight className="w-4 h-4" />
                </button>
              </div>
            </header>

            {/* Client-side message search overlay */}
            <MessageSearch
              open={searchOpen}
              messages={messages}
              onClose={() => setSearchOpen(false)}
              onJump={jumpToMessage}
            />

            {/* Messages */}
            <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto min-h-0 px-3 md:px-5 py-4">
              <MessageList
                messages={messages}
                loading={msgLoading}
                myId={myId}
                isRoom={isRoom}
                highlightId={highlightId}
                failedIds={failedIds}
                onRetry={retryMessage}
                onRegisterRef={registerMsgRef}
              />
            </div>

            {typers.size > 0 && <TypingIndicator names={typerNames} />}

            <MessageComposer
              onSend={handleSend}
              onTyping={markTyping}
              contextId={conversationId || ""}
              projectId={room?.projectId ?? null}
              disabled={!conversationId}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center px-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-500/15 to-purple-500/15 flex items-center justify-center">
                <MessageSquare className="w-7 h-7 text-indigo-500/70" />
              </div>
              <h3 className="text-base font-semibold mb-1.5">Select a conversation</h3>
              <p className="text-sm text-muted-foreground max-w-[260px]">
                Choose a chat from the list or start a new conversation.
              </p>
              <button
                onClick={() => setNewChatOpen(true)}
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 rounded-lg px-3.5 py-2 shadow-sm shadow-indigo-500/20 transition-all"
              >
                New Chat
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Details panel: inline column on lg+, Sheet below ── */}
      <aside className="hidden lg:flex w-[300px] xl:w-[320px] shrink-0 flex-col min-h-0 bg-card/40 border-l border-border/40">
        <ConversationDetails
          conversation={currentConv}
          profile={profile}
          room={room}
          loading={detailsLoading}
          messages={messages}
          presence={presence}
        />
      </aside>

      <Sheet open={detailsOpen && !!conversationId} onOpenChange={setDetailsOpen}>
        <SheetContent side="right" className="w-[85vw] sm:max-w-sm p-0 gap-0">
          <SheetTitle className="sr-only">Conversation details</SheetTitle>
          <ConversationDetails
            conversation={currentConv}
            profile={profile}
            room={room}
            loading={detailsLoading}
            messages={messages}
            presence={presence}
            onClose={() => setDetailsOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* ── New Chat ─────────────────────────────────────── */}
      <NewChatDialog
        open={newChatOpen}
        onOpenChange={setNewChatOpen}
        onSelectUser={(userId) => {
          setNewChatOpen(false);
          // Reuse an existing conversation if present, else open a fresh DM —
          // the backend derives conversations from history, so duplicates are
          // impossible.
          const existing = conversations?.find((c) => c.type === "direct" && c.otherUserId === userId);
          navigate(existing ? `/messages/${existing.id}` : `/messages/dm_${userId}`);
        }}
      />
    </div>
  );
}
