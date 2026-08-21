import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  User,
  MapPin,
  MessageCircle,
  ArrowLeft,
  Briefcase,
  Building2,
  Flame,
  FolderKanban,
  CheckCircle2,
  MessageSquare,
  FileText,
  CalendarDays,
  Pencil,
  Loader2,
  Flag,
  UserCheck,
  UserPlus,
} from "lucide-react";
import {
  publicProfileService,
  type PublicProfileDto,
} from "@/services/publicProfileService";
import {
  socialService,
  type SocialProfileDto,
  type FollowUserDto,
} from "@/services/socialService";
import { postService, type PostDto } from "@/services/postService";
import FeedPostCard from "@/components/feed/FeedPostCard";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";
import { ReportDialog } from "@/components/ReportDialog";

const HEATMAP_DAYS = 13 * 7; // 13 weeks

/** Build a dense [date → count] map from the server's sparse heatmap points. */
function useHeatmap(profile: PublicProfileDto | null): Map<string, number> {
  return useMemo(() => {
    const map = new Map<string, number>();
    for (const p of profile?.contributions.heatmap ?? []) {
      map.set(p.date.slice(0, 10), p.count);
    }
    return map;
  }, [profile]);
}

/** GitHub-style contribution grid for the last {@link HEATMAP_DAYS} days. */
function ContributionHeatmap({ counts }: { counts: Map<string, number> }) {
  const days = useMemo(() => {
    const result: { date: string; count: number }[] = [];
    const today = new Date();
    for (let i = HEATMAP_DAYS - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      result.push({ date: key, count: counts.get(key) ?? 0 });
    }
    return result;
  }, [counts]);

  const max = Math.max(1, ...days.map((d) => d.count));

  return (
    <div className="overflow-x-auto pb-1">
      <div className="grid grid-flow-col grid-rows-7 gap-1 min-w-max">
        {days.map(({ date, count }) => {
          const intensity = count === 0 ? 0 : count >= max * 0.75 ? 4 : count >= max * 0.5 ? 3 : count >= max * 0.25 ? 2 : 1;
          return (
            <span
              key={date}
              title={`${date}: ${count} contribution${count !== 1 ? "s" : ""}`}
              className={cn(
                "w-3 h-3 rounded-[3px]",
                intensity === 0 && "bg-muted/50",
                intensity === 1 && "bg-indigo-500/30",
                intensity === 2 && "bg-indigo-500/50",
                intensity === 3 && "bg-indigo-500/75",
                intensity === 4 && "bg-indigo-500"
              )}
            />
          );
        })}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border/40 bg-muted/20 p-4 hover:border-indigo-500/20 hover:bg-indigo-500/5 transition-all">
      <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
        {icon}
        <span className="text-[11px] font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-bold text-foreground">{value.toLocaleString()}</p>
    </div>
  );
}

