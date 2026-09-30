import { Clock, FolderOpen, MoreVertical, Pin, PinOff, Users } from "lucide-react";
import { StatusPill } from "@/components/StatusPill";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { timeAgo } from "@/lib/format";
import type { ProjectDto } from "@/services/projectService";

interface ProjectCardProps {
  project: ProjectDto;
  pinned: boolean;
  onOpen: () => void;
  onTogglePin: () => void;
}

/** One project row in the Recent Projects list. */
export function ProjectCard({ project, pinned, onOpen, onTogglePin }: ProjectCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className="group flex min-h-[138px] cursor-pointer items-center gap-5 rounded-[14px] border border-border bg-surface-inner p-[18px] outline-none transition-colors hover:border-muted-foreground/30 focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="flex h-[78px] w-[78px] shrink-0 items-center justify-center rounded-[14px] bg-tint-warm-tile text-tint-warm-fg">
        <FolderOpen className="h-8 w-8" strokeWidth={1.8} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-3">
          <p className="truncate font-display text-[18px] font-bold tracking-tight text-foreground">
            {project.name}
          </p>
          <StatusPill status={project.status} size="md" />
        </div>

        {project.description && (
          <p className="mt-2 truncate text-[14px] text-muted-foreground">{project.description}</p>
        )}

        <div className="mt-3 flex items-center gap-[18px] text-[13px] text-muted-foreground">
          <span className="inline-flex min-w-0 items-center gap-2">
            <Users className="h-4 w-4 shrink-0" strokeWidth={1.8} />
            {project.memberCount} member{project.memberCount === 1 ? "" : "s"}
          </span>
          <span className="inline-flex shrink-0 items-center gap-2">
            <Clock className="h-4 w-4" strokeWidth={1.8} />
            {timeAgo(project.updatedAt) || "Recently"}
          </span>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            aria-label={`${project.name} options`}
            onClick={(e) => e.stopPropagation()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={onOpen}>Open project</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onTogglePin}>
            {pinned ? (
              <>
                <PinOff /> Unpin project
              </>
            ) : (
              <>
                <Pin /> Pin project
              </>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default ProjectCard;
