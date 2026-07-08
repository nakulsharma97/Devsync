import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Heart,
  MessageCircle,
  Trash2,
  Send,
  Sparkles,
  Image,
  Paperclip,
  FileText,
  X,
  Loader2,
  AlertCircle,
  ImagePlus,
  Users,
  UserPlus,
  User,
  Rss,
  AtSign,
  ChevronDown,
  Share2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { postService, type Post, type Comment } from "@/services/postService";
import { connectionService } from "@/services/connectionService";
import { useDevSyncAuth } from "@/contexts/AuthContext";
import { searchService } from "@/services/searchService";
import { reactionService, REACTION_LIST, type EmojiReaction } from "@/services/reactionService";
import { PostSkeleton } from "@/components/Shimmer";
import { notificationService, type FollowEvent } from "@/services/notificationService";
import { toast } from "sonner";

const ACCEPTED_FILE_TYPES = "image/*,.pdf";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const POSTS_PER_PAGE = 10;

// Format file size for display
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

type FeedTab = "all" | "following";

/** Render rich project links in post content */
function renderRichText(text: string) {
  // Match project links like 🚀 Just shared my project: **Title**
  // and repo URLs
  const parts = text.split(/(\*\*[^*]+\*\*|https?:\/\/[^\s]+)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="text-accent">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("http")) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent underline underline-offset-2 hover:no-underline"
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

/** @mention suggestions component */
function MentionSuggestions({
  query,
  onSelect,
  position,
}: {
  query: string;
  onSelect: (username: string) => void;
  position: { top: number; left: number };
}) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query || query.length < 1) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    searchService
      .search(query)
      .then((r) => setSuggestions((r.developers || []).slice(0, 5)))
      .catch(() => setSuggestions([]))
      .finally(() => setLoading(false));
  }, [query]);

  if (suggestions.length === 0 && !loading) return null;

  return (
    <div
      className="absolute z-50 bg-popover border border-border rounded-xl shadow-lg p-1 min-w-[200px]"
      style={{ top: position.top, left: position.left }}
    >
      {loading ? (
        <div className="px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
          <Loader2 className="w-3 h-3 animate-spin" /> Searching...
        </div>
      ) : (
        suggestions.map((user: any) => (
          <button
            key={user.id}
            onClick={() => onSelect(user.username || user.fullName)}
            className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-accent/10 transition-colors flex items-center gap-2"
          >
            <AtSign className="w-3 h-3 text-muted-foreground" />
            <span className="font-medium text-foreground">
              {user.fullName}
            </span>
            <span className="text-muted-foreground">@{user.username}</span>
          </button>
        ))
      )}
    </div>
  );
}

