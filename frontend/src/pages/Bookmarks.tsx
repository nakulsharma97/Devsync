import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Bookmark, ExternalLink, Github, Plus, Search, Trash2 } from "lucide-react";
import { bookmarkService, type Bookmark as BookmarkType, type BookmarkRequest } from "@/services/bookmarkService";

export default function Bookmarks() {
  const [bookmarks, setBookmarks] = useState<BookmarkType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<BookmarkRequest>({ repoName: "", repoUrl: "", description: "", language: "", owner: "", stars: 0 });

  const fetchBookmarks = async () => {
    try { setBookmarks(await bookmarkService.getAll()); }
    catch { /* API not available */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchBookmarks(); }, []);

  const handleAdd = async () => {
    if (!form.repoName.trim() || !form.repoUrl.trim()) return;
    try {
      await bookmarkService.create(form);
      setShowAdd(false);
      setForm({ repoName: "", repoUrl: "", description: "", language: "", owner: "", stars: 0 });
      await fetchBookmarks();
    } catch (err) { console.error("Failed to add bookmark:", err); }
  };

  const handleDelete = async (id: number) => {
    try { await bookmarkService.delete(id); setBookmarks((prev) => prev.filter((b) => b.id !== id)); }
    catch (err) { console.error("Failed to delete bookmark:", err); }
  };

  const filtered = bookmarks.filter((b) =>
    b.repoName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.language && b.language.toLowerCase().includes(searchQuery.toLowerCase())));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Bookmarks</h1>
          <p className="mt-1 text-sm text-muted-foreground">Saved GitHub repositories</p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)} className="text-sm shadow-sm"><Plus className="w-4 h-4 mr-1.5" /> Add Repo</Button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search bookmarks by name or language..." className="text-sm pl-9 h-10 bg-background" />
      </div>

      {loading && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-border/50 rounded-xl p-5 animate-pulse bg-card">
              <div className="h-4 bg-muted rounded w-2/3 mb-3" /><div className="h-3 bg-muted rounded w-full mb-2" /><div className="h-3 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="border border-border/50 rounded-xl p-12 flex flex-col items-center text-center gap-4 bg-card">
          <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center ring-1 ring-accent/20"><Bookmark className="w-6 h-6 text-accent" /></div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{searchQuery ? "No matching bookmarks" : "No bookmarks yet"}</h3>
            <p className="text-sm text-muted-foreground mt-1">{searchQuery ? "Try a different search term." : "Save interesting GitHub repos to come back to them later."}</p>
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((b) => (
          <div key={b.id} className="border border-border/50 rounded-xl p-5 bg-card hover:border-accent/30 transition-all duration-200 hover:shadow-sm group">
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-sm font-semibold text-foreground">{b.repoName}</h3>
              <button onClick={() => handleDelete(b.id)} className="opacity-0 group-hover:opacity-100 transition-all text-muted-foreground hover:text-destructive p-1 -mr-1 -mt-1"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
            {b.owner && <p className="text-xs text-muted-foreground mb-1">{b.owner}</p>}
            {b.description && <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-3">{b.description}</p>}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {b.language && <span className="px-2 py-0.5 rounded-md bg-accent/10 text-accent">{b.language}</span>}
              {b.stars > 0 && <span>★ {b.stars}</span>}
              <a href={b.repoUrl} target="_blank" rel="noopener noreferrer" className="ml-auto hover:text-foreground transition-colors"><ExternalLink className="w-3.5 h-3.5" /></a>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold tracking-tight">Add Repository</DialogTitle>
            <DialogDescription className="text-sm">Save a GitHub repo to your bookmarks.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Repository Name</label>
              <Input value={form.repoName} onChange={(e) => setForm({ ...form, repoName: e.target.value })} className="text-sm bg-background" placeholder="my-awesome-repo" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">URL</label>
              <div className="relative"><Github className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input value={form.repoUrl} onChange={(e) => setForm({ ...form, repoUrl: e.target.value })} className="text-sm pl-9 bg-background" placeholder="https://github.com/user/repo" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Language</label>
                <Input value={form.language || ""} onChange={(e) => setForm({ ...form, language: e.target.value })} className="text-sm bg-background" placeholder="TypeScript" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Stars</label>
                <Input type="number" value={form.stars || 0} onChange={(e) => setForm({ ...form, stars: parseInt(e.target.value) || 0 })} className="text-sm bg-background" />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Description</label>
              <Input value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} className="text-sm bg-background" placeholder="A brief description..." />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowAdd(false)} className="text-sm">Cancel</Button>
              <Button size="sm" onClick={handleAdd} className="text-sm shadow-sm">Save Bookmark</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
