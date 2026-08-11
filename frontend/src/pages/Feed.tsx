import { useState, useEffect, useCallback, useRef } from "react";
import { postService, type PostDto, type CommentDto } from "@/services/postService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { EmojiPicker } from "@/components/EmojiPicker";
import { SkeletonCardList } from "@/components/Skeletons";
import { motion } from "framer-motion";
import {
  Heart,
  MessageCircle,
  Trash2,
  Send,
  Image as ImageIcon,
  Loader2,
  ChevronDown,
  Rss,
  Sparkles,
  PenLine,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { getErrorMessage } from "@/lib/utils";

const MAX_CONTENT_LENGTH = 1000;

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
  const composerRef = useRef<HTMLTextAreaElement>(null);

  // Comments state: { postId: { comments, show, loading, sending } }
  const [commentState, setCommentState] = useState<
    Record<
      string,
      {
        comments: CommentDto[];
        show: boolean;
        loading: boolean;
        sending: boolean;
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
        content: newContent.trim().slice(0, MAX_CONTENT_LENGTH),
        imageUrl: showImageInput ? newImageUrl.trim() || undefined : undefined,
      });
      setPosts((prev) => [created, ...prev]);
      setNewContent("");
      setNewImageUrl("");
      setShowImageInput(false);
      toast.success("Post created!");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Failed to create post"));
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
      // Sync with server truth
      const res = await postService.toggleLike(postId);
      setLikedPosts((prev) => {
        const next = new Set(prev);
        if (res.liked) next.add(postId);
        else next.delete(postId);
        return next;
      });
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, likeCount: res.count } : p))
      );
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
        sending: false,
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
    if (!text?.trim() || commentState[postId]?.sending) return;

    const originalText = text;
    setCommentState((prev) => ({
      ...prev,
      [postId]: { ...prev[postId], text: "", sending: true },
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
          sending: false,
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
        [postId]: { ...prev[postId], text: originalText, sending: false },
      }));
      toast.error("Failed to add comment");
    }
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      loadPosts(page + 1, true);
    }
  };

  const focusComposer = () => {
    composerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => composerRef.current?.focus(), 300);
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <FeedHeader />
        <SkeletonCardList count={3} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <FeedHeader />

      {/* Create Post */}
      <Card className="border-border/40">
        <CardContent className="pt-4 pb-3">
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="flex gap-3">
              <Avatar className="w-9 h-9 shrink-0 ring-2 ring-indigo-500/10">
                <AvatarImage src={user?.avatarUrl || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xs font-bold">
                  {user?.fullName?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <textarea
                ref={composerRef}
                placeholder="Share something with your team..."
                value={newContent}
                onChange={(e) =>
                  setNewContent(e.target.value.slice(0, MAX_CONTENT_LENGTH))
                }
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault();
                    handleCreate(e);
                  }
                }}
                className="field-sizing-content min-h-[76px] max-h-64 w-full resize-none text-sm bg-transparent border border-border/40 rounded-xl p-3 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 placeholder:text-muted-foreground/50 transition-all"
              />
            </div>

            {/* Image URL + preview */}
            {showImageInput && (
              <div className="flex items-center gap-3 pl-12">
                <div className="flex-1">
                  <Input
                    placeholder="Paste image URL..."
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    className="text-sm bg-transparent border-border/40"
                  />
                </div>
                {newImageUrl.trim() && (
                  <div className="relative shrink-0">
                    <img
                      src={newImageUrl.trim()}
                      alt="Preview"
                      className="h-14 w-20 object-cover rounded-lg border border-border/40"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1">
                <EmojiPicker
                  disabled={creating}
                  onSelect={(emoji) =>
                    setNewContent((prev) => (prev + emoji).slice(0, MAX_CONTENT_LENGTH))
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowImageInput(!showImageInput)}
                  className={`text-xs gap-1 ${
                    showImageInput
                      ? "text-indigo-400 bg-indigo-500/10"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  {showImageInput ? "Remove image" : "Image"}
                </Button>
                <span className="text-[10px] text-muted-foreground/50 ml-1 hidden sm:inline">
                  Ctrl/⌘ + Enter to post
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-[10px] tabular-nums ${
                    newContent.length > MAX_CONTENT_LENGTH - 50
                      ? "text-amber-500"
                      : "text-muted-foreground/50"
                  }`}
                >
                  {newContent.length}/{MAX_CONTENT_LENGTH}
                </span>
                <Button
                  type="submit"
                  disabled={creating || !newContent.trim()}
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs hover:from-indigo-600 hover:to-purple-700 shadow-md"
                >
                  {creating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5 mr-1" />
                  )}
                  Post
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Feed Posts */}
      {posts.length === 0 ? (
        <div className="text-center py-16 animate-fade-in-up">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-500/15 to-purple-500/10 flex items-center justify-center ring-1 ring-indigo-500/20">
            <Rss className="w-7 h-7 text-indigo-400" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-5">
            Be the first to share an update with your team — kick off the
            conversation!
          </p>
          <Button variant="outline" size="sm" onClick={focusComposer}>
            <PenLine className="w-3.5 h-3.5 mr-1.5" />
            Write the first post
          </Button>
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

// ── Header ─────────────────────────────────────────────────

function FeedHeader() {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          Feed
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Latest updates from your team and projects
        </p>
      </div>
      <span className="inline-flex items-center gap-1.5 text-[10px] font-medium px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Live
      </span>
    </div>
  );
}

// ── Post Card Component ────────────────────────────────────

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
    sending: boolean;
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
    <Card className="group border-border/40 hover:border-indigo-500/25 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300">
      <div className="p-4 md:p-5 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 ring-2 ring-indigo-500/10">
              <AvatarImage src={post.user.avatarUrl || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-500 dark:text-indigo-400 text-xs font-bold">
                {post.user.fullName?.charAt(0) || "?"}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold">{post.user.fullName}</p>
                {isOwnPost && (
                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20">
                    You
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{timeAgo}</p>
            </div>
          </div>
          {isOwnPost && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground/40 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-all"
              onClick={onDelete}
              aria-label="Delete post"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {/* Content */}
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
          {post.content}
        </p>
        {post.imageUrl && (
          <div className="rounded-xl overflow-hidden border border-border/20">
            <img
              src={post.imageUrl}
              alt="Post image"
              className="max-h-80 w-full object-cover animate-fade-in-up"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={onLike}
            aria-label={isLiked ? "Unlike post" : "Like post"}
            className={`flex items-center gap-1.5 text-xs rounded-full px-3 py-1.5 transition-all duration-200 ${
              isLiked
                ? "text-red-500 bg-red-500/10"
                : "text-muted-foreground hover:text-red-500 hover:bg-red-500/5"
            }`}
          >
            <motion.span
              key={isLiked ? "liked" : "unliked"}
              initial={{ scale: isLiked ? 0.4 : 1 }}
              animate={{ scale: isLiked ? [0.4, 1.35, 1] : 1 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="inline-flex"
            >
              <Heart className={`w-4 h-4 ${isLiked ? "fill-red-500" : ""}`} />
            </motion.span>
            <span className="tabular-nums">{likeCount > 0 ? likeCount : "Like"}</span>
          </button>

          <button
            onClick={onToggleComments}
            aria-label="Toggle comments"
            className={`flex items-center gap-1.5 text-xs rounded-full px-3 py-1.5 transition-all duration-200 ${
              commentState?.show
                ? "text-indigo-500 bg-indigo-500/10"
                : "text-muted-foreground hover:text-indigo-500 hover:bg-indigo-500/5"
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            <span className="tabular-nums">
              {commentCount > 0 ? commentCount : "Comment"}
            </span>
          </button>
        </div>

        {/* Comments Section */}
        {commentState?.show && (
          <div className="border-t border-border/20 pt-3 space-y-3 animate-fade-in-up">
            {commentState.loading ? (
              <div className="flex justify-center py-2">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
              </div>
            ) : (
              <>
                {commentState.comments.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    No comments yet — start the discussion
                  </p>
                ) : (
                  <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                    {commentState.comments.map((comment) => (
                      <div
                        key={comment.id}
                        className="flex gap-2.5 animate-fade-in-up"
                      >
                        <Avatar className="w-6 h-6 shrink-0 ring-1 ring-indigo-500/10">
                          <AvatarImage src={comment.user.avatarUrl || undefined} />
                          <AvatarFallback className="text-[9px] font-bold bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-500 dark:text-indigo-400">
                            {comment.user.fullName?.charAt(0) || "?"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="bg-muted/50 rounded-2xl rounded-tl-sm px-3 py-2">
                            <div className="flex items-baseline gap-2">
                              <span className="text-xs font-semibold">
                                {comment.user.fullName}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {getTimeAgo(comment.createdAt)}
                              </span>
                            </div>
                            <p className="text-xs mt-0.5 whitespace-pre-wrap break-words">
                              {comment.content}
                            </p>
                          </div>
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
                    disabled={commentState.sending}
                    className="flex-1 h-9 text-xs bg-transparent border-border/40 rounded-full"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!commentState.text?.trim() || commentState.sending}
                    className="h-9 w-9 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700"
                    aria-label="Send comment"
                  >
                    {commentState.sending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </form>
              </>
            )}
          </div>
        )}
      </div>
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
