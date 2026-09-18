import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/hooks/useApi";
import { useCountUp } from "@/hooks/useCountUp";
import { projectService } from "@/services/projectService";
import { notificationService } from "@/services/notificationService";
import { pinnedProjectService } from "@/services/pinnedProjectService";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { PinButton } from "@/components/PinButton";
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
  ArrowUpRight,
  ChevronRight,
  Clock,
  Pin,
  X,
  Sparkles,
  Network,
  FolderOpen,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import { useNavigate } from "react-router";

// ─── Helpers ─────────────────────────────────────────────

function greeting() {
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

// ─── Stat Card ───────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  to,
  loading,
  value,
  main,
  sub,
}: {
  icon: LucideIcon;
  label: string;
  to: string;
  loading: boolean;
  value?: number | null;
  main?: React.ReactNode;
  sub: React.ReactNode;
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
      className="group border-border hover:border-muted-foreground/30 hover:bg-muted/30 transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Icon className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-[13px] font-medium text-foreground">{label}</CardTitle>
          </div>
          <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground/40 opacity-0 group-hover:opacity-100 group-hover:text-foreground transition-all" />
        </div>
      </CardHeader>
      <CardContent>
        {main ?? (
          loading || value === null ? (
            <Skeleton className="h-7 w-12 mb-1" />
          ) : (
            <p className="text-2xl font-semibold tabular-nums tracking-tight font-display">{display}</p>
          )
        )}
        <div className="text-xs text-muted-foreground mt-1">{sub}</div>
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
  const { data: pinnedProjects, refetch: refetchPinned } = useApi(() =>
    pinnedProjectService.getPinned()
  );
  const { data: unreadCount } = useApi(() => notificationService.getUnreadCount());
  const { subscription } = useSubscription();
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const isFree = subscription?.planCode === "FREE" || (!subscription && subscription !== null);
  const firstName = user?.fullName?.split(" ")[0] || "Developer";
  const recentProjects = projects
    ? [...projects].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
    : [];

  const pinnedIds = new Set((pinnedProjects ?? []).map((p) => p.projectId));
  const pinnedFull = (pinnedProjects ?? [])
    .map((p) => (projects ?? []).find((proj) => proj.id === p.projectId))
    .filter((p): p is NonNullable<typeof p> => !!p);

  const quickActions: { label: string; icon: LucideIcon; to: string }[] = [
    { label: "Explore Projects", icon: FolderOpen, to: "/projects" },
    { label: "Find Developers", icon: Network, to: "/network" },
    { label: "View Analytics", icon: BarChart3, to: "/analytics" },
  ];

  return (
    <div className="max-w-6xl">
      <div className="grid lg:grid-cols-[1fr_260px] gap-6 items-start">
        {/* ── Main column ── */}
        <div className="space-y-5 min-w-0">
          {/* Greeting */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">
                {greeting()},
              </p>
              <h1 className="font-display text-2xl font-semibold text-foreground mt-0.5">
                {firstName}
                {isAdmin && (
                  <span className="inline-flex items-center px-1.5 py-0.5 ml-2 align-middle rounded text-[10px] font-medium bg-muted text-muted-foreground border border-border">
                    Admin
                  </span>
                )}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Build. Collaborate. Ship real projects.
              </p>
            </div>
            <p className="text-xs text-muted-foreground shrink-0">{todayLabel}</p>
          </div>

          {/* Upgrade banner — neutral surface, one quiet primary action */}
          {isFree && !bannerDismissed && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card">
              <Sparkles className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-foreground">You're on the Free plan</p>
                <p className="text-xs text-muted-foreground">
                  Upgrade to get private projects, more storage, and advanced features.
                </p>
              </div>
              <button
                onClick={() => navigate("/settings/billing")}
                className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-accent-hover transition-colors"
              >
                Upgrade
              </button>
              <button
                onClick={() => navigate("/settings/billing")}
                className="shrink-0 text-xs text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
              >
                Learn more
              </button>
              <button
                onClick={() => setBannerDismissed(true)}
                aria-label="Dismiss"
                className="shrink-0 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Summary cards */}
          <div className="grid sm:grid-cols-3 gap-4">
            <StatCard
              icon={FolderKanban}
              label="Projects"
              to="/projects"
              loading={projectsLoading}
              value={projects?.length ?? null}
              sub="Total projects"
            />
            <StatCard
              icon={Bell}
              label="Notifications"
              to="/notifications"
              loading={unreadCount === null}
              value={unreadCount}
              sub={unreadCount !== null && unreadCount > 0 ? "Unread" : "All caught up"}
            />
            <StatCard
              icon={MessageSquare}
              label="Messages"
              to="/messages"
              loading={false}
              main={<p className="text-sm text-muted-foreground mt-1">Team chats & DMs</p>}
              sub={
                <span className="inline-flex items-center gap-1 text-foreground font-medium">
                  Open <ArrowRight className="w-3 h-3" />
                </span>
              }
            />
          </div>

          {/* Pinned Projects */}
          {pinnedFull.length > 0 && (
            <Card className="border-border">
              <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-semibold font-display flex items-center gap-2">
                  <Pin className="w-3.5 h-3.5 text-muted-foreground" />
                  Pinned
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="divide-y divide-border-subtle -mx-2">
                  {pinnedFull.map((p) => (
                    <div
                      key={p.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate(`/board/${p.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          navigate(`/board/${p.id}`);
                        }
                      }}
                      className="group flex items-center justify-between gap-3 px-2 py-2.5 rounded-lg hover:bg-muted/40 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                          <FolderKanban className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">{p.name}</p>
                            <StatusPill status={p.status} />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {p.memberCount} member{p.memberCount !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                      <PinButton projectId={p.id} pinned size="icon" onChanged={() => refetchPinned()} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Projects */}
          <Card className="border-border">
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
              <div>
                <CardTitle className="text-sm font-semibold font-display">Recent Projects</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Your latest work and collaborations.</p>
              </div>
              {projects && projects.length > 0 && (
                <button
                  onClick={() => navigate("/projects")}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  View all
                </button>
              )}
            </CardHeader>
            <CardContent className="pt-0">
              {projectsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <SkeletonTableRow key={i} />
                  ))}
                </div>
              ) : recentProjects.length > 0 ? (
                <div className="divide-y divide-border-subtle -mx-2">
                  {recentProjects.slice(0, 5).map((p) => (
                    <div
                      key={p.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate(`/board/${p.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          navigate(`/board/${p.id}`);
                        }
                      }}
                      className="group flex items-center justify-between gap-3 px-2 py-2.5 rounded-lg hover:bg-muted/40 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                          <FolderKanban className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">{p.name}</p>
                            <StatusPill status={p.status} />
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <MemberStack members={p.members} />
                            <span>{p.memberCount} member{p.memberCount !== 1 ? "s" : ""}</span>
                            <span className="text-muted-foreground/40">·</span>
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {timeAgo(p.updatedAt) || "Recently"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <PinButton
                          projectId={p.id}
                          pinned={pinnedIds.has(p.id)}
                          onChanged={() => refetchPinned()}
                        />
                        <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-foreground transition-colors" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <div className="w-11 h-11 mx-auto mb-3 rounded-lg bg-muted flex items-center justify-center">
                    <FolderKanban className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <h3 className="text-sm font-medium mb-1">No projects yet</h3>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto mb-4">
                    Create your first project to start collaborating.
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <Button size="sm" onClick={() => navigate("/projects")} className="bg-primary text-primary-foreground hover:bg-accent-hover">
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Create Project
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => navigate("/feed")}>
                      Explore Feed
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Right panel ── */}
        <aside className="space-y-4 lg:sticky lg:top-20">
          <Button
            onClick={() => navigate("/projects?new=1")}
            className="w-full bg-primary text-primary-foreground hover:bg-accent-hover h-9"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            New Project
          </Button>

          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1.5">
                <h3 className="text-[13px] font-medium text-foreground">Stay in the loop</h3>
                <Network className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Collaborate, get feedback, and ship faster with your network.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/network")}
                className="w-full h-8 text-xs"
              >
                Explore Network
                <ArrowRight className="w-3 h-3 ml-1.5" />
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4">
              <h3 className="text-[13px] font-medium text-foreground mb-2">Quick Actions</h3>
              <div className="space-y-0.5 -mx-1">
                {quickActions.map((a) => (
                  <button
                    key={a.label}
                    onClick={() => navigate(a.to)}
                    className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors text-left"
                  >
                    <a.icon className="w-3.5 h-3.5 shrink-0" />
                    {a.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
