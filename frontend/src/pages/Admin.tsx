import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Shield, Users, FolderGit2, Rss, UserPlus, ListTodo, MessagesSquare, Ban, Activity, Trash2, Loader2,
} from "lucide-react";
import {
  adminService,
  type AdminDashboard,
  type AdminPost,
  type AdminUser,
  type PlatformStats,
} from "@/services/adminService";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

export default function Admin() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [tab, setTab] = useState<"overview" | "users" | "posts">("overview");
  const [loading, setLoading] = useState(true);
  const [deletingPost, setDeletingPost] = useState<string | null>(null);
  const [changingRole, setChangingRole] = useState<string | null>(null);
  const [togglingBlock, setTogglingBlock] = useState<string | null>(null);

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const admin = await adminService.isAdmin();
        setIsAdmin(admin);
        if (admin) {
          const [dash, platformStats, allUsers, allPosts] = await Promise.all([
            adminService.getDashboard(),
            adminService.getPlatformStats(),
            adminService.getAllUsers(),
            adminService.getAllPosts(),
          ]);
          setDashboard(dash);
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
      setPosts((prev) => prev.filter((p) => p.id !== postId));
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
      const updated = await adminService.updateUserRole(userId, newRole);
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
      toast.success(`Role updated to ${newRole}`);
    } catch {
      toast.error("Failed to update role");
    } finally {
      setChangingRole(null);
    }
  };

  const handleToggleBlock = async (user: AdminUser) => {
    setTogglingBlock(user.id);
    try {
      const updated = await adminService.setUserBlocked(user.id, !user.blocked);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? updated : u)));
      toast.success(updated.blocked ? "User blocked" : "User unblocked");
    } catch {
      toast.error("Failed to update block status");
    } finally {
      setTogglingBlock(null);
    }
  };

  const roleBadge = (role: string) =>
    role === "ADMIN" ? (
      <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20">ADMIN</Badge>
    ) : (
      <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">USER</Badge>
    );

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      ACTIVE: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
      ARCHIVED: "bg-amber-500/10 text-amber-500 border-amber-500/20",
      COMPLETED: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    };
    return (
      <Badge variant="outline" className={styles[status] || "bg-secondary text-secondary-foreground"}>{status}</Badge>
    );
  };

  const statCards = dashboard
    ? [
        { icon: Users, label: "Total Users", value: dashboard.totalUsers, color: "text-blue-500" },
        { icon: Activity, label: "Active Users", value: dashboard.activeUsers, color: "text-emerald-500" },
        { icon: Ban, label: "Blocked Users", value: dashboard.blockedUsers, color: "text-red-500" },
        { icon: FolderGit2, label: "Projects", value: dashboard.totalProjects, color: "text-indigo-500" },
        { icon: UserPlus, label: "Teams", value: dashboard.totalTeams, color: "text-amber-500" },
        { icon: ListTodo, label: "Tasks", value: dashboard.totalTasks, color: "text-violet-500" },
        { icon: Rss, label: "Posts", value: dashboard.totalPosts, color: "text-purple-500" },
        { icon: MessagesSquare, label: "Messages", value: dashboard.totalMessages, color: "text-cyan-500" },
      ]
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
          <p className="text-sm text-muted-foreground">Loading admin dashboard...</p>
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
              You don't have admin privileges. Contact the platform owner if you believe this is a mistake.
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
    <div className="relative space-y-8">
      <div className="absolute -top-20 -right-20 w-72 h-72 bg-gradient-to-bl from-accent/[0.03] to-transparent rounded-full blur-3xl pointer-events-none" />

      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-5 h-5 rounded-md bg-accent/10 flex items-center justify-center">
            <Shield className="w-3 h-3 text-accent" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Admin Dashboard</h1>
        </div>
        <p className="ml-7 text-sm text-muted-foreground">Platform overview, user management, and content moderation</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Card key={s.label} className="gap-2 py-4 border-border/50 hover:border-accent/30 transition-colors">
            <CardContent className="px-4 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">{s.label}</p>
                <p className="text-2xl font-bold mt-1">{s.value.toLocaleString()}</p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-accent/5 flex items-center justify-center shrink-0">
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="border-border/50 gap-0 overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold text-foreground">Recent Users</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow><TableHead>User</TableHead><TableHead>Role</TableHead><TableHead className="text-right">Joined</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {(dashboard?.recentUsers || []).map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center ring-1 ring-accent/20 shrink-0 overflow-hidden">
                          {u.avatarUrl ? <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" /> : <Users className="w-3.5 h-3.5 text-accent" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{u.fullName}</p>
                          <p className="text-xs text-muted-foreground truncate">@{u.username || "—"}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {roleBadge(u.role)}
                        {u.blocked && <Badge variant="destructive" className="text-[10px] px-1.5">Blocked</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
                {(dashboard?.recentUsers || []).length === 0 && (
                  <TableRow><TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-8">No users yet</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-border/50 gap-0 overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold text-foreground">Recent Projects</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow><TableHead>Project</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Created</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {(dashboard?.recentProjects || []).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center shrink-0">
                          <FolderGit2 className="w-4 h-4 text-indigo-400" />
                        </div>
                        <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                      </div>
                    </TableCell>
                    <TableCell>{statusBadge(p.status)}</TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">{new Date(p.createdAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
                {(dashboard?.recentProjects || []).length === 0 && (
                  <TableRow><TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-8">No projects yet</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-1 border-b border-border/50">
        {(["overview", "users", "posts"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2.5 text-xs border-b-2 transition-colors capitalize ${tab === t ? "border-accent text-accent" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {t === "overview" && "📊 "}
            {t === "users" && "👥 "}
            {t === "posts" && "📝 "}
            {t}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <Card className="border-border/50">
          <CardHeader className="pb-4"><CardTitle className="text-sm font-semibold text-foreground">Platform Overview</CardTitle></CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="border border-border/50 rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-1">Total Users</p>
                <p className="text-2xl font-bold text-foreground">{dashboard?.totalUsers ?? 0}</p>
              </div>
              <div className="border border-border/50 rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-1">Active Rate</p>
                <p className="text-2xl font-bold text-foreground">
                  {dashboard && dashboard.totalUsers > 0 ? Math.round((dashboard.activeUsers / dashboard.totalUsers) * 100) + "%" : "0%"}
                </p>
              </div>
              <div className="border border-border/50 rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-1">Avg Posts per User</p>
                <p className="text-2xl font-bold text-foreground">
                  {dashboard && dashboard.totalUsers > 0 ? (dashboard.totalPosts / dashboard.totalUsers).toFixed(1) : "0"}
                </p>
              </div>
              <div className="border border-border/50 rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-1">Blocked Users</p>
                <p className="text-2xl font-bold text-foreground">{dashboard?.blockedUsers ?? 0}</p>
              </div>
            </div>
            {stats && (
              <p className="text-xs text-muted-foreground mt-4">
                {stats.totalConnections} connections · {stats.totalPosts} posts · {stats.totalProjects} projects · {stats.totalTeams} teams
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "users" && (
        <div className="space-y-2">
          {users.length === 0 ? (
            <div className="border border-border/50 rounded-xl p-10 text-center text-sm text-muted-foreground bg-card">No users found.</div>
          ) : (
            users.map((user) => (
              <div key={user.id} className="bg-card border border-border/50 rounded-xl p-4 flex items-center gap-4 hover:border-accent/20 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center ring-1 ring-accent/20 shrink-0 overflow-hidden">
                  {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" /> : <Users className="w-4 h-4 text-accent" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{user.fullName}</p>
                  <p className="text-xs text-muted-foreground truncate">@{user.username} · {user.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {user.postCount} posts · {user.followerCount} followers{user.blocked && " · blocked"}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {roleBadge(user.role)}
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    disabled={changingRole === user.id}
                    className="text-xs bg-background border border-border/50 rounded-lg px-2 py-1 text-foreground"
                  >
                    <option value="USER">User</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                  <Button
                    size="sm"
                    variant="ghost"
                    className={user.blocked ? "text-emerald-500 hover:text-emerald-600" : "text-muted-foreground hover:text-destructive"}
                    onClick={() => handleToggleBlock(user)}
                    disabled={togglingBlock === user.id}
                  >
                    {togglingBlock === user.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                    <span className="ml-1">{user.blocked ? "Unblock" : "Block"}</span>
                  </Button>
                  {changingRole === user.id && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === "posts" && (
        <div className="space-y-2">
          {posts.length === 0 ? (
            <div className="border border-border/50 rounded-xl p-10 text-center text-sm text-muted-foreground bg-card">No posts found.</div>
          ) : (
            posts.map((post) => (
              <div key={post.id} className="bg-card border border-border/50 rounded-xl p-4 hover:border-accent/20 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground line-clamp-2">{post.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      By {post.author?.fullName || "Unknown"} · {post.likeCount} likes · {post.commentCount} comments · {new Date(post.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeletePost(post.id)}
                    disabled={deletingPost === post.id}
                    className="shrink-0 p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded-lg hover:bg-destructive/5"
                  >
                    {deletingPost === post.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
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
