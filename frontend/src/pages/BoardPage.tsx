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
  CalendarDays,
  KanbanSquare,
  Flag,
  Link2,
  Link2Off,
  CalendarClock,
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

function isOverdue(task: TaskDto): boolean {
  if (!task.dueDate) return false;
  return new Date(task.dueDate).getTime() < Date.now();
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
  onClose,
  onSaved,
}: {
  task: TaskDto;
  allTasks: TaskDto[];
  members: { id: string; fullName: string }[];
  onClose: () => void;
  onSaved: () => void;
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
        dueDate: dueDate ? new Date(dueDate + "T12:00:00").toISOString() : undefined,
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
      </DialogContent>
    </Dialog>
  );
}

// ── Calendar view ──────────────────────────────────────────

function CalendarView() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const to = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59).toISOString();
  const { data: tasks, loading } = useApi(() => boardService.calendarTasks(from, to), []);

  const byDate = useMemo(() => {
    const map = new Map<string, TaskDto[]>();
    for (const t of tasks ?? []) {
      if (!t.dueDate) continue;
      const day = t.dueDate.slice(0, 10);
      map.set(day, [...(map.get(day) ?? []), t]);
    }
    return new Map([...map.entries()].sort((a, b) => a[0].localeCompare(b[0])));
  }, [tasks]);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 bg-muted/40 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (byDate.size === 0) {
    return (
      <div className="text-center py-12 rounded-xl border border-border/40 bg-card">
        <CalendarDays className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">
          No tasks with due dates in the next two months. Set a due date on a task to see it here.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/40 bg-card divide-y divide-border/30">
      {[...byDate.entries()].map(([day, dayTasks]) => (
        <div key={day} className="p-3.5">
          <p className="text-xs font-semibold text-muted-foreground mb-2">
            {new Date(day + "T12:00:00").toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </p>
          <div className="space-y-1.5">
            {dayTasks.map((t) => (
              <div key={t.id} className="flex items-center gap-2.5 text-sm bg-muted/30 rounded-lg px-3 py-2">
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full shrink-0",
                    new Date(t.dueDate!).getTime() < Date.now() ? "bg-red-500" : "bg-indigo-400"
                  )}
                />
                <span className="flex-1 min-w-0 truncate">{t.title}</span>
                {t.assigneeName && (
                  <span className="text-[11px] text-muted-foreground shrink-0">→ {t.assigneeName}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
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
  const [creating, setCreating] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState("");
  const [showGitHub, setShowGitHub] = useState(false);
  const [view, setView] = useState<"board" | "calendar">("board");
  const [detailTask, setDetailTask] = useState<TaskDto | null>(null);

  const members = (project?.members ?? []).map((m) => ({ id: m.userId, fullName: m.fullName }));
  const allTasks = (board?.columns ?? []).flatMap((col) => col.tasks);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedColumn) return;
    setCreating(true);
    try {
      await boardService.createTask({ title: title.trim(), columnId: selectedColumn });
      toast("Task created!");
      setTitle("");
      setOpen(false);
      refetch();
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
        <CalendarView />
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
          onClose={() => setDetailTask(null)}
          onSaved={() => {
            refetch();
            // Keep the dialog showing the freshest task data.
            const fresh = allTasks.find((t) => t.id === detailTask.id);
            if (fresh) setDetailTask(fresh);
          }}
        />
      )}
    </div>
  );
}
