import { FolderKanban, Pin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PinButton } from "@/components/PinButton";
import { StatusPill } from "@/components/StatusPill";
import type { ProjectDto } from "@/services/projectService";

interface PinnedProjectsProps {
  projects: ProjectDto[];
  onOpen: (project: ProjectDto) => void;
  onChanged: () => void;
}

/** Compact list of pinned projects — pinned rows skip the description to stay scannable. */
export function PinnedProjects({ projects, onOpen, onChanged }: PinnedProjectsProps) {
  if (projects.length === 0) return null;

  return (
    <Card className="gap-0 rounded-[15px] border-border p-6 shadow-[var(--shadow-card)]">
      <h2 className="flex items-center gap-2 font-display text-[17px] font-bold tracking-tight text-foreground">
        <Pin className="h-[18px] w-[18px] text-muted-foreground" />
        Pinned
      </h2>

      <div className="mt-4 space-y-1">
        {projects.map((project) => (
          <div
            key={project.id}
            role="button"
            tabIndex={0}
            onClick={() => onOpen(project)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onOpen(project);
              }
            }}
            className="group flex cursor-pointer items-center justify-between gap-3 rounded-[12px] px-2 py-2.5 outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-tint-warm-tile text-tint-warm-fg">
                <FolderKanban className="h-5 w-5" strokeWidth={1.9} />
              </span>
              <span className="min-w-0">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-[14px] font-semibold text-foreground">
                    {project.name}
                  </span>
                  <StatusPill status={project.status} />
                </span>
                <span className="mt-0.5 block text-[12px] text-muted-foreground">
                  {project.memberCount} member{project.memberCount === 1 ? "" : "s"}
                </span>
              </span>
            </span>
            <PinButton
              projectId={project.id}
              pinned
              size="icon"
              onChanged={() => onChanged()}
            />
          </div>
        ))}
      </div>
    </Card>
  );
}

export default PinnedProjects;
