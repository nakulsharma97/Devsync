import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Search, Users, FolderGit2, Bookmark, User } from "lucide-react";
import { searchService, type SearchResults } from "@/services/searchService";

type TabKey = "developers" | "projects" | "bookmarks";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("developers");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const doSearch = useCallback(async () => {
    if (!debouncedQuery.trim()) {
      setResults(null);
      return;
    }
    setLoading(true);
    try {
      const data = await searchService.search(debouncedQuery);
      setResults(data);
    } catch {
      setResults({ developers: [], projects: [], bookmarks: [] });
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery]);

  useEffect(() => {
    doSearch();
  }, [doSearch]);

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    {
      key: "developers",
      label: "Developers",
      icon: <Users className="w-3.5 h-3.5" />,
    },
    {
      key: "projects",
      label: "Projects",
      icon: <FolderGit2 className="w-3.5 h-3.5" />,
    },
    {
      key: "bookmarks",
      label: "Repositories",
      icon: <Bookmark className="w-3.5 h-3.5" />,
    },
  ];

  const tabCount = results
    ? results.developers.length +
      results.projects.length +
      results.bookmarks.length
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Search
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Find developers, projects, and repositories
        </p>
      </div>

      {/* Search Input */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search developers, projects, repos..."
          className="text-sm pl-9 h-10"
          autoFocus
        />
      </div>

      {/* Tabs */}
      {results && (
        <div className="flex items-center gap-1 mb-6 border-b border-border">
          {tabs.map((tab) => {
            const count =
              tab.key === "developers"
                ? results.developers.length
                : tab.key === "projects"
                  ? results.projects.length
                  : results.bookmarks.length;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-xs border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.icon}
                {tab.label}
                <span className="ml-1 text-[10px] text-muted-foreground">
                  ({count})
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="border border-border rounded-lg p-4 animate-pulse"
            >
              <div className="h-3 bg-secondary rounded w-1/3 mb-2" />
              <div className="h-2 bg-secondary rounded w-2/3" />
            </div>
          ))}
        </div>
      )}

      {/* No query */}
      {!query && (
        <div className="border border-border rounded-lg p-12 flex flex-col items-center text-center gap-3">
          <Search className="w-8 h-8 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">
            Search the community
          </h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            Find developers, projects, and bookmarked repositories across
            DevSync.
          </p>
        </div>
      )}

      {/* No results */}
      {query && !loading && tabCount === 0 && (
        <div className="border border-border rounded-lg p-12 flex flex-col items-center text-center gap-3">
          <Search className="w-8 h-8 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">
            No results found
          </h3>
          <p className="text-sm text-muted-foreground">
            No matches for "{query}". Try a different search term.
          </p>
        </div>
      )}

      {/* Results - Developers */}
      {results && activeTab === "developers" && results.developers.length > 0 && (
        <div className="space-y-2">
          {results.developers.map((dev: any) => (
            <div
              key={dev.id}
              className="border border-border rounded-lg p-4 flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center shrink-0">
                {dev.avatarUrl ? (
                  <img
                    src={dev.avatarUrl}
                    alt=""
                    className="w-9 h-9 rounded-full object-cover"
                  />
                ) : (
                  <User className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {dev.fullName || dev.username}
                </p>
                <p className="text-xs text-muted-foreground">@{dev.username}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results - Projects */}
      {results && activeTab === "projects" && results.projects.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-3">
          {results.projects.map((project: any) => (
            <div key={project.id} className="border border-border rounded-lg p-4">
              <h3 className="text-sm font-medium text-foreground">
                {project.title}
              </h3>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {project.description}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Results - Bookmarks */}
      {results && activeTab === "bookmarks" && results.bookmarks.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-3">
          {results.bookmarks.map((b: any) => (
            <div key={b.id} className="border border-border rounded-lg p-4">
              <h3 className="text-sm font-medium text-foreground">
                {b.repoName}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">{b.owner}</p>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
