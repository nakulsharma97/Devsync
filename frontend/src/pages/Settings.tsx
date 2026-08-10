import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, Sun, Moon, GitBranch, Loader2, Unplug } from "lucide-react";
import { useTheme } from "next-themes";
import { githubService, type GitHubConnection } from "@/services/githubService";
import { toast } from "sonner";

export default function Settings() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();

  const [github, setGithub] = useState<GitHubConnection | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const loadGithub = useCallback(async () => {
    try {
      setGithub(await githubService.getConnection());
    } catch {
      setGithub({ connected: false, githubUsername: null, tokenScopes: null, connectedAt: null, lastSyncedAt: null });
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
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "GitHub integration is not configured");
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm("Disconnect your GitHub account?")) return;
    setDisconnecting(true);
    try {
      await githubService.disconnect();
      setGithub({ connected: false, githubUsername: null, tokenScopes: null, connectedAt: null, lastSyncedAt: null });
      toast.success("GitHub disconnected");
    } catch {
      toast.error("Failed to disconnect GitHub");
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your preferences</p>
      </div>

      <Card className="border-border/40">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="w-full sm:w-auto"
          >
            {theme === "dark" ? <Sun className="w-4 h-4 mr-2" /> : <Moon className="w-4 h-4 mr-2" />}
            Switch to {theme === "dark" ? "Light" : "Dark"} mode
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/40">
        <CardHeader>
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-muted-foreground" />
            GitHub
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {github === null ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Checking connection…
            </div>
          ) : github.connected ? (
            <>
              <div className="text-sm">
                <span className="text-muted-foreground">Connected as </span>
                <span className="font-medium">@{github.githubUsername}</span>
                {github.tokenScopes && (
                  <Badge variant="outline" className="ml-2 text-[10px]">{github.tokenScopes}</Badge>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={handleDisconnect} disabled={disconnecting}>
                {disconnecting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Unplug className="w-4 h-4 mr-2" />}
                Disconnect GitHub
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Connect your GitHub account to link repositories to projects and track commits, issues and pull requests.
              </p>
              <Button size="sm" onClick={handleConnect} disabled={connecting}>
                {connecting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <GitBranch className="w-4 h-4 mr-2" />}
                Connect GitHub
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/40">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm">
            <span className="text-muted-foreground">Signed in as </span>
            <span className="font-medium">{user?.email}</span>
          </div>
          <Button variant="destructive" size="sm" onClick={logout}>
            <LogOut className="w-4 h-4 mr-2" /> Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
