import { useState, useEffect, useCallback } from "react";
import { postService, type PostDto, type CommentDto } from "@/services/postService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Heart,
  MessageCircle,
  Trash2,
  Send,
  Image,
  Loader2,
  ChevronDown,
  Rss,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export default function Feed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<PostDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // New post form
  const [newContent, setNewContent] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [showImageInput, setShowImageInput] = useState(false);
  const [creating, setCreating] = useState(false);

  // Comments state: { postId: { comments, show, loading } }
  const [commentState, setCommentState] = useState<
    Record<
      string,
      {
        comments: CommentDto[];
        show: boolean;
        loading: boolean;
        text: string;
      }
    >
  >({});

  // Liked posts for optimistic UI
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());

  const loadPosts = useCallback(async (pageNum: number, append = false) => {
    if (pageNum === 0) setLoading(true);
    else setLoadingMore(true);
    try {
      const result = await postService.getFeed(pageNum, 20);
      if (append) {
        setPosts((prev) => {
          const existing = new Set(prev.map((p) => p.id));
          const newPosts = result.content.filter((p) => !existing.has(p.id));
          return [...prev, ...newPosts];
        });
      } else {
        setPosts(result.content);
      }
      setHasMore(!result.last);
      setPage(pageNum);
    } catch {
      toast.error("Failed to load feed");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadPosts(0);
  }, [loadPosts]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;
    setCreating(true);
    try {
      const created = await postService.create({
        content: newContent.trim(),
        imageUrl: showImageInput ? newImageUrl.trim() || undefined : undefined,
      });
      setPosts((prev) => [created, ...prev]);
      setNewContent("");
      setNewImageUrl("");
      setShowImageInput(false);
      toast.success("Post created!");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to create post");
    } finally {
      setCreating(false);
    }
  };

  const handleLike = async (postId: string) => {
    // Optimistic toggle
    const wasLiked = likedPosts.has(postId);
    setLikedPosts((prev) => {
      const next = new Set(prev);
      if (wasLiked) next.delete(postId);
      else next.add(postId);
      return next;
    });
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, likeCount: (p.likeCount || 0) + (wasLiked ? -1 : 1) }
          : p
      )
    );

    try {
      await postService.toggleLike(postId);
    } catch {
      // Revert on error
      setLikedPosts((prev) => {
        const next = new Set(prev);
        if (wasLiked) next.add(postId);
        else next.delete(postId);
        return next;
      });
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, likeCount: (p.likeCount || 0) + (wasLiked ? 1 : -1) }
            : p
        )
      );
    }
  };

  const handleDelete = async (postId: string) => {
    try {
      await postService.delete(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      toast.success("Post deleted");
    } catch {
      toast.error("Failed to delete post");
    }
  };

  const toggleComments = async (postId: string) => {
    setCommentState((prev) => {
      const current = prev[postId];
      if (current?.show) {
        return { ...prev, [postId]: { ...current, show: false } };
      }
      return prev;
    });

    if (commentState[postId]?.show) return;

    setCommentState((prev) => ({
      ...prev,
      [postId]: {
        comments: prev[postId]?.comments || [],
        show: true,
        loading: true,
        text: "",
      },
    }));

    try {
      const comments = await postService.getComments(postId);
      setCommentState((prev) => ({
        ...prev,
        [postId]: { ...prev[postId], comments, loading: false },
      }));
    } catch {
      setCommentState((prev) => ({
        ...prev,
        [postId]: { ...prev[postId], loading: false },
      }));
    }
  };

  const handleAddComment = async (postId: string) => {
    const text = commentState[postId]?.text;
    if (!text?.trim()) return;

    const originalText = text;
    setCommentState((prev) => ({
      ...prev,
      [postId]: { ...prev[postId], text: "", loading: true },
    }));

    try {
      const comment = await postService.addComment(postId, {
        content: originalText.trim(),
      });
      setCommentState((prev) => ({
        ...prev,
        [postId]: {
          ...prev[postId],
          comments: [...(prev[postId]?.comments || []), comment],
          text: "",
          loading: false,
        },
      }));
      // Update comment count
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, commentCount: (p.commentCount || 0) + 1 }
            : p
        )
      );
    } catch {
      setCommentState((prev) => ({
        ...prev,
        [postId]: { ...prev[postId], text: originalText, loading: false },
      }));
      toast.error("Failed to add comment");
    }
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      loadPosts(page + 1, true);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          Feed
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Latest updates from your team and projects
        </p>
      </div>

      {/* Create Post */}
      <Card className="border-border/40">
        <CardContent className="pt-5">
          <form onSubmit={handleCreate} className="space-y-3">
            <textarea
              placeholder="Share something with your team..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              className="min-h-[80px] w-full resize-none text-sm bg-transparent border border-border/40 rounded-lg p-3 focus:outline-none focus:border-indigo-500/50 placeholder:text-muted-foreground/50"
            />
            {showImageInput && (
              <Input
                placeholder="Paste image URL..."
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                className="text-sm bg-transparent border-border/40"
              />
            )}
            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowImageInput(!showImageInput)}
                className={`text-xs gap-1 ${
                  showImageInput
                    ? "text-indigo-400 bg-indigo-500/10"
                    : "text-muted-foreground"
                }`}
              >
                <Image className="w-3.5 h-3.5" />
                {showImageInput ? "Remove image" : "Add image"}
              </Button>
              <Button
                type="submit"
                disabled={creating || !newContent.trim()}
                className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs"
              >
                {creating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 mr-1" />
                )}
                Post
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Feed Posts */}
      {posts.length === 0 ? (
        <div className="text-center py-16">
          <Rss className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
          <p className="text-sm text-muted-foreground">
            Be the first to share something!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <FeedPost
              key={post.id}
              post={post}
              isLiked={likedPosts.has(post.id)}
              currentUserId={user?.id}
              commentState={commentState[post.id]}
              onLike={() => handleLike(post.id)}
              onDelete={() => handleDelete(post.id)}
              onToggleComments={() => toggleComments(post.id)}
              onAddComment={() => handleAddComment(post.id)}
              onCommentTextChange={(text) =>
                setCommentState((prev) => ({
                  ...prev,
                  [post.id]: { ...prev[post.id], text },
                }))
              }
            />
          ))}

          {/* Load more */}
          {hasMore && (
            <div className="text-center py-4">
              <Button
                variant="ghost"
                onClick={loadMore}
                disabled={loadingMore}
                className="text-xs gap-1 text-muted-foreground"
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

// ── Post Card Component ────────────────────────────────────────

function FeedPost({
  post,
  isLiked,
  currentUserId,
  commentState,
  onLike,
  onDelete,
  onToggleComments,
  onAddComment,
  onCommentTextChange,
}: {
  post: PostDto;
  isLiked: boolean;
  currentUserId?: string | null;
  commentState?: {
    comments: CommentDto[];
    show: boolean;
    loading: boolean;
    text: string;
  };
  onLike: () => void;
  onDelete: () => void;
  onToggleComments: () => void;
  onAddComment: () => void;
  onCommentTextChange: (text: string) => void;
}) {
  const isOwnPost = String(post.user.id) === String(currentUserId);
  const timeAgo = getTimeAgo(post.createdAt);
  const likeCount = post.likeCount || 0;
  const commentCount = post.commentCount || 0;

  return (
    <Card className="border-border/40 hover:border-indigo-500/20 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="w-9 h-9">
              <AvatarFallback className="bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-400 text-xs font-bold">
                {post.user.fullName?.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{post.user.fullName}</p>
              <p className="text-xs text-muted-foreground">{timeAgo}</p>
            </div>
          </div>
          {isOwnPost && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {post.content}
        </p>
        {post.imageUrl && (
          <img
            src={post.imageUrl}
            alt="Post image"
            className="rounded-lg max-h-80 w-full object-cover border border-border/20"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        )}

        {/* Actions */}
        <div className="flex items-center gap-4 pt-1">
          <button
            onClick={onLike}
            className={`flex items-center gap-1.5 text-xs transition-colors ${
              isLiked
                ? "text-red-400"
                : "text-muted-foreground hover:text-red-400"
            }`}
          >
            <Heart
              className={`w-4 h-4 ${isLiked ? "fill-red-400" : ""}`}
            />
            {likeCount > 0 && <span>{likeCount}</span>}
          </button>

          <button
            onClick={onToggleComments}
            className={`flex items-center gap-1.5 text-xs transition-colors ${
              commentState?.show
                ? "text-indigo-400"
                : "text-muted-foreground hover:text-indigo-400"
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            {commentCount > 0 && <span>{commentCount}</span>}
          </button>
        </div>

        {/* Comments Section */}
        {commentState?.show && (
          <div className="border-t border-border/20 pt-3 space-y-3">
            {commentState.loading ? (
              <div className="flex justify-center py-2">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
              </div>
            ) : (
              <>
                {commentState.comments.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    No comments yet
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {commentState.comments.map((comment) => (
                      <div key={comment.id} className="flex gap-2">
                        <Avatar className="w-6 h-6 shrink-0">
                          <AvatarFallback className="text-[9px] font-bold bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-400">
                            {comment.user.fullName?.charAt(0) || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span className="text-xs font-medium">
                              {comment.user.fullName}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {getTimeAgo(comment.createdAt)}
                            </span>
                          </div>
                          <p className="text-xs mt-0.5">{comment.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add comment */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    onAddComment();
                  }}
                  className="flex gap-2"
                >
                  <Input
                    value={commentState.text}
                    onChange={(e) => onCommentTextChange(e.target.value)}
                    placeholder="Write a comment..."
                    className="flex-1 h-8 text-xs bg-transparent border-border/40"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!commentState.text?.trim()}
                    className="h-8 w-8 bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </form>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function getTimeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}
