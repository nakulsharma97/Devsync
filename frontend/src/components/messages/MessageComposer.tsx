import { useEffect, useRef, useState } from "react";
import { Paperclip, Send, Loader2, X, FileText } from "lucide-react";
import { EmojiPicker } from "@/components/EmojiPicker";
import { attachmentService, validateAttachment, type AttachmentDto } from "@/services/attachmentService";
import { formatBytes } from "@/lib/format";
import { cn, getFeatureLimitError } from "@/lib/utils";
import { useNavigate } from "react-router";
import { toast } from "sonner";

interface MessageComposerProps {
  onSend: (text: string, attachmentId?: string, attachment?: AttachmentDto | null) => void;
  /** Called on every keystroke so the parent can publish the typing indicator. */
  onTyping?: () => void;
  /** Conversation id used as the attachment context (e.g. "dm_<id>"). */
  contextId: string;
  /** Project id for room messages — enables authorized downloads for members. */
  projectId?: string | null;
  disabled?: boolean;
}

export function MessageComposer({ onSend, onTyping, contextId, projectId, disabled }: MessageComposerProps) {
  const [text, setText] = useState("");
  const [attachment, setAttachment] = useState<AttachmentDto | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const sendingRef = useRef(false);
  const navigate = useNavigate();

  // Drop a staged attachment when the conversation changes.
  useEffect(() => {
    setAttachment(null);
    setUploadError(null);
  }, [contextId]);

  const autoGrow = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
  };

  const handleFile = async (file: File) => {
    const validationError = validateAttachment(file);
    if (validationError) {
      setUploadError(validationError);
      return;
    }
    setUploading(true);
    setUploadError(null);
    try {
      const uploaded = await attachmentService.upload(file, contextId, projectId);
      setAttachment(uploaded);
    } catch (err: unknown) {
      const limitErr = getFeatureLimitError(err);
      if (limitErr?.code === "STORAGE_LIMIT") {
        toast.error(limitErr.message, {
          description: "Upgrade to Pro for more storage.",
          action: {
            label: "Upgrade",
            onClick: () => navigate("/settings/billing"),
          },
        });
        setUploadError(limitErr.message);
      } else {
        setUploadError("Upload failed. Try again.");
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const submit = () => {
    const content = text.trim();
    if ((!content && !attachment) || uploading || sendingRef.current || disabled) return;
    sendingRef.current = true;
    onSend(content || attachment!.fileName, attachment?.id, attachment);
    setText("");
    setAttachment(null);
    setUploadError(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.focus();
    }
    setTimeout(() => {
      sendingRef.current = false;
    }, 400);
  };

  return (
    <div className="shrink-0 border-t border-border/40 bg-background/60 backdrop-blur-xl px-3 pt-2.5 pb-3">
      {/* Staged attachment preview */}
      {(attachment || uploadError) && (
        <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-lg border border-border/50 bg-muted/40">
          {attachment ? (
            <>
              <span className="w-8 h-8 shrink-0 rounded-md bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-xs font-medium truncate">{attachment.fileName}</span>
                <span className="block text-[10px] text-muted-foreground">{formatBytes(attachment.size)}</span>
              </span>
              <button
                onClick={() => setAttachment(null)}
                aria-label="Remove attachment"
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <>
              <span className="flex-1 text-xs text-red-500/90">{uploadError}</span>
              <button
                onClick={() => setUploadError(null)}
                aria-label="Dismiss error"
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      )}

      {/* Input row */}
      <div
        className={cn(
          "flex items-end gap-1.5 rounded-2xl border border-border/50 bg-muted/30 focus-within:border-indigo-500/50 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all px-2 py-1.5"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.gif,.webp,.svg,.bmp,.pdf,.doc,.docx,.txt,.md,.zip,.xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || disabled}
          aria-label="Attach file"
          title="Attach file"
          className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors disabled:opacity-40"
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin text-indigo-500" /> : <Paperclip className="w-4 h-4" />}
        </button>

        <EmojiPicker
          onSelect={(emoji) => {
            setText((prev) => prev + emoji);
            requestAnimationFrame(() => {
              autoGrow();
              textareaRef.current?.focus();
            });
          }}
          disabled={disabled}
        />

        <textarea
          ref={textareaRef}
          value={text}
          rows={1}
          onChange={(e) => {
            setText(e.target.value);
            autoGrow();
            onTyping?.();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={disabled ? "Messaging unavailable" : "Type a message..."}
          disabled={disabled}
          aria-label="Message"
          className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none py-1.5 max-h-[132px] leading-relaxed disabled:opacity-50"
        />

        <button
          type="button"
          onClick={submit}
          disabled={(!text.trim() && !attachment) || uploading || disabled}
          aria-label="Send message"
          className="w-9 h-9 shrink-0 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/25 transition-all hover:from-indigo-600 hover:to-purple-700 hover:shadow-lg hover:shadow-indigo-500/30 active:scale-95 disabled:opacity-40 disabled:shadow-none disabled:hover:from-indigo-500 disabled:hover:to-purple-600"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
      <p className="text-[10px] text-muted-foreground/50 mt-1.5 px-1">
        Enter to send · Shift + Enter for a new line
      </p>
    </div>
  );
}
