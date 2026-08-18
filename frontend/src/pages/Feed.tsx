import { useState, useEffect, useCallback, useRef } from "react";
import { postService, type PostDto } from "@/services/postService";
import { attachmentService } from "@/services/attachmentService";
import FeedPostCard from "@/components/feed/FeedPostCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { EmojiPicker } from "@/components/EmojiPicker";
import { SkeletonCardList } from "@/components/Skeletons";
import {
  ImagePlus,
  X,
  RefreshCw,
  Loader2,
  ChevronDown,
  Rss,
  Sparkles,
  PenLine,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { getErrorMessage } from "@/lib/utils";

const MAX_CONTENT_LENGTH = 1000;

/** Mirrors AttachmentService IMAGE_EXTENSIONS on the backend. */
const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"]);
/** Backend default: app.upload.max-size (10 MB). */
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

export default function Feed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<PostDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // New post form
  const [newContent, setNewContent] = useState("");
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [creating, setCreating] = useState(false);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Revoke the preview object URL when replaced or unmounted
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

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

  const handlePickImage = (file: File | undefined | null) => {
    if (!file) return;
    const dot = file.name.lastIndexOf(".");
    const ext = dot >= 0 ? file.name.slice(dot + 1).toLowerCase() : "";
    if (!IMAGE_EXTENSIONS.has(ext)) {
      setImageError("Unsupported image type. Use JPG, PNG, WEBP or GIF.");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setImageError("Image is too large — maximum size is 10 MB.");
      return;
    }
    setImageError(null);
    // Revoke the previous preview so we don't leak object URLs
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setNewImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  };

  const clearImage = () => {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setNewImageFile(null);
    setImagePreviewUrl(null);
    setImageError(null);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;
    if (creating) return; // guard against duplicate submits
    setCreating(true);
    setImageError(null);
    setUploadProgress(0);
    try {
      // 1. Create the post (backend requires non-blank content).
      let created = await postService.create({
        content: newContent.trim().slice(0, MAX_CONTENT_LENGTH),
      });
      // 2. Upload the image against the now-existing post, then record it.
      if (newImageFile) {
        try {
          const attachment = await attachmentService.uploadPostImage(
            newImageFile,
            created.id,
            setUploadProgress
          );
          created = await postService.updatePostImage(created.id, attachment.url);
        } catch (err: unknown) {
          // The post exists but has no image — surface a specific message and
          // keep the draft so the user can retry instead of losing their text.
          toast.error(getErrorMessage(err, "Unable to upload image."));
          throw err;
        }
      }
      setPosts((prev) => [created, ...prev]);
      setNewContent("");
      clearImage();
      toast.success("Post created!");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, "Unable to create post."));
    } finally {
      setCreating(false);
      setUploadProgress(0);
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
      <div className="space-y-8 max-w-3xl mx-auto px-4 sm:px-6 py-6 md:py-8">
        <FeedHeader />
        <SkeletonCardList count={3} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 md:py-8 space-y-8">
      <FeedHeader />

      {/* Create Post */}
      <Card className="border-border/40 shadow-sm">
        <CardContent className="pt-5 pb-4">
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="flex gap-3">
              <Avatar className="w-10 h-10 shrink-0 ring-2 ring-indigo-500/10">
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
                aria-label="Post content"
                className="min-h-[110px] max-h-64 w-full resize-none text-sm bg-transparent border border-border/40 rounded-xl p-3 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 placeholder:text-muted-foreground/50 transition-all"
              />
            </div>

            {/* Selected image preview */}
            {imagePreviewUrl && (
              <div className="pl-12 relative w-full max-w-sm">
                <div className="relative rounded-xl overflow-hidden border border-border/40">
                  <img
                    src={imagePreviewUrl}
                    alt="Selected image preview"
                    className="w-full max-h-56 object-cover"
                  />
                  <div className="absolute bottom-2 right-2 flex gap-1.5">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-8 text-xs gap-1.5 shadow-md"
                      aria-label="Replace selected image"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Replace
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={clearImage}
                      className="h-8 text-xs gap-1.5 shadow-md"
                      aria-label="Remove selected image"
                    >
                      <X className="h-3.5 w-3.5" />
                      Remove
                    </Button>
                  </div>
                </div>
                {/* Upload progress */}
                {creating && uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="mt-2">
                    <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 transition-all duration-200"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 tabular-nums">
                      Uploading image… {uploadProgress}%
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Image validation error */}
            {imageError && (
              <p
                role="alert"
                className="flex items-center gap-1.5 text-xs text-red-500 pl-12"
              >
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {imageError}
              </p>
            )}

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/bmp"
              className="sr-only"
              id="feed-image-input"
              onChange={(e) => {
                handlePickImage(e.target.files?.[0]);
                e.target.value = "";
              }}
            />

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
                  onClick={() => fileInputRef.current?.click()}
                  disabled={creating}
                  className={`text-xs gap-1.5 ${
                    imagePreviewUrl
                      ? "text-indigo-400 bg-indigo-500/10"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <ImagePlus className="w-3.5 h-3.5" />
                  {imagePreviewUrl ? "Replace image" : "Attach image"}
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
                  {creating && newImageFile ? "Uploading…" : "Post"}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Feed Posts */}
      {posts.length === 0 ? (
        <div className="text-center py-20 animate-fade-in-up">
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
        <div className="space-y-5">
          {posts.map((post) => (
            <FeedPostCard
              key={post.id}
              post={post}
              currentUserId={user?.id}
              onUpdated={(updated) =>
                setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
              }
              onDeleted={(postId) =>
                setPosts((prev) => prev.filter((p) => p.id !== postId))
              }
            />
          ))}

          {/* Load more */}
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
