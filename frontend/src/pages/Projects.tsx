import { useState } from "react";
import { useNavigate } from "react-router";
import { useApi } from "@/hooks/useApi";
import {
  projectService,
  type InvitationDto,
  type ProjectDto,
} from "@/services/projectService";
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
import { SkeletonProjectCard } from "@/components/Skeletons";
import { StatusPill } from "@/components/StatusPill";
import { MemberStack } from "@/components/MemberStack";
import { PinButton } from "@/components/PinButton";
import { pinnedProjectService } from "@/services/pinnedProjectService";
import { timeAgo } from "@/lib/format";
import { getErrorMessage, getFeatureLimitError } from "@/lib/utils";
import {
  Plus,
  FolderKanban,
  Loader2,
  MessageSquare,
  Clock,
  ArrowUpRight,
  Globe,
  Lock,
  UserPlus,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const projectGradients = [
  "from-primary to-primary",
  "from-primary to-primary",
  "from-accent to-primary",
  "from-primary to-primary",
  "from-accent to-primary",
];

type Visibility = "PRIVATE" | "PUBLIC";

type Template = "" | "SPRINT_BOARD" | "BUG_TRACKER" | "FEATURE_BACKLOG";

const TEMPLATES: { code: Template; label: string; hint: string }[] = [
  { code: "", label: "Blank", hint: "Start from scratch — no board yet" },
  { code: "SPRINT_BOARD", label: "Sprint Board", hint: "To Do · In Progress · In Review · Done" },
  { code: "BUG_TRACKER", label: "Bug Tracker", hint: "Triage · In Progress · Fixed · Verified" },
  { code: "FEATURE_BACKLOG", label: "Feature Backlog", hint: "Backlog · Ready · In Progress · Done" },
];

export default function Projects() {
  const navigate = useNavigate();
  const { data: projects, loading, refetch } = useApi(() =>
    projectService.getMyProjects()
  );
  const {
    data: invitations,
    loading: invitesLoading,
    refetch: refetchInvitations,
  } = useApi(() => projectService.getMyInvitations());
  const { data: pinnedProjects, refetch: refetchPinned } = useApi(() =>
    pinnedProjectService.getPinned()
  );
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("PRIVATE");
  const [template, setTemplate] = useState<Template>("");
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [creating, setCreating] = useState(false);
  const [respondingInviteId, setRespondingInviteId] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      // Validate URL format only if a value is provided
      if (repositoryUrl.trim()) {
        try {
          new URL(repositoryUrl.trim());
        } catch {
          toast.error("Please enter a valid URL (e.g. https://github.com/user/repo)");
          setCreating(false);
          return;
        }
      }
      const created = await projectService.createProject({
        name: name.trim(),
        description: description.trim() || undefined,
        visibility,
        template: template || undefined,
        repositoryUrl: repositoryUrl.trim() || undefined,
      });
      toast("Project created!");
      setOpen(false);
      setName("");
      setDescription("");
      setVisibility("PRIVATE");
      setTemplate("");
      setRepositoryUrl("");
      refetch();
      // Open the new project workspace.
      navigate(`/projects/${created.id}`);
    } catch (err: unknown) {
      const limitErr = getFeatureLimitError(err);
      if (limitErr?.code === "PRIVATE_PROJECT_LIMIT") {
        toast.error(limitErr.message, {
          description: "Upgrade to Pro for more private projects.",
          action: {
            label: "Upgrade",
            onClick: () => navigate("/settings/billing"),
          },
        });
      } else {
        toast(getErrorMessage(err, "Failed to create project"));
      }
    } finally {
      setCreating(false);
    }
  };

  const handleInviteResponse = async (invitation: InvitationDto, accept: boolean) => {
    setRespondingInviteId(invitation.id);
    try {
      if (accept) {
        await projectService.acceptInvitation(invitation.id);
        toast(`You joined ${invitation.projectName}`);
      } else {
        await projectService.declineInvitation(invitation.id);
        toast("Invitation declined");
      }
      refetchInvitations();
      refetch();
    } catch (err: unknown) {
      toast(getErrorMessage(err, accept ? "Failed to accept invitation" : "Failed to decline invitation"));
    } finally {
      setRespondingInviteId(null);
    }
  };

  const pendingInvitations = (invitations ?? []).filter((i) => i.status === "PENDING");

  // projectId → pinned state
  const pinnedIds = new Set((pinnedProjects ?? []).map((p) => p.projectId));
  const togglePin = (projectId: string, pinned: boolean) => {
    refetchPinned();
    // No-op: list re-renders from server truth on next refetch.
    void pinned;
  };

  return (
    <div className="relative w-full min-w-0 max-w-6xl space-y-6 overflow-hidden">
      {/* Decorative glows (clipped to the page so they never create a scrollbar) */}
      <div className="absolute -top-24 -right-24 w-80 h-80 bg-gradient-to-bl from-primary/[0.06] to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-gradient-to-tr from-accent/[0.05] to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="relative flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-primary" />
            Projects
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your development projects
          </p>
          {projects && (
            <p className="text-xs text-muted-foreground/70 mt-2 inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              {projects.length} total
              <span className="text-muted-foreground/40">·</span>
              {projects.filter((p) => p.status === "ACTIVE").length} active
            </p>
          )}
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="relative overflow-hidden group bg-primary text-white hover:bg-primary/90 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200">
              <Plus className="w-4 h-4 mr-1.5" />
              New Project
              <span
                aria-hidden
                className=""
              />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            {/* sticky header: stays visible while the form scrolls inside the dialog */}
            <DialogHeader className="sticky top-0 z-10 bg-background -mb-4 pb-4">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 mb-3">
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
                  className="min-h-[84px] w-full resize-none text-sm bg-transparent border border-border/40 rounded-lg p-3 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground/50 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="project-repo" className="text-xs">
                  Repository URL (optional)
                </Label>
                <Input
                  id="project-repo"
                  type="url"
                  placeholder="https://github.com/username/repository"
                  value={repositoryUrl}
                  onChange={(e) => setRepositoryUrl(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Visibility</Label>
                <div className="grid grid-cols-2 gap-2">
                  <VisibilityOption
                    active={visibility === "PRIVATE"}
                    onClick={() => setVisibility("PRIVATE")}
                    icon={<Lock className="w-4 h-4" />}
                    title="Private"
                    hint="Only invited members can access"
                  />
                  <VisibilityOption
                    active={visibility === "PUBLIC"}
                    onClick={() => setVisibility("PUBLIC")}
                    icon={<Globe className="w-4 h-4" />}
                    title="Public"
                    hint="Anyone can discover and request to join"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Template</Label>
                <div className="grid grid-cols-2 gap-2">
                  {TEMPLATES.map((t) => (
                    <button
                      key={t.code || "blank"}
                      type="button"
                      onClick={() => setTemplate(t.code)}
                      aria-pressed={template === t.code}
                      className={cn(
                        "text-left rounded-xl border p-3 transition-all",
                        template === t.code
                          ? "border-primary/50 bg-primary/[0.08] ring-2 ring-primary/20"
                          : "border-border/40 hover:border-border/70 bg-transparent"
                      )}
                    >
                      <span
                        className={cn(
                          "text-sm font-medium",
                          template === t.code ? "text-primary dark:text-primary" : "text-foreground"
                        )}
                      >
                        {t.label}
                      </span>
                      <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{t.hint}</p>
                    </button>
                  ))}
                </div>
              </div>
              <Button
                type="submit"
                disabled={creating || !name.trim()}
                className="w-full bg-primary text-white hover:from-primary hover:to-primary"
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

      {/* Pending invitations */}
      {!invitesLoading && pendingInvitations.length > 0 && (
        <div className="relative rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.07] to-primary/[0.04] p-4">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <UserPlus className="w-4 h-4 text-primary" />
            Project invitations
          </h3>
          <div className="space-y-2">
            {pendingInvitations.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center gap-3 bg-card/70 border border-border/40 rounded-xl p-3"
              >
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/20 to-primary/20 flex items-center justify-center shrink-0 overflow-hidden">
                  {inv.senderAvatar ? (
                    <img src={inv.senderAvatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs font-bold text-primary">
                      {inv.senderName?.charAt(0) || "?"}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {inv.senderName} invited you to{" "}
                    <span className="text-primary">{inv.projectName}</span>
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {inv.message || "Join this project and start collaborating"}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    disabled={respondingInviteId === inv.id}
                    onClick={() => handleInviteResponse(inv, true)}
                    className="text-xs"
                  >
                    {respondingInviteId === inv.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5 mr-1" />
                    )}
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={respondingInviteId === inv.id}
                    onClick={() => handleInviteResponse(inv, false)}
                    className="text-xs"
                  >
                    <X className="w-3.5 h-3.5 mr-1" />
                    Decline
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="relative grid w-full min-w-0 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonProjectCard key={i} />
          ))}
        </div>
      ) : projects && projects.length > 0 ? (
        <div className="relative grid w-full min-w-0 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((project, index) => (
            <ProjectCard
              key={project.id}
              project={project}
              index={index}
              pinned={pinnedIds.has(project.id)}
              onTogglePin={(pinned) => togglePin(project.id, pinned)}
              onOpen={() => navigate(`/projects/${project.id}`)}
              onBoard={() => navigate(`/board/${project.id}`)}
              onChat={() => navigate("/messages")}
            />
          ))}
        </div>
      ) : (
        <div className="relative text-center py-16 bg-card rounded-2xl border border-border/40">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/10 flex items-center justify-center ring-1 ring-primary/20">
            <FolderKanban className="w-7 h-7 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-5">
            Create your first project to start collaborating with your team.
          </p>
          <Button
            onClick={() => setOpen(true)}
            className="bg-primary text-white hover:from-primary hover:to-primary"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Create your first project
          </Button>
        </div>
      )}
    </div>
  );
}

