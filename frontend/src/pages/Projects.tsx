import { useState } from "react";
import { useNavigate } from "react-router";
import { useApi } from "@/hooks/useApi";
import { projectService, type ProjectDto } from "@/services/projectService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SkeletonCardList } from "@/components/Skeletons";
import { StatusPill } from "@/components/StatusPill";
import { MemberStack } from "@/components/MemberStack";
import { timeAgo } from "@/lib/format";
import { getErrorMessage } from "@/lib/utils";
import {
  Plus,
  FolderKanban,
  Loader2,
  MessageSquare,
  Clock,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";

const projectGradients = [
  "from-indigo-500 to-purple-600",
  "from-blue-500 to-cyan-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-amber-600",
  "from-pink-500 to-rose-600",
];

export default function Projects() {
  const navigate = useNavigate();
  const { data: projects, loading, refetch } = useApi(() =>
    projectService.getMyProjects()
  );
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      await projectService.createProject({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      toast("Project created!");
      setOpen(false);
      setName("");
      setDescription("");
      refetch();
    } catch (err: unknown) {
      toast(getErrorMessage(err, "Failed to create project"));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="relative space-y-6 max-w-6xl">
      {/* Decorative glows */}
      <div className="absolute -top-24 -right-24 w-80 h-80 bg-gradient-to-bl from-indigo-500/[0.06] to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-gradient-to-tr from-purple-500/[0.05] to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-indigo-400" />
            Projects
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your development projects
          </p>
          {projects && (
            <p className="text-xs text-muted-foreground/70 mt-2 inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
              {projects.length} total
              <span className="text-muted-foreground/40">·</span>
              {projects.filter((p) => p.status === "ACTIVE").length} active
            </p>
          )}
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="relative overflow-hidden group bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
              <Plus className="w-4 h-4 mr-1.5" />
              New Project
              <span
                aria-hidden
                className="animate-shine-sweep absolute top-0 bottom-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none"
              />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-3">
                <FolderKanban className="w-6 h-6 text-white" />
              </div>
              <DialogTitle className="text-center">Create a new project</DialogTitle>
              <DialogDescription className="text-center">
                Set up a workspace to start collaborating with your team.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="project-name" className="text-xs">
                  Project name
                </Label>
                <Input
                  id="project-name"
                  placeholder="e.g. DevSync Mobile App"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="project-desc" className="text-xs">
                  Description (optional)
                </Label>
                <textarea
                  id="project-desc"
                  placeholder="What is this project about?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[84px] w-full resize-none text-sm bg-transparent border border-border/40 rounded-lg p-3 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 placeholder:text-muted-foreground/50 transition-all"
                />
              </div>
              <Button
                type="submit"
                disabled={creating || !name.trim()}
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700"
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-1.5" />
                    Create Project
                  </>
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Content */}
      {loading ? (
        <SkeletonCardList count={6} />
      ) : projects && projects.length > 0 ? (
        <div className="relative grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project, index) => (
            <ProjectCard
              key={project.id}
              project={project}
              index={index}
              onOpen={() => navigate(`/board/${project.id}`)}
              onChat={() => navigate("/messages")}
            />
          ))}
        </div>
      ) : (
        <div className="relative text-center py-16 bg-card rounded-2xl border border-border/40">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-500/15 to-purple-500/10 flex items-center justify-center ring-1 ring-indigo-500/20">
            <FolderKanban className="w-7 h-7 text-indigo-400" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-5">
            Create your first project to start collaborating with your team.
          </p>
          <Button
            onClick={() => setOpen(true)}
            className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Create your first project
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Project Card ──────────────────────────────────────────

function ProjectCard({
  project,
  index,
  onOpen,
  onChat,
}: {
  project: ProjectDto;
  index: number;
  onOpen: () => void;
  onChat: () => void;
}) {
  return (
    <Card
      onClick={onOpen}
      className="group relative overflow-hidden border-border/40 hover:border-indigo-500/30 hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 cursor-pointer animate-fade-in-up"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      {/* Hover tint */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      <CardHeader className="pb-2 relative">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-xl bg-gradient-to-br ${
                projectGradients[index % projectGradients.length]
              } flex items-center justify-center shadow-md transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-3 shrink-0`}
            >
              <FolderKanban className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm font-semibold truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
                {project.name}
              </CardTitle>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                <MemberStack members={project.members} />
                <span>
                  {project.memberCount} member{project.memberCount !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          </div>
          <StatusPill status={project.status} />
        </div>

        {project.description && (
          <p className="text-xs text-muted-foreground mt-2.5 line-clamp-2 leading-relaxed">
            {project.description}
          </p>
        )}

        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60 mt-2">
          <Clock className="w-3 h-3" />
          Updated {timeAgo(project.updatedAt) || "Recently updated"}
        </div>
      </CardHeader>

      <CardContent className="flex gap-2 pt-1 pb-4 relative">
        <Button
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
          className="flex-1 text-xs bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 shadow-sm"
        >
          <ArrowUpRight className="w-3 h-3 mr-1" />
          Open Board
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => {
            e.stopPropagation();
            onChat();
          }}
          className="flex-1 text-xs"
        >
          <MessageSquare className="w-3 h-3 mr-1" />
          Team Chat
        </Button>
      </CardContent>
    </Card>
  );
}
