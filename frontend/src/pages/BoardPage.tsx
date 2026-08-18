import { useMemo, useState } from "react";
import { useParams } from "react-router";
import { useApi } from "@/hooks/useApi";
import { boardService, type TaskDto } from "@/services/boardService";
import { projectService } from "@/services/projectService";
import { Button } from "@/components/ui/button";
import {
  Plus,
  GripVertical,
  Loader2,
  GitBranch,
  GitPullRequest,
  GitMerge,
  CalendarDays,
  KanbanSquare,
  Flag,
  Link2,
  Link2Off,
  CalendarClock,
  PlayCircle,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  MessageSquarePlus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Skeleton } from "@/components/Skeletons";
import { GitHubSection } from "@/components/GitHubSection";
import { cn } from "@/lib/utils";

const PRIORITY_STYLES: Record<string, { label: string; cls: string }> = {
  CRITICAL: { label: "Critical", cls: "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/25" },
  HIGH: { label: "High", cls: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/25" },
  MEDIUM: { label: "Medium", cls: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/25" },
  LOW: { label: "Low", cls: "text-muted-foreground bg-muted/60 border-border/30" },
};

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

/** Solid dot colors for calendar chips (background, not text). */
const PRIORITY_DOTS: Record<string, string> = {
  CRITICAL: "bg-red-500",
  HIGH: "bg-amber-500",
  MEDIUM: "bg-blue-500",
  LOW: "bg-muted-foreground/50",
};

function isOverdue(task: TaskDto): boolean {
  if (!task.dueDate) return false;
  return new Date(task.dueDate).getTime() < Date.now();
}

const PR_STATE_STYLES: Record<string, string> = {
  OPEN: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/25",
  CHANGES_REQUESTED: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/25",
  APPROVED: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/25",
  MERGED: "text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/25",
  CLOSED: "text-muted-foreground bg-muted/50 border-border/30",
};

function prStateStyle(state: string): string {
  return PR_STATE_STYLES[state] ?? PR_STATE_STYLES.OPEN;
}

function TaskCard({
  task,
  columnId,
  onClick,
}: {
  task: TaskDto;
  columnId: string;
  onClick: () => void;
}) {
  const [dragging, setDragging] = useState(false);
  const priority = PRIORITY_STYLES[task.priority] ?? PRIORITY_STYLES.MEDIUM;
  const blocked = (task.dependencies?.length ?? 0) > 0;

  return (
    <div
      draggable
      onClick={onClick}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", JSON.stringify({ taskId: task.id, columnId }));
        setDragging(true);
      }}
      onDragEnd={() => setDragging(false)}
      className={`bg-card border border-border/40 rounded-lg p-3 cursor-grab active:cursor-grabbing transition-all ${
        dragging ? "opacity-50 scale-95 shadow-lg" : "hover:border-indigo-500/30 hover:shadow-sm"
      }`}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="w-3 h-3 text-muted-foreground/40 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{task.title}</p>

          {/* Priority + due date */}
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <span
              className={cn(
                "inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full border",
                priority.cls
              )}
            >
              <Flag className="w-2 h-2" />
              {priority.label}
            </span>
            {task.dueDate && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full",
                  isOverdue(task)
                    ? "text-red-600 dark:text-red-400 bg-red-500/10"
                    : "text-muted-foreground bg-muted/50"
                )}
                title={`Due ${new Date(task.dueDate).toLocaleDateString()}`}
              >
                <CalendarClock className="w-2.5 h-2.5" />
                {new Date(task.dueDate).toLocaleDateString([], { month: "short", day: "numeric" })}
              </span>
            )}
          </div>

          {/* Sprint / milestone */}
          {(task.sprint || task.milestone) && (
            <p className="text-[10px] text-muted-foreground mt-1 truncate">
              {[task.sprint, task.milestone].filter(Boolean).join(" · ")}
            </p>
          )}

          {/* Labels */}
          {task.labels && task.labels.length > 0 && (
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              {task.labels.slice(0, 3).map((label) => (
                <span
                  key={label}
                  className="text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 dark:text-indigo-300"
                >
                  {label}
                </span>
              ))}
              {task.labels.length > 3 && (
                <span className="text-[9px] text-muted-foreground">+{task.labels.length - 3}</span>
              )}
            </div>
          )}

          {/* GitHub workflow: branch + PR state */}
          {(task.branchName || task.pullRequestState) && (
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              {task.branchName && (
                <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono">
                  <GitBranch className="w-2 h-2" />
                  {task.branchName.split("/").pop()}
                </span>
              )}
              {task.pullRequestState && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full border font-medium",
                    prStateStyle(task.pullRequestState)
                  )}
                >
                  <GitPullRequest className="w-2 h-2" />
                  {task.pullRequestState === "MERGED"
                    ? `#${task.pullRequestNumber} merged`
                    : `${task.pullRequestState.replace("_", " ")}${task.pullRequestNumber ? ` #${task.pullRequestNumber}` : ""}`}
                </span>
              )}
            </div>
          )}

          <div className="flex items-center justify-between mt-1.5">
            {task.assigneeName ? (
              <p className="text-xs text-muted-foreground">Assigned to {task.assigneeName}</p>
            ) : (
              <span />
            )}
            {blocked && (
              <span
                className="inline-flex items-center gap-1 text-[9px] font-medium text-amber-600 dark:text-amber-400"
                title={`Blocked by ${task.dependencies!.length} task${task.dependencies!.length !== 1 ? "s" : ""}`}
              >
                <Link2 className="w-2.5 h-2.5" />
                {task.dependencies!.length}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function BoardSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {Array.from({ length: 3 }).map((_, colIdx) => (
        <div key={colIdx} className="flex-1 min-w-[250px] bg-muted/30 rounded-xl border border-border/40 p-3">
          <div className="flex items-center gap-2 mb-3">
            <Skeleton className="w-2 h-2 rounded-full" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-6 rounded-full" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, taskIdx) => (
              <div key={taskIdx} className="bg-card border border-border/40 rounded-lg p-3">
                <Skeleton className="h-4 w-full mb-1" />
                <Skeleton className="h-3 w-24 mt-2" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Task detail dialog: edit fields + dependencies ─────────

function TaskDetailDialog({
  task,
  allTasks,
  members,
  currentUserRole,
  onClose,
  onSaved,
  onTaskUpdated,
}: {
  task: TaskDto;
  allTasks: TaskDto[];
  members: { id: string; fullName: string }[];
  currentUserRole: string | null;
  onClose: () => void;
  onSaved: () => void;
  onTaskUpdated: (task: TaskDto) => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [priority, setPriority] = useState(task.priority || "MEDIUM");
  const [dueDate, setDueDate] = useState(task.dueDate ? task.dueDate.slice(0, 10) : "");
  const [assigneeId, setAssigneeId] = useState(task.assigneeId ?? "");
  const [labels, setLabels] = useState((task.labels ?? []).join(", "));
  const [sprint, setSprint] = useState(task.sprint ?? "");
  const [milestone, setMilestone] = useState(task.milestone ?? "");
  const [saving, setSaving] = useState(false);
  const [depsBusy, setDepsBusy] = useState<string | null>(null);
  const [newDepId, setNewDepId] = useState("");
  const [wfBusy, setWfBusy] = useState<string | null>(null);

  // GitHub workflow permissions — the backend enforces the same rules.
  const canWork = currentUserRole === "OWNER" || currentUserRole === "ADMIN" || currentUserRole === "MEMBER";
  const canManage = currentUserRole === "OWNER" || currentUserRole === "ADMIN";
  const prLive = task.pullRequestNumber != null && task.pullRequestState !== "MERGED" && task.pullRequestState !== "CLOSED";

  const runWorkflow = async (op: string, call: () => Promise<TaskDto>, success: string) => {
    if (wfBusy) return;
    setWfBusy(op);
    try {
      const updated = await call();
      toast(success);
      onTaskUpdated(updated);
      onSaved();
    } catch (err) {
      toast(err instanceof Error && err.message ? err.message : "Operation failed");
    } finally {
      setWfBusy(null);
    }
  };

  const wfBtn = (op: string) => (wfBusy === op ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await boardService.updateTask(task.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        columnId: task.columnId,
        priority,
        dueDate: dueDate ? new Date(dueDate + "T12:00:00").toISOString() : null,
        // Tell the backend to actually remove a cleared due date.
        clearDueDate: !dueDate,
        assigneeId: assigneeId || undefined,
        labels: labels
          .split(",")
          .map((l) => l.trim())
          .filter(Boolean)
          .join(",") || undefined,
        sprint: sprint.trim() || undefined,
        milestone: milestone.trim() || undefined,
      });
      toast("Task updated");
      onSaved();
    } catch (err) {
      toast(err instanceof Error && err.message ? err.message : "Failed to update task");
    } finally {
      setSaving(false);
    }
  };

  const addDependency = async () => {
    if (!newDepId || depsBusy) return;
    setDepsBusy("add");
    try {
      await boardService.addDependency(task.id, newDepId);
      toast("Dependency added");
      setNewDepId("");
      onSaved();
    } catch (err) {
      toast(err instanceof Error && err.message ? err.message : "Failed to add dependency");
    } finally {
      setDepsBusy(null);
    }
  };

  const removeDependency = async (depId: string) => {
    setDepsBusy(depId);
    try {
      await boardService.removeDependency(task.id, depId);
      toast("Dependency removed");
      onSaved();
    } catch {
      toast("Failed to remove dependency");
    } finally {
      setDepsBusy(null);
    }
  };

  const dependencyTasks = allTasks.filter((t) => (task.dependencies ?? []).includes(t.id));
  const candidateTasks = allTasks.filter(
    (t) => t.id !== task.id && !(task.dependencies ?? []).includes(t.id)
  );

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="task-title" className="text-xs text-muted-foreground">Title</label>
            <Input id="task-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="task-desc" className="text-xs text-muted-foreground">Description</label>
            <textarea
              id="task-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full text-sm bg-transparent border border-border/40 rounded-lg p-3 resize-none focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="task-priority" className="text-xs text-muted-foreground">Priority</label>
              <select
                id="task-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="h-9 w-full text-sm bg-muted/30 border border-border/40 rounded-lg px-2 focus:outline-none focus:border-indigo-500/50"
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p.charAt(0) + p.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="task-due" className="text-xs text-muted-foreground">Due date</label>
              <Input id="task-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="task-assignee" className="text-xs text-muted-foreground">Assignee</label>
              <select
                id="task-assignee"
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="h-9 w-full text-sm bg-muted/30 border border-border/40 rounded-lg px-2 focus:outline-none focus:border-indigo-500/50"
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="task-labels" className="text-xs text-muted-foreground">Labels (comma separated)</label>
              <Input id="task-labels" value={labels} onChange={(e) => setLabels(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="task-sprint" className="text-xs text-muted-foreground">Sprint</label>
              <Input id="task-sprint" value={sprint} onChange={(e) => setSprint(e.target.value)} placeholder="e.g. Sprint 12" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="task-milestone" className="text-xs text-muted-foreground">Milestone</label>
              <Input id="task-milestone" value={milestone} onChange={(e) => setMilestone(e.target.value)} placeholder="e.g. v2.0" />
            </div>
          </div>

          <Button type="submit" disabled={saving || !title.trim()} className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
          </Button>
        </form>

        {/* Dependencies */}
        <div className="border-t border-border/40 pt-4 space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Link2 className="w-4 h-4 text-amber-500" />
            Dependencies
          </h4>
          {dependencyTasks.length === 0 ? (
            <p className="text-xs text-muted-foreground">No dependencies — this task is not blocked.</p>
          ) : (
            <div className="space-y-1.5">
              {dependencyTasks.map((dep) => (
                <div key={dep.id} className="flex items-center gap-2 text-sm bg-muted/40 rounded-lg px-3 py-2">
                  <Link2 className="w-3 h-3 text-amber-500 shrink-0" />
                  <span className="flex-1 min-w-0 truncate">{dep.title}</span>
                  <button
                    onClick={() => removeDependency(dep.id)}
                    disabled={depsBusy === dep.id}
                    aria-label={`Remove dependency on ${dep.title}`}
                    className="p-1 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                  >
                    {depsBusy === dep.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2Off className="w-3.5 h-3.5" />}
                  </button>
                </div>
              ))}
            </div>
          )}
          {candidateTasks.length > 0 && (
            <div className="flex items-center gap-2">
              <select
                value={newDepId}
                onChange={(e) => setNewDepId(e.target.value)}
                aria-label="Select blocking task"
                className="h-9 flex-1 min-w-0 text-sm bg-muted/30 border border-border/40 rounded-lg px-2 focus:outline-none focus:border-indigo-500/50"
              >
                <option value="">Blocked by…</option>
                {candidateTasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
              <Button size="sm" variant="outline" onClick={addDependency} disabled={!newDepId || depsBusy === "add"}>
                {depsBusy === "add" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Add
              </Button>
            </div>
          )}
        </div>

        {/* GitHub development workflow */}
        <div className="border-t border-border/40 pt-4 space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-emerald-500" />
            GitHub Workflow
          </h4>

          {!task.branchName && !task.pullRequestNumber ? (
            <p className="text-xs text-muted-foreground">
              Work on this task on a feature branch and ship it through a pull request. Start to get a branch
              suggestion.
            </p>
          ) : (
            <div className="space-y-2 text-sm">
              {task.branchName && (
                <div className="flex items-center gap-2 bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-3 py-2">
                  <GitBranch className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="font-mono text-xs truncate">{task.branchName}</span>
                </div>
              )}
              {task.pullRequestState && (
                <div className="flex items-center gap-2 bg-muted/40 border border-border/40 rounded-lg px-3 py-2">
                  <GitPullRequest className="w-3.5 h-3.5 shrink-0" />
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full border",
                      prStateStyle(task.pullRequestState)
                    )}
                  >
                    {task.pullRequestState.replace("_", " ")}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    {task.pullRequestNumber ? `PR #${task.pullRequestNumber}` : "PR"}
                    {task.prMergedAt
                      ? ` · merged ${new Date(task.prMergedAt).toLocaleDateString()}`
                      : task.prCreatedAt
                        ? ` · opened ${new Date(task.prCreatedAt).toLocaleDateString()}`
                        : ""}
                  </span>
                  {task.pullRequestUrl && (
                    <a
                      href={task.pullRequestUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-auto inline-flex items-center gap-1 text-xs text-indigo-500 hover:underline"
                    >
                      View PR <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}
            </div>
          )}

          {canWork && (
            <div className="flex flex-wrap items-center gap-2">
              {!task.startedAt && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={wfBusy !== null}
                  onClick={() =>
                    runWorkflow("start", () => boardService.startTask(task.id), "Task started — branch suggested")
                  }
                >
                  {wfBtn("start")}
                  <PlayCircle className="w-3.5 h-3.5 mr-1" />
                  Start Task
                </Button>
              )}
              {task.startedAt && !task.branchName && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={wfBusy !== null}
                  onClick={() => runWorkflow("branch", () => boardService.createBranch(task.id), "Branch created on GitHub")}
                >
                  {wfBtn("branch")}
                  <GitBranch className="w-3.5 h-3.5 mr-1" />
                  Create Branch
                </Button>
              )}
              {task.branchName && !task.pullRequestNumber && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={wfBusy !== null}
                  onClick={() =>
                    runWorkflow("pr", () => boardService.createPullRequest(task.id), "Pull request opened on GitHub")
                  }
                >
                  {wfBtn("pr")}
                  <GitPullRequest className="w-3.5 h-3.5 mr-1" />
                  Create Pull Request
                </Button>
              )}
              {task.pullRequestNumber && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={wfBusy !== null}
                  onClick={() =>
                    runWorkflow("refresh", () => boardService.refreshPullRequest(task.id), "Pull request status refreshed")
                  }
                >
                  {wfBtn("refresh")}
                  <RefreshCw className="w-3.5 h-3.5 mr-1" />
                  Refresh
                </Button>
              )}
            </div>
          )}

          {canManage && prLive && (
            <div className="flex flex-wrap items-center gap-2 border-t border-border/40 pt-3">
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={wfBusy !== null}
                onClick={() =>
                  runWorkflow("approve", () => boardService.approvePullRequest(task.id), "Pull request approved")
                }
              >
                {wfBtn("approve")}
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-amber-600 dark:text-amber-400"
                disabled={wfBusy !== null}
                onClick={() =>
                  runWorkflow(
                    "changes",
                    () => boardService.requestChanges(task.id, "Please address the requested changes."),
                    "Changes requested on the pull request"
                  )
                }
              >
                {wfBtn("changes")}
                <MessageSquarePlus className="w-3.5 h-3.5 mr-1" />
                Request Changes
              </Button>
              <Button
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 text-white"
                disabled={wfBusy !== null}
                onClick={() =>
                  runWorkflow("merge", () => boardService.mergePullRequest(task.id), "Pull request merged — task completed")
                }
              >
                {wfBtn("merge")}
                <GitMerge className="w-3.5 h-3.5 mr-1" />
                Merge PR
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Calendar view ──────────────────────────────────────────

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Local (not UTC) YYYY-MM-DD key, so a task never shifts to the wrong day. */
function toLocalDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function CalendarView({
  projectId,
  refreshKey,
  onOpenTask,
}: {
  projectId: string;
  refreshKey: number;
  onOpenTask: (task: TaskDto) => void;
}) {
  const today = new Date();
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  // Full visible grid: first Sunday on/before the 1st → last Saturday on/after month end.
  const gridStart = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    return new Date(first.getFullYear(), first.getMonth(), first.getDate() - first.getDay());
  }, [cursor]);
  const gridEnd = useMemo(() => {
    const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    return new Date(last.getFullYear(), last.getMonth(), last.getDate() + (6 - last.getDay()));
  }, [cursor]);

  const fromIso = useMemo(
    () => new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate()).toISOString(),
    [gridStart]
  );
  const toIso = useMemo(
    () =>
      new Date(gridEnd.getFullYear(), gridEnd.getMonth(), gridEnd.getDate(), 23, 59, 59).toISOString(),
    [gridEnd]
  );

  const { data: tasks, loading, error, refetch } = useApi(
    () => boardService.calendarTasks(projectId, fromIso, toIso),
    [projectId, fromIso, toIso, refreshKey]
  );

  const byDay = useMemo(() => {
    const map = new Map<string, TaskDto[]>();
    for (const t of tasks ?? []) {
      if (!t.dueDate) continue;
      const key = toLocalDayKey(new Date(t.dueDate));
      map.set(key, [...(map.get(key) ?? []), t]);
    }
    return map;
  }, [tasks]);

  const cells = useMemo(() => {
    const out: Date[] = [];
    const cur = new Date(gridStart);
    while (cur <= gridEnd) {
      out.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return out;
  }, [gridStart, gridEnd]);

  const monthLabel = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const inCursorMonth = (d: Date) => d.getMonth() === cursor.getMonth() && d.getFullYear() === cursor.getFullYear();
  const todayKey = toLocalDayKey(today);
  const nav = (offset: number) => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + offset, 1));
  const goToday = () => setCursor(new Date(today.getFullYear(), today.getMonth(), 1));

  if (loading) {
    return (
      <div className="rounded-xl border border-border/40 bg-card p-3">
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: 42 }).map((_, i) => (
            <div key={i} className="h-20 bg-muted/40 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 rounded-xl border border-border/40 bg-card">
        <CalendarDays className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Failed to load the calendar. {error}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={refetch}>
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-sm font-semibold">{monthLabel}</h2>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={() => nav(-1)} aria-label="Previous month">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToday}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={() => nav(1)} aria-label="Next month">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {(tasks ?? []).length === 0 ? (
        <div className="text-center py-12 rounded-xl border border-border/40 bg-card">
          <CalendarDays className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            No tasks scheduled for this period. Set a due date on a task to see it here.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border/40 bg-card p-3">
          <div className="grid grid-cols-7 gap-1.5 mb-1.5">
            {WEEKDAYS.map((w) => (
              <p
                key={w}
                className="text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {w}
              </p>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {cells.map((day) => {
              const key = toLocalDayKey(day);
              const dayTasks = byDay.get(key) ?? [];
              const isToday = key === todayKey;
              const inMonth = inCursorMonth(day);
              return (
                <div
                  key={key}
                  className={cn(
                    "min-h-[5.5rem] rounded-lg border border-border/30 p-1.5 flex flex-col gap-1",
                    inMonth ? "bg-card" : "bg-muted/20 opacity-50",
                    isToday && "ring-1 ring-indigo-500/50 border-indigo-500/40"
                  )}
                >
                  <p
                    className={cn(
                      "text-[10px] font-medium",
                      isToday ? "text-indigo-500" : "text-muted-foreground"
                    )}
                  >
                    {day.getDate()}
                  </p>
                  <div className="space-y-1 min-w-0">
                    {dayTasks.slice(0, 3).map((t) => {
                      const overdue = isOverdue(t);
                      const status = t.columnName ?? "";
                      return (
                        <button
                          key={t.id}
                          onClick={() => onOpenTask(t)}
                          className={cn(
                            "w-full text-left rounded px-1 py-0.5 border transition-colors",
                            overdue
                              ? "bg-red-500/10 border-red-500/25 text-red-600 dark:text-red-400 hover:bg-red-500/20"
                              : "bg-indigo-500/10 border-indigo-500/25 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-500/20"
                          )}
                          title={`${t.title}${status ? ` · ${status}` : ""}${t.assigneeName ? ` · ${t.assigneeName}` : ""}`}
                        >
                          <span className="flex items-center gap-1 min-w-0">
                            <span
                              className={cn(
                                "w-1 h-1 rounded-full shrink-0",
                                PRIORITY_DOTS[t.priority] ?? PRIORITY_DOTS.MEDIUM
                              )}
                            />
                            <span className="text-[10px] leading-tight truncate">{t.title}</span>
                          </span>
                          <span className="flex items-center gap-1 text-[8px] leading-none mt-0.5 text-muted-foreground truncate">
                            {status && <span className="uppercase truncate">{status}</span>}
                            {t.assigneeName && (
                              <span className="truncate">· {t.assigneeName.split(" ")[0]}</span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                    {dayTasks.length > 3 && (
                      <p className="text-[10px] text-muted-foreground text-center">+{dayTasks.length - 3} more</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────

export default function BoardPage() {
  const { projectId } = useParams();
  const { data: board, loading, refetch } = useApi(
    () => (projectId ? boardService.getProjectBoard(projectId) : Promise.resolve(null)),
    [projectId]
  );
  const { data: project } = useApi(
    () => (projectId ? projectService.getProject(projectId) : Promise.resolve(null)),
    [projectId]
  );
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [creating, setCreating] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState("");
  const [showGitHub, setShowGitHub] = useState(false);
  const [view, setView] = useState<"board" | "calendar">("board");
  const [detailTask, setDetailTask] = useState<TaskDto | null>(null);
  /** Bumped after any task mutation so the open calendar refetches. */
  const [refreshKey, setRefreshKey] = useState(0);

  const members = (project?.members ?? []).map((m) => ({ id: m.userId, fullName: m.fullName }));
  const allTasks = (board?.columns ?? []).flatMap((col) => col.tasks);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedColumn) return;
    setCreating(true);
    try {
      await boardService.createTask({
        title: title.trim(),
        columnId: selectedColumn,
        // Noon local time keeps the calendar day stable across timezones.
        dueDate: dueDate ? new Date(dueDate + "T12:00:00").toISOString() : undefined,
      });
      toast("Task created!");
      setTitle("");
      setDueDate("");
      setOpen(false);
      refetch();
      setRefreshKey((k) => k + 1);
    } catch {
      toast("Failed to create task");
    } finally {
      setCreating(false);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    try {
      const { taskId, columnId } = JSON.parse(e.dataTransfer.getData("text/plain"));
      if (columnId === targetColumnId) return;
      await boardService.updateTaskPosition(taskId, targetColumnId, 0);
      refetch();
    } catch {
      toast("Failed to move task");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-7 w-40" />
        <BoardSkeleton />
      </div>
    );
  }

  if (!board) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground mb-4">No board found for this project</p>
        <Button
          onClick={async () => {
            try {
              await boardService.createBoard("Board", projectId!, ["To Do", "In Progress", "Done"]);
              refetch();
              toast("Board created!");
            } catch {
              toast("Failed to create board");
            }
          }}
        >
          Create Board
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-xl font-bold tracking-tight">{board.name}</h1>
        <div className="flex items-center gap-1.5">
          {/* View toggle */}
          <div className="flex items-center gap-0.5 bg-muted/40 border border-border/40 rounded-lg p-0.5">
            <button
              onClick={() => setView("board")}
              aria-pressed={view === "board"}
              className={cn(
                "inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md transition-all",
                view === "board"
                  ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <KanbanSquare className="w-3.5 h-3.5" />
              Board
            </button>
            <button
              onClick={() => setView("calendar")}
              aria-pressed={view === "calendar"}
              className={cn(
                "inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md transition-all",
                view === "calendar"
                  ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              Calendar
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowGitHub((v) => !v)}>
            <GitBranch className="w-3.5 h-3.5 mr-1.5" />
            {showGitHub ? "Hide GitHub" : "GitHub"}
          </Button>
        </div>
      </div>

      {showGitHub && projectId && (
        <div className="border border-border/40 rounded-xl p-4 bg-card">
          <GitHubSection projectId={projectId} />
        </div>
      )}

      {view === "calendar" ? (
        <CalendarView projectId={projectId!} refreshKey={refreshKey} onOpenTask={(t) => setDetailTask(t)} />
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {board.columns.map((col) => (
            <div
              key={col.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, col.id)}
              className="flex-1 min-w-[250px] bg-muted/30 rounded-xl border border-border/40 p-3"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-400" />
                  <h3 className="text-sm font-semibold">{col.name}</h3>
                  <span className="text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full">
                    {col.tasks.length}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setSelectedColumn(col.id);
                    setOpen(true);
                  }}
                  className="p-1 rounded hover:bg-accent/10 transition-colors"
                  aria-label={`Add task to ${col.name}`}
                >
                  <Plus className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
              <div className="space-y-2 min-h-[100px]">
                {col.tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    columnId={col.id}
                    onClick={() => setDetailTask(task)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create task */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Task</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <Input placeholder="Task title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <div className="space-y-1.5">
              <label htmlFor="new-task-due" className="text-xs text-muted-foreground">
                Due date (optional)
              </label>
              <Input
                id="new-task-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <Button
              type="submit"
              disabled={creating || !title.trim()}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Task"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Task detail / edit */}
      {detailTask && (
        <TaskDetailDialog
          task={detailTask}
          allTasks={allTasks}
          members={members}
          currentUserRole={project?.currentUserRole ?? null}
          onClose={() => setDetailTask(null)}
          onSaved={() => {
            refetch();
            setRefreshKey((k) => k + 1);
            // Keep the dialog showing the freshest task data.
            const fresh = allTasks.find((t) => t.id === detailTask.id);
            if (fresh) setDetailTask(fresh);
          }}
          onTaskUpdated={(t) => setDetailTask(t)}
        />
      )}
    </div>
  );
}
