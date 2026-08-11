import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/hooks/useApi";
import { useCountUp } from "@/hooks/useCountUp";
import { projectService } from "@/services/projectService";
import { notificationService } from "@/services/notificationService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton, SkeletonTableRow } from "@/components/Skeletons";
import { StatusPill } from "@/components/StatusPill";
import { MemberStack } from "@/components/MemberStack";
import { timeAgo } from "@/lib/format";
import {
  FolderKanban,
  Bell,
  MessageSquare,
  Plus,
  ArrowRight,
  ChevronRight,
  CalendarDays,
  Clock,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { useNavigate } from "react-router";

// ─── Helpers ─────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

const todayLabel = new Date().toLocaleDateString("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
});

const projectGradients = [
  "from-indigo-500 to-purple-600",
  "from-blue-500 to-cyan-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-amber-600",
  "from-pink-500 to-rose-600",
];



// ─── Stat Card ───────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  gradient,
  to,
  loading,
  value,
  main,
  sub,
  index,
}: {
  icon: LucideIcon;
  label: string;
  gradient: string;
  to: string;
  loading: boolean;
  /** Numeric value — omit for cards without a count. */
  value?: number | null;
  /** Custom content to render in place of the number area. */
  main?: React.ReactNode;
  sub: React.ReactNode;
  index: number;
}) {
  const navigate = useNavigate();
  const display = useCountUp(value ?? 0, {
    enabled: value !== undefined && !loading && value !== null,
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      navigate(to);
    }
  };

  return (
    <Card
      onClick={() => navigate(to)}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={label}
      className="group relative overflow-hidden border-border/40 hover:border-indigo-500/30 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 cursor-pointer animate-fade-in-up outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2"
      style={{ animationDelay: `${index * 0.08}s` }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-3`}
            >
              <Icon className="w-4 h-4 text-white" />
            </div>
            <CardTitle className="text-sm font-medium">{label}</CardTitle>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground/40 -translate-x-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
        </div>
      </CardHeader>
      <CardContent>
        {main ?? (
          loading || value === null ? (
            <Skeleton className="h-8 w-14 mb-1" />
          ) : (
            <p className="text-3xl font-bold tabular-nums tracking-tight">{display}</p>
          )
        )}
        <div className="text-xs text-muted-foreground mt-1.5">{sub}</div>
      </CardContent>
    </Card>
  );
}

// ─── Page ────────────────────────────────────────────────

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { data: projects, loading: projectsLoading } = useApi(() =>
    projectService.getMyProjects()
  );
  const { data: unreadCount } = useApi(() => notificationService.getUnreadCount());

  const firstName = user?.fullName?.split(" ")[0] || "Developer";
  const recentProjects = projects
    ? [...projects].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
    : [];

  return (
    <div className="relative space-y-6 max-w-5xl">
      {/* Decorative glows */}
      <div className="absolute -top-24 -right-24 w-80 h-80 bg-gradient-to-bl from-indigo-500/[0.06] to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-gradient-to-tr from-purple-500/[0.05] to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* ── Header ── */}
      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="relative shrink-0">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 p-[2px] shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full rounded-[14px] bg-background flex items-center justify-center overflow-hidden">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.fullName || ""} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-lg font-bold bg-gradient-to-br from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    {user?.fullName?.charAt(0) || "U"}
                  </span>
                )}
              </div>
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-2 ring-background" />
          </div>
          <div>
            <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
              {getGreeting()},
            </p>
            <h1 className="text-2xl font-bold tracking-tight">{firstName}</h1>
            <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
              <CalendarDays className="w-3.5 h-3.5 text-muted-foreground/60" />
              {todayLabel}
              {isAdmin && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent/10 text-accent border border-accent/20">
                  <Sparkles className="w-2.5 h-2.5" />
                  Admin
                </span>
              )}
            </p>
          </div>
        </div>
        <Button
          onClick={() => navigate("/projects")}
          className="relative overflow-hidden group bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          New Project
          <span
            aria-hidden
            className="animate-shine-sweep absolute top-0 bottom-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none"
          />
        </Button>
      </div>

      {/* ── Stat cards ── */}
      <div className="relative grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          index={0}
          icon={FolderKanban}
          label="Projects"
          gradient="from-indigo-500 to-purple-600"
          to="/projects"
          loading={projectsLoading}
          value={projects?.length ?? null}
          sub="Total projects"
        />
        <StatCard
          index={1}
          icon={Bell}
          label="Notifications"
          gradient="from-amber-500 to-orange-600"
          to="/notifications"
          loading={unreadCount === null}
          value={unreadCount}
          sub={unreadCount !== null && unreadCount > 0 ? "Unread — needs attention" : "All caught up"}
        />
        <StatCard
          index={2}
          icon={MessageSquare}
          label="Messages"
          gradient="from-emerald-500 to-teal-600"
          to="/messages"
          loading={false}
          main={
            <p className="text-sm text-muted-foreground font-medium">Team chats &amp; DMs</p>
          }
          sub={
            <span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-medium">
              Open messages
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform duration-200" />
            </span>
          }
        />
      </div>

      {/* ── Recent Projects ── */}
      <Card className="relative border-border/40">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <FolderKanban className="w-4 h-4 text-indigo-400" />
            Recent Projects
          </CardTitle>
          {projects && projects.length > 0 && (
            <button
              onClick={() => navigate("/projects")}
              className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors"
            >
              View all
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </CardHeader>
        <CardContent>
          {projectsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonTableRow key={i} />
              ))}
            </div>
          ) : recentProjects.length > 0 ? (
            <div className="space-y-2">
              {recentProjects.slice(0, 5).map((p, i) => (
                <div
                  key={p.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Open project ${p.name}`}
                  onClick={() => navigate(`/board/${p.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate(`/board/${p.id}`);
                    }
                  }}
                  className="group flex items-center justify-between gap-3 p-3 rounded-xl border border-border/40 hover:border-indigo-500/25 hover:bg-accent/5 hover:shadow-sm transition-all duration-200 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-lg bg-gradient-to-br ${
                        projectGradients[i % projectGradients.length]
                      } flex items-center justify-center shrink-0 shadow-sm transition-transform duration-200 group-hover:scale-105 group-hover:-rotate-3`}
                    >
                      <FolderKanban className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{p.name}</p>
                        <StatusPill status={p.status} />
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                        <MemberStack members={p.members} />
                        <span>
                          {p.memberCount} member{p.memberCount !== 1 ? "s" : ""}
                        </span>
                        <span className="text-muted-foreground/40">·</span>
                        <span className="inline-flex items-center gap-1 truncate">
                          <Clock className="w-3 h-3 text-muted-foreground/50" />
                          {timeAgo(p.updatedAt) || "Recently updated"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all duration-200 shrink-0" />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-500/15 to-purple-500/10 flex items-center justify-center ring-1 ring-indigo-500/20">
                <FolderKanban className="w-7 h-7 text-indigo-400" />
              </div>
              <h3 className="text-base font-semibold mb-1.5">No projects yet</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-5">
                Create your first project to start collaborating with your team.
              </p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <Button
                  size="sm"
                  onClick={() => navigate("/projects")}
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Create your first project
                </Button>
                <Button size="sm" variant="outline" onClick={() => navigate("/feed")}>
                  Explore the feed
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
