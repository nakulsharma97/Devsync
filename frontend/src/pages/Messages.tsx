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
} from "lucide-react";
import { conversationService, type Conversation } from "@/services/conversationService";
import { messageService, type Message } from "@/services/messageService";

function ConversationList({
  conversations,
  selectedId,
  onSelect,
  loading,
}: {
  conversations: Conversation[];
  selectedId?: string;
  onSelect: (id: string) => void;
  loading: boolean;
}) {
  return (
    <div className="space-y-1">
      {conversations.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-3 ring-1 ring-accent/20">
            <MessageCircle className="w-5 h-5 text-accent" />
          </div>
          <p className="text-sm text-muted-foreground">No conversations yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Go to <strong>Search</strong> to find developers to message
          </p>
        </div>
      )}
      {loading && (
        <div className="space-y-2 p-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-muted/30 rounded-xl animate-pulse" />
          ))}
        </div>
      )}
      {conversations.map((conv) => (
        <button
          key={conv._id}
          onClick={() => onSelect(conv._id)}
          className={`w-full text-left p-3 rounded-xl transition-all duration-200 flex items-center gap-3 ${
            selectedId === conv._id
              ? "bg-accent/10 border border-accent/20"
              : "hover:bg-accent/5 border border-transparent"
          }`}
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center shrink-0 ring-1 ring-accent/20">
            {conv.otherUser?.avatarUrl ? (
              <img src={conv.otherUser.avatarUrl} alt="" className="w-9 h-9 rounded-xl object-cover" />
            ) : (
              <User className="w-4 h-4 text-accent" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground truncate">
                {conv.otherUser?.fullName || "Unknown"}
              </p>
              <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                {new Date(conv.lastMessageAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {conv.lastMessageText || "No messages yet"}
            </p>
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

function ChatView({
  conversationId,
  onBack,
}: {
  conversationId: string;
  onBack: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      await messageService.send(conversationId, input.trim());
      setInput("");
      await fetchMessages();
    } catch (err) {
      console.error("Failed to send message:", err);
    }
    setSending(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border/50">
        <button
          onClick={onBack}
          className="lg:hidden p-1 rounded-lg hover:bg-accent/10 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <span className="text-sm font-medium text-foreground">
          {messages.find((m) => !m.isMine)?.sender?.fullName || "Chat"}
        </span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
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
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="text-sm bg-muted/30 border-0 focus-visible:ring-1 focus-visible:ring-accent/30"
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
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

export default function Messages() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
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
          <div className="p-3 border-b border-border/50">
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Conversations
            </h2>
          </div>
          <div className="p-3">
            <ConversationList
              conversations={conversations}
              selectedId={selectedId || undefined}
              onSelect={setSelectedId}
              loading={loading}
            />
          </div>
        </div>

        {/* Chat area */}
        <div className={`flex-1 flex flex-col ${!selectedId ? "hidden lg:flex" : "flex"}`}>
          {selectedId ? (
            <ChatView
              conversationId={selectedId}
              onBack={() => setSelectedId(null)}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4 ring-1 ring-accent/20">
                  <MessageCircle className="w-7 h-7 text-accent" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">
                  Select a conversation
                </p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Choose a conversation from the sidebar, or find a developer to message in Search.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
