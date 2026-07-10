import { useState } from "react";
import { useParams } from "react-router";
import { useApi } from "@/hooks/useApi";
import { boardService } from "@/services/boardService";
import { Button } from "@/components/ui/button";
import { Plus, GripVertical, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Skeleton } from "@/components/Skeletons";

function TaskCard({ task, columnId }: { task: any; columnId: string }) {
  const [dragging, setDragging] = useState(false);

  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.setData("text/plain", JSON.stringify({ taskId: task.id, columnId })); setDragging(true); }}
      onDragEnd={() => setDragging(false)}
      className={`bg-card border border-border/40 rounded-lg p-3 cursor-grab active:cursor-grabbing transition-all ${
        dragging ? "opacity-50 scale-95 shadow-lg" : "hover:border-indigo-500/30 hover:shadow-sm"
      }`}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="w-3 h-3 text-muted-foreground/40 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{task.title}</p>
          {task.assigneeName && (
            <p className="text-xs text-muted-foreground mt-1">Assigned to {task.assigneeName}</p>
          )}
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

export default function BoardPage() {
  const { projectId } = useParams();
  const { data: board, loading, refetch } = useApi(
    () => projectId ? boardService.getProjectBoard(projectId) : Promise.resolve(null),
    [projectId]
  );
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [selectedColumn, setSelectedColumn] = useState("");

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
        <Button onClick={async () => {
          try {
            await boardService.createBoard("Board", projectId!, ["To Do", "In Progress", "Done"]);
            refetch();
            toast("Board created!");
          } catch { toast("Failed to create board"); }
        }}>Create Board</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">{board.name}</h1>
      </div>

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
                <span className="text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full">{col.tasks.length}</span>
              </div>
              <button
                onClick={() => { setSelectedColumn(col.id); setOpen(true); }}
                className="p-1 rounded hover:bg-accent/10 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
            <div className="space-y-2 min-h-[100px]">
              {col.tasks.map((task) => (
                <TaskCard key={task.id} task={task} columnId={col.id} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Task</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <Input placeholder="Task title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <Button type="submit" disabled={creating || !title.trim()} className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Task"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
