import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Plus, FolderGit2, ExternalLink, Github, Trash2 } from "lucide-react";
import { projectService, type Project, type ProjectRequest } from "@/services/projectService";

const emptyForm: ProjectRequest = {
  title: "",
  description: "",
  techStack: "",
  githubRepo: "",
  liveDemo: "",
  tags: [],
};

export default function Projects() {
  const [showCreate, setShowCreate] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<ProjectRequest>(emptyForm);

  const fetchProjects = async () => {
    try {
      const data = await projectService.getAll();
      setProjects(data);
    } catch {
      // API not available
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await projectService.create(form);
      setShowCreate(false);
      setForm(emptyForm);
      await fetchProjects();
    } catch (err) {
      console.error("Failed to create project:", err);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this project?")) return;
    try {
      await projectService.delete(id);
      await fetchProjects();
    } catch (err) {
      console.error("Failed to delete project:", err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">Showcase your work</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)} className="text-sm">
          <Plus className="w-4 h-4 mr-1.5" />
          New Project
        </Button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="border border-border rounded-lg p-12 flex items-center justify-center">
          <p className="text-sm text-muted-foreground animate-pulse">Loading projects...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && projects.length === 0 ? (
        <div className="border border-border rounded-lg p-12 flex flex-col items-center text-center gap-3">
          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
            <FolderGit2 className="w-5 h-5 text-muted-foreground" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">No projects yet</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            Create your first project to showcase your work to the developer community.
          </p>
          <Button size="sm" onClick={() => setShowCreate(true)} className="mt-2 text-sm">
            <Plus className="w-4 h-4 mr-1.5" />
            Create Project
          </Button>
        </div>
      ) : null}

      {/* Project Grid */}
      {!loading && projects.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <div
              key={project.id}
              className="border border-border rounded-lg p-5 hover:bg-accent/30 transition-colors group"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">{project.title}</h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(project.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed mb-3">
                {project.description || "No description provided."}
              </p>
              {project.techStack && (
                <div className="flex gap-1.5 flex-wrap mb-3">
                  {project.techStack.split(",").map((t) => (
                    <span
                      key={t.trim()}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground"
                    >
                      {t.trim()}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-3">
                {project.githubRepo && (
                  <a
                    href={project.githubRepo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
                  >
                    <Github className="w-3 h-3" />
                    Code
                  </a>
                )}
                {project.liveDemo && (
                  <a
                    href={project.liveDemo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Demo
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold tracking-tight">New Project</DialogTitle>
            <DialogDescription className="text-sm">
              Share your project with the community.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Title</label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="My Awesome Project"
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Description</label>
              <Textarea
                value={form.description || ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe your project..."
                rows={3}
                className="text-sm resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Tech Stack</label>
              <Input
                value={form.techStack || ""}
                onChange={(e) => setForm({ ...form, techStack: e.target.value })}
                placeholder="React, Node.js, PostgreSQL"
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">GitHub Repository</label>
              <div className="relative">
                <Github className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={form.githubRepo || ""}
                  onChange={(e) => setForm({ ...form, githubRepo: e.target.value })}
                  placeholder="https://github.com/user/repo"
                  className="text-sm pl-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Live Demo</label>
              <div className="relative">
                <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={form.liveDemo || ""}
                  onChange={(e) => setForm({ ...form, liveDemo: e.target.value })}
                  placeholder="https://myproject.com"
                  className="text-sm pl-9"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowCreate(false)} className="text-sm">
                Cancel
              </Button>
              <Button size="sm" onClick={handleCreate} disabled={creating} className="text-sm">
                {creating ? "Creating..." : "Create Project"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
