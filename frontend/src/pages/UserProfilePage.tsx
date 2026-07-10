import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  User,
  AtSign,
  Github,
  Linkedin,
  Globe,
  MapPin,
  MessageCircle,
  UserPlus,
  UserCheck,
  Loader2,
  ArrowLeft,
  Heart,
  MessageSquare,
  Briefcase,
  Rss,
  Sparkles,
} from "lucide-react";
import { userService, type UserDto } from "@/services/userService";
import { postService, type PostDto } from "@/services/postService";
import { useAuth } from "@/contexts/AuthContext";

export default function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [profileUser, setProfileUser] = useState<UserDto | null>(null);
  const [posts, setPosts] = useState<PostDto[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [toggling, setToggling] = useState(false);
  const [loading, setLoading] = useState(true);

  const isOwnProfile = currentUser?.id === userId;

  const fetchProfile = useCallback(async () => {
    if (!userId) return;
    try {
      const [userData, userPosts] = await Promise.all([
        userService.getUser(userId),
        postService.getPostsByUser(Number(userId)).catch(() => [] as PostDto[]),
      ]);
      setProfileUser(userData);
      setPosts(userPosts);
    } catch (err) {
      console.error("Failed to load profile:", err);
    }
    setLoading(false);
  }, [userId, isOwnProfile]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleMessage = async () => {
    if (!userId) return;
    navigate(`/messages/dm_${userId}`);
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

  if (!profileUser) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center mb-4 ring-1 ring-accent/20">
          <User className="w-6 h-6 text-accent" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">User not found</h3>
        <p className="text-sm text-muted-foreground mt-1">This user doesn't exist or has been removed.</p>
        <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="mt-4">
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Go back
        </Button>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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
        className="bg-card border border-border/50 rounded-xl p-6 mb-8 relative overflow-hidden hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5 transition-all duration-300"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.02] to-transparent pointer-events-none" />

        <div className="flex items-start gap-5 relative">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center ring-1 ring-accent/20 shrink-0 overflow-hidden shadow-sm">
            {profileUser.avatarUrl ? (
              <img src={profileUser.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <User className="w-8 h-8 text-accent" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-foreground truncate">
              {profileUser.fullName}
            </h2>
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
              <AtSign className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">@{profileUser.username}</span>
            </p>

            {/* Badges */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {profileUser.role && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20 font-medium flex items-center gap-1">
                  <Briefcase className="w-2.5 h-2.5" /> {profileUser.role}
                </span>
              )}
              {profileUser.location && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted/50 text-muted-foreground border border-border/30 flex items-center gap-1">
                  <MapPin className="w-2.5 h-2.5" /> {profileUser.location}
                </span>
              )}
            </div>

            {/* Social links */}
            {(profileUser.githubUrl || profileUser.websiteUrl) && (
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                {profileUser.githubUrl && (
                  <a
                    href={profileUser.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Github className="w-3 h-3" /> {profileUser.githubUrl.replace('https://github.com/', '')}
                  </a>
                )}
                {profileUser.websiteUrl && (
                  <a
                    href={profileUser.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Globe className="w-3 h-3" /> Portfolio
                  </a>
                )}
              </div>
            )}

            {/* Bio */}
            {profileUser.bio && (
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                {profileUser.bio}
              </p>
            )}

            {/* Stats */}
            <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
              <span>
                <strong className="text-foreground">{followerCount}</strong> followers
              </span>
              <span>
                <strong className="text-foreground">{followingCount}</strong> following
              </span>
              <span>
                <strong className="text-foreground">{posts.length}</strong> posts
              </span>
            </div>
          </div>

          {/* Actions */}
          {!isOwnProfile && (
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleMessage}
                className="text-xs"
              >
                <MessageCircle className="w-3.5 h-3.5 mr-1.5" /> Message
              </Button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Posts */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 rounded-md bg-accent/10 flex items-center justify-center">
            <Rss className="w-3 h-3 text-accent" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">Recent Posts</h3>
        </div>

        {posts.length === 0 ? (
          <div className="border border-border/50 rounded-xl p-12 flex flex-col items-center text-center gap-4 bg-card">
            <div className="w-10 h-10 rounded-2xl bg-accent/10 flex items-center justify-center ring-1 ring-accent/20">
              <Sparkles className="w-5 h-5 text-accent" />
            </div>
            <p className="text-sm text-muted-foreground">
              No posts yet. Check back later!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <div
                key={post.id}
                className="border border-border/50 rounded-xl p-4 bg-card hover:border-accent/20 transition-all duration-200"
              >
                <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {post.user?.fullName || "Unknown"}
                  </span>
                  <span className="text-muted-foreground/30">·</span>
                  <span>{formatDate(post.createdAt)}</span>
                </div>
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {post.content}
                </p>
                {post.imageUrl && (
                  <img
                    src={post.imageUrl}
                    alt="Post attachment"
                    className="mt-3 max-h-60 rounded-lg object-cover border border-border/50"
                    loading="lazy"
                  />
                )}
                <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/50 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5" /> {post.likeCount || 0} {(post.likeCount || 0) === 1 ? "like" : "likes"}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" /> {post.commentCount || 0} {(post.commentCount || 0) === 1 ? "comment" : "comments"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
