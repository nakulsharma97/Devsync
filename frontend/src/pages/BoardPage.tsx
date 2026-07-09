import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  GripVertical,
  Trash2,
  Loader2,
  ArrowLeft,
  LayoutPanelTop,
  Circle,
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  X,
} from "lucide-react";
import { boardService, type BoardColumn, type BoardTask } from "@/services/boardService";
import { projectService } from "@/services/projectService";
import { toast } from "sonner";

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-green-500/10 text-green-500 border-green-500/20",
  medium: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  high: "bg-red-500/10 text-red-500 border-red-500/20",
};

function TaskCard({
  task,
  onDelete,
  onDragStart,
}: {
  task: BoardTask;
  onDelete: (id: string) => void;
  onDragStart: (e: React.DragEvent, taskId: string, columnId: string) => void;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task._id, "")}
      className="bg-card border border-border/50 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-accent/30 hover:shadow-sm transition-all group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <GripVertical className="w-3 h-3 text-muted-foreground/30 shrink-0 mt-0.5" />
          <p className="text-xs font-medium text-foreground line-clamp-2">{task.title}</p>
        </div>
        <button
          onClick={() => onDelete(task._id)}
          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
      {task.description && (
        <p className="text-[10px] text-muted-foreground line-clamp-2 mb-2 ml-5">
          {task.description}
        </p>
      )}
      <div className="flex items-center gap-2 ml-5">
        {task.priority && (
          <span
            className={`text-[9px] px-1.5 py-0.5 rounded-full border ${
              PRIORITY_COLORS[task.priority] || "bg-accent/10 text-accent border-accent/20"
            }`}
          >
            {task.priority}
          </span>
        )}
        {task.assignee && (
          <span className="text-[9px] text-muted-foreground">{task.assignee.fullName}</span>
        )}
      </div>
    </div>
  );
}

