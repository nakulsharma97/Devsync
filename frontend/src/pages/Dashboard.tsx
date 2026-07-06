import { useDevSyncAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
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
  BarChart3,
  Sparkles,
  Send,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { projectService } from "@/services/projectService";
import { bookmarkService } from "@/services/bookmarkService";
import { postService } from "@/services/postService";
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
  const [metricHistory, setMetricHistory] = useState<
    Array<{ time: string; memoryPercent: number; cpuPercent: number | null }>
  >([]);

  useEffect(() => {
    (async () => {
      try {
        const [projects, bookmarks, feed] = await Promise.all([
          projectService.getAll(),
          bookmarkService.getAll(),
          postService.getFeed(0, 20),
        ]);
        setRecentProjects(projects.slice(0, 4));
        setStats((prev) => ({
          ...prev,
          projects: projects.length,
          bookmarks: bookmarks.length,
          posts: feed.content.length,
        }));
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

        // Accumulate metric history for charts
        if (metricsData) {
          const memoryPercent =
            metricsData.memoryMax > 0
              ? Math.round((metricsData.memoryUsed / metricsData.memoryMax) * 100)
              : 0;
          const cpuPercent =
            metricsData.cpuUsage !== null
              ? Math.round(metricsData.cpuUsage * 100)
              : null;
          const now = new Date();
          const timeLabel = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

          setMetricHistory((prev) => {
            const next = [
              ...prev,
              { time: timeLabel, memoryPercent, cpuPercent },
            ];
            return next.length > 20 ? next.slice(next.length - 20) : next;
          });
        }
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
    <div className="relative">
      {/* Subtle background decoration */}
      <div className="absolute -top-20 -right-20 w-72 h-72 bg-gradient-to-bl from-accent/[0.03] to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-gradient-to-tr from-purple-500/[0.02] to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Welcome */}
      <div className="mb-10 relative">
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8 relative">
        {statCards.map((stat, i) => (
          <motion.button
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            onClick={() => stat.href !== "#" && navigate(stat.href)}
            className="group relative bg-card border border-border/50 rounded-xl p-5 flex flex-col items-center text-center gap-2 transition-all duration-300 hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5 hover:-translate-y-0.5 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent/15 to-accent/5 flex items-center justify-center ring-1 ring-accent/20 group-hover:ring-accent/30 group-hover:scale-105 transition-all duration-200">
              <stat.icon className={`w-4.5 h-4.5 ${stat.color}`} />
            </div>
            <span className="text-xl font-bold text-foreground group-hover:text-accent transition-colors duration-200">{stat.value}</span>
            <span className="text-xs text-muted-foreground">{stat.label}</span>
          </motion.button>
        ))}
      </div>

      {/* System Metrics */}
      {metrics && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-accent/10 flex items-center justify-center">
                <BarChart3 className="w-3 h-3 text-accent" />
              </div>
              <h2 className="text-sm font-semibold text-foreground">System Metrics</h2>
            </div>
            <span className="text-[10px] text-muted-foreground/60">Updates every 30s</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Memory */}
            <div className="group relative bg-card border border-border/50 rounded-xl p-4 transition-all duration-300 hover:border-accent/30 hover:shadow-md hover:shadow-accent/5 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              <div className="flex items-center gap-2 mb-2 relative">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent/15 to-accent/5 flex items-center justify-center ring-1 ring-accent/20 group-hover:ring-accent/30 transition-all duration-200">
                  <Database className="w-3.5 h-3.5 text-accent" />
                </div>
                <span className="text-xs font-medium text-foreground">Memory</span>
              </div>
              <p className="text-sm font-bold text-foreground group-hover:text-accent transition-colors duration-200">{formatBytes(metrics.memoryUsed)}</p>
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
            <div className="group relative bg-card border border-border/50 rounded-xl p-4 transition-all duration-300 hover:border-accent/30 hover:shadow-md hover:shadow-accent/5 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              <div className="flex items-center gap-2 mb-2 relative">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent/15 to-accent/5 flex items-center justify-center ring-1 ring-accent/20 group-hover:ring-accent/30 transition-all duration-200">
                  <TrendingUp className="w-3.5 h-3.5 text-accent" />
                </div>
                <span className="text-xs font-medium text-foreground">CPU</span>
              </div>
              <p className="text-sm font-bold text-foreground group-hover:text-accent transition-colors duration-200">
                {metrics.cpuUsage !== null ? `${(metrics.cpuUsage * 100).toFixed(1)}%` : "--"}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">System usage</p>
              {metrics.cpuUsage !== null && (
                <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, metrics.cpuUsage * 100)}%`,
                      backgroundColor: metrics.cpuUsage > 0.7 ? "#ef4444" : metrics.cpuUsage > 0.4 ? "#f59e0b" : "var(--accent)",
                    }}
                  />
                </div>
              )}
            </div>

            {/* Threads */}
            <div className="group relative bg-card border border-border/50 rounded-xl p-4 transition-all duration-300 hover:border-accent/30 hover:shadow-md hover:shadow-accent/5 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              <div className="flex items-center gap-2 mb-2 relative">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent/15 to-accent/5 flex items-center justify-center ring-1 ring-accent/20 group-hover:ring-accent/30 transition-all duration-200">
                  <Activity className="w-3.5 h-3.5 text-accent" />
                </div>
                <span className="text-xs font-medium text-foreground">Threads</span>
              </div>
              <p className="text-sm font-bold text-foreground group-hover:text-accent transition-colors duration-200">{metrics.threads}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Live threads</p>
            </div>

            {/* Uptime */}
            <div className="group relative bg-card border border-border/50 rounded-xl p-4 transition-all duration-300 hover:border-accent/30 hover:shadow-md hover:shadow-accent/5 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              <div className="flex items-center gap-2 mb-2 relative">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent/15 to-accent/5 flex items-center justify-center ring-1 ring-accent/20 group-hover:ring-accent/30 transition-all duration-200">
                  <Server className="w-3.5 h-3.5 text-accent" />
                </div>
                <span className="text-xs font-medium text-foreground">Uptime</span>
              </div>
              <p className="text-sm font-bold text-foreground group-hover:text-accent transition-colors duration-200">{formatUptime(metrics.uptime)}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Since last restart</p>
            </div>
          </div>
        </div>
      )}

      {/* Metrics History Chart */}
      {metricHistory.length > 1 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Metrics History</h2>
            </div>
            <span className="text-[10px] text-muted-foreground">Last ~10 min</span>
          </div>
          <div className="bg-card border border-border/50 rounded-xl p-4">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={metricHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                  width={36}
                />
                <RechartsTooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value: number, name: string) => [
                    `${value}%`,
                    name === "memoryPercent" ? "Memory" : "CPU",
                  ]}
                  labelFormatter={(label) => `Time: ${label}`}
                />
                <Line
                  type="monotone"
                  dataKey="memoryPercent"
                  stroke="hsl(var(--accent))"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3, fill: "hsl(var(--accent))" }}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="cpuPercent"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 3, fill: "#f59e0b" }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/50">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 rounded bg-accent" />
                <span className="text-[10px] text-muted-foreground">Memory</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 rounded bg-amber-500" />
                <span className="text-[10px] text-muted-foreground">CPU</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Projects */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-accent/10 flex items-center justify-center">
              <FolderGit2 className="w-3 h-3 text-accent" />
            </div>
            <h2 className="text-sm font-semibold text-foreground">Recent Projects</h2>
          </div>
          <button onClick={() => navigate("/projects")}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        {recentProjects.length === 0 ? (
          <div className="border border-border/50 rounded-xl p-10 flex items-center justify-center bg-card relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.02] to-transparent pointer-events-none" />
            <p className="text-sm text-muted-foreground relative">
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
                className="group relative border border-border/50 rounded-xl p-4 transition-all duration-300 cursor-pointer bg-card hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5 hover:-translate-y-0.5 overflow-hidden"
                onClick={() => navigate(`/projects/${project.id}`)}>
                <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                <h3 className="text-sm font-medium text-foreground mb-1 relative group-hover:text-accent transition-colors duration-200">{project.title}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2 relative">{project.description}</p>
                {project.techStack && (
                  <div className="flex gap-1.5 mt-2 flex-wrap relative">
                    {project.techStack.split(",").map((t: string) => (
                      <span key={t.trim()} className="text-[10px] px-1.5 py-0.5 rounded-md bg-gradient-to-r from-accent/15 to-accent/5 text-accent border border-accent/20">
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
        <div className="flex items-center gap-2 mb-4">
          <div className="w-5 h-5 rounded-md bg-accent/10 flex items-center justify-center">
            <Sparkles className="w-3 h-3 text-accent" />
          </div>
          <h2 className="text-sm font-semibold text-foreground">Quick Actions</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: "Create a project", href: "/projects" },
            { label: "Browse feed", href: "/feed" },
            { label: "Find a team", href: "/teams" },
          ].map((action) => (
            <button key={action.label} onClick={() => navigate(action.href)}
              className="group relative bg-card border border-border/50 rounded-xl px-4 py-3.5 text-sm text-foreground hover:border-accent/30 transition-all duration-300 text-left hover:shadow-lg hover:shadow-accent/5 hover:-translate-y-0.5 inline-flex items-center justify-between overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              <span className="relative group-hover:text-accent transition-colors duration-200">{action.label}</span>
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-accent transition-colors relative" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
