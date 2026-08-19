import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { postService, type PostDto, type CommentDto } from "@/services/postService";
import { attachmentService } from "@/services/attachmentService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Heart,
  MessageCircle,
  Send,
  ImagePlus,
  X,
  RefreshCw,
  Loader2,
  AlertTriangle,
  MoreVertical,
  Pencil,
  Trash2,
  Flag,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/utils";
import { ReportDialog } from "@/components/ReportDialog";

const MAX_CONTENT_LENGTH = 1000;
const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"]);
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

// ── Post Image (authenticated blob fetch) ───────────────────

/**
 * Post images live behind the authenticated /api/attachments/... endpoint, so a
 * plain <img> cannot load them. Fetch the blob with the JWT, show an object
 * URL, and fall back to a placeholder on failure.
 */
export function FeedPostImage({ url, alt }: { url: string; alt: string }) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  const isAttachmentUrl = url.startsWith("/api/attachments/");

  useEffect(() => {
    if (!isAttachmentUrl) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    let created: string | null = null;
    attachmentService
      .downloadBlob(url)
      .then((blob) => {
        if (cancelled) return;
        created = URL.createObjectURL(blob);
        setObjectUrl(created);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setFailed(true);
        setLoading(false);
      });
    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [url, isAttachmentUrl]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 rounded-xl border border-border/20 bg-muted/30">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const src = isAttachmentUrl ? objectUrl : url;

  if (failed || !src) {
    return (
      <div className="flex items-center justify-center gap-2 h-40 rounded-xl border border-border/20 bg-muted/30 text-muted-foreground">
        <AlertTriangle className="h-4 w-4" />
        <span className="text-xs">Image failed to load</span>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden border border-border/20 bg-muted/20">
      <img
        src={src}
        alt={alt}
        className="w-full max-h-96 object-cover animate-fade-in-up"
        loading="lazy"
        onError={() => setFailed(true)}
      />
    </div>
  );
}

// ── Post Card ────────────────────────────────────────────────

export interface FeedPostCardProps {
  post: PostDto;
  currentUserId?: string | null;
  /** Called after a successful edit so the parent list can update in place. */
  onUpdated?: (post: PostDto) => void;
  /** Called after a successful delete so the parent list can remove it. */
  onDeleted?: (postId: string) => void;
}

export default function FeedPostCard({
  post,
  currentUserId,
  onUpdated,
  onDeleted,
}: FeedPostCardProps) {
  const navigate = useNavigate();
  const isOwnPost = String(post.user.id) === String(currentUserId);
  const timeAgo = getTimeAgo(post.createdAt);
  const isEdited =
    new Date(post.updatedAt).getTime() > new Date(post.createdAt).getTime();

  // Likes (optimistic, server-synced)
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likeCount || 0);

  // Comments
  const [comments, setComments] = useState<CommentDto[]>([]);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentSending, setCommentSending] = useState(false);
  const [commentCount, setCommentCount] = useState(post.commentCount || 0);

  // Edit dialog (author-only)
  const [editOpen, setEditOpen] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [editRemoveImage, setEditRemoveImage] = useState(false);
  const [editImageError, setEditImageError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // Delete confirmation (author-only)
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Comment deletion confirmation
  const [commentToDelete, setCommentToDelete] = useState<CommentDto | null>(null);
  const [commentDeleting, setCommentDeleting] = useState(false);

  // Report dialog (any user can report a post)
  const [reportOpen, setReportOpen] = useState(false);

  // When the parent hands us a refreshed post (e.g. edit), sync counts.
  useEffect(() => {
    setLikeCount(post.likeCount || 0);
    setCommentCount(post.commentCount || 0);
  }, [post.likeCount, post.commentCount]);

  const openComments = useCallback(async () => {
    if (commentsOpen) {
      setCommentsOpen(false);
      return;
    }
    setCommentsOpen(true);
    setCommentsLoading(true);
    try {
      setComments(await postService.getComments(post.id));
    } catch {
      toast.error("Failed to load comments");
    } finally {
      setCommentsLoading(false);
    }
  }, [commentsOpen, post.id]);

  const handleLike = async () => {
    const wasLiked = isLiked;
    setIsLiked(!wasLiked);
    setLikeCount((c) => c + (wasLiked ? -1 : 1));
    try {
      const res = await postService.toggleLike(post.id);
      setIsLiked(res.liked);
      setLikeCount(res.count);
    } catch {
      // revert
      setIsLiked(wasLiked);
      setLikeCount((c) => c + (wasLiked ? 1 : -1));
    }
  };

  const handleAddComment = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = commentText.trim();
    if (!text || commentSending) return;
    setCommentSending(true);
    setCommentText("");
    try {
      const comment = await postService.addComment(post.id, { content: text });
      setComments((prev) => [...prev, comment]);
      setCommentCount((c) => c + 1);
    } catch {
      setCommentText(text);
      toast.error("Failed to add comment");
    } finally {
      setCommentSending(false);
    }
  };

  const confirmDeleteComment = async () => {
    if (!commentToDelete || commentDeleting) return;
    setCommentDeleting(true);
    try {
      await postService.deleteComment(commentToDelete.id);
      setComments((prev) => prev.filter((c) => c.id !== commentToDelete.id));
      setCommentCount((c) => Math.max(0, c - 1));
      setCommentToDelete(null);
    } catch (err) {
      toast.error(getErrorMessage(err, "Unable to delete comment."));
    } finally {
      setCommentDeleting(false);
    }
  };

  // ── Edit flow ──────────────────────────────────────────────

  const openEdit = () => {
    setEditContent(post.content);
    setEditImageFile(null);
    setEditImagePreview(null);
    setEditRemoveImage(false);
    setEditImageError(null);
    setEditOpen(true);
  };

  const closeEdit = () => {
    if (editSaving) return;
    setEditOpen(false);
  };

  const handleEditPickImage = (file: File | undefined | null) => {
    if (!file) return;
    const dot = file.name.lastIndexOf(".");
    const ext = dot >= 0 ? file.name.slice(dot + 1).toLowerCase() : "";
    if (!IMAGE_EXTENSIONS.has(ext)) {
      setEditImageError("Unsupported image type. Use JPG, PNG, WEBP or GIF.");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setEditImageError("Image is too large — maximum size is 10 MB.");
      return;
    }
    setEditImageError(null);
    if (editImagePreview) URL.revokeObjectURL(editImagePreview);
    setEditImageFile(file);
    setEditImagePreview(URL.createObjectURL(file));
    setEditRemoveImage(false);
  };

  const saveEdit = async () => {
    if (!editContent.trim() || editSaving) return;
    setEditSaving(true);
    setEditImageError(null);
    try {
      let updated = post;
      if (editImageFile) {
        const attachment = await attachmentService.uploadPostImage(editImageFile, post.id);
        updated = await postService.updatePostImage(post.id, attachment.url);
      } else if (editRemoveImage) {
        updated = await postService.updatePostImage(post.id, null);
      }
      updated = await postService.updatePost(post.id, {
        content: editContent.trim().slice(0, MAX_CONTENT_LENGTH),
      });
      onUpdated?.(updated);
      setEditOpen(false);
      setEditImageFile(null);
      setEditImagePreview(null);
      setEditRemoveImage(false);
      toast.success("Post updated");
    } catch (err) {
      toast.error(getErrorMessage(err, "Unable to update post."));
    } finally {
      setEditSaving(false);
    }
  };

  // ── Delete flow ────────────────────────────────────────────

  const confirmDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await postService.delete(post.id);
      setDeleteOpen(false);
      onDeleted?.(post.id);
      toast.success("Post deleted");
    } catch (err) {
      toast.error(getErrorMessage(err, "Unable to delete post."));
    } finally {
      setDeleting(false);
    }
  };

  const goToProfile = () => {
    if (post.user.username) navigate(`/profile/${post.user.username}`);
  };

  return (
    <Card className="group border-border/40 hover:border-indigo-500/25 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300">
      <div className="p-5 md:p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={goToProfile}
              disabled={!post.user.username}
              aria-label={post.user.username ? `View ${post.user.fullName}'s profile` : undefined}
              className={`shrink-0 ${post.user.username ? "cursor-pointer" : "cursor-default"}`}
            >
              <Avatar className="w-10 h-10 ring-2 ring-indigo-500/10">
                <AvatarImage src={post.user.avatarUrl || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-500 dark:text-indigo-400 text-xs font-bold">
                  {post.user.fullName?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
            </button>
            <div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={goToProfile}
                  disabled={!post.user.username}
                  className={`text-sm font-semibold text-left ${
                    post.user.username
                      ? "hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors"
                      : "cursor-default"
                  }`}
                >
                  {post.user.fullName}
                </button>
                {post.user.username && (
                  <span className="text-xs text-muted-foreground/70">
                    @{post.user.username}
                  </span>
                )}
                {isOwnPost && (
                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20">
                    You
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                {timeAgo}
                {isEdited && (
                  <span className="text-[10px] text-muted-foreground/70">
                    · Edited
                  </span>
                )}
              </p>
            </div>
          </div>
          {/* 3-dot Post actions menu — only for the post owner */}
          {isOwnPost && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground/50 hover:text-foreground hover:bg-muted opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-all"
                  aria-label="Post actions"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onSelect={openEdit} className="gap-2 cursor-pointer">
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => setDeleteOpen(true)}
                  className="gap-2 cursor-pointer text-red-500 focus:text-red-500 focus:bg-red-500/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Content */}
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
          {post.content}
        </p>
        {post.imageUrl && <FeedPostImage url={post.imageUrl} alt="Post image" />}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleLike}
            aria-label={isLiked ? "Unlike post" : "Like post"}
            className={`flex items-center gap-1.5 text-xs rounded-full px-3 py-1.5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 ${
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
            onClick={openComments}
            aria-label="Toggle comments"
            className={`flex items-center gap-1.5 text-xs rounded-full px-3 py-1.5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 ${
              commentsOpen
                ? "text-indigo-500 bg-indigo-500/10"
                : "text-muted-foreground hover:text-indigo-500 hover:bg-indigo-500/5"
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            <span className="tabular-nums">
              {commentCount > 0 ? commentCount : "Comment"}
            </span>
          </button>

          <button
            onClick={() => setReportOpen(true)}
            aria-label="Report post"
            className="flex items-center gap-1.5 text-xs rounded-full px-3 py-1.5 ml-auto text-muted-foreground/60 hover:text-amber-500 hover:bg-amber-500/5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
          >
            <Flag className="w-4 h-4" />
            <span className="hidden sm:inline">Report</span>
          </button>
        </div>

        {/* Comments Section */}
        {commentsOpen && (
          <div className="border-t border-border/20 pt-4 space-y-4 animate-fade-in-up">
            {commentsLoading ? (
              <div className="flex justify-center py-3">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
              </div>
            ) : (
              <>
                {comments.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-3">
                    No comments yet — start the discussion
                  </p>
                ) : (
                  <div className="space-y-3.5 max-h-60 overflow-y-auto pr-1">
                    {comments.map((comment) => (
                      <div key={comment.id} className="flex gap-2.5 animate-fade-in-up">
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
                        {/* Delete comment — comment author OR post owner */}
                        {(String(comment.user.id) === String(currentUserId) ||
                          isOwnPost) && (
                          <button
                            onClick={() => setCommentToDelete(comment)}
                            aria-label="Delete comment"
                            className="self-start p-1 rounded-md text-muted-foreground/40 hover:text-red-500 hover:bg-red-500/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/40"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Add comment */}
                <form onSubmit={handleAddComment} className="flex gap-2">
                  <Input
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Write a comment..."
                    disabled={commentSending}
                    aria-label="Write a comment"
                    className="flex-1 h-9 text-xs bg-transparent border-border/40 rounded-full"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!commentText.trim() || commentSending}
                    className="h-9 w-9 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700"
                    aria-label="Send comment"
                  >
                    {commentSending ? (
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

      {/* Edit post dialog (author-only) */}
      <Dialog open={editOpen} onOpenChange={(open) => !open && closeEdit()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit post</DialogTitle>
            <DialogDescription>
              Update your post content or image.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value.slice(0, MAX_CONTENT_LENGTH))}
              aria-label="Edit post content"
              className="min-h-[110px] max-h-64 w-full resize-none text-sm bg-transparent border border-border/40 rounded-xl p-3 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 placeholder:text-muted-foreground/50 transition-all"
            />

            {editImagePreview ? (
              <div className="relative">
                <img
                  src={editImagePreview}
                  alt="Edited image preview"
                  className="w-full max-h-48 object-cover rounded-xl border border-border/40"
                />
                <div className="absolute bottom-2 right-2 flex gap-1.5">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => editFileInputRef.current?.click()}
                    className="h-8 text-xs gap-1.5 shadow-md"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Replace
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (editImagePreview) URL.revokeObjectURL(editImagePreview);
                      setEditImageFile(null);
                      setEditImagePreview(null);
                      setEditRemoveImage(true);
                    }}
                    className="h-8 text-xs gap-1.5 shadow-md"
                  >
                    <X className="h-3.5 w-3.5" />
                    Remove
                  </Button>
                </div>
              </div>
            ) : post.imageUrl && !editRemoveImage ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <FeedPostImage url={post.imageUrl} alt="Current post image" />
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => editFileInputRef.current?.click()}
                    className="h-8 text-xs gap-1.5"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Replace
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditRemoveImage(true)}
                    className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-red-400"
                  >
                    <X className="h-3.5 w-3.5" />
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {editRemoveImage
                    ? "Image will be removed when you save."
                    : "No image on this post."}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => editFileInputRef.current?.click()}
                  className="h-8 text-xs gap-1.5"
                >
                  <ImagePlus className="h-3.5 w-3.5" />
                  Add image
                </Button>
              </div>
            )}

            <input
              ref={editFileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/bmp"
              className="sr-only"
              onChange={(e) => {
                handleEditPickImage(e.target.files?.[0]);
                e.target.value = "";
              }}
            />

            {editImageError && (
              <p role="alert" className="flex items-center gap-1.5 text-xs text-red-500">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                {editImageError}
              </p>
            )}

            <div className="flex items-center justify-between">
              <span
                className={`text-[10px] tabular-nums ${
                  editContent.length > MAX_CONTENT_LENGTH - 50
                    ? "text-amber-500"
                    : "text-muted-foreground/50"
                }`}
              >
                {editContent.length}/{MAX_CONTENT_LENGTH}
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeEdit} disabled={editSaving}>
              Cancel
            </Button>
            <Button
              onClick={saveEdit}
              disabled={editSaving || !editContent.trim()}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700"
            >
              {editSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Pencil className="h-4 w-4 mr-1" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation (author-only) */}
      <AlertDialog open={deleteOpen} onOpenChange={(open) => !open && !deleting && setDeleteOpen(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete post?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Report dialog (any user) */}
      <ReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        entityType="POST"
        entityId={post.id}
        entityLabel={`post by ${post.user.fullName}`}
      />

      {/* Comment deletion confirmation */}
      <AlertDialog
        open={!!commentToDelete}
        onOpenChange={(open) => !open && !commentDeleting && setCommentToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete comment?</AlertDialogTitle>
            <AlertDialogDescription>
              This comment will be removed from the post.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={commentDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteComment}
              disabled={commentDeleting}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              {commentDeleting && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

export function getTimeAgo(dateStr: string): string {
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
