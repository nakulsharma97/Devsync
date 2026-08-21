import { useCallback, useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LogOut,
  Sun,
  Moon,
  Monitor,
  GitBranch,
  Loader2,
  Unplug,
  User,
  Shield,
  Bell,
  Globe,
  Mail,
  AtSign,
} from "lucide-react";
import { useTheme } from "next-themes";
import { githubService, type GitHubConnection } from "@/services/githubService";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";

function SettingsSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-border/40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
            <Icon className="w-4 h-4 text-indigo-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

export default function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();

  const [github, setGithub] = useState<GitHubConnection | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const loadGithub = useCallback(async () => {
    try {
      setGithub(await githubService.getConnection());
    } catch {
      setGithub({
        connected: false,
        githubUsername: null,
        tokenScopes: null,
        connectedAt: null,
        lastSyncedAt: null,
      });
    }
  }, []);

  // Handle the OAuth callback landing (?github=connected|error=...)
  useEffect(() => {
    const flag = searchParams.get("github");
    if (flag) {
      if (flag === "connected") toast.success("GitHub connected");
      else if (flag.startsWith("error")) toast.error("GitHub connection failed");
      searchParams.delete("github");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    loadGithub();
  }, [loadGithub]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const url = await githubService.getAuthUrl();
      window.location.href = url;
    } catch (e) {
      toast.error(getErrorMessage(e, "GitHub integration is not configured"));
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm("Disconnect your GitHub account?")) return;
    setDisconnecting(true);
    try {
      await githubService.disconnect();
      setGithub({
        connected: false,
        githubUsername: null,
        tokenScopes: null,
        connectedAt: null,
        lastSyncedAt: null,
      });
      toast.success("GitHub disconnected");
    } catch {
      toast.error("Failed to disconnect GitHub");
    } finally {
      setDisconnecting(false);
    }
  };

  const themeOptions = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  return (
    <div className="max-w-[1060px] mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account preferences and integrations
        </p>
      </div>

      {/* Appearance */}
      <SettingsSection
        icon={Sun}
        title="Appearance"
        description="Choose your preferred theme"
      >
        <div className="grid grid-cols-3 gap-3 max-w-md">
          {themeOptions.map((opt) => {
            const Icon = opt.icon;
            const isActive = theme === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTheme(opt.value)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  isActive
                    ? "border-indigo-500 bg-indigo-500/5 text-foreground"
                    : "border-border/40 bg-muted/20 text-muted-foreground hover:border-indigo-500/30 hover:text-foreground"
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${isActive ? "text-indigo-500" : ""}`}
                />
                <span className="text-xs font-medium">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </SettingsSection>

      {/* GitHub Integration */}
      <SettingsSection
        icon={GitBranch}
        title="GitHub Integration"
        description="Connect your GitHub account to link repositories"
      >
        {github === null ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Checking connection...
          </div>
        ) : github.connected ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <GitBranch className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  Connected as @{github.githubUsername}
                </p>
                <p className="text-xs text-muted-foreground">
                  {github.connectedAt
                    ? `Connected ${new Date(github.connectedAt).toLocaleDateString()}`
                    : "GitHub account linked"}
                </p>
              </div>
              <Badge
                variant="secondary"
                className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              >
                Active
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="text-muted-foreground hover:text-red-600 hover:border-red-500/30"
            >
              {disconnecting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Unplug className="w-4 h-4 mr-2" />
              )}
              Disconnect GitHub
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Connect your GitHub account to link repositories to projects, track
              commits, issues, and pull requests.
            </p>
            <Button
              size="sm"
              onClick={handleConnect}
              disabled={connecting}
              className="bg-[#24292f] hover:bg-[#32383f] text-white dark:bg-[#f6f8fa] dark:hover:bg-[#e1e4e8] dark:text-[#24292f]"
            >
              {connecting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <svg
                  className="w-4 h-4 mr-2"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              )}
              Connect GitHub
            </Button>
          </div>
        )}
      </SettingsSection>

      {/* Account */}
      <SettingsSection
        icon={User}
        title="Account"
        description="Your account information"
      >
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-3 rounded-xl bg-muted/30 border border-border/30">
              <div className="flex items-center gap-2 mb-1">
                <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Email
                </span>
              </div>
              <p className="text-sm font-medium text-foreground">
                {user?.email}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-muted/30 border border-border/30">
              <div className="flex items-center gap-2 mb-1">
                <AtSign className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Username
                </span>
              </div>
              <p className="text-sm font-medium text-foreground">
                @{user?.username}
              </p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-3 rounded-xl bg-muted/30 border border-border/30">
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Role
                </span>
              </div>
              <p className="text-sm font-medium text-foreground capitalize">
                {user?.role?.toLowerCase() || "member"}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-muted/30 border border-border/30">
              <div className="flex items-center gap-2 mb-1">
                <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Provider
                </span>
              </div>
              <p className="text-sm font-medium text-foreground capitalize">
                {user?.authProvider?.toLowerCase() || "email"}
              </p>
            </div>
          </div>
        </div>
      </SettingsSection>

      {/* Security */}
      <SettingsSection
        icon={Shield}
        title="Security"
        description="Manage your account security"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-border/30">
            <div>
              <p className="text-sm font-medium text-foreground">Sign Out</p>
              <p className="text-xs text-muted-foreground">
                Sign out of your DevSync account on this device
              </p>
            </div>
            <Button variant="destructive" size="sm" onClick={logout}>
              <LogOut className="w-4 h-4 mr-2" /> Sign Out
            </Button>
          </div>
        </div>
      </SettingsSection>

      {/* Notifications */}
      <SettingsSection
        icon={Bell}
        title="Notifications"
        description="Manage how you receive notifications"
      >
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Notifications are delivered in-app and via WebSocket in real-time.
            You can manage individual notification preferences from the
            notifications page.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/notifications")}
            className="gap-1.5"
          >
            <Bell className="w-3.5 h-3.5" />
            View Notifications
          </Button>
        </div>
      </SettingsSection>
    </div>
  );
}