/** Followers / Following list dialog. */
function FollowListDialog({
  open,
  onOpenChange,
  title,
  users,
  loading,
  onUserClick,
  onFollowToggle,
  togglingIds,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  users: FollowUserDto[];
  loading: boolean;
  onUserClick: (username: string) => void;
  onFollowToggle: (userId: string, currentlyFollowing: boolean) => void;
  togglingIds: Set<string>;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[70vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>People in this list</DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto pr-1 -mr-1 space-y-1">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nobody here yet.
            </p>
          ) : (
            users.map((u) => (
              <div
                key={u.id}
                className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-muted/50 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => u.username && onUserClick(u.username)}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                >
                  <Avatar className="w-9 h-9 shrink-0 ring-1 ring-indigo-500/10">
                    <AvatarImage src={u.avatarUrl || undefined} />
                    <AvatarFallback className="text-[10px] font-bold bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-500 dark:text-indigo-400">
                      {u.fullName?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{u.fullName}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      @{u.username}
                      {u.isSelf && <span className="text-indigo-500"> · You</span>}
                      {u.followsYou && !u.isSelf && (
                        <span className="text-green-600 dark:text-green-400"> · Follows you</span>
                      )}
                    </p>
                  </div>
                </button>
                {!u.isSelf && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={togglingIds.has(u.id)}
                    onClick={() => onFollowToggle(u.id, u.isFollowing)}
                    className={cn(
                      "text-xs shrink-0",
                      u.isFollowing
                        ? "border-border/60 text-foreground hover:border-red-500/50 hover:text-red-600 hover:bg-red-500/5 dark:hover:border-red-400/50 dark:hover:text-red-400 dark:hover:bg-red-500/10"
                        : "border-indigo-500/30 bg-indigo-500 text-white hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-700"
                    )}
                  >
                    {togglingIds.has(u.id) ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : u.isFollowing ? (
                      <UserCheck className="w-3 h-3 mr-1" />
                    ) : (
                      <UserPlus className="w-3 h-3 mr-1" />
                    )}
                    {u.isFollowing ? "Unfollow" : "Follow"}
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function UserProfilePage() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [profile, setProfile] = useState<PublicProfileDto | null>(null);
  const [social, setSocial] = useState<SocialProfileDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Follow state
  const [followBusy, setFollowBusy] = useState(false);

  // Followers / Following dialogs
  const [listMode, setListMode] = useState<"followers" | "following" | null>(null);
  const [listUsers, setListUsers] = useState<FollowUserDto[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  // Report dialog
  const [reportOpen, setReportOpen] = useState(false);

  // User posts
  const [userPosts, setUserPosts] = useState<PostDto[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postsPage, setPostsPage] = useState(0);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [loadingMorePosts, setLoadingMorePosts] = useState(false);

  const counts = useHeatmap(profile);

  const fetchProfile = useCallback(async () => {
    if (!username) return;
    setLoading(true);
    setError(null);
    try {
      const [publicProfile, socialProfile] = await Promise.all([
        publicProfileService.getProfile(username),
        socialService.getProfile(username),
      ]);
      setProfile(publicProfile);
      setSocial(socialProfile);
    } catch {
      setError("This profile doesn't exist or is no longer available.");
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Fetch user's posts
  const fetchPosts = useCallback(
    async (pageNum: number, append = false) => {
      if (!social?.id) return;
      if (pageNum === 0) setPostsLoading(true);
      else setLoadingMorePosts(true);
      try {
        const result = await postService.getPostsByUser(social.id, pageNum, 10);
        if (append) {
          setUserPosts((prev) => {
            const existing = new Set(prev.map((p) => p.id));
            const fresh = result.content.filter((p) => !existing.has(p.id));
            return [...prev, ...fresh];
          });
        } else {
          setUserPosts(result.content);
        }
        setHasMorePosts(!result.last);
        setPostsPage(pageNum);
      } catch {
        // Silently fail — posts section just stays empty
      } finally {
        setPostsLoading(false);
        setLoadingMorePosts(false);
      }
    },
    [social]
  );

  useEffect(() => {
    if (social?.id) fetchPosts(0);
  }, [social?.id, fetchPosts]);

  const openList = useCallback(
    async (mode: "followers" | "following") => {
      if (!social) return;
      setListMode(mode);
      setListLoading(true);
      setListUsers([]);
      try {
        const users =
          mode === "followers"
            ? await socialService.getFollowers(social.id)
            : await socialService.getFollowing(social.id);
        setListUsers(users);
      } catch {
        toast.error("Failed to load list");
      } finally {
        setListLoading(false);
      }
    },
    [social]
  );

  const toggleFollow = async () => {
    if (!social || followBusy) return;
    setFollowBusy(true);
    try {
      if (social.isFollowing) {
        await socialService.unfollow(social.id);
      } else {
        await socialService.follow(social.id);
      }
      // Re-fetch authoritative state from backend to avoid stale data
      const freshSocial = await socialService.getProfile(username!);
      setSocial(freshSocial);
    } catch (err) {
      toast.error(getErrorMessage(err, "Unable to update follow status."));
    } finally {
      setFollowBusy(false);
    }
  };

  const toggleFollowInList = async (userId: string, currentlyFollowing: boolean) => {
    setTogglingIds((prev) => new Set(prev).add(userId));
    try {
      if (currentlyFollowing) await socialService.unfollow(userId);
      else await socialService.follow(userId);
      setListUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isFollowing: !currentlyFollowing } : u))
      );
    } catch {
      toast.error("Unable to update follow status.");
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
          <p className="text-sm text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profile || !social) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center mb-4 ring-1 ring-accent/20">
          <User className="w-6 h-6 text-accent" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">Profile not found</h3>
        <p className="text-sm text-muted-foreground mt-1">This user doesn't exist or has been removed.</p>
        <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="mt-4">
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Go back
        </Button>
      </div>
    );
  }

  const c = profile.contributions;
  const memberSince = profile.memberSince
    ? new Date(profile.memberSince).toLocaleDateString(undefined, { month: "short", year: "numeric" })
    : null;
  const badges: string[] = [];
  if (c.currentStreak >= 30) badges.push("🔥 30+ day streak");
  else if (c.currentStreak >= 7) badges.push("🔥 7+ day streak");
  else if (c.currentStreak >= 3) badges.push("🔥 On a roll");
  if (c.projectsCreated >= 5) badges.push("🚀 Builder");
  if (c.tasksCompleted >= 25) badges.push("✅ Task Master");
  if (c.messagesSent >= 100) badges.push("💬 Team Communicator");

  const postsCount = social.posts;
  const followerCount = social.followerCount;
  const followingCount = social.followingCount;

  return (
    <div className="relative">
      <div className="absolute -top-20 -right-20 w-72 h-72 bg-gradient-to-bl from-accent/[0.03] to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back
      </button>

      {/* Profile card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border/50 rounded-2xl p-6 mb-6 relative overflow-hidden hover:border-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.03] to-purple-500/[0.02] pointer-events-none" />

        <div className="flex items-start gap-5 relative flex-wrap">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/10 flex items-center justify-center ring-2 ring-indigo-500/20 shrink-0 overflow-hidden shadow-md shadow-indigo-500/10">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <User className="w-8 h-8 text-indigo-500" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-foreground truncate">{profile.displayName}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              <span className="truncate">@{profile.username}</span>
            </p>

            {/* Badges — only from data the user actually provided */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {profile.jobTitle && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20 font-medium flex items-center gap-1">
                  <Briefcase className="w-2.5 h-2.5" /> {profile.jobTitle}
                </span>
              )}
              {profile.company && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted/50 text-muted-foreground border border-border/30 flex items-center gap-1">
                  <Building2 className="w-2.5 h-2.5" /> {profile.company}
                </span>
              )}
              {profile.location && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted/50 text-muted-foreground border border-border/30 flex items-center gap-1">
                  <MapPin className="w-2.5 h-2.5" /> {profile.location}
                </span>
              )}
              {social.isSelf && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20 font-medium">
                  This is you
                </span>
              )}
            </div>

            {/* Bio */}
            {profile.bio && (
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{profile.bio}</p>
            )}

            {/* Earned badges */}
            {badges.length > 0 && (
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {badges.map((b) => (
                  <span
                    key={b}
                    className="text-[10px] px-2 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-medium"
                  >
                    {b}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
              {memberSince && (
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="w-3.5 h-3.5" /> Member since {memberSince}
                </span>
              )}
              {c.currentStreak > 0 && (
                <span className="inline-flex items-center gap-1 text-orange-500">
                  <Flame className="w-3.5 h-3.5" /> {c.currentStreak} day streak
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            {social.isSelf ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate("/profile")}
                  className="text-xs gap-1.5"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit Profile
                </Button>
                <Button
                  size="sm"
                  onClick={() => navigate("/profile/posts")}
                  className="text-xs gap-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700"
                >
                  <FileText className="w-3.5 h-3.5" />
                  My Posts
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="outline"
                disabled={followBusy}
                onClick={toggleFollow}
                className={cn(
                  "text-xs gap-1.5 min-w-[100px] justify-center",
                  social.isFollowing
                    ? "border-border/60 text-foreground hover:border-red-500/50 hover:text-red-600 hover:bg-red-500/5 dark:hover:border-red-400/50 dark:hover:text-red-400 dark:hover:bg-red-500/10"
                    : "border-indigo-500/30 bg-indigo-500 text-white hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-700"
                )}
              >
                {followBusy ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    {social.isFollowing ? "Unfollowing..." : "Following..."}
                  </>
                ) : social.isFollowing ? (
                  <>
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>
                    Following
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                    Follow
                  </>
                )}
              </Button>
            )}
            {social.isSelf && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => navigate("/feed")}
                className="text-xs gap-1.5 text-muted-foreground"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                View Feed
              </Button>
            )}
            {!social.isSelf && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setReportOpen(true)}
                aria-label="Report user"
                className="text-xs gap-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/5"
              >
                <Flag className="w-3.5 h-3.5" />
                Report
              </Button>
            )}
          </div>
        </div>

        {/* Social stats */}
        <div className="grid grid-cols-3 gap-3 mt-6 relative">
          <button
            type="button"
            onClick={() => document.getElementById("user-posts")?.scrollIntoView({ behavior: "smooth" })}
            className="rounded-xl border border-border/40 bg-muted/20 p-4 text-left hover:border-indigo-500/20 hover:bg-indigo-500/5 transition-all"
          >
            <p className="text-2xl font-bold text-foreground">{postsCount.toLocaleString()}</p>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Posts
            </p>
          </button>
          <button
            type="button"
            onClick={() => openList("followers")}
            className="rounded-xl border border-border/40 bg-muted/20 p-4 text-left hover:border-indigo-500/20 hover:bg-indigo-500/5 transition-all"
            aria-label={`View followers (${followerCount})`}
          >
            <p className="text-2xl font-bold text-foreground">{followerCount.toLocaleString()}</p>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Followers
            </p>
          </button>
          <button
            type="button"
            onClick={() => openList("following")}
            className="rounded-xl border border-border/40 bg-muted/20 p-4 text-left hover:border-indigo-500/20 hover:bg-indigo-500/5 transition-all"
            aria-label={`View following (${followingCount})`}
          >
            <p className="text-2xl font-bold text-foreground">{followingCount.toLocaleString()}</p>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Following
            </p>
          </button>
        </div>
      </motion.div>

      {/* Contribution stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <StatCard icon={<FolderKanban className="w-3.5 h-3.5" />} label="Projects" value={c.projectsCreated} />
        <StatCard icon={<CheckCircle2 className="w-3.5 h-3.5" />} label="Tasks done" value={c.tasksCompleted} />
        <StatCard icon={<MessageSquare className="w-3.5 h-3.5" />} label="Messages" value={c.messagesSent} />
        <StatCard icon={<FileText className="w-3.5 h-3.5" />} label="Posts" value={c.postsCreated} />
        <StatCard icon={<MessageCircle className="w-3.5 h-3.5" />} label="Comments" value={c.commentsAdded} />
      </div>

      {/* Heatmap */}
      <div className="rounded-2xl border border-border/50 bg-card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-500" />
            Contribution activity
          </h3>
          <span className="text-[11px] text-muted-foreground">Last {HEATMAP_DAYS} days</span>
        </div>
        <ContributionHeatmap counts={counts} />
        {c.heatmap.length === 0 && (
          <p className="text-xs text-muted-foreground mt-3">
            No contributions yet — this developer is just getting started.
          </p>
        )}
      </div>

      {/* User's Posts */}
      <div id="user-posts" className="mb-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">
          {social.isSelf ? "Your Posts" : `Posts by ${profile.displayName}`}
        </h3>
        {postsLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border border-border/40 rounded-xl p-5 bg-card animate-pulse">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-muted" />
                  <div className="space-y-1.5">
                    <div className="h-3 bg-muted rounded w-24" />
                    <div className="h-2 bg-muted rounded w-16" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded w-full" />
                  <div className="h-3 bg-muted rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : userPosts.length === 0 ? (
          <div className="bg-card border border-border/50 rounded-2xl text-center py-12 px-6">
            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-indigo-500/15 to-purple-500/10 flex items-center justify-center ring-1 ring-indigo-500/20">
              <FileText className="w-5 h-5 text-indigo-400" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">No posts yet</p>
            <p className="text-xs text-muted-foreground">
              {social.isSelf
                ? "You haven't shared any posts yet."
                : "This developer hasn't shared any updates yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {userPosts.map((post) => (
              <FeedPostCard
                key={post.id}
                post={post}
                currentUserId={currentUser?.id}
                onUpdated={(updated) =>
                  setUserPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
                }
                onDeleted={(postId) =>
                  setUserPosts((prev) => prev.filter((p) => p.id !== postId))
                }
              />
            ))}
            {hasMorePosts && (
              <div className="text-center py-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchPosts(postsPage + 1, true)}
                  disabled={loadingMorePosts}
                  className="text-xs gap-1 rounded-full text-muted-foreground hover:text-indigo-500 hover:border-indigo-500/30"
                >
                  {loadingMorePosts ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    "Load more"
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Followers / Following dialog */}
      <FollowListDialog
        open={listMode !== null}
        onOpenChange={(open) => !open && setListMode(null)}
        title={listMode === "followers" ? "Followers" : "Following"}
        users={listUsers}
        loading={listLoading}
        onUserClick={(uname) => {
          setListMode(null);
          if (uname === currentUser?.username) navigate("/profile");
          else navigate(`/profile/${uname}`);
        }}
        onFollowToggle={toggleFollowInList}
        togglingIds={togglingIds}
      />

      {/* Report user dialog */}
      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        entityType="USER"
        entityId={social.id}
        entityLabel={`user @${profile.username}`}
      />
    </div>
  );
}
