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
} from "lucide-react";
import { projectService } from "@/services/projectService";

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
};

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
    projects: 0,
    posts: 0,
    teams: 0,
    bookmarks: 0,
    repos: 0,
    connections: 0,
  });
  const [recentProjects, setRecentProjects] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const projects = await projectService.getAll();
        setRecentProjects(projects.slice(0, 4));
        setStats((prev) => ({ ...prev, projects: projects.length }));
      } catch {
        // API not available yet
      }
    };
    fetchData();
  }, []);

  const statCards = [
    { icon: FolderGit2, label: "Projects", value: stats.projects, href: "/projects" },
    { icon: Rss, label: "Posts", value: stats.posts, href: "/feed" },
    { icon: Users, label: "Teams", value: stats.teams, href: "/teams" },
    { icon: Bookmark, label: "Bookmarks", value: stats.bookmarks, href: "/bookmarks" },
    { icon: TrendingUp, label: "Connections", value: stats.connections, href: "#" },
  ];

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={{ animate: { transition: { staggerChildren: 0.05 } } }}
    >
      {/* Welcome Section */}
      <motion.div variants={fadeUp} className="mb-10">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Dashboard
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Welcome back, {user?.fullName || "Developer"}. Here's your overview.
        </p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        variants={fadeUp}
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-px bg-border rounded-lg overflow-hidden mb-8"
      >
        {statCards.map((stat) => (
          <button
            key={stat.label}
            onClick={() => stat.href !== "#" && navigate(stat.href)}
            className="bg-card p-5 flex flex-col items-center text-center gap-2 transition-colors hover:bg-accent/50 cursor-pointer"
          >
            <stat.icon className="w-5 h-5 text-foreground" />
            <span className="text-lg font-semibold text-foreground">{stat.value}</span>
            <span className="text-xs text-muted-foreground">{stat.label}</span>
          </button>
        ))}
      </motion.div>

      {/* Recent Projects Section */}
      <motion.div variants={fadeUp} className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground">Recent Projects</h2>
          <button
            onClick={() => navigate("/projects")}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            View all
          </button>
        </div>
        {recentProjects.length === 0 ? (
          <div className="border border-border rounded-lg p-8 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">
              No projects yet.{" "}
              <button
                onClick={() => navigate("/projects")}
                className="text-foreground underline underline-offset-2 hover:no-underline"
              >
                Create your first project
              </button>
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {recentProjects.map((project) => (
              <div
                key={project.id}
                className="border border-border rounded-lg p-4 hover:bg-accent/50 transition-colors cursor-pointer"
                onClick={() => navigate(`/projects/${project.id}`)}
              >
                <h3 className="text-sm font-medium text-foreground mb-1">{project.title}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2">{project.description}</p>
                {project.techStack && (
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {project.techStack.split(",").map((t: string) => (
                      <span
                        key={t.trim()}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground"
                      >
                        {t.trim()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Get Started Prompt */}
      <motion.div variants={fadeUp}>
        <h2 className="text-sm font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="border border-border rounded-lg p-6 flex flex-col sm:flex-row gap-3">
          <QuickActionButton label="Create a project" href="/projects" />
          <QuickActionButton label="Browse feed" href="/feed" />
          <QuickActionButton label="Find a team" href="/teams" />
        </div>
      </motion.div>
    </motion.div>
  );
}

function QuickActionButton({ label, href }: { label: string; href: string }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(href)}
      className="flex-1 px-4 py-3 rounded-md border border-border text-sm text-foreground hover:bg-accent/50 transition-colors text-left"
    >
      {label}
    </button>
  );
}
