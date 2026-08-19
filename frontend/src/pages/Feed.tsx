import { useState, useEffect, useCallback, useRef } from "react";
import { postService, type PostDto } from "@/services/postService";
import { attachmentService } from "@/services/attachmentService";
import FeedPostCard from "@/components/feed/FeedPostCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { EmojiPicker } from "@/components/EmojiPicker";
import CropModal from "@/components/feed/CropModal";
import { SkeletonCardList } from "@/components/Skeletons";
import {
  ImagePlus,
  X,
  RefreshCw,
  Loader2,
  ChevronDown,
  Rss,
  Sparkles,
  Plus,
  AlertTriangle,
  Crop,
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

  // Composer state — collapsed by default
  const [composerOpen, setComposerOpen] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [creating, setCreating] = useState(false);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Crop state
  const [cropOpen, setCropOpen] = useState(false);

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

  const openComposer = () => {
    setComposerOpen(true);
    setTimeout(() => composerRef.current?.focus(), 100);
  };

  const closeComposer = () => {
    setComposerOpen(false);
    setNewContent("");
    clearImage();
  };

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
    setCropOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCropApply = useCallback(
    (croppedFile: File, previewUrl: string) => {
      // Revoke old preview URL
      setImagePreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return previewUrl;
      });
      setNewImageFile(croppedFile);
    },
    []
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;
    if (creating) return;
    setCreating(true);
    setImageError(null);
    setUploadProgress(0);
    try {
      let created = await postService.create({
        content: newContent.trim().slice(0, MAX_CONTENT_LENGTH),
      });
      if (newImageFile) {
        try {
          const attachment = await attachmentService.uploadPostImage(
            newImageFile,
            created.id,
            setUploadProgress
          );
          created = await postService.updatePostImage(created.id, attachment.url);
        } catch (err: unknown) {
          toast.error(getErrorMessage(err, "Unable to upload image."));
          throw err;
        }
      }
      setPosts((prev) => [created, ...prev]);
      setNewContent("");
      clearImage();
      setComposerOpen(false);
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

  if (loading) {
    return (
      <div className="max-w-[1100px] mx-auto px-6 sm:px-8 py-7 space-y-6">
        <FeedHeader onCreatePost={openComposer} />
        <SkeletonCardList count={3} />
      </div>
    );
  }

  return (
    <div className="max-w-[1100px] mx-auto px-6 sm:px-8 py-7 space-y-6">
      <FeedHeader onCreatePost={openComposer} />

      {/* Composer — collapsible */}
      {composerOpen && (
        <Card className="border-border/40 shadow-sm overflow-hidden animate-fade-in-up">
          <CardContent className="pt-5 pb-4">
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="flex items-start gap-3">
                <Avatar className="w-10 h-10 shrink-0 ring-2 ring-indigo-500/15 shadow-sm shadow-indigo-500/10">
                  <AvatarImage src={user?.avatarUrl || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xs font-bold">
                    {user?.fullName?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
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
                    className="min-h-[80px] max-h-48 w-full resize-none text-sm bg-transparent border border-border/40 rounded-xl p-3 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 placeholder:text-muted-foreground/50 transition-all"
                  />
                </div>
                <button
                  type="button"
                  onClick={closeComposer}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shrink-0"
                  aria-label="Close composer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Image preview */}
              {imagePreviewUrl && (
                <div className="ml-13 relative w-full max-w-sm">
                  <div className="relative rounded-xl overflow-hidden border border-border/40">
                    <img
                      src={imagePreviewUrl}
                      alt="Selected image preview"
                      className="w-full max-h-48 object-cover"
                    />
                    <div className="absolute bottom-2 right-2 flex gap-1.5">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setCropOpen(true)}
                        className="h-7 text-[10px] gap-1 shadow-md"
                        aria-label="Crop image"
                      >
                        <Crop className="h-3 w-3" />
                        Crop
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="h-7 text-[10px] gap-1 shadow-md"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Replace
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={clearImage}
                        className="h-7 text-[10px] gap-1 shadow-md"
                      >
                        <X className="h-3 w-3" />
                        Remove
                      </Button>
                    </div>
                  </div>
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

              {imageError && (
                <p role="alert" className="flex items-center gap-1.5 text-xs text-red-500 ml-13">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  {imageError}
                </p>
              )}

              <input
                ref={fileInputRef}
                id="feed-image-input"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/bmp"
                className="sr-only"
                onChange={(e) => {
                  handlePickImage(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />

              <div className="flex items-center justify-between ml-13">
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
                    className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs hover:from-indigo-600 hover:to-purple-700 shadow-md h-8"
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
      )}

      {/* Crop Modal */}
      {imagePreviewUrl && (
        <CropModal
          open={cropOpen}
          onOpenChange={setCropOpen}
          imageSrc={imagePreviewUrl}
          onApply={handleCropApply}
        />
      )}

      {/* Posts or Empty State */}
      {posts.length === 0 && !composerOpen ? (
        <div className="border border-border/40 rounded-2xl bg-card py-12 px-6 text-center">
          <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-indigo-500/15 to-purple-500/10 flex items-center justify-center ring-1 ring-indigo-500/20 shadow-md shadow-indigo-500/10">
            <Rss className="w-6 h-6 text-indigo-400" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1">No posts yet</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-4">
            Be the first to share an update with your team
          </p>
          <Button
            size="sm"
            onClick={openComposer}
            className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 shadow-md gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Post
          </Button>
        </div>
      ) : posts.length === 0 && composerOpen ? (
        /* Composer is open but no posts yet — show a subtle hint */
        <p className="text-center text-xs text-muted-foreground py-4">
          Your post will appear here once published
        </p>
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

function FeedHeader({ onCreatePost }: { onCreatePost: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-[28px] font-bold tracking-tight text-foreground flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-indigo-500" />
          </div>
          Feed
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          Latest updates from your team and projects
        </p>
      </div>
      <div className="flex items-center gap-2.5 shrink-0">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-medium px-2.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live
        </span>
        <Button
          onClick={onCreatePost}
          className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 shadow-md gap-1.5 h-9"
        >
          <Plus className="w-3.5 h-3.5" />
          Create Post
        </Button>
      </div>
    </div>
  );
}
