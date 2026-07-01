import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Heart, MessageCircle, Trash2, Send, Sparkles } from "lucide-react";
import { postService, type Post, type Comment } from "@/services/postService";
import { useDevSyncAuth } from "@/contexts/AuthContext";

export default function Feed() {
  const { user } = useDevSyncAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [newContent, setNewContent] = useState("");
  const [creating, setCreating] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Record<number, boolean>>({});
  const [likeCounts, setLikeCounts] = useState<Record<number, number>>({});
  const [commentInputs, setCommentInputs] = useState<Record<number, string>>(
    {},
  );
  const [comments, setComments] = useState<Record<number, Comment[]>>({});
  const [openComments, setOpenComments] = useState<Record<number, boolean>>(
    {},
  );

  const fetchFeed = useCallback(async () => {
    try {
      const feed = await postService.getFeed(0, 20);
      const items = feed.content || [];
      setPosts(items);
    } catch {
      // API not available
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  const handleCreatePost = async () => {
    if (!newContent.trim()) return;
    setCreating(true);
    try {
      await postService.create({ content: newContent });
      setNewContent("");
      await fetchFeed();
    } catch (err) {
      console.error("Failed to create post:", err);
    } finally {
      setCreating(false);
    }
  };

  const handleLike = async (postId: number) => {
    // Optimistic update
    const wasLiked = likedPosts[postId];
    setLikedPosts((prev) => ({ ...prev, [postId]: !wasLiked }));
    setLikeCounts((prev) => ({
      ...prev,
      [postId]: (prev[postId] || 0) + (wasLiked ? -1 : 1),
    }));
    try {
      const result = await postService.toggleLike(postId);
      // Sync with server response
      setLikedPosts((prev) => ({ ...prev, [postId]: result.liked }));
      setLikeCounts((prev) => ({ ...prev, [postId]: result.count }));
    } catch (err) {
      // Revert on error
      setLikedPosts((prev) => ({ ...prev, [postId]: wasLiked }));
      setLikeCounts((prev) => ({
        ...prev,
        [postId]: (prev[postId] || 0) + (wasLiked ? 1 : -1),
      }));
      console.error("Failed to toggle like:", err);
    }
  };

  const handleDelete = async (postId: number) => {
    try {
      await postService.delete(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (err) {
      console.error("Failed to delete post:", err);
    }
  };

  const toggleComments = async (postId: number) => {
    if (openComments[postId]) {
      setOpenComments((prev) => ({ ...prev, [postId]: false }));
      return;
    }
    setOpenComments((prev) => ({ ...prev, [postId]: true }));
    try {
      const data = await postService.getComments(postId);
      setComments((prev) => ({ ...prev, [postId]: data }));
    } catch {
      // ignore
    }
  };

  const handleComment = async (postId: number) => {
    const content = commentInputs[postId]?.trim();
    if (!content) return;
    try {
      await postService.addComment(postId, { content });
      setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
      const data = await postService.getComments(postId);
      setComments((prev) => ({ ...prev, [postId]: data }));
    } catch (err) {
      console.error("Failed to add comment:", err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Developer Feed
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            See what others are building
          </p>
        </div>
      </div>

      {/* Create Post */}
      <div className="border border-border rounded-lg p-4 mb-6">
        <Textarea
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          placeholder="Share what you're working on..."
          rows={3}
          className="text-sm resize-none border-0 p-0 focus-visible:ring-0 placeholder:text-muted-foreground"
        />
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
          <span className="text-xs text-muted-foreground">
            {user?.fullName || "Developer"}
          </span>
          <Button
            size="sm"
            onClick={handleCreatePost}
            disabled={creating || !newContent.trim()}
            className="text-sm"
          >
            {creating ? "Posting..." : "Post"}
            <Send className="ml-1.5 w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="border border-border rounded-lg p-5 animate-pulse"
            >
              <div className="h-3 bg-secondary rounded w-1/3 mb-3" />
              <div className="h-2 bg-secondary rounded w-full mb-2" />
              <div className="h-2 bg-secondary rounded w-2/3" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && posts.length === 0 && (
        <div className="border border-border rounded-lg p-12 flex flex-col items-center text-center gap-3">
          <Sparkles className="w-8 h-8 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">
            No posts yet
          </h3>
          <p className="text-sm text-muted-foreground">
            Be the first to share something!
          </p>
        </div>
      )}

      {/* Post List */}
      <div className="space-y-4">
        {posts.map((post) => (
          <div key={post.id} className="border border-border rounded-lg p-5">
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs text-muted-foreground">
                {new Date(post.createdAt).toLocaleDateString()}
              </p>
              {post.userId === user?.id && (
                <button
                  onClick={() => handleDelete(post.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {post.content}
            </p>

            {/* Actions */}
            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border">
              <button
                onClick={() => handleLike(post.id)}
                className={`flex items-center gap-1.5 text-xs transition-colors ${
                  likedPosts[post.id]
                    ? "text-red-500"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Heart
                  className={`w-3.5 h-3.5 ${
                    likedPosts[post.id] ? "fill-red-500" : ""
                  }`}
                />
                {likeCounts[post.id] !== undefined
                  ? `${likeCounts[post.id]} like${likeCounts[post.id] !== 1 ? "s" : ""}`
                  : "Like"}
              </button>
              <button
                onClick={() => toggleComments(post.id)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Comment
              </button>
            </div>

            {/* Comments */}
            {openComments[post.id] && (
              <div className="mt-4 pt-3 border-t border-border space-y-3">
                {(comments[post.id]?.length ?? 0) > 0 ? (
                  comments[post.id]!.map((comment) => (
                    <div key={comment.id} className="text-sm">
                      <span className="text-xs text-muted-foreground">
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </span>
                      <p className="text-sm text-foreground mt-0.5">
                        {comment.content}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No comments yet.
                  </p>
                )}
                <div className="flex gap-2 items-center">
                  <Input
                    value={commentInputs[post.id] || ""}
                    onChange={(e) =>
                      setCommentInputs((prev) => ({
                        ...prev,
                        [post.id]: e.target.value,
                      }))
                    }
                    placeholder="Write a comment..."
                    className="text-sm h-8 border-0 border-b border-border rounded-none px-0 focus-visible:ring-0 focus-visible:border-foreground"
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleComment(post.id)
                    }
                  />
                  <button
                    onClick={() => handleComment(post.id)}
                    className="text-xs text-foreground hover:text-muted-foreground transition-colors shrink-0"
                  >
                    Send
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
