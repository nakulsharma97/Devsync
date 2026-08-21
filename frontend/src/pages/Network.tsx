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
  Briefcase,
  AlertTriangle,
  RefreshCw,
  Calendar,
  Heart,
} from "lucide-react";
import { connectionService, type ConnectionUserDto } from "@/services/connectionService";
import { conversationService } from "@/services/conversationService";
import { useDevSyncAuth } from "@/contexts/AuthContext";

function SkeletonCard() {
  return (
    <div className="border border-border/40 rounded-xl p-4 bg-card animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-muted shrink-0" />
        <div className="flex-1 space-y-3">
          <div className="h-5 bg-muted rounded w-32" />
          <div className="h-3.5 bg-muted rounded w-24" />
          <div className="h-3 bg-muted rounded w-48" />
          <div className="flex gap-4 mt-2">
            <div className="h-3 bg-muted rounded w-16" />
            <div className="h-3 bg-muted rounded w-16" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="w-9 h-9 rounded-xl bg-muted" />
          <div className="w-20 h-9 rounded-xl bg-muted" />
        </div>
      </div>
    </div>
  );
}

export default function Network() {
  useDevSyncAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<ConnectionUserDto[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<ConnectionUserDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"all" | "following" | "followers">("all");

  const fetchUsers = useCallback(async () => {
    try {
      setLoadError(null);
      const all = await connectionService.getAllUsers();
      setUsers(all);
    } catch {
      setLoadError("Couldn't load the developer network. Please try again.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Apply tab + search filter
  useEffect(() => {
    let result = [...users];

    if (activeTab === "following") {
      result = result.filter((u) => u.isFollowing);
    } else if (activeTab === "followers") {
      result = result.filter((u) => u.followsYou);
    }

    if (searchInput.trim()) {
      const q = searchInput.toLowerCase();
      result = result.filter(
        (u) =>
          u.fullName.toLowerCase().includes(q) ||
          u.username.toLowerCase().includes(q) ||
          (u.bio && u.bio.toLowerCase().includes(q)),
      );
    }

    setFilteredUsers(result);
  }, [users, activeTab, searchInput]);

  const handleToggleFollow = async (e: React.MouseEvent, targetId: string) => {
    e.stopPropagation();
    if (togglingIds.has(targetId)) return;
    setTogglingIds((prev) => new Set(prev).add(targetId));
    try {
      const target = users.find((u) => u.id === targetId);
      if (!target) return;
      if (target.isFollowing) {
        await connectionService.unfollow(targetId);
      } else {
        await connectionService.follow(targetId);
      }
      const all = await connectionService.getAllUsers(searchQuery);
      setUsers(all);
    } catch {
      // Silently fail — state unchanged
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(targetId);
        return next;
      });
    }
  };

  const handleMessage = async (e: React.MouseEvent, targetId: string) => {
    e.stopPropagation();
    try {
      const { conversationId } = await conversationService.createOrGet(targetId);
      navigate(`/messages/${conversationId}`);
    } catch {
      // Silently fail
    }
  };

  const followingCount = users.filter((u) => u.isFollowing).length;
  const followerCount = users.filter((u) => u.followsYou && !u.isSelf).length;
  const totalDevelopers = users.filter((u) => !u.isSelf).length;

  const statCards = [
    {
      icon: Users,
      value: totalDevelopers,
      label: "Total developers",
      description: "Explore the DevSync community",
      color: "bg-indigo-500/10 text-indigo-500",
    },
    {
      icon: UserCheck,
      value: followingCount,
      label: "Following",
      description: "Developers you follow",
      color: "bg-emerald-500/10 text-emerald-500",
    },
    {
      icon: Heart,
      value: followerCount,
      label: "Followers",
      description: "Developers who follow you",
      color: "bg-rose-500/10 text-rose-500",
    },
  ];

  return (
    <div className="relative">
      <div className="absolute -top-20 -right-20 w-72 h-72 bg-gradient-to-bl from-accent/[0.03] to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-5 h-5 rounded-md bg-accent/10 flex items-center justify-center">
              <Users className="w-3 h-3 text-accent" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Network</h1>
          </div>
          <p className="ml-7 text-sm text-muted-foreground">
            Discover and connect with other developers
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-card border border-border/50 rounded-xl p-4 flex items-center gap-3 hover:border-accent/30 transition-all"
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${stat.color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">{stat.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Search */}
      <div className="mb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setSearchInput(searchQuery);
              }
            }}
            placeholder="Search developers by name, username, or bio..."
            className="pl-9 h-9 text-sm bg-muted/30 border-border/50 focus-visible:ring-accent/30 focus-visible:border-accent/40 rounded-xl"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-5 border-b border-border/50 mb-5">
        {([
          { key: "all" as const, label: "All Developers" },
          { key: "following" as const, label: `Following (${followingCount})` },
          { key: "followers" as const, label: `Followers (${followerCount})` },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`pb-2.5 text-sm font-medium border-b-2 transition-all ${
              activeTab === tab.key
                ? "border-indigo-500 text-indigo-500"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && loadError && (
        <div className="border border-red-500/20 bg-red-500/5 rounded-2xl p-8 flex flex-col items-center text-center gap-3">
          <AlertTriangle className="w-6 h-6 text-red-500" />
          <p className="text-sm font-medium text-foreground">{loadError}</p>
          <Button variant="outline" size="sm" onClick={fetchUsers} className="gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </Button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !loadError && filteredUsers.length === 0 && (
        <div className="border border-border/40 rounded-2xl p-12 flex flex-col items-center text-center gap-3 bg-card">
          <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center">
            <Search className="w-5 h-5 text-muted-foreground/50" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">
            {searchInput
              ? "No developers match your search"
              : activeTab === "following"
                ? "Not following anyone yet"
                : "No followers yet"}
          </h3>
          <p className="text-xs text-muted-foreground max-w-xs">
            {searchInput
              ? "Try another name, username, or keyword."
              : activeTab === "following"
                ? "Search for interesting developers and start following them!"
                : "Other developers will appear here when they follow you."}
          </p>
        </div>
      )}

      {/* Developer cards */}
      <AnimatePresence mode="popLayout">
        <div className="space-y-3">
          {filteredUsers.map((netUser) => (
            <motion.div
              key={netUser.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="border border-border/40 rounded-xl bg-card hover:border-accent/20 hover:shadow-lg hover:shadow-accent/5 transition-all duration-200"
            >
              <div className="p-4">
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <button
                    type="button"
                    onClick={() => {
                      if (!netUser.isSelf) navigate(`/profile/${netUser.username}`);
                    }}
                    className="shrink-0"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/10 flex items-center justify-center ring-2 ring-indigo-500/15 overflow-hidden shadow-md shadow-indigo-500/10 hover:ring-indigo-500/30 transition-all">
                      {netUser.avatarUrl ? (
                        <img src={netUser.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-5 h-5 text-indigo-500" />
                      )}
                    </div>
                  </button>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          if (!netUser.isSelf) navigate(`/profile/${netUser.username}`);
                        }}
                        className="text-base font-bold text-foreground hover:text-indigo-500 transition-colors"
                      >
                        {netUser.fullName}
                      </button>
                      {netUser.followsYou && !netUser.isSelf && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">
                          Follows you
                        </span>
                      )}
                      {netUser.isSelf && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 font-medium">
                          You
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground mt-0.5">
                      @{netUser.username}
                    </p>

                    {netUser.bio && (
                      <p className="text-xs text-muted-foreground/80 mt-1.5 line-clamp-2 leading-relaxed">
                        {netUser.bio}
                      </p>
                    )}

                    {/* Metadata */}
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      {netUser.role && (
                        <span className="flex items-center gap-1">
                          <Briefcase className="w-3 h-3" />
                          {netUser.role}
                        </span>
                      )}
                      {netUser.createdAt && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Member
                        </span>
                      )}
                    </div>

                    {/* Stats strip */}
                    <div className="flex items-center gap-4 mt-2 pt-2 border-t border-border/30">
                      <div className="text-center">
                        <p className="text-sm font-bold text-foreground">{netUser.followerCount}</p>
                        <p className="text-[10px] text-muted-foreground">Followers</p>
                      </div>
                      <div className="w-px h-6 bg-border/40" />
                      <div className="text-center">
                        <p className="text-sm font-bold text-foreground">{netUser.followingCount}</p>
                        <p className="text-[10px] text-muted-foreground">Following</p>
                      </div>
                      {netUser.isFollowing && !netUser.isSelf && (
                        <>
                          <div className="w-px h-6 bg-border/40" />
                          <span className="text-[10px] font-medium text-indigo-500">
                            Following
                          </span>
                        </>
                      )}
                      {netUser.followsYou && netUser.isFollowing && !netUser.isSelf && (
                        <span className="text-[10px] font-medium text-emerald-500">
                          Mutual
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {!netUser.isSelf && (
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleMessage(e, netUser.id)}
                        className="w-9 h-9 rounded-xl text-muted-foreground hover:text-foreground hover:bg-indigo-500/10"
                        title="Send message"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => handleToggleFollow(e, netUser.id)}
                        disabled={togglingIds.has(netUser.id)}
                        className={`text-xs h-9 min-w-[90px] justify-center gap-1.5 rounded-xl font-medium ${
                          netUser.isFollowing
                            ? "border-border/60 text-foreground hover:border-red-500/50 hover:text-red-600 hover:bg-red-500/5 dark:hover:border-red-400/50 dark:hover:text-red-400 dark:hover:bg-red-500/10"
                            : "border-indigo-500/30 bg-indigo-500 text-white hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-700"
                        }`}
                      >
                        {togglingIds.has(netUser.id) ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            {netUser.isFollowing ? "Unfollowing..." : "Following..."}
                          </>
                        ) : netUser.isFollowing ? (
                          <>
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5" /></svg>
                            Following
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-3.5 h-3.5" />
                            Follow
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </AnimatePresence>
    </div>
  );
}
