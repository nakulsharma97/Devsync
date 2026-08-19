import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { postService, type PostDto } from "@/services/postService";
import FeedPostCard from "@/components/feed/FeedPostCard";
import { Button } from "@/components/ui/button";
import { SkeletonCardList } from "@/components/Skeletons";
import { PenLine, FileText, Loader2, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

/**
 * "My Posts" — a dedicated page listing only the authenticated user's posts
 * so they can manage (edit/delete) their own updates without searching the
 * community Feed.
 */
export default function MyPosts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<PostDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadPosts = useCallback(
    async (pageNum: number, append = false) => {
      if (!user?.id) return;
      if (pageNum === 0) setLoading(true);
      else setLoadingMore(true);
      try {
        const result = await postService.getPostsByUser(user.id, pageNum, 10);
        if (append) {
          setPosts((prev) => {
            const existing = new Set(prev.map((p) => p.id));
            const fresh = result.content.filter((p) => !existing.has(p.id));
            return [...prev, ...fresh];
          });
        } else {
          setPosts(result.content);
        }
        setHasMore(!result.last);
        setPage(pageNum);
      } catch {
        toast.error("Failed to load your posts");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [user?.id]
  );

  useEffect(() => {
    loadPosts(0);
  }, [loadPosts]);

  const loadMore = () => {
    if (!loadingMore && hasMore) loadPosts(page + 1, true);
  };

  const handleDeleted = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  const handleUpdated = (updated: PostDto) => {
    setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  return (
    <div className="max-w-[1060px] mx-auto px-4 sm:px-6 py-5 md:py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            My Posts
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage the posts you've shared with the DevSync community
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => navigate("/feed")}
          className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs hover:from-indigo-600 hover:to-purple-700 shadow-md"
        >
          <PenLine className="w-3.5 h-3.5 mr-1.5" />
          Create Post
        </Button>
      </div>

      {/* Posts */}
      {loading ? (
        <SkeletonCardList count={3} />
      ) : posts.length === 0 ? (
        <div className="bg-card border border-border/50 rounded-2xl text-center py-16 px-6 animate-fade-in-up">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-500/15 to-purple-500/10 flex items-center justify-center ring-1 ring-indigo-500/20 shadow-md shadow-indigo-500/10">
            <FileText className="w-7 h-7 text-indigo-400" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1.5">No posts yet</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-5">
            Share your first update with the DevSync community.
          </p>
          <Button variant="outline" size="sm" onClick={() => navigate("/feed")} className="gap-1.5">
            <PenLine className="w-3.5 h-3.5" />
            Create Post
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          {posts.map((post) => (
            <FeedPostCard
              key={post.id}
              post={post}
              currentUserId={user?.id}
              onUpdated={handleUpdated}
              onDeleted={handleDeleted}
            />
          ))}

          {hasMore && (
            <div className="text-center py-5">
              <Button
                variant="outline"
                onClick={loadMore}
                disabled={loadingMore}
                className="text-xs gap-1 rounded-full text-muted-foreground hover:text-indigo-500 hover:border-indigo-500/30 transition-colors"
              >
                {loadingMore ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                Load more
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