function VisibilityOption({
  active,
  onClick,
  icon,
  title,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "text-left rounded-xl border p-3 transition-all",
        active
          ? "border-primary/50 bg-primary/[0.08] ring-2 ring-primary/20"
          : "border-border/40 hover:border-border/70 bg-transparent"
      )}
    >
      <div className="flex items-center gap-2">
        <span className={cn("w-8 h-8 rounded-lg flex items-center justify-center", active ? "bg-primary/15 text-primary" : "bg-muted/60 text-muted-foreground")}>
          {icon}
        </span>
        <span className={cn("text-sm font-medium", active ? "text-primary dark:text-primary" : "text-foreground")}>
          {title}
        </span>
      </div>
      <p className="text-[11px] text-muted-foreground mt-1.5 leading-snug">{hint}</p>
    </button>
  );
}

// ── Project Card ──────────────────────────────────────────

function ProjectCard({
  project,
  index,
  pinned,
  onTogglePin,
  onOpen,
  onBoard,
  onChat,
}: {
  project: ProjectDto;
  index: number;
  pinned: boolean;
  onTogglePin: (pinned: boolean) => void;
  onOpen: () => void;
  onBoard: () => void;
  onChat: () => void;
}) {
  const isPublic = project.visibility === "PUBLIC";
  return (
    <Card
      onClick={onOpen}
      className="group @container relative min-w-0 overflow-hidden border-border/40 hover:border-primary/30 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 cursor-pointer animate-fade-in-up"
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      {/* Hover tint */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

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
              <CardTitle className="text-sm font-semibold truncate group-hover:text-primary dark:group-hover:text-primary transition-colors">
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
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <div className="flex items-center gap-1">
              <StatusPill status={project.status} />
              <PinButton projectId={project.id} pinned={pinned} onChanged={onTogglePin} />
            </div>
            <span
              className={cn(
                "inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border",
                isPublic
                  ? "text-accent dark:text-accent border-accent/25 bg-accent/[0.07]"
                  : "text-primary dark:text-primary border-primary/25 bg-primary/[0.07]"
              )}
            >
              {isPublic ? <Globe className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
              {isPublic ? "Public" : "Private"}
            </span>
          </div>
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

      <CardContent className="relative mt-auto flex flex-col gap-2 pt-1 pb-4 @min-[22.5rem]:flex-row @min-[22.5rem]:flex-wrap">
        {/*
          Actions adapt to the CARD width (container query), not the viewport:
          wide cards show all three in a row, narrower cards stack
          [Open Project] over [Board] [Team Chat]. Buttons never clip.
        */}
        <Button
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
          className="w-full text-xs bg-primary text-white hover:from-primary hover:to-primary shadow-sm @min-[22.5rem]:flex-1 @min-[22.5rem]:min-w-[7rem]"
        >
          <ArrowUpRight className="w-3 h-3" />
          Open Project
        </Button>
        <div className="flex gap-2 @min-[22.5rem]:flex-1 @min-[22.5rem]:min-w-[11rem]">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onBoard();
            }}
            className="flex-1 text-xs"
            title="Open Kanban board"
          >
            <FolderKanban className="w-3 h-3" />
            Board
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onChat();
            }}
            className="flex-1 text-xs"
            title="Open team chat"
          >
            <MessageSquare className="w-3 h-3" />
            Team Chat
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
