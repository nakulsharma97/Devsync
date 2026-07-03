import { useDevSyncAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  FolderGit2,
  Rss,
  Users,
  Bookmark,
  TrendingUp,
  ArrowRight,
  Database,
  Server,
  Activity,
} from "lucide-react";
import { projectService } from "@/services/projectService";
import {
  checkHealth,
  fetchMetrics,
  formatBytes,
  formatUptime,
  type HealthStatus,
  type SystemMetrics,
} from "@/services/api";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DashboardStats {
  projects: number;
  posts: number;
  teams: number;
  bookmarks: number;
  repos: number;
  connections: number;
}

export default function Dashboard() {
  const { user } = useDevSyncAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    projects: 0, posts: 0, teams: 0, bookmarks: 0, repos: 0, connections: 0,
  });
  const [recentProjects, setRecentProjects] = useState<any[]>([]);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const projects = await projectService.getAll();
        setRecentProjects(projects.slice(0, 4));
        setStats((prev) => ({ ...prev, projects: projects.length }));
      } catch { /* API not available */ }
    })();
  }, []);

  // Poll backend health and metrics every 30 seconds
  useEffect(() => {
    const poll = async () => {
      try {
        const [healthData, metricsData] = await Promise.all([
          checkHealth(),
          fetchMetrics(),
        ]);
        setHealth(healthData);
        setMetrics(metricsData);
      } catch {
        setHealth({ status: "DOWN" });
        setMetrics(null);
      }
    };
    poll();
    const interval = setInterval(poll, 30000);
    return () => clearInterval(interval);
  }, []);

  const apiStatus = health?.status ?? null;
  const dbStatus = health?.components?.db?.status ??
    (apiStatus === "DOWN" ? "DOWN" :
     apiStatus === "UP" ? "UP" : null);

  const statCards = [
    { icon: FolderGit2, label: "Projects", value: stats.projects, href: "/projects", color: "text-accent" },
    { icon: Rss, label: "Posts", value: stats.posts, href: "/feed", color: "text-accent" },
    { icon: Users, label: "Teams", value: stats.teams, href: "/teams", color: "text-accent" },
    { icon: Bookmark, label: "Bookmarks", value: stats.bookmarks, href: "/bookmarks", color: "text-accent" },
    { icon: TrendingUp, label: "Connections", value: stats.connections, href: "#", color: "text-muted-foreground" },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      {/* Welcome */}
      <div className="mb-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Welcome back, <span className="text-foreground font-medium">{user?.fullName || "Developer"}</span>.
            </p>
          </div>

          {/* Health Status Indicator */}
          <div className="flex items-center gap-3">
            {/* API Status */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Server className="w-3.5 h-3.5" />
              <span>API</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className={`inline-block w-2 h-2 rounded-full cursor-pointer ${
                      apiStatus === "UP" ? "bg-green-500" : apiStatus === "DOWN" ? "bg-red-500" : "bg-muted-foreground/30 animate-pulse"
                    }`}
                  />
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {apiStatus === "UP"
                    ? "API is healthy"
                    : apiStatus === "DOWN"
                    ? "API is unreachable"
                    : "Checking API status..."}
                </TooltipContent>
              </Tooltip>
            </div>
            {/* Database Status */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Database className="w-3.5 h-3.5" />
              <span>DB</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className={`inline-block w-2 h-2 rounded-full cursor-pointer ${
                      dbStatus === "UP" ? "bg-green-500" : dbStatus === "DOWN" ? "bg-red-500" : apiStatus === "DOWN" ? "bg-red-500" : "bg-muted-foreground/30 animate-pulse"
                    }`}
                  />
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {dbStatus === "UP"
                    ? "Database is connected"
                    : dbStatus === "DOWN"
                    ? "Database connection failed"
                    : "Checking database status..."}
                </TooltipContent>
              </Tooltip>
            </div>
            {health && (
              <Activity className="w-3 h-3 text-muted-foreground/50" />
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
        {statCards.map((stat, i) => (
          <motion.button
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            onClick={() => stat.href !== "#" && navigate(stat.href)}
            className="bg-card border border-border/50 rounded-xl p-5 flex flex-col items-center text-center gap-2 transition-all duration-200 hover:border-accent/30 hover:shadow-sm hover:bg-accent/5"
          >
            <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center ring-1 ring-accent/20">
              <stat.icon className={`w-4.5 h-4.5 ${stat.color}`} />
            </div>
            <span className="text-xl font-bold text-foreground">{stat.value}</span>
            <span className="text-xs text-muted-foreground">{stat.label}</span>
          </motion.button>
        ))}
      </div>

      {/* System Metrics */}
      {metrics && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">System Metrics</h2>
            <span className="text-[10px] text-muted-foreground">Updates every 30s</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Memory */}
            <div className="bg-card border border-border/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center ring-1 ring-accent/20">
                  <Database className="w-3.5 h-3.5 text-accent" />
                </div>
                <span className="text-xs font-medium text-foreground">Memory</span>
              </div>
              <p className="text-sm font-bold text-foreground">{formatBytes(metrics.memoryUsed)}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                of {formatBytes(metrics.memoryMax)}
              </p>
              {metrics.memoryMax > 0 && (
                <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent transition-all duration-500"
                    style={{ width: `${Math.min(100, (metrics.memoryUsed / metrics.memoryMax) * 100)}%` }}
                  />
                </div>
              )}
            </div>

            {/* CPU */}
            <div className="bg-card border border-border/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center ring-1 ring-accent/20">
                  <TrendingUp className="w-3.5 h-3.5 text-accent" />
                </div>
                <span className="text-xs font-medium text-foreground">CPU</span>
              </div>
              <p className="text-sm font-bold text-foreground">
                {metrics.cpuUsage !== null ? `${(metrics.cpuUsage * 100).toFixed(1)}%` : "--"}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">System usage</p>
              {metrics.cpuUsage !== null && (
                <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, metrics.cpuUsage * 100)}%`,
                      backgroundColor: metrics.cpuUsage > 0.7 ? "#ef4444" : metrics.cpuUsage > 0.4 ? "#f59e0b" : "hsl(var(--accent))",
                    }}
                  />
                </div>
              )}
            </div>

            {/* Threads */}
            <div className="bg-card border border-border/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center ring-1 ring-accent/20">
                  <Activity className="w-3.5 h-3.5 text-accent" />
                </div>
                <span className="text-xs font-medium text-foreground">Threads</span>
              </div>
              <p className="text-sm font-bold text-foreground">{metrics.threads}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Live threads</p>
            </div>

            {/* Uptime */}
            <div className="bg-card border border-border/50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center ring-1 ring-accent/20">
                  <Server className="w-3.5 h-3.5 text-accent" />
                </div>
                <span className="text-xs font-medium text-foreground">Uptime</span>
              </div>
              <p className="text-sm font-bold text-foreground">{formatUptime(metrics.uptime)}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Since last restart</p>
            </div>
          </div>
        </div>
      )}

      {/* Recent Projects */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground">Recent Projects</h2>
          <button onClick={() => navigate("/projects")}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        {recentProjects.length === 0 ? (
          <div className="border border-border/50 rounded-xl p-8 flex items-center justify-center bg-card">
            <p className="text-sm text-muted-foreground">
              No projects yet.{" "}
              <button onClick={() => navigate("/projects")}
                className="text-accent underline underline-offset-2 hover:no-underline">
                Create your first project
              </button>
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {recentProjects.map((project) => (
              <div key={project.id}
                className="border border-border/50 rounded-xl p-4 hover:border-accent/30 transition-all duration-200 cursor-pointer bg-card hover:shadow-sm hover:bg-accent/5"
                onClick={() => navigate(`/projects/${project.id}`)}>
                <h3 className="text-sm font-medium text-foreground mb-1">{project.title}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2">{project.description}</p>
                {project.techStack && (
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {project.techStack.split(",").map((t: string) => (
                      <span key={t.trim()} className="text-[10px] px-1.5 py-0.5 rounded-md bg-accent/10 text-accent">
                        {t.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: "Create a project", href: "/projects" },
            { label: "Browse feed", href: "/feed" },
            { label: "Find a team", href: "/teams" },
          ].map((action) => (
            <button key={action.label} onClick={() => navigate(action.href)}
              className="bg-card border border-border/50 rounded-xl px-4 py-3.5 text-sm text-foreground hover:border-accent/30 transition-all duration-200 text-left hover:shadow-sm hover:bg-accent/5 inline-flex items-center justify-between group">
              {action.label}
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-accent transition-colors" />
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
