import { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowRight, Bell, FolderKanban, MessageSquare, Plus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/hooks/useApi";
import { projectService, type ProjectDto } from "@/services/projectService";
import { notificationService } from "@/services/notificationService";
import { pinnedProjectService } from "@/services/pinnedProjectService";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Button } from "@/components/ui/button";
import { getErrorMessage } from "@/lib/utils";
import { DashboardGreeting } from "@/components/dashboard/DashboardGreeting";
import { UpgradeBanner } from "@/components/dashboard/UpgradeBanner";
import { StatCard } from "@/components/dashboard/StatCard";
import { PinnedProjects } from "@/components/dashboard/PinnedProjects";
import { RecentProjects } from "@/components/dashboard/RecentProjects";
import { NetworkCard } from "@/components/dashboard/NetworkCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { defaultQuickActions } from "@/components/dashboard/navigation";

/** How many projects the Recent Projects panel lists. */
const RECENT_LIMIT = 5;

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

  const openProject = (project: ProjectDto) => navigate(`/board/${project.id}`);

  const togglePin = async (project: ProjectDto) => {
    try {
      if (pinnedIds.has(project.id)) {
        await pinnedProjectService.unpin(project.id);
      } else {
        await pinnedProjectService.pin(project.id);
      }
      refetchPinned();
    } catch (err) {
      toast.error(getErrorMessage(err, "Unable to update pin."));
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1400px]">
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_336px]">
        {/* ── Main column ── */}
        <div className="min-w-0 space-y-6">
          <DashboardGreeting firstName={firstName} isAdmin={isAdmin} />

          {isFree && !bannerDismissed && (
            <UpgradeBanner
              onUpgrade={() => navigate("/settings/billing")}
              onLearnMore={() => navigate("/settings/billing")}
              onDismiss={() => setBannerDismissed(true)}
            />
          )}

          {/* Summary cards */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              icon={FolderKanban}
              label="Projects"
              to="/projects"
              tone="warm"
              linkable
              onOpen={navigate}
              loading={projectsLoading}
              value={projects?.length ?? null}
              sub="Total projects"
            />
            <StatCard
              icon={Bell}
              label="Notifications"
              to="/notifications"
              tone="blue"
              onOpen={navigate}
              loading={unreadCount === null}
              value={unreadCount}
              sub={unreadCount !== null && unreadCount > 0 ? "Unread" : "All caught up"}
            />
            <StatCard
              icon={MessageSquare}
              label="Messages"
              to="/messages"
              tone="green"
              onOpen={navigate}
              main={
                <p className="font-display text-[15px] font-semibold leading-snug text-foreground">
                  Team chats &amp; DMs
                </p>
              }
              sub={
                <span className="inline-flex items-center gap-2 font-semibold text-tint-green-fg">
                  Open
                  <ArrowRight className="h-4 w-4" />
                </span>
              }
            />
          </div>

          <PinnedProjects projects={pinnedFull} onOpen={openProject} onChanged={refetchPinned} />

          <RecentProjects
            projects={recentProjects.slice(0, RECENT_LIMIT)}
            loading={projectsLoading}
            pinnedIds={pinnedIds}
            onOpen={openProject}
            onTogglePin={togglePin}
            onViewAll={() => navigate("/projects")}
            onCreate={() => navigate("/projects")}
            onExploreFeed={() => navigate("/feed")}
          />
        </div>

        {/* ── Right column ── */}
        {/* 114px = shell header (82px) + main top padding (32px) at xl */}
        <aside className="space-y-5 xl:sticky xl:top-[114px]">
          <Button
            onClick={() => navigate("/projects?new=1")}
            className="h-12 w-full rounded-[12px] text-[15px] font-semibold"
          >
            <Plus className="h-[18px] w-[18px]" />
            New Project
          </Button>

          <NetworkCard onExplore={() => navigate("/network")} />
          <QuickActions actions={defaultQuickActions} onOpen={(to) => navigate(to)} />
        </aside>
      </div>
    </div>
  );
}
