import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/contexts/AuthContext";
import { projectService, type InvitationDto, type ProjectDto } from "@/services/projectService";
import { boardService } from "@/services/boardService";
import { activityService, type ActivityDto } from "@/services/activityService";
import { attachmentService, type AttachmentDto } from "@/services/attachmentService";
import { teamRoomService } from "@/services/teamRoomService";
import { formatBytes, timeAgo } from "@/lib/format";
import { getErrorMessage } from "@/lib/utils";
import { StatusPill } from "@/components/StatusPill";
import { InviteMemberDialog } from "@/components/project/InviteMemberDialog";
import { ProjectChat } from "@/components/project/ProjectChat";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  ArrowUpRight,
  Activity as ActivityIcon,
  ClipboardList,
  FileText,
  FolderKanban,
  Globe,
  LayoutDashboard,
  Loader2,
  Lock,
  MessageSquare,
  MessagesSquare,
  Plus,
  Settings as SettingsIcon,
  Trash2,
  Upload,
  UserPlus,
  Users,
  AlertTriangle,
  Archive,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import BoardPage from "./BoardPage";

type TabId =
  | "overview"
  | "board"
  | "tasks"
  | "chat"
  | "files"
  | "members"
  | "activity"
  | "settings";

const TABS: { id: TabId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "board", label: "Board", icon: ClipboardList },
  { id: "tasks", label: "Tasks", icon: FileText },
  { id: "chat", label: "Team Chat", icon: MessagesSquare },
  { id: "files", label: "Files", icon: FolderKanban },
  { id: "members", label: "Members", icon: Users },
  { id: "activity", label: "Activity", icon: ActivityIcon },
  { id: "settings", label: "Settings", icon: SettingsIcon },
];