export default function BoardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [columns, setColumns] = useState<BoardColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectName, setProjectName] = useState("");
  const [newTaskInputs, setNewTaskInputs] = useState<Record<string, { title: string; description: string; priority: string }>>({});
  const [addingTask, setAddingTask] = useState<Record<string, boolean>>({});
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState("");
  const dragItem = useRef<{ taskId: string; sourceColumnId: string } | null>(null);

  useEffect(() => {
    if (!projectId) return;
    const fetchBoard = async () => {
      try {
        const [boardData, project] = await Promise.all([
          boardService.getBoard(projectId),
          projectService.getById(projectId),
        ]);
        setColumns(boardData);
        setProjectName(project.title);
      } catch (err) {
        console.error("Failed to load board:", err);
        toast.error("Failed to load board");
      } finally {
        setLoading(false);
      }
    };
    fetchBoard();
  }, [projectId]);

  const handleAddTask = async (colId: string) => {
    if (!projectId) return;
    const input = newTaskInputs[colId];
    if (!input?.title.trim()) return;

    setAddingTask((prev) => ({ ...prev, [colId]: true }));
    try {
      const task = await boardService.addTask(colId, projectId, input.title, input.description || undefined, input.priority || undefined);
      setColumns((prev) =>
        prev.map((col) =>
          col._id === colId
            ? { ...col, tasks: [...col.tasks, task] }
            : col,
        ),
      );
      setNewTaskInputs((prev) => ({ ...prev, [colId]: { title: "", description: "", priority: "" } }));
      toast.success("Task added");
    } catch {
      toast.error("Failed to add task");
    } finally {
      setAddingTask((prev) => ({ ...prev, [colId]: false }));
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await boardService.deleteTask(taskId);
      setColumns((prev) =>
        prev.map((col) => ({
          ...col,
          tasks: col.tasks.filter((t) => t._id !== taskId),
        })),
      );
      toast.success("Task deleted");
    } catch {
      toast.error("Failed to delete task");
    }
  };

  const handleDragStart = (e: React.DragEvent, taskId: string, _columnId: string) => {
    const colId = columns.find((col) => col.tasks.some((t) => t._id === taskId))?._id;
    if (colId) {
      dragItem.current = { taskId, sourceColumnId: colId };
      e.dataTransfer.effectAllowed = "move";
    }
  };

  const handleDrop = async (targetColumnId: string) => {
    if (!dragItem.current) return;
    const { taskId, sourceColumnId } = dragItem.current;
    if (sourceColumnId === targetColumnId) return;

    // Optimistically update UI
    setColumns((prev) => {
      const newCols = prev.map((col) => ({ ...col, tasks: [...col.tasks] }));
      const sourceCol = newCols.find((c) => c._id === sourceColumnId);
      const targetCol = newCols.find((c) => c._id === targetColumnId);
      if (!sourceCol || !targetCol) return prev;

      const taskIndex = sourceCol.tasks.findIndex((t) => t._id === taskId);
      if (taskIndex === -1) return prev;

      const [movedTask] = sourceCol.tasks.splice(taskIndex, 1);
      targetCol.tasks.push(movedTask);

      return newCols;
    });

    dragItem.current = null;

    try {
      await boardService.moveTask(taskId, targetColumnId, 999);
    } catch {
      toast.error("Failed to move task");
      // Refetch board
      if (projectId) {
        const boardData = await boardService.getBoard(projectId);
        setColumns(boardData);
      }
    }
  };

  const handleAddColumn = async () => {
    if (!projectId || !newColumnTitle.trim()) return;
    setAddingColumn(true);
    try {
      const col = await boardService.addColumn(projectId, newColumnTitle.trim());
      setColumns((prev) => [...prev, col]);
      setNewColumnTitle("");
      toast.success("Column added");
    } catch {
      toast.error("Failed to add column");
    } finally {
      setAddingColumn(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
          <p className="text-sm text-muted-foreground">Loading board...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Background decoration */}
      <div className="absolute -top-20 -right-20 w-72 h-72 bg-gradient-to-bl from-accent/[0.03] to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate("/projects")}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2 transition-colors"
        >
          <ArrowLeft className="w-3 h-3" /> Back to Projects
        </button>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-accent/10 flex items-center justify-center">
            <LayoutPanelTop className="w-3 h-3 text-accent" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {projectName} — Board
          </h1>
        </div>
        <p className="ml-7 text-sm text-muted-foreground">
          Drag tasks between columns to update their status
        </p>
      </div>

      {/* Board Columns */}
      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[60vh]">
        {columns.map((col) => (
          <div
            key={col._id}
            className="flex-shrink-0 w-72 bg-muted/30 border border-border/50 rounded-xl"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(col._id)}
          >
            {/* Column Header */}
            <div className="px-3 py-2.5 border-b border-border/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    col.title === "To Do"
                      ? "bg-blue-500"
                      : col.title === "In Progress"
                        ? "bg-amber-500"
                        : col.title === "Done"
                          ? "bg-green-500"
                          : "bg-accent"
                  }`}
                />
                <span className="text-xs font-semibold text-foreground">{col.title}</span>
                <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 rounded-full">
                  {col.tasks.length}
                </span>
              </div>
            </div>

            {/* Tasks */}
            <div className="p-2 space-y-2 min-h-[100px]">
              {col.tasks.map((task) => (
                <TaskCard
                  key={task._id}
                  task={task}
                  onDelete={handleDeleteTask}
                  onDragStart={handleDragStart}
                />
              ))}

              {/* Add Task Form */}
              <div className="pt-1">
                {newTaskInputs[col._id]?.title !== undefined ? (
                  <div className="space-y-2">
                    <Input
                      value={newTaskInputs[col._id]?.title || ""}
                      onChange={(e) =>
                        setNewTaskInputs((prev) => ({
                          ...prev,
                          [col._id]: { ...prev[col._id], title: e.target.value },
                        }))
                      }
                      placeholder="Task title..."
                      className="text-xs h-8 bg-background"
                      onKeyDown={(e) => e.key === "Enter" && handleAddTask(col._id)}
                      autoFocus
                    />
                    <Textarea
                      value={newTaskInputs[col._id]?.description || ""}
                      onChange={(e) =>
                        setNewTaskInputs((prev) => ({
                          ...prev,
                          [col._id]: { ...prev[col._id], description: e.target.value },
                        }))
                      }
                      placeholder="Description (optional)"
                      rows={2}
                      className="text-xs resize-none bg-background"
                    />
                    <div className="flex items-center gap-2">
                      <select
                        value={newTaskInputs[col._id]?.priority || ""}
                        onChange={(e) =>
                          setNewTaskInputs((prev) => ({
                            ...prev,
                            [col._id]: { ...prev[col._id], priority: e.target.value },
                          }))
                        }
                        className="text-[10px] bg-background border border-border/50 rounded px-1.5 py-1 text-foreground"
                      >
                        <option value="">No priority</option>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleAddTask(col._id)}
                        disabled={addingTask[col._id]}
                        className="text-xs h-7 flex-1"
                      >
                        {addingTask[col._id] ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          "Add"
                        )}
                      </Button>
                      <button
                        onClick={() =>
                          setNewTaskInputs((prev) => {
                            const next = { ...prev };
                            delete next[col._id];
                            return next;
                          })
                        }
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() =>
                      setNewTaskInputs((prev) => ({
                        ...prev,
                        [col._id]: { title: "", description: "", priority: "" },
                      }))
                    }
                    className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/5 rounded-lg transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Add task
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Add Column Button */}
        <div className="flex-shrink-0 w-72">
          {addingColumn || newColumnTitle !== "" ? (
            <div className="bg-muted/30 border border-border/50 rounded-xl p-3 space-y-2">
              <Input
                value={newColumnTitle}
                onChange={(e) => setNewColumnTitle(e.target.value)}
                placeholder="Column name..."
                className="text-xs h-8 bg-background"
                onKeyDown={(e) => e.key === "Enter" && handleAddColumn()}
                autoFocus
              />
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleAddColumn}
                  disabled={addingColumn}
                  className="text-xs h-7"
                >
                  {addingColumn ? <Loader2 className="w-3 h-3 animate-spin" /> : "Add Column"}
                </Button>
                <button
                  onClick={() => {
                    setAddingColumn(false);
                    setNewColumnTitle("");
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingColumn(true)}
              className="w-full border-2 border-dashed border-border/30 rounded-xl p-4 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:border-accent/30 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Column
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
