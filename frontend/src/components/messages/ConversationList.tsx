import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Search, Plus, Users, Loader2, MessageSquare } from "lucide-react";
import type { ConversationDto } from "@/services/messageService";
import { userService, type PublicUserDto } from "@/services/userService";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

type SearchTab = "people" | "messages";

interface ConversationListProps {
  conversations: ConversationDto[] | null;
  loading: boolean;
  activeId: string | null;
  presence: Record<string, string>;
  onSelect: (id: string) => void;
  onNewChat: () => void;
}

/** Presence dot + human status for a peer. */
function presenceColor(status: string | null | undefined): string {
  switch (status) {
    case "ONLINE":
      return "bg-emerald-500";
    case "AWAY":
      return "bg-amber-500";
    default:
      return "bg-muted-foreground/40";
  }
}

function ConversationRow({
  conv,
  active,
  presence,
  onClick,
}: {
  conv: ConversationDto;
  active: boolean;
  presence: Record<string, string>;
  onClick: () => void;
}) {
  const isRoom = conv.type === "room";
  const onlineStatus =
    presence[conv.otherUserId || ""] ?? conv.otherUserPresence ?? "OFFLINE";
  const unread = conv.unreadCount || 0;

  return (
    <button
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150",
        active
          ? "bg-gradient-to-r from-indigo-500/15 to-purple-500/5 border border-indigo-500/20"
          : "border border-transparent hover:bg-accent/5"
      )}
    >
      {active && (
        <span
          aria-hidden
          className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-full bg-gradient-to-b from-indigo-500 to-purple-500"
        />
      )}
      {/* Avatar */}
      <span className="relative shrink-0">
        <span
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold",
            isRoom
              ? "bg-gradient-to-br from-purple-500/20 to-pink-500/20 text-purple-400"
              : "bg-gradient-to-br from-indigo-500/20 to-blue-500/20 text-indigo-400"
          )}
        >
          {conv.avatarUrl ? (
            <img src={conv.avatarUrl} alt={conv.name} className="w-full h-full object-cover rounded-full" />
          ) : isRoom ? (
            <Users className="w-4 h-4" />
          ) : (
            conv.name?.charAt(0)?.toUpperCase() || "?"
          )}
        </span>
        {!isRoom && conv.otherUserId && (
          <span
            className={cn(
              "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-background",
              presenceColor(onlineStatus)
            )}
          />
        )}
      </span>

      {/* Name + last message */}
      <span className="flex-1 min-w-0">
        <span className="flex items-baseline justify-between gap-2">
          <span
            className={cn(
              "text-sm truncate",
              unread > 0 ? "font-semibold text-foreground" : "font-medium text-foreground/90"
            )}
          >
            {conv.name}
          </span>
          {conv.lastMessageAt && (
            <span className="text-[10px] text-muted-foreground/60 shrink-0">
              {timeAgo(conv.lastMessageAt, "")}
            </span>
          )}
        </span>
        {isRoom && conv.projectName && conv.projectName !== conv.name && (
          <span className="block text-[10px] text-muted-foreground/50 truncate mt-0.5">
            {conv.projectName}
          </span>
        )}
        <span className="flex items-center justify-between gap-2 mt-0.5">
          <span
            className={cn(
              "text-xs truncate",
              unread > 0 ? "text-foreground/80 font-medium" : "text-muted-foreground"
            )}
          >
            {isRoom ? `${conv.participantCount} member${conv.participantCount !== 1 ? "s" : ""} · ` : ""}
            {conv.lastMessage || "No messages yet"}
          </span>
          {unread > 0 && (
            <span className="shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-[10px] font-bold flex items-center justify-center">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </span>
      </span>
    </button>
  );
}

function PeopleResult({ user, onClick }: { user: PublicUserDto; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-accent/5 transition-colors"
    >
      <span className="relative shrink-0">
        <span className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500/20 to-blue-500/20 text-indigo-400 flex items-center justify-center overflow-hidden text-sm font-bold">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.fullName} className="w-full h-full object-cover" />
          ) : (
            user.fullName?.charAt(0)?.toUpperCase() || "?"
          )}
        </span>
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-background",
            presenceColor(user.presenceStatus ?? "OFFLINE")
          )}
        />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium truncate">{user.fullName}</span>
        <span className="block text-xs text-muted-foreground truncate">@{user.username}</span>
      </span>
      <MessageSquare className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
    </button>
  );
}