export default function ProjectWorkspace() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tab, setTab] = useState<TabId>("overview");
  const [inviteOpen, setInviteOpen] = useState(false);

  const { data: project, loading, error, refetch } = useApi(
    () => (projectId ? projectService.getProject(projectId) : Promise.reject(new Error("Missing project id"))),
    [projectId]
  );

  const isOwner = project?.ownerId === user?.id;
  const canManage = isOwner || project?.currentUserRole === "ADMIN";

  // ── Project-not-found / unauthorized states ─────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted/60 rounded-lg animate-pulse" />
        <div className="h-28 bg-muted/40 rounded-2xl animate-pulse" />
        <div className="grid sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-muted/40 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !project) {
    const isForbidden = /private|permission|access|denied/i.test(error || "");
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div
          className={cn(
            "w-14 h-14 rounded-2xl flex items-center justify-center mb-4",
            isForbidden ? "bg-amber-500/10 text-amber-500" : "bg-muted/50 text-muted-foreground"
          )}
        >
          {isForbidden ? <Lock className="w-6 h-6" /> : <FolderKanban className="w-6 h-6" />}
        </div>
        <h2 className="text-lg font-semibold mb-1">
          {isForbidden ? "You don't have access to this project" : "Project not found"}
        </h2>
        <p className="text-sm text-muted-foreground max-w-sm mb-5">
          {isForbidden
            ? "This project is private. Ask the owner for an invitation."
            : "This project doesn't exist or has been deleted."}
        </p>
        <Button variant="outline" size="sm" onClick={() => navigate("/projects")}>
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Back to Projects
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-6xl">
      {/* Header */}
      <div className="rounded-2xl border border-border/40 bg-card p-5 relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-gradient-to-bl from-indigo-500/[0.07] to-transparent rounded-full blur-3xl pointer-events-none" />
        <button
          onClick={() => navigate("/projects")}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Projects
        </button>

        <div className="flex items-start justify-between gap-4 flex-wrap relative">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold tracking-tight">{project.name}</h1>
              <StatusPill status={project.status} />
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border",
                  project.visibility === "PUBLIC"
                    ? "text-emerald-600 dark:text-emerald-400 border-emerald-500/25 bg-emerald-500/[0.07]"
                    : "text-amber-600 dark:text-amber-400 border-amber-500/25 bg-amber-500/[0.07]"
                )}
              >
                {project.visibility === "PUBLIC" ? (
                  <Globe className="w-2.5 h-2.5" />
                ) : (
                  <Lock className="w-2.5 h-2.5" />
                )}
                {project.visibility === "PUBLIC" ? "Public" : "Private"}
              </span>
            </div>
            {project.description && (
              <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl line-clamp-2">
                {project.description}
              </p>
            )}
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                {project.memberCount} member{project.memberCount !== 1 ? "s" : ""}
              </span>
              {project.ownerId && (
                <span>
                  Owner:{" "}
                  <span className="text-foreground font-medium">
                    {project.members.find((m) => m.userId === project.ownerId)?.fullName || "—"}
                  </span>
                </span>
              )}
              <span className="text-muted-foreground/60">
                Updated {timeAgo(project.updatedAt) || "recently"}
              </span>
            </div>
          </div>

          {canManage && (
            <div className="flex items-center gap-2 shrink-0">
              <Button size="sm" onClick={() => setInviteOpen(true)}>
                <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                Invite Member
              </Button>
              <Button
                size="sm"
                variant={tab === "settings" ? "default" : "outline"}
                onClick={() => setTab("settings")}
                aria-label="Project Settings"
              >
                <SettingsIcon className="w-3.5 h-3.5 mr-1.5" />
                Settings
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 -mx-1 px-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            aria-pressed={tab === id}
            className={cn(
              "shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all",
              tab === id
                ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/5"
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="min-h-[320px]">
        {tab === "overview" && (
          <OverviewTab project={project} onOpenBoard={() => setTab("board")} onOpenChat={() => setTab("chat")} onInvite={() => setInviteOpen(true)} canManage={canManage} />
        )}
        {tab === "board" && projectId && <BoardPage />}
        {tab === "tasks" && <TasksTab projectId={project.id} />}
        {tab === "chat" && <ChatTab project={project} />}
        {tab === "files" && <FilesTab projectId={project.id} />}
        {tab === "members" && (
          <MembersTab
            project={project}
            canManage={canManage}
            onInvite={() => setInviteOpen(true)}
            onChange={() => refetch()}
          />
        )}
        {tab === "activity" && <ActivityTab projectId={project.id} />}
        {tab === "settings" && (
          <SettingsTab
            project={project}
            canManage={canManage}
            onChanged={(next) => {
              refetch();
              toast(next ? "Project updated" : "Saved");
            }}
          />
        )}
      </div>

      <InviteMemberDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        projectId={project.id}
        projectName={project.name}
        members={project.members}
        onInvited={() => {
          // Refresh so the members tab shows up-to-date pending invitations.
          refetch();
        }}
      />
    </div>
  );
}

// ── Overview ───────────────────────────────────────────────

function OverviewTab({
  project,
  onOpenBoard,
  onOpenChat,
  onInvite,
  canManage,
}: {
  project: ProjectDto;
  onOpenBoard: () => void;
  onOpenChat: () => void;
  onInvite: () => void;
  canManage: boolean;
}) {
  const { data: board } = useApi(
    () => boardService.getProjectBoard(project.id),
    [project.id]
  );
  const { data: activityPage } = useApi(
    () => activityService.getProjectActivities(project.id, 0, 6),
    [project.id]
  );

  const totals = useMemo(() => {
    const columns = board?.columns ?? [];
    return {
      total: columns.reduce((sum, c) => sum + c.tasks.length, 0),
      byColumn: columns.map((c) => ({ name: c.name, count: c.tasks.length })),
      done: columns.find((c) => /done|completed/i.test(c.name))?.tasks.length ?? 0,
    };
  }, [board]);

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <QuickAction icon={<FolderKanban className="w-4 h-4" />} label="Open Board" onClick={onOpenBoard} />
        <QuickAction icon={<MessagesSquare className="w-4 h-4" />} label="Team Chat" onClick={onOpenChat} />
        {canManage && <QuickAction icon={<UserPlus className="w-4 h-4" />} label="Invite Member" onClick={onInvite} />}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Task summary */}
        <div className="rounded-xl border border-border/40 bg-card p-4">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <ClipboardList className="w-4 h-4 text-indigo-400" />
            Task Summary
          </h3>
          {!board ? (
            <p className="text-xs text-muted-foreground py-4">
              No board yet — open the Board tab to create one.
            </p>
          ) : (
            <div className="space-y-2.5">
              {totals.byColumn.map((c) => (
                <div key={c.name} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{c.name}</span>
                  <span className="font-medium">{c.count}</span>
                </div>
              ))}
              <div className="border-t border-border/40 pt-2.5 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total tasks</span>
                <span className="font-semibold">{totals.total}</span>
              </div>
            </div>
          )}
        </div>

        {/* Members preview */}
        <div className="rounded-xl border border-border/40 bg-card p-4">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-indigo-400" />
            Members ({project.memberCount})
          </h3>
          <div className="space-y-2">
            {project.members.slice(0, 6).map((m) => (
              <div key={m.userId} className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center shrink-0 overflow-hidden">
                  {m.avatarUrl ? (
                    <img src={m.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[10px] font-bold text-indigo-400">
                      {m.fullName?.charAt(0) || "?"}
                    </span>
                  )}
                </div>
                <span className="text-sm font-medium truncate flex-1">{m.fullName}</span>
                <span
                  className={cn(
                    "text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full",
                    m.role === "OWNER"
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      : m.role === "ADMIN"
                        ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                        : "bg-muted/60 text-muted-foreground"
                  )}
                >
                  {m.role}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div className="rounded-xl border border-border/40 bg-card p-4">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <ActivityIcon className="w-4 h-4 text-indigo-400" />
            Recent Activity
          </h3>
          {!activityPage?.content || activityPage.content.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4">No activity yet.</p>
          ) : (
            <div className="space-y-2.5">
              {activityPage.content.slice(0, 5).map((a) => (
                <div key={a.id} className="flex gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs truncate">{a.title}</p>
                    <p className="text-[10px] text-muted-foreground/70">
                      {a.user?.fullName || "Someone"} · {timeAgo(a.createdAt, "")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function QuickAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2.5 rounded-xl border border-border/40 bg-card p-3.5 text-sm font-medium hover:border-indigo-500/30 hover:bg-indigo-500/[0.03] transition-all text-left group"
    >
      <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500/15 to-purple-500/10 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
        {icon}
      </span>
      {label}
      <ArrowUpRight className="w-3.5 h-3.5 ml-auto text-muted-foreground/40 group-hover:text-indigo-400 transition-colors" />
    </button>
  );
}

// ── Tasks ──────────────────────────────────────────────────

function TasksTab({ projectId }: { projectId: string }) {
  const { data: board, loading, refetch } = useApi(
    () => boardService.getProjectBoard(projectId),
    [projectId]
  );

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-14 bg-muted/40 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!board) {
    return (
      <div className="text-center py-12 rounded-xl border border-border/40 bg-card">
        <ClipboardList className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground mb-4">No tasks yet</p>
        <Button
          size="sm"
          onClick={async () => {
            try {
              await boardService.createBoard("Board", projectId, ["To Do", "In Progress", "Done"]);
              refetch();
              toast("Board created!");
            } catch {
              toast("Failed to create board");
            }
          }}
        >
          <Plus className="w-3.5 h-3.5 mr-1" /> Create Board
        </Button>
      </div>
    );
  }

  const tasks = board.columns.flatMap((col) =>
    col.tasks.map((t) => ({ ...t, columnName: col.name }))
  );

  return (
    <div className="rounded-xl border border-border/40 bg-card divide-y divide-border/30">
      {tasks.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-12">No tasks in this project yet.</p>
      ) : (
        tasks.map((t) => (
          <div key={t.id} className="flex items-center gap-3 p-3.5">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{t.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                <span
                  className={cn(
                    "text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-full",
                    /done|completed/i.test(t.columnName)
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : /progress/i.test(t.columnName)
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        : "bg-muted/60 text-muted-foreground"
                  )}
                >
                  {t.columnName}
                </span>
                {t.assigneeName && <span>Assigned to {t.assigneeName}</span>}
              </p>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ── Team Chat ──────────────────────────────────────────────

function ChatTab({ project }: { project: ProjectDto }) {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const ensureRoom = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const room = await teamRoomService.getOrCreateProjectRoom(project.id);
      setRoomId(room.id);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to open team chat"));
    } finally {
      setLoading(false);
    }
  }, [project.id]);

  useEffect(() => {
    ensureRoom();
  }, [ensureRoom]);

  if (loading) {
    return (
      <div className="h-[360px] rounded-xl border border-border/40 bg-card flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error || !roomId) {
    return (
      <div className="text-center py-12 rounded-xl border border-border/40 bg-card">
        <MessageSquare className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground mb-4">{error || "Could not open team chat"}</p>
        <Button size="sm" variant="outline" onClick={ensureRoom}>
          Retry
        </Button>
      </div>
    );
  }

  return <ProjectChat roomId={roomId} />;
}

// ── Files ──────────────────────────────────────────────────

function FilesTab({ projectId }: { projectId: string }) {
  const { data: files, loading, refetch } = useApi(
    () => attachmentService.listByProject(projectId),
    [projectId]
  );
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      // Files land in the team chat as a message attachment, and are also
      // listed in the project's Files tab.
      const room = await teamRoomService.getOrCreateProjectRoom(projectId);
      await attachmentService.upload(file, room.id, projectId);
      toast(`${file.name} uploaded`);
      refetch();
    } catch (err: unknown) {
      toast(getErrorMessage(err, "Upload failed"));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="rounded-xl border border-border/40 bg-card">
      <div className="flex items-center justify-between p-4 border-b border-border/40">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <FolderKanban className="w-4 h-4 text-indigo-400" />
          Project Files
        </h3>
        <label className="cursor-pointer">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
            }}
          />
          <Button size="sm" disabled={uploading} asChild={false} onClick={() => fileInputRef.current?.click()}>
            {uploading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5 mr-1" />
            )}
            {uploading ? "Uploading…" : "Upload File"}
          </Button>
        </label>
      </div>

      <div className="p-2">
        {loading ? (
          <div className="space-y-2 p-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-12 bg-muted/40 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : !files || files.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-12">
            No files shared in this project yet. Share files in the team chat — they appear here.
          </p>
        ) : (
          <div className="space-y-1">
            {files.map((file) => (
              <FileRow key={file.id} file={file} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FileRow({ file }: { file: AttachmentDto }) {
  const [downloading, setDownloading] = useState(false);
  const handleDownload = async () => {
    setDownloading(true);
    try {
      const blob = await attachmentService.downloadBlob(file.url);
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = file.fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      toast("Failed to download file");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent/5 transition-colors">
      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500/15 to-purple-500/10 flex items-center justify-center shrink-0">
        <FileText className="w-4 h-4 text-indigo-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{file.fileName}</p>
        <p className="text-[11px] text-muted-foreground">
          {file.uploaderName} · {formatBytes(file.size)} · {timeAgo(file.createdAt, "")}
        </p>
      </div>
      <Button size="sm" variant="outline" disabled={downloading} onClick={handleDownload} className="text-xs shrink-0">
        {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Download"}
      </Button>
    </div>
  );
}

// ── Members ────────────────────────────────────────────────

function MembersTab({
  project,
  canManage,
  onInvite,
  onChange,
}: {
  project: ProjectDto;
  canManage: boolean;
  onInvite: () => void;
  onChange: () => void;
}) {
  const { user } = useAuth();
  const { data: invitations, loading: invitesLoading, refetch: refetchInvites } = useApi(
    () => (canManage ? projectService.getProjectInvitations(project.id) : Promise.resolve([])),
    [project.id, canManage]
  );
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removingName, setRemovingName] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const pendingInvites = (invitations ?? []).filter((i) => i.status === "PENDING");

  const handleRemove = async () => {
    if (!removingId) return;
    setBusyId(removingId);
    try {
      await projectService.removeMember(project.id, removingId);
      toast(`${removingName} removed from the project`);
      setConfirmOpen(false);
      onChange();
    } catch (err: unknown) {
      toast(getErrorMessage(err, "Failed to remove member"));
    } finally {
      setBusyId(null);
    }
  };

  const handleRoleChange = async (memberUserId: string, role: string) => {
    setBusyId(memberUserId);
    try {
      await projectService.updateMemberRole(project.id, memberUserId, role);
      toast("Role updated");
      onChange();
    } catch (err: unknown) {
      toast(getErrorMessage(err, "Failed to update role"));
    } finally {
      setBusyId(null);
    }
  };

  const handleCancelInvite = async (invitation: InvitationDto) => {
    try {
      await projectService.cancelInvitation(invitation.id);
      toast("Invitation cancelled");
      refetchInvites();
    } catch (err: unknown) {
      toast(getErrorMessage(err, "Failed to cancel invitation"));
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      {/* Members */}
      <div className="rounded-xl border border-border/40 bg-card">
        <div className="flex items-center justify-between p-4 border-b border-border/40">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Users className="w-4 h-4 text-indigo-400" />
            Members ({project.memberCount})
          </h3>
          {canManage && (
            <Button size="sm" onClick={onInvite}>
              <UserPlus className="w-3.5 h-3.5 mr-1.5" />
              Invite
            </Button>
          )}
        </div>
        <div className="divide-y divide-border/30">
          {project.members.map((m) => {
            const isSelf = m.userId === user?.id;
            const isOwnerRow = m.role === "OWNER";
            return (
              <div key={m.userId} className="flex items-center gap-3 p-3.5">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center shrink-0 overflow-hidden">
                  {m.avatarUrl ? (
                    <img src={m.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs font-bold text-indigo-400">
                      {m.fullName?.charAt(0) || "?"}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {m.fullName} {isSelf && <span className="text-muted-foreground text-xs">(you)</span>}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">{m.email}</p>
                </div>

                {canManage && !isOwnerRow ? (
                  <select
                    value={m.role}
                    disabled={busyId === m.userId}
                    onChange={(e) => handleRoleChange(m.userId, e.target.value)}
                    aria-label={`Change role for ${m.fullName}`}
                    className="h-8 text-xs bg-muted/30 border border-border/40 rounded-lg px-2 focus:outline-none focus:border-indigo-500/50"
                  >
                    <option value="MEMBER">Member</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                ) : (
                  <span
                    className={cn(
                      "text-[9px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full shrink-0",
                      isOwnerRow
                        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        : m.role === "ADMIN"
                          ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                          : "bg-muted/60 text-muted-foreground"
                    )}
                  >
                    {m.role}
                  </span>
                )}

                {canManage && !isOwnerRow && (
                  <button
                    onClick={() => {
                      setRemovingId(m.userId);
                      setRemovingName(m.fullName);
                      setConfirmOpen(true);
                    }}
                    aria-label={`Remove ${m.fullName}`}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Pending invitations */}
      {canManage && (
        <div className="rounded-xl border border-border/40 bg-card self-start">
          <div className="p-4 border-b border-border/40">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-indigo-400" />
              Pending Invitations
            </h3>
          </div>
          <div className="p-2">
            {invitesLoading ? (
              <div className="space-y-2 p-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="h-11 bg-muted/40 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : pendingInvites.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                No pending invitations
              </p>
            ) : (
              <div className="space-y-1">
                {pendingInvites.map((inv) => (
                  <div key={inv.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent/5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center shrink-0 overflow-hidden">
                      {inv.receiverAvatar ? (
                        <img src={inv.receiverAvatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px] font-bold text-indigo-400">
                          {inv.receiverName?.charAt(0) || "?"}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{inv.receiverName}</p>
                      <p className="text-[11px] text-muted-foreground">Pending</p>
                    </div>
                    <Button size="sm" variant="ghost" className="text-xs shrink-0" onClick={() => handleCancelInvite(inv)}>
                      Cancel
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {removingName}?</AlertDialogTitle>
            <AlertDialogDescription>
              They will lose access to this project immediately. Their historical
              activity and messages are preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={busyId === removingId}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {busyId === removingId ? <Loader2 className="w-4 h-4 animate-spin" /> : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Activity ───────────────────────────────────────────────

const ACTIVITY_LABELS: Record<string, { label: string; tone: string }> = {
  PROJECT_CREATED: { label: "Project created", tone: "text-emerald-500" },
  PROJECT_UPDATED: { label: "Project updated", tone: "text-blue-500" },
  PROJECT_ARCHIVED: { label: "Project archived", tone: "text-amber-500" },
  PROJECT_RESTORED: { label: "Project restored", tone: "text-emerald-500" },
  PROJECT_VISIBILITY_CHANGED: { label: "Visibility changed", tone: "text-indigo-500" },
  TASK_CREATED: { label: "Task created", tone: "text-blue-500" },
  TASK_UPDATED: { label: "Task updated", tone: "text-blue-500" },
  TASK_MOVED: { label: "Task moved", tone: "text-indigo-500" },
  TASK_COMPLETED: { label: "Task completed", tone: "text-emerald-500" },
  TASK_ASSIGNED: { label: "Task assigned", tone: "text-purple-500" },
  USER_JOINED_PROJECT: { label: "Member joined", tone: "text-emerald-500" },
  USER_LEFT_PROJECT: { label: "Member removed", tone: "text-red-500" },
  INVITATION_SENT: { label: "Invitation sent", tone: "text-indigo-500" },
  INVITATION_ACCEPTED: { label: "Invitation accepted", tone: "text-emerald-500" },
  MEMBER_ROLE_CHANGED: { label: "Role changed", tone: "text-amber-500" },
  MESSAGE_SENT: { label: "Message sent", tone: "text-blue-500" },
  FILE_UPLOADED: { label: "File uploaded", tone: "text-purple-500" },
  REPORT_RESOLVED: { label: "Report resolved", tone: "text-emerald-500" },
};

function ActivityTab({ projectId }: { projectId: string }) {
  const { data: page, loading, error } = useApi(
    () => activityService.getProjectActivities(projectId, 0, 30),
    [projectId]
  );

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 bg-muted/40 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="text-center py-12 rounded-xl border border-border/40 bg-card">
        <AlertTriangle className="w-8 h-8 text-amber-500/60 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">{error || "Failed to load activity"}</p>
      </div>
    );
  }

  const activities = page.content;

  return (
    <div className="rounded-xl border border-border/40 bg-card">
      {activities.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-12">
          No activity yet — actions in this project will appear here.
        </p>
      ) : (
        <div className="divide-y divide-border/30">
          {activities.map((a: ActivityDto) => {
            const meta = ACTIVITY_LABELS[a.activityType] ?? { label: a.activityType.replace(/_/g, " "), tone: "text-muted-foreground" };
            return (
              <div key={a.id} className="flex items-start gap-3 p-3.5">
                <span className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", meta.tone)} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{a.user?.fullName || "Someone"}</span>{" "}
                    <span className="text-muted-foreground">{meta.label.toLowerCase()}</span>
                    {a.description && (
                      <span className="text-muted-foreground"> — {a.description}</span>
                    )}
                  </p>
                  <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                    {timeAgo(a.createdAt, "")} · {a.title}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Settings ───────────────────────────────────────────────

function SettingsTab({
  project,
  canManage,
  onChanged,
}: {
  project: ProjectDto;
  canManage: boolean;
  onChanged: (updated: boolean) => void;
}) {
  const navigate = useNavigate();
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState<"delete" | "archive" | null>(null);
  const [dangerBusy, setDangerBusy] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await projectService.updateProject(project.id, {
        name: name.trim(),
        description: description.trim() || undefined,
      });
      onChanged(true);
    } catch (err: unknown) {
      toast(getErrorMessage(err, "Failed to update project"));
    } finally {
      setSaving(false);
    }
  };

  const handleVisibility = async () => {
    const next = project.visibility === "PUBLIC" ? "PRIVATE" : "PUBLIC";
    try {
      await projectService.changeVisibility(project.id, next);
      toast(`Project is now ${next.toLowerCase()}`);
      onChanged(true);
    } catch (err: unknown) {
      toast(getErrorMessage(err, "Failed to change visibility"));
    }
  };

  const handleDanger = async () => {
    if (!confirmOpen) return;
    setDangerBusy(true);
    try {
      if (confirmOpen === "archive") {
        await projectService.updateProject(project.id, { status: "ARCHIVED" });
        toast("Project archived");
        onChanged(true);
      } else {
        await projectService.deleteProject(project.id);
        toast("Project deleted");
        navigate("/projects");
      }
    } catch (err: unknown) {
      toast(getErrorMessage(err, confirmOpen === "archive" ? "Failed to archive project" : "Failed to delete project"));
    } finally {
      setDangerBusy(false);
      setConfirmOpen(null);
    }
  };

  if (!canManage) {
    return (
      <div className="rounded-xl border border-border/40 bg-card p-6 text-center">
        <Lock className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">
          Only the project owner or an admin member can change project settings.
        </p>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      {/* General */}
      <form onSubmit={handleSave} className="rounded-xl border border-border/40 bg-card p-5 space-y-4 self-start">
        <h3 className="text-sm font-semibold">General</h3>
        <div className="space-y-1.5">
          <label htmlFor="ws-name" className="text-xs text-muted-foreground">Project name</label>
          <input
            id="ws-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-9 w-full text-sm bg-muted/30 border border-border/40 rounded-lg px-3 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="ws-desc" className="text-xs text-muted-foreground">Description</label>
          <textarea
            id="ws-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full text-sm bg-muted/30 border border-border/40 rounded-lg p-3 resize-none focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <Button type="submit" size="sm" disabled={saving || !name.trim()}>
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save Changes"}
        </Button>
      </form>

      {/* Visibility */}
      <div className="rounded-xl border border-border/40 bg-card p-5 self-start">
        <h3 className="text-sm font-semibold mb-1">Visibility</h3>
        <p className="text-xs text-muted-foreground mb-4">
          {project.visibility === "PUBLIC"
            ? "Anyone can discover and join this project."
            : "Only invited members can access this project."}
        </p>
        <Button size="sm" variant="outline" onClick={handleVisibility}>
          {project.visibility === "PUBLIC" ? (
            <>
              <Lock className="w-3.5 h-3.5 mr-1.5" /> Make Private
            </>
          ) : (
            <>
              <Globe className="w-3.5 h-3.5 mr-1.5" /> Make Public
            </>
          )}
        </Button>
        <p className="text-[11px] text-muted-foreground/70 mt-3">
          {project.visibility === "PUBLIC"
            ? "Switching to private keeps current members but blocks new access."
            : "Making it public lets any authenticated user join."}
        </p>
      </div>

      {/* Danger zone */}
      <div className="rounded-xl border border-red-500/25 bg-red-500/[0.02] p-5 lg:col-span-2">
        <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-1">Danger Zone</h3>
        <p className="text-xs text-muted-foreground mb-4">
          These actions cannot be undone.
        </p>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="text-amber-600 dark:text-amber-400 border-amber-500/30" onClick={() => setConfirmOpen("archive")}>
            <Archive className="w-3.5 h-3.5 mr-1.5" /> Archive Project
          </Button>
          <Button size="sm" variant="outline" className="text-red-600 dark:text-red-400 border-red-500/30" onClick={() => setConfirmOpen("delete")}>
            <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete Project
          </Button>
        </div>
      </div>

      <AlertDialog open={confirmOpen !== null} onOpenChange={(o) => !o && setConfirmOpen(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmOpen === "archive" ? "Archive this project?" : "Delete this project?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmOpen === "archive"
                ? "The project stays stored and visible to members, but normal edits are prevented. You can restore it later."
                : "The project and its memberships will be permanently removed. Activity records are preserved."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDanger}
              disabled={dangerBusy}
              className={confirmOpen === "delete" ? "bg-red-600 hover:bg-red-700 text-white" : undefined}
            >
              {dangerBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : confirmOpen === "archive" ? "Archive" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
