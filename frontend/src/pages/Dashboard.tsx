import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/hooks/useApi";
import { projectService, type ProjectDto } from "@/services/projectService";
import { notificationService } from "@/services/notificationService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FolderKanban, Bell, Plus, Loader2, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: projects, loading: projectsLoading } = useApi(() => projectService.getMyProjects());
  const { data: unreadCount } = useApi(() => notificationService.getUnreadCount());

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome, {user?.fullName?.split(" ")[0] || "Developer"}</h1>
          <p className="text-sm text-muted-foreground mt-1">Here's your development overview</p>
        </div>
        <Button onClick={() => navigate("/projects")} className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
          <Plus className="w-4 h-4 mr-1.5" /> New Project
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="border-border/40 hover:border-indigo-500/30 transition-colors cursor-pointer" onClick={() => navigate("/projects")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FolderKanban className="w-4 h-4 text-indigo-400" />
              Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{projectsLoading ? "..." : projects?.length || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Total projects</p>
          </CardContent>
        </Card>

        <Card className="border-border/40 hover:border-indigo-500/30 transition-colors cursor-pointer" onClick={() => navigate("/notifications")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-400" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{unreadCount ?? "..."}</p>
            <p className="text-xs text-muted-foreground mt-1">Unread</p>
          </CardContent>
        </Card>

        <Card className="border-border/40 hover:border-indigo-500/30 transition-colors cursor-pointer" onClick={() => navigate("/messages")}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              Messages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Team chats & DMs</p>
            <Button variant="link" className="p-0 h-auto text-xs text-indigo-400 mt-2">
              Open messages <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/40">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Recent Projects</CardTitle>
        </CardHeader>
        <CardContent>
          {projectsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
            </div>
          ) : projects && projects.length > 0 ? (
            <div className="space-y-2">
              {projects.slice(0, 5).map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-border/40 hover:border-indigo-500/20 transition-colors cursor-pointer" onClick={() => navigate(`/board/${p.id}`)}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
                      <FolderKanban className="w-4 h-4 text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.memberCount} member{p.memberCount !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                  <span className="text-xs text-indigo-400">{p.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FolderKanban className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No projects yet</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate("/projects")}>
                Create your first project
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
