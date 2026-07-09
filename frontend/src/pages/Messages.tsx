import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  MessageCircle,
  Send,
  Loader2,
  ChevronLeft,
  User,
  Sparkles,
  Users,
  UserPlus,
  X,
  Check,
  Search,
} from "lucide-react";
import { EmojiPicker } from "@/components/EmojiPicker";
import { TypingIndicator } from "@/components/TypingIndicator";
import { typingService } from "@/services/typingService";
import { conversationService, type Conversation } from "@/services/conversationService";
import { messageService, type Message } from "@/services/messageService";
import { teamRoomService } from "@/services/teamRoomService";
import { searchService } from "@/services/searchService";

function ConversationList({
  conversations,
  selectedId,
  onSelect,
  loading,
  emptyMessage,
}: {
  conversations: Conversation[];
  selectedId?: string;
  onSelect: (id: string) => void;
  loading: boolean;
  emptyMessage?: string;
}) {
  return (
    <div className="space-y-1">
      {conversations.length === 0 && !loading && (
        <div className="text-center py-8">
          <div className="w-9 h-9 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-2 ring-1 ring-accent/20">
            <MessageCircle className="w-4 h-4 text-accent" />
          </div>
          <p className="text-xs text-muted-foreground">{emptyMessage || "Nothing here yet"}</p>
        </div>
      )}
      {loading && (
        <div className="space-y-2 p-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-muted/30 rounded-xl animate-pulse" />
          ))}
        </div>
      )}
      {conversations.map((conv) => (
        <button
          key={conv._id}
          onClick={() => onSelect(conv._id)}
          className={`w-full text-left p-2.5 rounded-xl transition-all duration-200 flex items-center gap-2.5 ${
            selectedId === conv._id
              ? "bg-accent/10 border border-accent/20"
              : "hover:bg-accent/5 border border-transparent"
          }`}
        >
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ring-1 overflow-hidden ${
            conv.isTeamRoom
              ? "bg-gradient-to-br from-purple-500/20 to-purple-500/5 ring-purple-500/20"
              : "bg-gradient-to-br from-accent/20 to-accent/5 ring-accent/20"
          }`}>
            {conv.isTeamRoom ? (
              <Users className="w-4 h-4 text-purple-500" />
            ) : conv.otherUser?.avatarUrl ? (
              <img src={conv.otherUser.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <User className="w-4 h-4 text-accent" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground truncate">
                {conv.isTeamRoom
                  ? conv.roomName || conv.projectName || "Team Room"
                  : conv.otherUser?.fullName || "Unknown"}
              </p>
              <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                {new Date(conv.lastMessageAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {conv.isTeamRoom && conv.projectName
                ? `${conv.projectName} — ${conv.lastMessageText || "No messages yet"}`
                : conv.lastMessageText || "No messages yet"}
            </p>
            {conv.isTeamRoom && conv.participantCount && (
              <p className="text-[9px] text-muted-foreground/60 mt-0.5">
                {conv.participantCount} participant{conv.participantCount !== 1 ? "s" : ""}
              </p>
            )}
          </div>
          {conv.unreadCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-accent text-[8px] font-bold text-white flex items-center justify-center shrink-0">
              {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

function InvitePopover({ roomId, onClose }: { roomId: string; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [participantIds, setParticipantIds] = useState<Set<string>>(new Set());
  const [inviting, setInviting] = useState<string | null>(null);
  const [invited, setInvited] = useState<Set<string>>(new Set());
  const popoverRef = useRef<HTMLDivElement>(null);

  // Fetch current participants
  useEffect(() => {
    teamRoomService.getRoomParticipants(roomId).then((participants) => {
      setParticipantIds(new Set(participants.map((p) => p.id)));
    }).catch(() => {});
  }, [roomId]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await searchService.search(query);
        setResults(res.developers || []);
      } catch { /* ignore */ }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Close on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const handleInvite = async (userId: string) => {
    setInviting(userId);
    try {
      const result = await teamRoomService.inviteToRoom(roomId, userId);
      if (!result.alreadyMember) {
        setInvited((prev) => new Set(prev).add(userId));
        setParticipantIds((prev) => new Set(prev).add(userId));
      }
    } catch { /* ignore */ }
    setInviting(null);
  };

  return (
    <div
      ref={popoverRef}
      className="absolute top-full right-0 mt-1 z-50 w-72 bg-popover border border-border/50 rounded-xl shadow-xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border/30">
        <span className="text-xs font-semibold text-foreground">Invite to Room</span>
        <button
          onClick={onClose}
          className="p-0.5 rounded hover:bg-accent/10 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Search */}
      <div className="p-2">
        <div className="flex items-center gap-1.5 bg-muted/30 rounded-lg px-2.5 py-1.5">
          <Search className="w-3 h-3 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search developers..."
            className="flex-1 text-xs bg-transparent border-0 outline-none text-foreground placeholder:text-muted-foreground"
            autoFocus
          />
        </div>
      </div>

      {/* Results */}
      <div className="max-h-52 overflow-y-auto p-1">
        {results.length === 0 && query.trim() ? (
          <p className="text-xs text-muted-foreground text-center py-4">No developers found</p>
        ) : results.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Type to search developers</p>
        ) : (
          results.map((dev: any) => {
            const isParticipant = participantIds.has(dev.id);
            const isInvited = invited.has(dev.id);
            return (
              <div
                key={dev.id}
                className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-accent/5 transition-colors"
              >
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center ring-1 ring-accent/20 shrink-0 overflow-hidden">
                  {dev.avatarUrl ? (
                    <img src={dev.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-3 h-3 text-accent" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{dev.fullName}</p>
                  <p className="text-[10px] text-muted-foreground truncate">@{dev.username}</p>
                </div>
                {isParticipant ? (
                  <span className="text-[9px] text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded-full">
                    In room
                  </span>
                ) : (
                  <button
                    onClick={() => handleInvite(dev.id)}
                    disabled={inviting === dev.id}
                    className={`shrink-0 p-1 rounded-md transition-colors ${
                      isInvited
                        ? "text-green-500 bg-green-500/10"
                        : "text-muted-foreground hover:text-accent hover:bg-accent/10"
                    }`}
                  >
                    {inviting === dev.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : isInvited ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <UserPlus className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function ChatView({
  conversationId,
  conversation,
  onBack,
}: {
  conversationId: string;
  conversation?: Conversation | null;
  onBack: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [typingNames, setTypingNames] = useState<string[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const typingPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTypingPing = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const msgs = await messageService.getMessages(conversationId);
      setMessages(msgs);
      // Mark as read
      await messageService.markAsRead(conversationId);
    } catch { /* ignore */ }
    setLoading(false);
  }, [conversationId]);

  useEffect(() => {
    fetchMessages();
    pollRef.current = setInterval(fetchMessages, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchMessages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Debounced typing ping — updates server every 2s max while typing
  const pingTyping = useCallback(async () => {
    const now = Date.now();
    if (now - lastTypingPing.current < 2000) return;
    lastTypingPing.current = now;
    try {
      await typingService.startTyping(conversationId);
    } catch { /* ignore */ }
  }, [conversationId]);

  // Handle input change — trigger typing ping + update input
  const onInputChange = useCallback(
    (value: string) => {
      setInput(value);
      if (value.trim()) {
        pingTyping();
      }
    },
    [pingTyping],
  );

  // Poll for other users typing
  useEffect(() => {
    const fetchTyping = async () => {
      try {
        const names = await typingService.getTypingUsers(conversationId);
        setTypingNames(names);
      } catch { /* ignore */ }
    };
    fetchTyping();
    typingPollRef.current = setInterval(fetchTyping, 3000);
    return () => {
      if (typingPollRef.current) clearInterval(typingPollRef.current);
    };
  }, [conversationId]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      await messageService.send(conversationId, input.trim());
      setInput("");
      await typingService.stopTyping(conversationId);
      lastTypingPing.current = 0;
      await fetchMessages();
    } catch (err) {
      console.error("Failed to send message:", err);
    }
    setSending(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border/50 relative">
        <button
          onClick={onBack}
          className="lg:hidden p-1 rounded-lg hover:bg-accent/10 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ring-1 overflow-hidden ${
          conversation?.isTeamRoom
            ? "bg-gradient-to-br from-purple-500/20 to-purple-500/5 ring-purple-500/20"
            : "bg-gradient-to-br from-accent/20 to-accent/5 ring-accent/20"
        }`}>
          {conversation?.isTeamRoom ? (
            <Users className="w-3.5 h-3.5 text-purple-500" />
          ) : conversation?.otherUser?.avatarUrl ? (
            <img src={conversation.otherUser.avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <User className="w-3.5 h-3.5 text-accent" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-sm font-medium text-foreground truncate block">
            {conversation?.isTeamRoom
              ? conversation?.roomName || conversation?.projectName || "Team Room"
              : conversation?.otherUser?.fullName || "Chat"}
          </span>
          {conversation?.isTeamRoom && conversation?.projectName && (
            <span className="text-[10px] text-muted-foreground">{conversation.projectName}</span>
          )}
        </div>
        {conversation?.isTeamRoom && (
          <div className="relative">
            <button
              onClick={() => setShowInvite(!showInvite)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors"
              title="Invite developers"
            >
              <UserPlus className="w-4 h-4" />
            </button>
            {showInvite && (
              <InvitePopover roomId={conversationId} onClose={() => setShowInvite(false)} />
            )}
          </div>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Typing indicator */}
        <TypingIndicator names={typingNames} />
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        )}
        {!loading && messages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-8">
            No messages yet. Say hello!
          </p>
        )}
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.isMine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                  msg.isMine
                    ? "bg-accent text-white rounded-br-md"
                    : "bg-muted/50 text-foreground rounded-bl-md"
                }`}
              >
                <p className="leading-relaxed">{msg.content}</p>
                <p
                  className={`text-[10px] mt-1 ${
                    msg.isMine ? "text-white/60" : "text-muted-foreground"
                  }`}
                >
                  {new Date(msg.createdAt).toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border/50">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 flex-1 bg-muted/30 rounded-lg px-3">
            <EmojiPicker
              onSelect={(emoji) => setInput((prev) => prev + emoji)}
              disabled={sending}
            />
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 text-sm bg-transparent border-0 focus-visible:ring-0 px-0"
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
            />
          </div>
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="shrink-0"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

type MsgTab = "all" | "direct" | "team";

export default function Messages() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<MsgTab>("all");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchConversations = useCallback(async () => {
    try {
      setConversations(await conversationService.getMyConversations());
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchConversations();
    pollRef.current = setInterval(fetchConversations, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchConversations]);

  const filteredConversations = tab === "all"
    ? conversations
    : tab === "direct"
      ? conversations.filter((c) => !c.isTeamRoom)
      : conversations.filter((c) => c.isTeamRoom);

  const selectedConv = conversations.find((c) => c._id === selectedId);

  return (
    <div className="relative h-[calc(100vh-10rem)]">
      <div className="absolute -top-20 -right-20 w-72 h-72 bg-gradient-to-bl from-accent/[0.03] to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-center gap-2 mb-4 relative">
        <div className="w-5 h-5 rounded-md bg-accent/10 flex items-center justify-center">
          <MessageCircle className="w-3 h-3 text-accent" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Messages</h1>
      </div>

      <div className="bg-card border border-border/50 rounded-xl overflow-hidden h-full flex flex-col lg:flex-row">
        {/* Conversation list - sidebar on desktop */}
        <div
          className={`lg:w-72 border-r border-border/50 overflow-y-auto ${
            selectedId ? "hidden lg:block" : "block"
          }`}
        >
          {/* Tabs */}
          <div className="flex items-center gap-0 border-b border-border/50">
            {([
              { id: "all" as const, label: "All" },
              { id: "direct" as const, label: "Direct" },
              { id: "team" as const, label: "Rooms" },
            ]).map((t) => (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); setSelectedId(null); }}
                className={`flex-1 px-2 py-2.5 text-xs border-b-2 transition-colors ${
                  tab === t.id
                    ? "border-accent text-accent font-medium"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.id === "team" ? (
                  <span className="inline-flex items-center gap-1">
                    <Users className="w-3 h-3" /> Rooms
                  </span>
                ) : (
                  t.label
                )}
              </button>
            ))}
          </div>
          <div className="p-2.5">
            <ConversationList
              conversations={filteredConversations}
              selectedId={selectedId || undefined}
              onSelect={setSelectedId}
              loading={loading}
              emptyMessage={
                tab === "team"
                  ? "No team rooms yet — create one from a project card"
                  : tab === "direct"
                    ? "No direct messages yet — find developers in Search"
                    : "No conversations yet"
              }
            />
          </div>
        </div>

        {/* Chat area */}
        <div className={`flex-1 flex flex-col ${!selectedId ? "hidden lg:flex" : "flex"}`}>
          {selectedId ? (
            <ChatView
              conversationId={selectedId}
              conversation={selectedConv}
              onBack={() => setSelectedId(null)}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4 ring-1 ring-accent/20">
                  <MessageCircle className="w-7 h-7 text-accent" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">
                  {tab === "team" ? "Select a team room" : "Select a conversation"}
                </p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  {tab === "team"
                    ? "Choose a team room from the sidebar to start chatting with your team."
                    : "Choose a conversation from the sidebar, or find a developer to message in Search."}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
