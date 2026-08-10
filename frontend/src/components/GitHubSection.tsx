import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  githubService,
  type GitHubCommit,
  type GitHubIssue,
  type GitHubLink,
  type GitHubPullRequest,
  type GitHubRepo,
} from "@/services/githubService";
import {
  GitBranch,
  GitCommitHorizontal,
  GitPullRequest,
  Loader2,
  Unplug,
  Link2,
  CircleDot,
} from "lucide-react";
import { toast } from "sonner";

type Tab = "commits" | "issues" | "pulls";

export function GitHubSection({ projectId }: { projectId: string }) {
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [link, setLink] = useState<GitHubLink | null>(null);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState("");
  const [linking, setLinking] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tab, setTab] = useState<Tab | null>(null);
  const [commits, setCommits] = useState<GitHubCommit[]>([]);
  const [issues, setIssues] = useState<GitHubIssue[]>([]);
  const [pulls, setPulls] = useState<GitHubPullRequest[]>([]);
  const [tabLoading, setTabLoading] = useState(false);

  const loadBasics = useCallback(async () => {
    setInitializing(true);
    setError(null);
    try {
      const [conn, currentLink] = await Promise.all([
        githubService.getConnection(),
        githubService.getLink(projectId),
      ]);
      setConnected(conn.connected);
      setUsername(conn.githubUsername);
      setLink(currentLink);
      if (conn.connected && !currentLink) {
        setLoadingRepos(true);
        try {
          const repoList = await githubService.listRepos();
          setRepos(repoList);
        } catch (e: any) {
          if (e?.response?.status === 429) {
            setError("GitHub rate limit exceeded — try again in a minute");
          } else if (e?.response?.status === 401) {
            setError("GitHub connection expired — reconnect your account");
            setConnected(false);
          }
        } finally {
          setLoadingRepos(false);
        }
      }
    } catch {
      setError("Failed to load GitHub status");
    } finally {
      setInitializing(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadBasics();
  }, [loadBasics]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const url = await githubService.getAuthUrl();
      window.location.href = url; // full navigation to GitHub OAuth
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "GitHub integration is not configured");
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm("Disconnect your GitHub account?")) return;
    try {
      await githubService.disconnect();
      setConnected(false);
      setUsername(null);
      setLink(null);
      setRepos([]);
      setTab(null);
      toast.success("GitHub disconnected");
    } catch {
      toast.error("Failed to disconnect GitHub");
    }
  };

  const handleLink = async () => {
    if (!selectedRepo) return;
    setLinking(true);
    try {
      const newLink = await githubService.linkRepo(projectId, selectedRepo);
      setLink(newLink);
      toast.success(`Linked ${selectedRepo}`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to link repository");
    } finally {
      setLinking(false);
    }
  };

  const handleUnlink = async () => {
    if (!window.confirm("Unlink this GitHub repository from the project?")) return;
    setUnlinking(true);
    try {
      await githubService.unlinkRepo(projectId);
      setLink(null);
      setTab(null);
      toast.success("Repository unlinked");
    } catch {
      toast.error("Failed to unlink repository");
    } finally {
      setUnlinking(false);
    }
  };

  const openTab = async (next: Tab) => {
    setTab(next);
    setTabLoading(true);
    try {
      if (next === "commits") setCommits(await githubService.getCommits(projectId));
      if (next === "issues") setIssues(await githubService.getIssues(projectId, "open"));
      if (next === "pulls") setPulls(await githubService.getPullRequests(projectId, "open"));
    } catch (e: any) {
      setError(e?.response?.data?.message || "Failed to load GitHub data");
    } finally {
      setTabLoading(false);
    }
  };

  if (initializing) {
    return <div className="p-4 text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading GitHub...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">GitHub Integration</h2>
          {connected ? (
            <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 bg-emerald-500/10">
              Connected as @{username}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">Not connected</Badge>
          )}
        </div>
        {connected && (
          <Button variant="ghost" size="sm" onClick={handleDisconnect} className="text-muted-foreground">
            <Unplug className="w-3.5 h-3.5 mr-1" /> Disconnect
          </Button>
        )}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {!connected && (
        <div className="border border-border/40 rounded-xl p-4 text-sm">
          <p className="text-muted-foreground mb-3">
            Connect your GitHub account to link repositories, track commits, issues and pull requests.
          </p>
          <Button size="sm" onClick={handleConnect} disabled={connecting}>
            {connecting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <GitBranch className="w-4 h-4 mr-2" />}
            Connect GitHub
          </Button>
        </div>
      )}

      {connected && !link && (
        <div className="border border-border/40 rounded-xl p-4 space-y-3">
          <p className="text-sm text-muted-foreground">Link a repository to this project (one per project).</p>
          {loadingRepos ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading repositories…
            </div>
          ) : (
            <>
              <select
                value={selectedRepo}
                onChange={(e) => setSelectedRepo(e.target.value)}
                className="w-full text-sm bg-background border border-border/50 rounded-lg px-3 py-2"
              >
                <option value="">Select a repository…</option>
                {repos.map((r) => (
                  <option key={r.id} value={r.fullName}>
                    {r.fullName} {r.language ? `· ${r.language}` : ""} ⭐{r.stargazersCount}
                  </option>
                ))}
              </select>
              <Button size="sm" onClick={handleLink} disabled={!selectedRepo || linking}>
                {linking ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Link2 className="w-4 h-4 mr-2" />}
                Link repository
              </Button>
            </>
          )}
        </div>
      )}

      {connected && link && (
        <>
          <div className="border border-border/40 rounded-xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <a href={link.repoUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-indigo-500 hover:underline">
                  {link.repoFullName}
                </a>
                {link.repoDescription && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{link.repoDescription}</p>
                )}
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="outline">{link.repoVisibility}</Badge>
                  {link.repoLanguage && <Badge variant="outline">{link.repoLanguage}</Badge>}
                  <Badge variant="outline">{link.repoDefaultBranch}</Badge>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleUnlink} disabled={unlinking} className="text-muted-foreground">
                {unlinking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unplug className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-1 border-b border-border/40">
            {(["commits", "issues", "pulls"] as const).map((t) => (
              <button
                key={t}
                onClick={() => openTab(t)}
                className={`px-3 py-2 text-xs border-b-2 transition-colors capitalize ${
                  tab === t ? "border-accent text-accent" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "commits" && <GitCommitHorizontal className="w-3.5 h-3.5 inline mr-1" />}
                {t === "issues" && <CircleDot className="w-3.5 h-3.5 inline mr-1" />}
                {t === "pulls" && <GitPullRequest className="w-3.5 h-3.5 inline mr-1" />}
                {t}
              </button>
            ))}
          </div>

          {tabLoading && <div className="flex items-center gap-2 text-sm text-muted-foreground py-4"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>}

          {!tabLoading && tab === "commits" && (
            <ul className="divide-y divide-border/40 border border-border/40 rounded-xl">
              {commits.length === 0 && <li className="p-3 text-sm text-muted-foreground">No commits found</li>}
              {commits.map((c) => (
                <li key={c.sha} className="p-3 text-sm">
                  <p className="font-medium truncate">{c.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {c.authorLogin || c.authorName || "Unknown"} · {c.timestamp ? new Date(c.timestamp).toLocaleString() : ""}
                    <span className="ml-2 font-mono text-[10px]">{c.sha.slice(0, 7)}</span>
                  </p>
                </li>
              ))}
            </ul>
          )}

          {!tabLoading && tab === "issues" && (
            <ul className="divide-y divide-border/40 border border-border/40 rounded-xl">
              {issues.length === 0 && <li className="p-3 text-sm text-muted-foreground">No open issues</li>}
              {issues.map((i) => (
                <li key={i.number} className="p-3 text-sm">
                  <a href={i.htmlUrl} target="_blank" rel="noreferrer" className="font-medium text-indigo-500 hover:underline">
                    #{i.number} {i.title}
                  </a>
                  <p className="text-xs text-muted-foreground mt-1">
                    {i.authorLogin} · {i.labels.join(", ") || "no labels"}
                    {i.assigneeLogin ? ` · assigned to ${i.assigneeLogin}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}

          {!tabLoading && tab === "pulls" && (
            <ul className="divide-y divide-border/40 border border-border/40 rounded-xl">
              {pulls.length === 0 && <li className="p-3 text-sm text-muted-foreground">No open pull requests</li>}
              {pulls.map((p) => (
                <li key={p.number} className="p-3 text-sm">
                  <a href={p.htmlUrl} target="_blank" rel="noreferrer" className="font-medium text-indigo-500 hover:underline">
                    #{p.number} {p.title}
                  </a>
                  <p className="text-xs text-muted-foreground mt-1">
                    {p.authorLogin} · {p.reviewStatus} · {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
