import { useState, useEffect, useCallback, useRef } from "react";
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
} from "lucide-react";
import { postService, type Post, type Comment } from "@/services/postService";
import { useDevSyncAuth } from "@/contexts/AuthContext";

const ACCEPTED_FILE_TYPES = "image/*,.pdf";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Format file size for display
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export default function Feed() {
  const { user } = useDevSyncAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [newContent, setNewContent] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const fetchFeed = useCallback(async () => {
    try {
      const feed = await postService.getFeed(0, 20);
      setPosts(feed.content || []);
    } catch (err: any) {
      console.error("Failed to fetch feed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setError(null);

    if (file) {
      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        setError(`File too large. Maximum size is 10MB. Selected file is ${formatFileSize(file.size)}.`);
        e.target.value = "";
        return;
      }

      // Validate file type
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

    // Reset input so the same file can be selected again
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

      // Upload file if selected
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
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Developer Feed
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          See what others are building
        </p>
      </div>

      {/* Create Post */}
      <div className="border border-border/50 rounded-xl p-4 mb-6 bg-card">
        <Textarea
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          placeholder="Share what you're working on..."
          rows={3}
          className="text-sm resize-none border-0 p-0 focus-visible:ring-0 placeholder:text-muted-foreground bg-transparent"
        />

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
            disabled={
              creating ||
              uploading ||
              (!newContent.trim() && !selectedFile)
            }
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
            <div
              key={i}
              className="border border-border/50 rounded-xl p-5 animate-pulse bg-card"
            >
              <div className="h-3 bg-muted rounded w-1/3 mb-3" />
              <div className="h-2 bg-muted rounded w-full mb-2" />
              <div className="h-2 bg-muted rounded w-2/3" />
            </div>
          ))}
        </div>
      )}

      {!loading && posts.length === 0 && (
        <div className="border border-border/50 rounded-xl p-12 flex flex-col items-center text-center gap-4 bg-card">
          <Sparkles className="w-8 h-8 text-muted-foreground" />
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              No posts yet
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Be the first to share something!
            </p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {posts.map((post) => (
          <div
            key={post._id}
            className="border border-border/50 rounded-xl p-5 bg-card"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {post.user?.fullName || "Unknown"}
                </span>
                <span className="text-xs text-muted-foreground/50">·</span>
                <span className="text-xs text-muted-foreground">
                  {formatDate(post.createdAt)}
                </span>
              </div>
              {post.user?.id === user?.id && (
                <button
                  onClick={() => handleDelete(post._id)}
                  className="text-muted-foreground hover:text-destructive transition-colors p-1 -mr-1 -mt-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {post.content}
            </p>

            {/* Post file attachment */}
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
                  ? `${likeCounts[post._id]} ${
                      likeCounts[post._id] === 1 ? "like" : "likes"
                    }`
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
                    No comments yet.
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
                    placeholder="Write a comment..."
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
    </div>
  );
}