export function ConversationList({
  conversations,
  loading,
  activeId,
  presence,
  onSelect,
  onNewChat,
}: ConversationListProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<SearchTab>("people");
  const [people, setPeople] = useState<PublicUserDto[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(false);
  const [peopleError, setPeopleError] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced people search against GET /users?q= (existing API).
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (tab !== "people" || q.length < 1) {
      setPeople([]);
      setPeopleLoading(false);
      return;
    }
    setPeopleLoading(true);
    setPeopleError(false);
    debounceRef.current = setTimeout(async () => {
      try {
        setPeople(await userService.searchUsers(q));
      } catch {
        setPeopleError(true);
      } finally {
        setPeopleLoading(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, tab]);

  const searching = query.trim().length > 0;
  const direct = conversations?.filter((c) => c.type === "direct") ?? [];
  const rooms = conversations?.filter((c) => c.type === "room") ?? [];

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="shrink-0 px-3 pt-3 pb-2 border-b border-border/40">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-sm font-semibold tracking-tight">Messages</h2>
          <button
            onClick={onNewChat}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 rounded-lg px-2.5 py-1.5 shadow-sm shadow-indigo-500/20 transition-all"
            title="New chat"
          >
            <Plus className="w-3.5 h-3.5" /> New Chat
          </button>
        </div>

        {/* Search box */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60 pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people or messages..."
            aria-label="Search conversations"
            className="w-full h-9 pl-8 pr-3 rounded-lg text-xs bg-muted/40 border border-border/50 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all placeholder:text-muted-foreground/60"
          />
        </div>

        {/* People / Messages tabs */}
        {searching && (
          <div className="flex items-center gap-1 mt-2">
            {(["people", "messages"] as SearchTab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[11px] font-medium capitalize transition-colors",
                  tab === t
                    ? "bg-indigo-500/10 text-indigo-500 dark:text-indigo-400"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-2 py-2 min-h-0">
        {searching && tab === "people" ? (
          <div className="space-y-0.5">
            {peopleLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
              </div>
            ) : peopleError ? (
              <p className="text-xs text-muted-foreground text-center py-8">Couldn&apos;t search people</p>
            ) : people.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">No people found</p>
            ) : (
              people.map((p) => (
                <PeopleResult
                  key={p.id}
                  user={p}
                  onClick={() => {
                    // Reuse the existing conversation if present, otherwise open
                    // a fresh DM (backend derives conversations from history —
                    // duplicates are impossible).
                    const existing = direct.find((c) => c.otherUserId === p.id);
                    navigate(existing ? `/messages/${existing.id}` : `/messages/dm_${p.id}`);
                    setQuery("");
                  }}
                />
              ))
            )}
          </div>
        ) : searching && tab === "messages" ? (
          <div className="space-y-0.5">
            {[...direct, ...rooms]
              .filter(
                (c) =>
                  c.name?.toLowerCase().includes(query.trim().toLowerCase()) ||
                  c.lastMessage?.toLowerCase().includes(query.trim().toLowerCase())
              )
              .map((c) => (
                <ConversationRow
                  key={c.id}
                  conv={c}
                  active={c.id === activeId}
                  presence={presence}
                  onClick={() => onSelect(c.id)}
                />
              ))}
            {[...direct, ...rooms].filter(
              (c) =>
                c.name?.toLowerCase().includes(query.trim().toLowerCase()) ||
                c.lastMessage?.toLowerCase().includes(query.trim().toLowerCase())
            ).length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-8">No matching messages</p>
            )}
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
          </div>
        ) : conversations === null || conversations.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center px-4">
            <MessageSquare className="w-8 h-8 text-muted-foreground/30" />
            <p className="text-sm font-medium text-foreground/80">No conversations yet</p>
            <p className="text-xs text-muted-foreground max-w-[220px]">
              Start a conversation with a developer or teammate.
            </p>
            <button
              onClick={onNewChat}
              className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg px-3 py-1.5 shadow-sm shadow-indigo-500/20 transition-all hover:from-indigo-600 hover:to-purple-700"
            >
              <Plus className="w-3.5 h-3.5" /> New Chat
            </button>
          </div>
        ) : (
          <div className="space-y-0.5">
            {direct.length > 0 && (
              <>
                <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/50">
                  Direct Messages
                </p>
                {direct.map((c) => (
                  <ConversationRow
                    key={c.id}
                    conv={c}
                    active={c.id === activeId}
                    presence={presence}
                    onClick={() => onSelect(c.id)}
                  />
                ))}
              </>
            )}
            {rooms.length > 0 && (
              <>
                <p className="px-3 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/50">
                  Team Chats
                </p>
                {rooms.map((c) => (
                  <ConversationRow
                    key={c.id}
                    conv={c}
                    active={c.id === activeId}
                    presence={presence}
                    onClick={() => onSelect(c.id)}
                  />
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
