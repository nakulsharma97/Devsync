import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Plus, FolderGit2, ExternalLink, Github, Trash2, Send, Check } from "lucide-react";
import { projectService, type Project, type ProjectRequest } from "@/services/projectService";
import { postService } from "@/services/postService";

const emptyForm: ProjectRequest = { title: "", description: "", techStack: "", githubRepo: "", liveDemo: "", tags: [] };

export default function Projects() {
  const [showCreate, setShowCreate] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<ProjectRequest>(emptyForm);

  const fetchProjects = async () => {
    try { setProjects(await projectService.getAll()); }
    catch { /* API not available */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchProjects(); }, []);

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    setCreating(true);
    try {
      await projectService.create(form);
      setShowCreate(false);
      setForm(emptyForm);
      await fetchProjects();
    } catch (err) { console.error("Failed to create project:", err); }
    finally { setCreating(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this project?")) return;
    try { await projectService.delete(id); await fetchProjects(); }
    catch (err) { console.error("Failed to delete project:", err); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">Showcase your work</p>
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)} className="text-sm shadow-sm">
          <Plus className="w-4 h-4 mr-1.5" /> New Project
        </Button>
      </div>

      {loading && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-border/50 rounded-xl p-5 animate-pulse bg-card">
              <div className="h-4 bg-muted rounded w-2/3 mb-3" />
              <div className="h-3 bg-muted rounded w-full mb-2" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {!loading && projects.length === 0 && (
        <div className="border border-border/50 rounded-xl p-12 flex flex-col items-center text-center gap-4 bg-card">
          <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center ring-1 ring-accent/20">
            <FolderGit2 className="w-6 h-6 text-accent" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">No projects yet</h3>
            <p className="text-sm text-muted-foreground mt-1">Create your first project to showcase your work.</p>
          </div>
          <Button size="sm" onClick={() => setShowCreate(true)} className="text-sm shadow-sm">
            <Plus className="w-4 h-4 mr-1.5" /> Create Project
          </Button>
        </div>
      )}

      {!loading && projects.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <div key={project.id} className="border border-border/50 rounded-xl p-5 bg-card hover:border-accent/30 transition-all duration-200 hover:shadow-sm group">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">{project.title}</h3>
                <button onClick={() => handleDelete(project.id)}
                  className="opacity-0 group-hover:opacity-100 transition-all text-muted-foreground hover:text-destructive p-1 -mr-1 -mt-1">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed mb-3">
                {project.description || "No description provided."}
              </p>
              {project.techStack && (
                <div className="flex gap-1.5 flex-wrap mb-3">
                  {project.techStack.split(",").map((t) => (
                    <span key={t.trim()} className="text-[10px] px-1.5 py-0.5 rounded-md bg-accent/10 text-accent">
                      {t.trim()}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-3">
                {project.githubRepo && (
                  <a href={project.githubRepo} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1">
                    <Github className="w-3 h-3" /> Code
                  </a>
                )}
                {project.liveDemo && (
                  <a href={project.liveDemo} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" /> Demo
                  </a>
                )}
                <ShareButton project={project} />
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold tracking-tight">New Project</DialogTitle>
            <DialogDescription className="text-sm">Share your project with the community.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Title</label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="My Awesome Project" className="text-sm bg-background" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Description</label>
              <Textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe your project..." rows={3} className="text-sm resize-none bg-background" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Tech Stack</label>
              <Input value={form.techStack || ""} onChange={(e) => setForm({ ...form, techStack: e.target.value })} placeholder="React, Node.js, PostgreSQL" className="text-sm bg-background" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">GitHub Repository</label>
              <div className="relative">
                <Github className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={form.githubRepo || ""} onChange={(e) => setForm({ ...form, githubRepo: e.target.value })} placeholder="https://github.com/user/repo" className="text-sm pl-9 bg-background" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Live Demo</label>
              <div className="relative">
                <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={form.liveDemo || ""} onChange={(e) => setForm({ ...form, liveDemo: e.target.value })} placeholder="https://myproject.com" className="text-sm pl-9 bg-background" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowCreate(false)} className="text-sm">Cancel</Button>
              <Button size="sm" onClick={handleCreate} disabled={creating} className="text-sm shadow-sm">
                {creating ? "Creating..." : "Create Project"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Share a project to the Feed as a post */
function ShareButton({ project }: { project: Project }) {
  const [shared, setShared] = useState(false);
  const [sharing, setSharing] = useState(false);

  const handleShare = async () => {
    if (shared || sharing) return;
    setSharing(true);
    try {
      let content = `🚀 Just shared my project: **${project.title}**`;
      if (project.description) {
        content += `\n\n${project.description.slice(0, 200)}`;
      }
      if (project.techStack) {
        content += `\n\nBuilt with: ${project.techStack}`;
      }
      if (project.liveDemo) {
        content += `\n\n🔗 ${project.liveDemo}`;
      }
      await postService.create({ content });
      setShared(true);
      setTimeout(() => setShared(false), 3000);
    } catch (err) {
      console.error("Failed to share project:", err);
    } finally {
      setSharing(false);
    }
  };

  return (
    <button
      onClick={handleShare}
      disabled={sharing || shared}
      className={`text-xs transition-colors inline-flex items-center gap-1 ${
        shared
          ? "text-green-500"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {shared ? (
        <><Check className="w-3 h-3" /> Shared</>
      ) : sharing ? (
        <><Send className="w-3 h-3 animate-pulse" /> Sharing...</>
      ) : (
        <><Send className="w-3 h-3" /> Share</>
      )}
    </button>
  );
}
