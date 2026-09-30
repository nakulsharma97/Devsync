import { ArrowRight, FolderKanban, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SkeletonTableRow } from "@/components/Skeletons";
import { ProjectCard } from "@/components/dashboard/ProjectCard";
import type { ProjectDto } from "@/services/projectService";

interface RecentProjectsProps {
  projects: ProjectDto[];
  loading: boolean;
  pinnedIds: Set<string>;
  onOpen: (project: ProjectDto) => void;
  onTogglePin: (project: ProjectDto) => void;
  onViewAll: () => void;
  onCreate: () => void;
  onExploreFeed: () => void;
}

/** "Recent Projects" panel: header, project rows, loading and empty states. */
export function RecentProjects({
  projects,
  loading,
  pinnedIds,
  onOpen,
  onTogglePin,
  onViewAll,
  onCreate,
  onExploreFeed,
}: RecentProjectsProps) {
  return (
    <Card className="gap-0 rounded-[15px] border-border bg-card p-6 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="font-display text-[19px] font-bold tracking-tight text-foreground">
            Recent Projects
          </h2>
          <p className="mt-1.5 text-[14px] text-muted-foreground">
            Your latest work and collaborations.
          </p>
        </div>
        {projects.length > 0 && (
          <button
            onClick={onViewAll}
            className="inline-flex shrink-0 items-center gap-2 rounded-[10px] px-2.5 py-1.5 text-[14px] font-semibold text-tint-warm-fg transition-colors hover:bg-tint-warm-tile"
          >
            View all
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mt-5">
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonTableRow key={i} />
            ))}
          </div>
        ) : projects.length > 0 ? (
          <div className="space-y-3">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                pinned={pinnedIds.has(project.id)}
                onOpen={() => onOpen(project)}
                onTogglePin={() => onTogglePin(project)}
              />
            ))}
          </div>
        ) : (
          <div className="py-10 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-[14px] bg-tint-warm-tile text-tint-warm-fg">
              <FolderKanban className="h-6 w-6" strokeWidth={1.9} />
            </div>
            <h3 className="text-[15px] font-semibold text-foreground">No projects yet</h3>
            <p className="mx-auto mt-1.5 max-w-xs text-[13px] text-muted-foreground">
              Create your first project to start collaborating.
            </p>
            <div className="mt-5 flex items-center justify-center gap-2">
              <Button onClick={onCreate} className="h-12 rounded-[12px] px-5 text-[14px] font-semibold">
                <Plus className="h-[18px] w-[18px]" />
                Create Project
              </Button>
              <Button
                variant="outline"
                onClick={onExploreFeed}
                className="h-12 rounded-[12px] border-border px-5 text-[14px] font-medium"
              >
                Explore Feed
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

export default RecentProjects;
