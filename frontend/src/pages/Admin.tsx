import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Shield,
  Users,
  Rss,
  Trash2,
  Loader2,
  FolderGit2,
  UserPlus,
  UserCog,
} from "lucide-react";
import { adminService, type AdminUser, type AdminPost, type PlatformStats } from "@/services/adminService";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function Admin() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [tab, setTab] = useState<"overview" | "users" | "posts">("overview");
  const [loading, setLoading] = useState(true);
  const [deletingPost, setDeletingPost] = useState<string | null>(null);
  const [changingRole, setChangingRole] = useState<string | null>(null);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const admin = await adminService.isAdmin();
        setIsAdmin(admin);
        if (admin) {
          const [platformStats, allUsers, allPosts] = await Promise.all([
            adminService.getPlatformStats(),
            adminService.getAllUsers(),
            adminService.getAllPosts(),
          ]);
          setStats(platformStats);
          setUsers(allUsers);
          setPosts(allPosts);
        }
      } catch {
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };
    checkAccess();
  }, []);

  const handleDeletePost = async (postId: string) => {
    setDeletingPost(postId);
    try {
      await adminService.deletePost(postId);
      setPosts((prev) => prev.filter((p) => p._id !== postId));
      toast.success("Post deleted");
    } catch {
      toast.error("Failed to delete post");
    } finally {
      setDeletingPost(null);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    setChangingRole(userId);
    try {
      await adminService.updateUserRole(userId, newRole);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)),
      );
      toast.success(`Role updated to ${newRole}`);
    } catch {
      toast.error("Failed to update role");
    } finally {
      setChangingRole(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
          <p className="text-sm text-muted-foreground">Checking access...</p>
        </div>
      </div>
    );
  }

  if (isAdmin === false) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center ring-1 ring-destructive/20">
            <Shield className="w-7 h-7 text-destructive" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Access Denied</h2>
            <p className="text-sm text-muted-foreground mt-1">
              You don't have admin privileges. Contact the platform owner if you
              believe this is a mistake.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => navigate("/dashboard")} className="text-sm">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Background decoration */}
      <div className="absolute -top-20 -right-20 w-72 h-72 bg-gradient-to-bl from-accent/[0.03] to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-5 h-5 rounded-md bg-accent/10 flex items-center justify-center">
            <Shield className="w-3 h-3 text-accent" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Admin Panel</h1>
        </div>
        <p className="ml-7 text-sm text-muted-foreground">
          Manage users, moderate content, and view platform stats
        </p>
      </div>

      {/* Platform Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-8">
          {[
            { icon: Users, label: "Users", value: stats.totalUsers, color: "text-blue-500" },
            { icon: Rss, label: "Posts", value: stats.totalPosts, color: "text-purple-500" },
            { icon: FolderGit2, label: "Projects", value: stats.totalProjects, color: "text-accent" },
            { icon: UserPlus, label: "Connections", value: stats.totalConnections, color: "text-green-500" },
            { icon: UserCog, label: "Teams", value: stats.totalTeams, color: "text-amber-500" },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-card border border-border/50 rounded-xl p-4 flex flex-col items-center text-center gap-2"
            >
              <s.icon className={`w-5 h-5 ${s.color}`} />
              <span className="text-xl font-bold text-foreground">{s.value}</span>
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-border/50">
        {(["overview", "users", "posts"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2.5 text-xs border-b-2 transition-colors capitalize ${
              tab === t
                ? "border-accent text-accent"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "overview" && "📊 "}
            {t === "users" && "👥 "}
            {t === "posts" && "📝 "}
            {t}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === "overview" && (
        <div className="bg-card border border-border/50 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Platform Overview</h3>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Welcome to the admin panel. Use the tabs above to manage users and moderate content.
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="border border-border/50 rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-1">Total Users</p>
                <p className="text-2xl font-bold text-foreground">{stats?.totalUsers ?? 0}</p>
              </div>
              <div className="border border-border/50 rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-1">Engagement Rate</p>
                <p className="text-2xl font-bold text-foreground">
                  {stats && stats.totalUsers > 0
                    ? ((stats.totalConnections / (stats.totalUsers * 2)) * 100).toFixed(1) + "%"
                    : "0%"}
                </p>
              </div>
              <div className="border border-border/50 rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-1">Avg Posts per User</p>
                <p className="text-2xl font-bold text-foreground">
                  {stats && stats.totalUsers > 0
                    ? (stats.totalPosts / stats.totalUsers).toFixed(1)
                    : "0"}
                </p>
              </div>
              <div className="border border-border/50 rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-1">Teams Active</p>
                <p className="text-2xl font-bold text-foreground">{stats?.totalTeams ?? 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "users" && (
        <div className="space-y-2">
          {users.length === 0 ? (
            <div className="border border-border/50 rounded-xl p-10 text-center text-sm text-muted-foreground bg-card">
              No users found.
            </div>
          ) : (
            users.map((user) => (
              <div
                key={user.id}
                className="bg-card border border-border/50 rounded-xl p-4 flex items-center gap-4 hover:border-accent/20 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center ring-1 ring-accent/20 shrink-0 overflow-hidden">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Users className="w-4 h-4 text-accent" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{user.fullName}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    @{user.username} · {user.email}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {user.postCount} posts · {user.followerCount} followers
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      user.role === "ADMIN"
                        ? "bg-purple-500/10 text-purple-500 border border-purple-500/20"
                        : "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                    }`}
                  >
                    {user.role}
                  </span>
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    disabled={changingRole === user.id}
                    className="text-xs bg-background border border-border/50 rounded-lg px-2 py-1 text-foreground"
                  >
                    <option value="DEVELOPER">Developer</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                  {changingRole === user.id && (
                    <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "posts" && (
        <div className="space-y-2">
          {posts.length === 0 ? (
            <div className="border border-border/50 rounded-xl p-10 text-center text-sm text-muted-foreground bg-card">
              No posts found.
            </div>
          ) : (
            posts.map((post) => (
              <div
                key={post._id}
                className="bg-card border border-border/50 rounded-xl p-4 hover:border-accent/20 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground line-clamp-2">{post.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      By {post.author?.fullName || "Unknown"} · {post.likeCount} likes ·{" "}
                      {post.commentCount} comments ·{" "}
                      {new Date(post.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeletePost(post._id)}
                    disabled={deletingPost === post._id}
                    className="shrink-0 p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded-lg hover:bg-destructive/5"
                  >
                    {deletingPost === post._id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
