import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Bookmark, ExternalLink, Github, Plus, Search, Trash2 } from "lucide-react";
import {
  bookmarkService,
  type Bookmark as BookmarkType,
  type BookmarkRequest,
} from "@/services/bookmarkService";

export default function Bookmarks() {
  const [bookmarks, setBookmarks] = useState<BookmarkType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<BookmarkRequest>({
    repoName: "",
    repoUrl: "",
    description: "",
    language: "",
    owner: "",
    stars: 0,
  });

  const fetchBookmarks = async () => {
    try {
      const data = await bookmarkService.getAll();
      setBookmarks(data);
    } catch {
      // API not available
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookmarks();
  }, []);

  const handleAdd = async () => {
    if (!form.repoName.trim() || !form.repoUrl.trim()) return;
    try {
      await bookmarkService.create(form);
      setShowAdd(false);
      setForm({ repoName: "", repoUrl: "", description: "", language: "", owner: "", stars: 0 });
      await fetchBookmarks();
    } catch (err) {
      console.error("Failed to add bookmark:", err);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await bookmarkService.delete(id);
      setBookmarks((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      console.error("Failed to delete bookmark:", err);
    }
  };

  const filtered = bookmarks.filter(
    (b) =>
      b.repoName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.language && b.language.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Bookmarks</h1>
          <p className="mt-1 text-sm text-muted-foreground">Saved GitHub repositories</p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)} className="text-sm">
          <Plus className="w-4 h-4 mr-1.5" />
          Add Repo
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search bookmarks..."
          className="text-sm pl-9"
        />
      </div>

      {loading && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="border border-border rounded-lg p-5 animate-pulse">
              <div className="h-3 bg-secondary rounded w-2/3 mb-3" />
              <div className="h-2 bg-secondary rounded w-full mb-2" />
              <div className="h-2 bg-secondary rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="border border-border rounded-lg p-12 flex flex-col items-center text-center gap-3">
          <Bookmark className="w-8 h-8 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">
            {searchQuery ? "No matching bookmarks" : "No bookmarks yet"}
          </h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            {searchQuery ? "Try a different search term." : "Save interesting GitHub repos to come back to them."}
          </p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((b) => (
          <div key={b.id} className="border border-border rounded-lg p-5 group">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-sm font-semibold text-foreground">{b.repoName}</h3>
              <button
                onClick={() => handleDelete(b.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            {b.owner && <p className="text-xs text-muted-foreground mb-1">{b.owner}</p>}
            {b.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-3">{b.description}</p>
            )}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {b.language && (
                <span className="px-1.5 py-0.5 rounded bg-secondary">{b.language}</span>
              )}
              {b.stars > 0 && <span>★ {b.stars}</span>}
              <a
                href={b.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto hover:text-foreground transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Add Bookmark Modal */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold tracking-tight">Add Repository</DialogTitle>
            <DialogDescription className="text-sm">Save a GitHub repo to your bookmarks.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Repository Name</label>
              <Input value={form.repoName} onChange={(e) => setForm({ ...form, repoName: e.target.value })} className="text-sm" placeholder="my-awesome-repo" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">URL</label>
              <div className="relative">
                <Github className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={form.repoUrl} onChange={(e) => setForm({ ...form, repoUrl: e.target.value })} className="text-sm pl-9" placeholder="https://github.com/user/repo" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Language</label>
                <Input value={form.language || ""} onChange={(e) => setForm({ ...form, language: e.target.value })} className="text-sm" placeholder="TypeScript" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Stars</label>
                <Input type="number" value={form.stars || 0} onChange={(e) => setForm({ ...form, stars: parseInt(e.target.value) || 0 })} className="text-sm" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Description</label>
              <Input value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} className="text-sm" placeholder="A brief description..." />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowAdd(false)} className="text-sm">Cancel</Button>
              <Button size="sm" onClick={handleAdd} className="text-sm">Save Bookmark</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