export default function Feed() {
  const { user } = useDevSyncAuth();
  const navigate = useNavigate();
  const [feedTab, setFeedTab] = useState<FeedTab>("all");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [newContent, setNewContent] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Follow events (displayed as inline feed items)
  const [followEvents, setFollowEvents] = useState<FollowEvent[]>([]);

  // @mention state
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [showMentions, setShowMentions] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Like state
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});

  // Reaction state
  const [postReactions, setPostReactions] = useState<Record<string, Record<string, { count: number; users: string[] }>>>({});
  const [userReactions, setUserReactions] = useState<Record<string, string[]>>({});

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const fetchFeed = useCallback(async () => {
    try {
      const feed = await postService.getFeed(0, POSTS_PER_PAGE);
      let allPosts = feed.content || [];
      setHasMore(allPosts.length >= POSTS_PER_PAGE);

      // If on "following" tab, filter by following user IDs
      if (feedTab === "following" && user?.id) {
        const followingIds = await connectionService.getFollowingIds();
        if (followingIds.length > 0) {
          allPosts = allPosts.filter(
            (p) => p.user?.id && followingIds.includes(p.user.id),
          );
        } else {
          allPosts = [];
        }
      }

      setPosts(allPosts);
    } catch (err: any) {
      console.error("Failed to fetch feed:", err);
    } finally {
      setLoading(false);
    }
  }, [feedTab, user?.id]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  // Fetch recent follow notifications
  useEffect(() => {
    const fetchFollowEvents = async () => {
      try {
        const events = await notificationService.getFollowFeed();
        setFollowEvents(events.slice(0, 5));
      } catch {
        // ignore
      }
    };
    fetchFollowEvents();
  }, []);

  // Load reactions for all visible posts
  useEffect(() => {
    if (posts.length === 0) return;
    const loadReactions = async () => {
      for (const post of posts) {
        try {
          const [allReactions, userReacts] = await Promise.all([
            reactionService.getForPost(post._id),
            reactionService.getUserReactions(post._id),
          ]);
          setPostReactions((prev) => ({ ...prev, [post._id]: allReactions }));
          setUserReactions((prev) => ({ ...prev, [post._id]: userReacts }));
        } catch {
          // ignore
        }
      }
    };
    loadReactions();
  }, [posts]);

  // Infinite scroll - load more
  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const feed = await postService.getFeed(posts.length, POSTS_PER_PAGE);
      const newPosts = feed.content || [];
      setHasMore(newPosts.length >= POSTS_PER_PAGE);
      setPosts((prev) => [...prev, ...newPosts]);
    } catch (err) {
      console.error("Failed to load more posts:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Handle @mention detection in textarea
  const handleContentChange = (value: string) => {
    setNewContent(value);

    // Check for @mention pattern
    const cursorPos = textareaRef.current?.selectionStart || value.length;
    const textBeforeCursor = value.slice(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@(\w*)$/);

    if (atMatch) {
      setMentionQuery(atMatch[1]);
      setShowMentions(true);
      // Position the suggestions below the textarea
      if (textareaRef.current) {
        const rect = textareaRef.current.getBoundingClientRect();
        setMentionPosition({ top: rect.height + 4, left: 0 });
      }
    } else {
      setShowMentions(false);
      setMentionQuery("");
    }
  };

  const handleMentionSelect = (username: string) => {
    const cursorPos = textareaRef.current?.selectionStart || newContent.length;
    const textBeforeCursor = newContent.slice(0, cursorPos);
    const textAfterCursor = newContent.slice(cursorPos);
    const updatedText =
      textBeforeCursor.replace(/@\w*$/, `@${username} `) + textAfterCursor;
    setNewContent(updatedText);
    setShowMentions(false);
    setMentionQuery("");
    textareaRef.current?.focus();
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setError(null);

    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        setError(
          `File too large. Maximum size is 10MB. Selected file is ${formatFileSize(file.size)}.`,
        );
        e.target.value = "";
        return;
      }

      if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
        setError("Only image files (PNG, JPG, WebP) and PDFs are supported.");
        e.target.value = "";
        return;
      }

      setSelectedFile(file);

      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (ev) => setFilePreview(ev.target?.result as string);
        reader.readAsDataURL(file);
      } else if (file.type === "application/pdf") {
        setFilePreview("pdf");
      }
    } else {
      setSelectedFile(null);
      setFilePreview(null);
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const clearFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
  };

  const handleCreatePost = async () => {
    if (!newContent.trim() && !selectedFile) return;
    setCreating(true);
    setError(null);

    try {
      let fileUrl: string | undefined;
      let fileType: string | undefined;

      if (selectedFile) {
        setUploading(true);
        const result = await postService.uploadFile(selectedFile);
        fileUrl = result.url;
        fileType = result.fileType;
        setUploading(false);
      }

      await postService.create({
        content: newContent,
        fileUrl,
        fileType,
      });

      setNewContent("");
      clearFile();
      await fetchFeed();
    } catch (err: any) {
      console.error("Failed to create post:", err);
      setError(err.message || "Failed to create post. Please try again.");
    } finally {
      setCreating(false);
      setUploading(false);
    }
  };

  const handleLike = async (postId: string) => {
    const wasLiked = likedPosts[postId];
    setLikedPosts((prev) => ({ ...prev, [postId]: !wasLiked }));
    setLikeCounts((prev) => ({
      ...prev,
      [postId]: (prev[postId] || 0) + (wasLiked ? -1 : 1),
    }));
    try {
      const result = await postService.toggleLike(postId);
      setLikedPosts((prev) => ({ ...prev, [postId]: result.liked }));
      setLikeCounts((prev) => ({ ...prev, [postId]: result.count }));
    } catch {
      setLikedPosts((prev) => ({ ...prev, [postId]: wasLiked }));
      setLikeCounts((prev) => ({
        ...prev,
        [postId]: (prev[postId] || 0) + (wasLiked ? 1 : -1),
      }));
    }
  };

  const handleDelete = async (postId: string) => {
    try {
      await postService.delete(postId);
      setPosts((prev) => prev.filter((p) => p._id !== postId));
    } catch (err) {
      console.error("Failed to delete post:", err);
    } finally {
      setDeleteTarget(null);
    }
  };

  const toggleComments = async (postId: string) => {
    if (openComments[postId]) {
      setOpenComments((prev) => ({ ...prev, [postId]: false }));
      return;
    }
    setOpenComments((prev) => ({ ...prev, [postId]: true }));
    try {
      const data = await postService.getComments(postId);
      setComments((prev) => ({ ...prev, [postId]: data }));
    } catch {
      /* ignore */
    }
  };

  const handleComment = async (postId: string) => {
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

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const readingTime = (text: string) => {
    const words = text.split(/\s+/).filter(Boolean).length;
    const minutes = Math.ceil(words / 200);
    return minutes < 1 ? "<1 min read" : `${minutes} min read`;
  };

  return (
    <div className="relative">
      {/* Subtle background decoration */}
      <div className="absolute -top-20 -right-20 w-72 h-72 bg-gradient-to-bl from-accent/[0.03] to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="mb-8 relative">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-5 h-5 rounded-md bg-accent/10 flex items-center justify-center">
            <Rss className="w-3 h-3 text-accent" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Developer Feed
          </h1>
        </div>
        <p className="ml-7 text-sm text-muted-foreground">
          {feedTab === "following"
            ? "Posts from people you follow"
            : "See what others are building"}
        </p>
      </div>

      {/* Feed Tab Switcher */}
      <div className="flex items-center gap-1 mb-6 border-b border-border/50">
        <button
          onClick={() => setFeedTab("all")}
          className={`flex items-center gap-1.5 px-3 py-2.5 text-xs border-b-2 transition-colors ${
            feedTab === "all"
              ? "border-accent text-accent"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Rss className="w-3.5 h-3.5" /> All Posts
        </button>
        <button
          onClick={() => setFeedTab("following")}
          className={`flex items-center gap-1.5 px-3 py-2.5 text-xs border-b-2 transition-colors ${
            feedTab === "following"
              ? "border-accent text-accent"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="w-3.5 h-3.5" /> Following
        </button>
      </div>

      {/* Create Post */}
      <div className="border border-border/50 rounded-xl p-4 mb-6 bg-card">
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={newContent}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="Share what you're working on... Use @ to mention someone"
            rows={3}
            className="text-sm resize-none border-0 p-0 focus-visible:ring-0 placeholder:text-muted-foreground bg-transparent"
          />
          {/* @mention suggestions */}
          {showMentions && (
            <div className="relative">
              <MentionSuggestions
                query={mentionQuery}
                onSelect={handleMentionSelect}
                position={mentionPosition}
              />
            </div>
          )}
        </div>

        {/* File Preview */}
        {filePreview && filePreview !== "pdf" && (
          <div className="relative mt-3 inline-block">
            <img
              src={filePreview}
              alt="Preview"
              className="max-h-48 rounded-lg object-cover border border-border/50"
            />
            <button
              onClick={clearFile}
              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 flex items-center justify-center hover:bg-background transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {filePreview === "pdf" && (
          <div className="relative mt-3 flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-accent/5">
            <FileText className="w-5 h-5 text-accent" />
            <span className="text-sm text-foreground truncate flex-1">
              {selectedFile?.name || "PDF file"}
            </span>
            <button
              onClick={clearFile}
              className="w-6 h-6 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 flex items-center justify-center hover:bg-background transition-colors shrink-0"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mt-3 flex items-center gap-2 text-xs text-destructive bg-destructive/5 rounded-lg px-3 py-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {user?.fullName || "Developer"}
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_FILE_TYPES}
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors px-2 py-1 rounded-md hover:bg-accent/5 border border-dashed border-border/40 hover:border-border/80"
            >
              {uploading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : selectedFile ? (
                <Paperclip className="w-3.5 h-3.5" />
              ) : (
                <ImagePlus className="w-3.5 h-3.5" />
              )}
              <span>
                {uploading
                  ? "Uploading..."
                  : selectedFile
                    ? selectedFile.name.length > 20
                      ? selectedFile.name.slice(0, 17) + "..."
                      : selectedFile.name
                    : "Add media"}
              </span>
            </label>
          </div>
          <Button
            size="sm"
            onClick={handleCreatePost}
            disabled={creating || uploading || (!newContent.trim() && !selectedFile)}
            className="text-sm shadow-sm"
          >
            {creating || uploading ? (
              <>
                <Loader2 className="mr-1.5 w-3.5 h-3.5 animate-spin" />
                {uploading ? "Uploading..." : "Posting..."}
              </>
            ) : (
              <>
                Post <Send className="ml-1.5 w-3.5 h-3.5" />
              </>
            )}
          </Button>
        </div>
      </div>

      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <PostSkeleton key={i} />
          ))}
        </div>
      )}

      {!loading && posts.length === 0 && (
        <div className="border border-border/50 rounded-xl p-12 flex flex-col items-center text-center gap-4 bg-card">
          {feedTab === "following" ? (
            <>
              <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center ring-1 ring-accent/20">
                <Users className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Nothing from followed users yet
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Go to <strong>Search</strong> to find developers to follow.
                  Their posts will appear here.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center ring-1 ring-accent/20">
                <Sparkles className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  No posts yet
                </h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  The feed is empty! Share your first post above to get started,
                  or check back later for updates from the community.
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Follow events — recent followers */}
      {followEvents.length > 0 && (
        <div className="mb-6 space-y-2">
          <div className="flex items-center gap-1.5 mb-2 text-xs text-muted-foreground/60 uppercase tracking-wider font-medium">
            <UserPlus className="w-3 h-3" />
            <span>Recent followers</span>
          </div>
          {followEvents.map((ev) => (
            <div
              key={ev._id}
              className="border border-green-500/20 bg-green-500/5 rounded-xl p-4 flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center shrink-0 ring-1 ring-accent/20 overflow-hidden">
                {ev.actorAvatar ? (
                  <img src={ev.actorAvatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-4 h-4 text-accent" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm text-foreground">
                  <span
                    className="font-semibold hover:text-accent cursor-pointer"
                    onClick={() => navigate(`/profile/${ev.actorId}`)}
                  >
                    {ev.actorName}
                  </span>{" "}
                  <span className="text-muted-foreground">started following you</span>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(ev.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <button
                onClick={() => {
                  if (ev.actorId) {
                    navigate(`/profile/${ev.actorId}`);
                  }
                }}
                className="text-xs text-accent hover:text-accent/80 font-medium shrink-0"
              >
                View profile
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-4">
        {posts.map((post) => (
          <div
            key={post._id}
            className="border border-border/50 rounded-xl p-5 bg-card hover:border-accent/20 transition-all duration-200"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-foreground">
                  {post.user?.fullName || "Unknown"}
                </span>
                <span className="text-xs text-muted-foreground/50">·</span>
                <span className="text-xs text-muted-foreground">
                  {formatDate(post.createdAt)}
                </span>
                <span className="text-xs text-muted-foreground/50">·</span>
                <span className="text-xs text-muted-foreground">
                  {readingTime(post.content)}
                </span>
              </div>
              {post.user?.id === user?.id && (
                <AlertDialog
                  open={deleteTarget === post._id}
                  onOpenChange={(open) =>
                    setDeleteTarget(open ? post._id : null)
                  }
                >
                  <AlertDialogTrigger asChild>
                    <button className="text-muted-foreground hover:text-destructive transition-colors p-1 -mr-1 -mt-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete post?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete this post and all its
                        comments and likes. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(post._id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>

            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {renderRichText(post.content)}
            </p>

            {/* Post file attachment */}
            {/* Emoji Reactions */}
            <div className="flex items-center gap-1 mt-3 flex-wrap">
              {REACTION_LIST.map((emoji) => {
                const reactions = postReactions[post._id]?.[emoji];
                const isActive = userReactions[post._id]?.includes(emoji);
                return (
                  <button
                    key={emoji}
                    onClick={async () => {
                      try {
                        const result = await reactionService.toggle(post._id, emoji as EmojiReaction);
                        // Refresh reactions
                        const [allReactions, userReacts] = await Promise.all([
                          reactionService.getForPost(post._id),
                          reactionService.getUserReactions(post._id),
                        ]);
                        setPostReactions((prev) => ({ ...prev, [post._id]: allReactions }));
                        setUserReactions((prev) => ({ ...prev, [post._id]: userReacts }));
                      } catch (err) {
                        console.error("Failed to toggle reaction:", err);
                      }
                    }}
                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs border transition-all duration-200 ${
                      isActive
                        ? "bg-accent/15 border-accent/30 text-accent scale-105"
                        : "bg-transparent border-border/30 text-muted-foreground hover:border-accent/30 hover:text-foreground hover:bg-accent/5"
                    }`}
                    title={reactions?.users?.join(", ") || emoji}
                  >
                    <span className="text-sm">{emoji}</span>
                    {reactions && reactions.count > 0 && (
                      <span className="text-[10px] font-medium">{reactions.count}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {post.fileUrl && (
              <div className="mt-3">
                {post.fileType?.startsWith("image/") ? (
                  <img
                    src={post.fileUrl}
                    alt="Post image"
                    className="max-h-72 rounded-lg object-cover border border-border/50 w-full"
                    loading="lazy"
                  />
                ) : post.fileType === "application/pdf" ? (
                  <a
                    href={post.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-accent/5 hover:bg-accent/10 transition-colors"
                  >
                    <FileText className="w-5 h-5 text-accent shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-foreground truncate block">
                        View attached PDF
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Click to open
                      </span>
                    </div>
                  </a>
                ) : null}
              </div>
            )}

            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border/50">
              <button
                onClick={() => handleLike(post._id)}
                className={`flex items-center gap-1.5 text-xs transition-all duration-200 ${
                  likedPosts[post._id]
                    ? "text-red-500"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Heart
                  className={`w-3.5 h-3.5 transition-all duration-200 ${
                    likedPosts[post._id] ? "fill-red-500 scale-110" : ""
                  }`}
                />
                {likeCounts[post._id] !== undefined
                  ? `${likeCounts[post._id]} ${likeCounts[post._id] === 1 ? "like" : "likes"}`
                  : `${post.likeCount} ${post.likeCount === 1 ? "like" : "likes"}`}
              </button>
              <button
                onClick={() => toggleComments(post._id)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" />{" "}
                {post.commentCount > 0
                  ? `${post.commentCount} comments`
                  : "Comment"}
              </button>
              {/* Share button */}
              <button
                onClick={() => {
                  const url = `${window.location.origin}/feed?post=${post._id}`;
                  navigator.clipboard.writeText(url);
                  toast.success("Link copied to clipboard!");
                }}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                title="Share"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {openComments[post._id] && (
              <div className="mt-4 pt-3 border-t border-border/50 space-y-3">
                {(comments[post._id]?.length ?? 0) > 0 ? (
                  comments[post._id]!.map((comment) => (
                    <div key={comment._id} className="text-sm py-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-foreground">
                          {comment.user?.fullName || "Unknown"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(comment.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-foreground mt-0.5">
                        {comment.content}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No comments yet. Be the first to share your thoughts!
                  </p>
                )}
                <div className="flex gap-2 items-center">
                  <Input
                    value={commentInputs[post._id] || ""}
                    onChange={(e) =>
                      setCommentInputs((prev) => ({
                        ...prev,
                        [post._id]: e.target.value,
                      }))
                    }
                    placeholder="Write a comment... Use @ to mention"
                    className="text-sm h-8 border-0 border-b border-border/50 rounded-none px-0 focus-visible:ring-0 focus-visible:border-accent bg-transparent"
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleComment(post._id)
                    }
                  />
                  <button
                    onClick={() => handleComment(post._id)}
                    className="text-xs text-accent hover:text-accent/80 transition-colors shrink-0 font-medium"
                  >
                    Send
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Load more */}
      {!loading && hasMore && posts.length > 0 && (
        <div className="mt-6 flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={loadMore}
            disabled={loadingMore}
            className="text-sm"
          >
            {loadingMore ? (
              <>
                <Loader2 className="mr-1.5 w-3.5 h-3.5 animate-spin" />{" "}
                Loading...
              </>
            ) : (
              <>
                <ChevronDown className="mr-1.5 w-3.5 h-3.5" /> Load more posts
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
