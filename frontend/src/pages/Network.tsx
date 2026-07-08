import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users,
  Search,
  UserPlus,
  UserCheck,
  MessageCircle,
  Loader2,
  User,
  MapPin,
  Briefcase,
  AtSign,
  ArrowLeft,
} from "lucide-react";
import { connectionService } from "@/services/connectionService";
import { conversationService } from "@/services/conversationService";
import { useDevSyncAuth } from "@/contexts/AuthContext";

interface NetworkUser {
  id: string;
  email: string;
  fullName: string;
  username: string;
  bio?: string;
  avatarUrl?: string;
  role: string;
  isSelf: boolean;
  isFollowing: boolean;
  followsYou: boolean;
  followerCount: number;
  followingCount: number;
}

export default function Network() {
  const { user } = useDevSyncAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<NetworkUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<NetworkUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"all" | "following" | "followers">("all");

  const fetchUsers = useCallback(async () => {
    try {
      const all = await connectionService.getAllUsers();
      setUsers(all);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Apply tab + search filter
  useEffect(() => {
    let result = [...users];

    // Tab filter
    if (activeTab === "following") {
      result = result.filter((u) => u.isFollowing);
    } else if (activeTab === "followers") {
      result = result.filter((u) => u.followsYou);
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (u) =>
          u.fullName.toLowerCase().includes(q) ||
          u.username.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.bio && u.bio.toLowerCase().includes(q)),
      );
    }

    setFilteredUsers(result);
  }, [users, activeTab, searchQuery]);

  const handleToggleFollow = async (targetId: string) => {
    setTogglingIds((prev) => new Set(prev).add(targetId));
    try {
      const target = users.find((u) => u.id === targetId);
      if (!target) return;
      if (target.isFollowing) {
        await connectionService.unfollow(targetId);
      } else {
        await connectionService.follow(targetId);
      }
      // Refresh the list
      const all = await connectionService.getAllUsers(searchQuery);
      setUsers(all);
    } catch (err) {
      console.error("Failed to toggle follow:", err);
    }
    setTogglingIds((prev) => {
      const next = new Set(prev);
      next.delete(targetId);
      return next;
    });
  };

  const handleMessage = async (targetId: string) => {
    try {
      const { conversationId } = await conversationService.createOrGet(targetId);
      navigate(`/messages/${conversationId}`);
    } catch (err) {
      console.error("Failed to start conversation:", err);
    }
  };

  const followingCount = users.filter((u) => u.isFollowing).length;
  const followerCount = users.filter((u) => u.followsYou && !u.isSelf).length;

  return (
    <div className="relative">
      <div className="absolute -top-20 -right-20 w-72 h-72 bg-gradient-to-bl from-accent/[0.03] to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center gap-2 mb-1 relative">
        <div className="w-5 h-5 rounded-md bg-accent/10 flex items-center justify-center">
          <Users className="w-3 h-3 text-accent" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Network</h1>
      </div>
      <p className="ml-7 text-sm text-muted-foreground mb-6">
        Discover and connect with other developers
      </p>

      {/* Stats bar */}
      <div className="flex items-center gap-6 mb-6 px-1">
        <div className="flex items-center gap-2">
          <div className="text-2xl font-bold text-foreground">{users.length - 1}</div>
          <div className="text-xs text-muted-foreground">Total developers</div>
        </div>
        <div className="w-px h-8 bg-border/50" />
        <div className="flex items-center gap-2">
          <div className="text-2xl font-bold text-accent">{followingCount}</div>
          <div className="text-xs text-muted-foreground">Following</div>
        </div>
        <div className="w-px h-8 bg-border/50" />
        <div className="flex items-center gap-2">
          <div className="text-2xl font-bold text-foreground">{followerCount}</div>
          <div className="text-xs text-muted-foreground">Followers</div>
        </div>
      </div>

      {/* Search + Tabs */}
      <div className="mb-6 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search developers by name, username, or bio..."
            className="pl-9 text-sm bg-muted/30 border-border/50 focus-visible:ring-accent/30"
          />
        </div>

        <div className="flex items-center gap-1 border-b border-border/50">
          {(["all", "following", "followers"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-2.5 text-xs border-b-2 transition-colors capitalize ${
                activeTab === tab
                  ? "border-accent text-accent font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab === "all" && "All Developers"}
              {tab === "following" && `Following (${followingCount})`}
              {tab === "followers" && `Followers (${followerCount})`}
            </button>
          ))}
        </div>
      </div>

      {/* User list */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="border border-border/50 rounded-xl p-4 bg-card animate-pulse"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-muted rounded w-1/4" />
                  <div className="h-2 bg-muted rounded w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && filteredUsers.length === 0 && (
        <div className="border border-border/50 rounded-xl p-12 flex flex-col items-center text-center gap-4 bg-card">
          <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center ring-1 ring-accent/20">
            <Search className="w-6 h-6 text-accent" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {searchQuery ? "No developers found" : activeTab === "following" ? "Not following anyone yet" : "No followers yet"}
            </h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              {searchQuery
                ? `No results for "${searchQuery}". Try a different name or username.`
                : activeTab === "following"
                  ? "Search for interesting developers and start following them!"
                  : "Other developers will appear here when they follow you."}
            </p>
          </div>
        </div>
      )}

      <AnimatePresence mode="popLayout">
        <div className="space-y-3">
          {filteredUsers.map((netUser) => (
            <motion.div
              key={netUser.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="border border-border/50 rounded-xl p-4 bg-card hover:border-accent/20 transition-all duration-200"
            >
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center shrink-0 ring-1 ring-accent/20 overflow-hidden">
                  {netUser.avatarUrl ? (
                    <img
                      src={netUser.avatarUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-5 h-5 text-accent" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground">
                      {netUser.fullName}
                    </span>
                    {netUser.followsYou && !netUser.isSelf && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 font-medium">
                        Follows you
                      </span>
                    )}
                    {netUser.isSelf && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20 font-medium">
                        You
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                    <AtSign className="w-3 h-3" />
                    <span>@{netUser.username}</span>
                    {netUser.role && (
                      <>
                        <span className="text-muted-foreground/30">·</span>
                        <Briefcase className="w-3 h-3" />
                        <span>{netUser.role}</span>
                      </>
                    )}
                  </div>

                  {netUser.bio && (
                    <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1">
                      {netUser.bio}
                    </p>
                  )}

                  {/* Stats */}
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                    <span>
                      <strong className="text-foreground">{netUser.followerCount}</strong> followers
                    </span>
                    <span>
                      <strong className="text-foreground">{netUser.followingCount}</strong> following
                    </span>
                    {netUser.isFollowing && !netUser.isSelf && (
                      <span className="text-accent font-medium">Following</span>
                    )}
                    {netUser.followsYou && netUser.isFollowing && !netUser.isSelf && (
                      <span className="text-green-600 dark:text-green-400 font-medium">· Mutual</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {!netUser.isSelf && (
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleMessage(netUser.id)}
                      className="text-muted-foreground hover:text-foreground hover:bg-accent/5"
                      title="Send message"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={netUser.isFollowing ? "outline" : "default"}
                      size="sm"
                      onClick={() => handleToggleFollow(netUser.id)}
                      disabled={togglingIds.has(netUser.id)}
                      className={`text-xs shrink-0 ${
                        netUser.isFollowing
                          ? "border-accent/30 text-accent hover:bg-accent/5"
                          : ""
                      }`}
                    >
                      {togglingIds.has(netUser.id) ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : netUser.isFollowing ? (
                        <>
                          <UserCheck className="w-3 h-3 mr-1" /> Following
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3 h-3 mr-1" /> Follow
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </AnimatePresence>
    </div>
  );
}
