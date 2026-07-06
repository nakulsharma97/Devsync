import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Search, Users, FolderGit2, Bookmark, User, UserPlus, UserCheck } from "lucide-react";
import { searchService, type SearchResults } from "@/services/searchService";
import { connectionService } from "@/services/connectionService";
import { useDevSyncAuth } from "@/contexts/AuthContext";

type TabKey = "developers" | "projects" | "bookmarks";

/** Follow button component */
function FollowButton({ userId }: { userId: string }) {
  const { user: currentUser } = useDevSyncAuth();
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentUser || currentUser.id === userId) return;
    connectionService.isFollowing(userId).then(setFollowing).catch(() => {});
  }, [userId, currentUser]);

  if (!currentUser || currentUser.id === userId) return null;

  const handleToggle = async () => {
    setLoading(true);
    try {
      if (following) {
        await connectionService.unfollow(userId);
        setFollowing(false);
      } else {
        await connectionService.follow(userId);
        setFollowing(true);
      }
    } catch {}
    finally { setLoading(false); }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition-all shrink-0 ${
        following
          ? "bg-accent/10 text-accent border border-accent/20 hover:bg-accent/15"
          : "bg-accent text-white hover:bg-accent/90 shadow-sm"
      }`}
    >
      {loading ? (
        <span className="w-3 h-3 border-2 border-current/30 border-t-current rounded-full animate-spin" />
      ) : following ? (
        <><UserCheck className="w-3 h-3" /> Following</>
      ) : (
        <><UserPlus className="w-3 h-3" /> Follow</>
      )}
    </button>
  );
}

/** Developer card with follow button */
function DevUserCard({ dev }: { dev: any }) {
  return (
    <div className="border border-border/50 rounded-xl p-4 flex items-center gap-3 bg-card hover:border-accent/20 transition-colors">
      <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center ring-1 ring-accent/20 shrink-0">
        {dev.avatarUrl ? <img src={dev.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" /> : <User className="w-4 h-4 text-accent" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{dev.fullName || dev.username}</p>
        <p className="text-xs text-muted-foreground">@{dev.username}</p>
      </div>
      <FollowButton userId={dev.id} />
    </div>
  );
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("developers");

  useEffect(() => { const t = setTimeout(() => setDebouncedQuery(query), 300); return () => clearTimeout(t); }, [query]);

  const doSearch = useCallback(async () => {
    if (!debouncedQuery.trim()) { setResults(null); return; }
    setLoading(true);
    try { setResults(await searchService.search(debouncedQuery)); }
    catch { setResults({ developers: [], projects: [], bookmarks: [] }); }
    finally { setLoading(false); }
  }, [debouncedQuery]);

  useEffect(() => { doSearch(); }, [doSearch]);

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: "developers", label: "Developers", icon: <Users className="w-3.5 h-3.5" /> },
    { key: "projects", label: "Projects", icon: <FolderGit2 className="w-3.5 h-3.5" /> },
    { key: "bookmarks", label: "Repositories", icon: <Bookmark className="w-3.5 h-3.5" /> },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Search</h1>
        <p className="mt-1 text-sm text-muted-foreground">Find developers, projects, and repositories</p>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search developers, projects, repos..." className="text-sm pl-9 h-10 bg-background" autoFocus />
      </div>

      {results && (
        <div className="flex items-center gap-1 mb-6 border-b border-border/50">
          {tabs.map((tab) => {
            const count = tab.key === "developers" ? results.developers.length : tab.key === "projects" ? results.projects.length : results.bookmarks.length;
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-xs border-b-2 transition-colors ${
                  activeTab === tab.key ? "border-accent text-accent" : "border-transparent text-muted-foreground hover:text-foreground"
                }`}>
                {tab.icon} {tab.label} <span className="ml-1 text-[10px] text-muted-foreground">({count})</span>
              </button>
            );
          })}
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-border/50 rounded-xl p-4 animate-pulse bg-card">
              <div className="h-3 bg-muted rounded w-1/3 mb-2" /><div className="h-3 bg-muted rounded w-2/3" />
            </div>
          ))}
        </div>
      )}

      {!query && !loading && (
        <div className="border border-border/50 rounded-xl p-12 flex flex-col items-center text-center gap-4 bg-card">
          <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center ring-1 ring-accent/20"><Search className="w-6 h-6 text-accent" /></div>
          <div><h3 className="text-sm font-semibold text-foreground">Search the community</h3><p className="text-sm text-muted-foreground mt-1">Find developers, projects, and bookmarked repositories across DevSync.</p></div>
        </div>
      )}

      {query && !loading && results && results.developers.length + results.projects.length + results.bookmarks.length === 0 && (
        <div className="border border-border/50 rounded-xl p-12 flex flex-col items-center text-center gap-4 bg-card">
          <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center ring-1 ring-accent/20"><Search className="w-6 h-6 text-accent" /></div>
          <div><h3 className="text-sm font-semibold text-foreground">No results found</h3><p className="text-sm text-muted-foreground mt-1">No matches for "{query}". Try a different search term.</p></div>
        </div>
      )}

      {results && activeTab === "developers" && results.developers.length > 0 && (
        <div className="space-y-2">
          {results.developers.map((dev: any) => (
            <DevUserCard key={dev.id} dev={dev} />
          ))}
        </div>
      )}

      {results && activeTab === "projects" && results.projects.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-3">
          {results.projects.map((project: any) => (
            <div key={project.id} className="border border-border/50 rounded-xl p-4 bg-card hover:border-accent/20 transition-colors">
              <h3 className="text-sm font-medium text-foreground">{project.title}</h3>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{project.description}</p>
            </div>
          ))}
        </div>
      )}

      {results && activeTab === "bookmarks" && results.bookmarks.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-3">
          {results.bookmarks.map((b: any) => (
            <div key={b.id} className="border border-border/50 rounded-xl p-4 bg-card hover:border-accent/20 transition-colors">
              <h3 className="text-sm font-medium text-foreground">{b.repoName}</h3>
              {b.owner && <p className="text-xs text-muted-foreground mt-1">{b.owner}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
