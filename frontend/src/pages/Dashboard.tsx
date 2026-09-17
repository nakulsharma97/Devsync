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
  ChevronRight,
  Clock,
  Pin,
  X,
  type LucideIcon,
} from "lucide-react";
import { useNavigate } from "react-router";

// ─── Helpers ─────────────────────────────────────────────

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
  index,
}: {
  icon: LucideIcon;
  label: string;
  to: string;
  loading: boolean;
  value?: number | null;
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
      className="group border-border hover:border-primary/40 transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
              <Icon className="w-4 h-4 text-primary" />
            </div>
            <CardTitle className="text-sm font-medium font-display">{label}</CardTitle>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </CardHeader>
      <CardContent>
        {main ?? (
          loading || value === null ? (
            <Skeleton className="h-7 w-12 mb-1" />
          ) : (
            <p className="text-2xl font-bold tabular-nums tracking-tight font-display">{display}</p>
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

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-xl font-semibold text-foreground">{firstName}</h1>
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
            {todayLabel}
            {isAdmin && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary">
                Admin
              </span>
            )}
          </p>
        </div>
        <Button
          onClick={() => navigate("/projects")}
          className="bg-primary text-primary-foreground hover:bg-primary/90 h-9"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          New Project
        </Button>
      </div>

      {/* Upgrade banner */}
      {isFree && !bannerDismissed && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border bg-card">
          <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">You're on the Free plan</p>
            <p className="text-xs text-muted-foreground">Upgrade for more private projects and storage.</p>
          </div>
          <button
            onClick={() => navigate("/settings/billing")}
            className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Upgrade
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

      {/* Stat cards */}
      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard
          index={0}
          icon={FolderKanban}
          label="Projects"
          to="/projects"
          loading={projectsLoading}
          value={projects?.length ?? null}
          sub="Total projects"
        />
        <StatCard
          index={1}
          icon={Bell}
          label="Notifications"
          to="/notifications"
          loading={unreadCount === null}
          value={unreadCount}
          sub={unreadCount !== null && unreadCount > 0 ? "Unread" : "All caught up"}
        />
        <StatCard
          index={2}
          icon={MessageSquare}
          label="Messages"
          to="/messages"
          loading={false}
          main={<p className="text-sm text-muted-foreground">Team chats & DMs</p>}
          sub={
            <span className="inline-flex items-center gap-1 text-primary font-medium">
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
            <button
              onClick={() => navigate("/projects")}
              className="text-xs text-primary hover:text-primary/80 transition-colors"
            >
              View all →
            </button>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
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
                  className="group flex items-center justify-between gap-3 p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                      <FolderKanban className="w-4 h-4 text-primary" />
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
          <CardTitle className="text-sm font-semibold font-display flex items-center gap-2">
            <FolderKanban className="w-3.5 h-3.5 text-muted-foreground" />
            Recent Projects
          </CardTitle>
          {projects && projects.length > 0 && (
            <button
              onClick={() => navigate("/projects")}
              className="text-xs text-primary hover:text-primary/80 transition-colors"
            >
              View all →
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
            <div className="space-y-2">
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
                  className="group flex items-center justify-between gap-3 p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                      <FolderKanban className="w-4 h-4 text-primary" />
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
                    <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-primary/10 flex items-center justify-center">
                <FolderKanban className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-display text-sm font-semibold mb-1">No projects yet</h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto mb-4">
                Create your first project to start collaborating.
              </p>
              <div className="flex items-center justify-center gap-2">
                <Button size="sm" onClick={() => navigate("/projects")} className="bg-primary text-primary-foreground">
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
  );
}
