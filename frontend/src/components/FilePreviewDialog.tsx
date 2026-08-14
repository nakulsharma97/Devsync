import { useEffect, useState } from "react";
import { Loader2, FileText, Download, X } from "lucide-react";
import { attachmentService, downloadAttachment, type AttachmentDto } from "@/services/attachmentService";
import { AuthorizedImage } from "./messages/AttachmentView";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Inline preview for images, PDFs and videos. The blob is fetched through the
 * authorized API client (downloads require the JWT) and rendered from an object
 * URL that is revoked on close. Other types fall back to a download card.
 */
export function FilePreviewDialog({
  attachment,
  onClose,
}: {
  attachment: AttachmentDto;
  onClose: () => void;
}) {
  const contentType = attachment.contentType ?? "";
  const name = (attachment.fileName || "").toLowerCase();
  const isImage = contentType.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg|bmp)$/.test(name);
  const isPdf = contentType === "application/pdf" || name.endsWith(".pdf");
  const isVideo = contentType.startsWith("video/") || /\.(mp4|webm|mov|ogg)$/.test(name);

  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (isImage) return; // AuthorizedImage fetches on its own
    let cancelled = false;
    let url: string | null = null;
    attachmentService
      .downloadBlob(attachment.url)
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setObjectUrl(url);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [attachment.url, isImage]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadAttachment(attachment.url, attachment.fileName);
    } catch {
      // server remains the authority
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Preview ${attachment.fileName}`}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl max-h-[85vh] flex flex-col rounded-2xl border border-border/50 bg-background shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-border/40">
          <span className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{attachment.fileName}</p>
            <p className="text-[11px] text-muted-foreground">
              {formatBytes(attachment.size)}
              {attachment.uploaderName ? ` · ${attachment.uploaderName}` : ""}
            </p>
          </div>
          <button
            onClick={handleDownload}
            disabled={downloading}
            aria-label="Download file"
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors disabled:opacity-40"
          >
            {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            aria-label="Close preview"
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-auto bg-muted/20 flex items-center justify-center p-4">
          {failed ? (
            <div className="text-center py-10">
              <p className="text-sm text-muted-foreground">Preview unavailable for this file.</p>
              <button
                onClick={handleDownload}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg px-3.5 py-2"
              >
                <Download className="w-3.5 h-3.5" /> Download instead
              </button>
            </div>
          ) : isImage ? (
            <AuthorizedImage
              url={attachment.url}
              alt={attachment.fileName}
              className="max-w-full max-h-[70vh] object-contain rounded-lg"
            />
          ) : isPdf ? (
            objectUrl ? (
              <iframe
                src={objectUrl}
                title={attachment.fileName}
                className="w-full h-[70vh] rounded-lg border border-border/40 bg-white"
              />
            ) : (
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground/60" />
            )
          ) : isVideo ? (
            objectUrl ? (
              <video
                src={objectUrl}
                controls
                autoPlay
                playsInline
                className="max-w-full max-h-[70vh] rounded-lg"
              >
                Your browser does not support video playback.
              </video>
            ) : (
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground/60" />
            )
          ) : (
            <div className={cn("text-center py-10")}>
              <FileText className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-foreground font-medium">{attachment.fileName}</p>
              <p className="text-xs text-muted-foreground mt-1">{formatBytes(attachment.size)}</p>
              <button
                onClick={handleDownload}
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg px-3.5 py-2"
              >
                <Download className="w-3.5 h-3.5" /> Download
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
