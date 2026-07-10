import { useState } from "react";
import { useNavigate } from "react-router";
import { useApi } from "@/hooks/useApi";
import { projectService, type ProjectDto } from "@/services/projectService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, FolderKanban, Loader2, ExternalLink, MessageSquare } from "lucide-react";
import { toast } from "sonner";

export default function Projects() {
  const navigate = useNavigate();
  const { data: projects, loading, refetch } = useApi(() => projectService.getMyProjects());
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      await projectService.createProject({ name: name.trim(), description: description.trim() || undefined });
      toast("Project created!");
      setOpen(false);
      setName("");
      setDescription("");
      refetch();
    } catch (err: any) {
      toast(err.response?.data?.message || "Failed to create project");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your development projects</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
              <Plus className="w-4 h-4 mr-1.5" /> New Project
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Project</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <Input placeholder="Project name" value={name} onChange={(e) => setName(e.target.value)} required />
              <Input placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
              <Button type="submit" disabled={creating || !name.trim()} className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Project"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      ) : projects && projects.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} onNavigate={navigate} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-card rounded-xl border border-border/40">
          <FolderKanban className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Create your first project to get started</p>
          <Button onClick={() => setOpen(true)}>Create Project</Button>
        </div>
      )}
    </div>
  );
}

function ProjectCard({ project, onNavigate }: { project: ProjectDto; onNavigate: any }) {
  return (
    <Card className="border-border/40 hover:border-indigo-500/30 hover:shadow-md transition-all duration-200 group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
              <FolderKanban className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">{project.name}</CardTitle>
              <p className="text-xs text-muted-foreground">{project.memberCount} member{project.memberCount !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
            project.status === "ACTIVE" ? "bg-emerald-500/10 text-emerald-400" :
            project.status === "ARCHIVED" ? "bg-gray-500/10 text-gray-400" :
            "bg-blue-500/10 text-blue-400"
          }`}>{project.status}</span>
        </div>
        {project.description && (
          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{project.description}</p>
        )}
      </CardHeader>
      <CardContent className="flex gap-2 pt-0">
        <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => onNavigate(`/board/${project.id}`)}>
          <ExternalLink className="w-3 h-3 mr-1" /> Board
        </Button>
        <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => onNavigate("/messages")}>
          <MessageSquare className="w-3 h-3 mr-1" /> Chat
        </Button>
      </CardContent>
    </Card>
  );
}
