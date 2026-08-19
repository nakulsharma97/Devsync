import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useApi } from "@/hooks/useApi";
import { userService } from "@/services/userService";
import { projectService, type PublicProjectSummaryDto } from "@/services/projectService";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, User, FolderKanban, Globe, UserPlus, Users, Check, Clock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Tab = "people" | "projects";

export default function SearchPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("people");
  const [query, setQuery] = useState("");
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const { data: users, loading: usersLoading } = useApi(
    () => (query.trim() ? userService.searchUsers(query) : Promise.resolve([])),
    [query]
  );

  const { data: discovered, loading: projectsLoading, refetch: refetchDiscovered } = useApi(
    () => (query.trim() ? projectService.discoverProjects(query) : projectService.discoverProjects()),
    [query]
  );

  // My project ids — used to show "Open" instead of "Request to Join" for
  // projects I'm already a member of.
  const { data: myProjects } = useApi(() => projectService.getMyProjects(), []);
  const myProjectIds = useMemo(
    () => new Set((myProjects ?? []).map((p) => p.id)),
    [myProjects]
  );

  // Request to join a PUBLIC project. Membership is granted only after the
  // owner approves; until then the card flips to a "Request Pending" state.
  const handleRequestJoin = useCallback(
    async (project: PublicProjectSummaryDto) => {
      setJoiningId(project.id);
      try {
        await projectService.requestJoin(project.id);
        toast(`Join request sent to the owner of ${project.name}`);
        // Re-fetch discovery so this card renders "Request Pending".
        refetchDiscovered();
      } catch (err: unknown) {
        toast(err instanceof Error ? err.message : "Failed to request to join");
      } finally {
        setJoiningId(null);
      }
    },
    [refetchDiscovered]
  );

  useEffect(() => {
    // Keep the tab bar sensible when a query is cleared.
    if (!query.trim()) {
      setTab("people");
    }
  }, [query]);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Search</h1>
        <p className="text-sm text-muted-foreground mt-1">Find developers and public projects</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search developers, or discover public projects…"
          className="pl-9 h-10"
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border/50">
        {(
          [
            { id: "people", label: "People" },
            { id: "projects", label: "Projects" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            aria-pressed={tab === t.id}
            className={cn(
              "px-3 py-2.5 text-xs border-b-2 transition-colors",
              tab === t.id
                ? "border-indigo-500 text-indigo-600 dark:text-indigo-300 font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* People */}
      {tab === "people" &&
        (usersLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
          </div>
        ) : users && users.length > 0 ? (
          <div className="space-y-2">
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/40 hover:border-indigo-500/20 transition-colors">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center text-xs font-bold text-indigo-400 overflow-hidden shrink-0">
                  {u.avatarUrl ? (
                    <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    u.fullName.charAt(0)
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{u.fullName}</p>
                  <p className="text-xs text-muted-foreground">@{u.username ?? "user"}</p>
                </div>
              </div>
            ))}
          </div>
        ) : query.trim() ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <User className="w-8 h-8 mx-auto mb-2 opacity-40" />
            No developers found
          </div>
        ) : null)}

      {/* Projects */}
      {tab === "projects" &&
        (projectsLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
          </div>
        ) : discovered && discovered.length > 0 ? (
          <div className="space-y-2">
            {discovered.map((p) => {
              const joined = myProjectIds.has(p.id);
              const pending = p.currentUserJoinRequestStatus === "PENDING";
              return (
                <div key={p.id} className="flex items-start gap-3 p-4 rounded-lg border border-border/40 hover:border-indigo-500/25 hover:bg-indigo-500/[0.02] transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/15 to-purple-500/10 flex items-center justify-center shrink-0">
                    <FolderKanban className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold">{p.name}</p>
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border border-emerald-500/25 bg-emerald-500/[0.07] text-emerald-600 dark:text-emerald-400">
                        <Globe className="w-2.5 h-2.5" />
                        Public
                      </span>
                    </div>
                    {p.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.description}</p>
                    )}
                    <p className="text-[11px] text-muted-foreground/70 mt-1.5 inline-flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {p.memberCount} member{p.memberCount !== 1 ? "s" : ""}
                      {p.ownerName && <><span className="text-muted-foreground/40">·</span> Owned by {p.ownerName}</>}
                    </p>
                  </div>
                  <div className="shrink-0">
                    {joined ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/projects/${p.id}`)}
                        className="text-xs"
                      >
                        <Check className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                        Open
                      </Button>
                    ) : pending ? (
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground border border-amber-500/30 bg-amber-500/[0.07] text-amber-600 dark:text-amber-400 rounded-lg px-3 py-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        Request Pending
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        disabled={joiningId === p.id}
                        onClick={() => handleRequestJoin(p)}
                        className="text-xs"
                      >
                        {joiningId === p.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <UserPlus className="w-3.5 h-3.5 mr-1" />
                        )}
                        Request to Join
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <FolderKanban className="w-8 h-8 mx-auto mb-2 opacity-40" />
            {query.trim() ? "No public projects found" : "Search to discover public projects"}
          </div>
        ))}
    </div>
  );
}
