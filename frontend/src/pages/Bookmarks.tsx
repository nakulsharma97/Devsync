import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/contexts/AuthContext";
import FeedPostCard from "@/components/feed/FeedPostCard";
import { postService, type PostDto } from "@/services/postService";
import {
  bookmarkService,
  type BookmarkResponse,
} from "@/services/bookmarkService";
import { Bookmark, Rss, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Bookmarks() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentUserId = user?.id || null;

  const [_bookmarks, setBookmarks] = useState<BookmarkResponse[]>([]);
  const [posts, setPosts] = useState<PostDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchBookmarks = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const allBookmarks = await bookmarkService.getAll();
      const postBookmarks = allBookmarks.filter(
        (b) => b.entityType === "POST",
      );
      setBookmarks(postBookmarks);

      if (postBookmarks.length === 0) {
        setPosts([]);
        setLoading(false);
        return;
      }

      // Fetch full post data for each bookmarked post
      const postPromises = postBookmarks.map((b) =>
        postService.getPost(b.entityId),
      );
      const results = await Promise.allSettled(postPromises);
      const successfulPosts = results
        .filter(
          (r): r is PromiseFulfilledResult<PostDto> =>
            r.status === "fulfilled",
        )
        .map((r) => r.value);
      setPosts(successfulPosts);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  const handlePostUpdated = (updated: PostDto) => {
    setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handlePostDeleted = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    setBookmarks((prev) => prev.filter((b) => b.entityId !== postId));
  };

  return (
    <div className="relative">
      <div className="absolute -top-20 -right-20 w-72 h-72 bg-gradient-to-bl from-accent/[0.03] to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-5 h-5 rounded-md bg-accent/10 flex items-center justify-center">
            <Bookmark className="w-3 h-3 text-accent" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Bookmarks</h1>
        </div>
        <p className="ml-7 text-sm text-muted-foreground">
          Posts you&apos;ve saved for later
        </p>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="border border-border/40 rounded-xl p-4 animate-pulse bg-card"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-muted" />
                <div className="space-y-2">
                  <div className="h-3 bg-muted rounded w-24" />
                  <div className="h-2 bg-muted rounded w-16" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-muted rounded w-full" />
                <div className="h-3 bg-muted rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="border border-border/50 rounded-xl p-8 flex flex-col items-center text-center gap-3 bg-card">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center ring-1 ring-red-500/20">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Unable to load bookmarks
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Something went wrong. Please try again.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchBookmarks}
            className="text-sm"
          >
            Try Again
          </Button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && posts.length === 0 && (
        <div className="border border-border/50 rounded-xl p-8 flex flex-col items-center text-center gap-3 bg-card">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center ring-1 ring-indigo-500/20">
            <Bookmark className="w-6 h-6 text-indigo-500" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              No bookmarks yet
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Save posts you want to come back to later.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/feed")}
            className="text-sm gap-1.5"
          >
            <Rss className="w-3.5 h-3.5" />
            Explore Feed
          </Button>
        </div>
      )}

      {/* Bookmarked posts */}
      {!loading && !error && posts.length > 0 && (
        <div className="space-y-4">
          {posts.map((post) => (
            <FeedPostCard
              key={post.id}
              post={post}
              currentUserId={currentUserId}
              onUpdated={handlePostUpdated}
              onDeleted={handlePostDeleted}
            />
          ))}
        </div>
      )}
    </div>
  );
}
