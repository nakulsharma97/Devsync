import { useEffect, useState, type ReactNode } from "react";
import { FilePreviewDialog } from "@/components/FilePreviewDialog";
import {
  FileText,
  Download,
  Loader2,
  ImageIcon,
  FileArchive,
  FileSpreadsheet,
} from "lucide-react";
import { attachmentService, downloadAttachment, type AttachmentDto } from "@/services/attachmentService";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Returns true when an attachment's content type is an image. */
export function isImageAttachment(attachment: AttachmentDto | null | undefined): boolean {
  return !!attachment && (attachment.contentType?.startsWith("image/") ?? false);
}

/** Icon for a non-image file based on its content type / extension. */
function fileIconFor(attachment: AttachmentDto): ReactNode {
  const name = (attachment.fileName || "").toLowerCase();
  if (/\.(zip|rar|7z|tar|gz)$/.test(name) || /zip/.test(attachment.contentType || "")) {
    return <FileArchive className="w-4 h-4" />;
  }
  if (/\.(xlsx|xls|csv)$/.test(name) || /spreadsheet|excel/.test(attachment.contentType || "")) {
    return <FileSpreadsheet className="w-4 h-4" />;
  }
  return <FileText className="w-4 h-4" />;
}

/**
 * Image thumbnail fetched through the authorized API client (the server
 * requires the JWT and returns Content-Disposition: attachment, so a plain
 * <img src> would fail). The object URL is revoked on unmount.
 */
export function AuthorizedImage({
  url,
  alt,
  className,
}: {
  url: string;
  alt?: string;
  className?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    setSrc(null);
    setFailed(false);
    attachmentService
      .downloadBlob(url)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  if (failed) {
    return (
      <div className={cn("flex items-center justify-center bg-muted/40 text-muted-foreground/60", className)}>
        <ImageIcon className="w-5 h-5" />
      </div>
    );
  }
  if (!src) {
    return (
      <div className={cn("flex items-center justify-center bg-muted/30", className)}>
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground/50" />
      </div>
    );
  }
  return <img src={src} alt={alt || "Attachment"} className={className} loading="lazy" />;
}

/**
 * A compact file row (icon + name + size + actions). Previewable types
 * (images, PDFs, videos) open the inline preview; every file can be downloaded.
 */
export function FileRow({ attachment, className }: { attachment: AttachmentDto; className?: string }) {
  const [downloading, setDownloading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const name = (attachment.fileName || "").toLowerCase();
  const previewable =
    isImageAttachment(attachment) ||
    (attachment.contentType ?? "") === "application/pdf" ||
    name.endsWith(".pdf") ||
    (attachment.contentType ?? "").startsWith("video/") ||
    /\.(mp4|webm|mov|ogg)$/.test(name);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadAttachment(attachment.url, attachment.fileName);
    } catch {
      // ignore — server remains the authority on access
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      className={cn(
        "group flex items-center gap-2.5 w-full rounded-lg border border-border/50 bg-muted/30 hover:bg-muted/60 transition-colors px-3 py-2",
        className
      )}
    >
      <button
        type="button"
        onClick={() => (previewable ? setPreviewOpen(true) : handleDownload())}
        className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
        title={previewable ? `Preview ${attachment.fileName}` : `Download ${attachment.fileName}`}
      >
        <span className="w-8 h-8 shrink-0 rounded-md bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 flex items-center justify-center">
          {fileIconFor(attachment)}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-xs font-medium truncate">{attachment.fileName}</span>
          <span className="block text-[10px] text-muted-foreground">
            {formatBytes(attachment.size)}
            {attachment.createdAt
              ? ` · ${new Date(attachment.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}`
              : ""}
          </span>
        </span>
      </button>
      {downloading ? (
        <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin text-muted-foreground/60" />
      ) : (
        <button
          type="button"
          onClick={handleDownload}
          aria-label={`Download ${attachment.fileName}`}
          title="Download"
          className="p-1.5 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-accent/10 transition-colors shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
        </button>
      )}
      {previewOpen && <FilePreviewDialog attachment={attachment} onClose={() => setPreviewOpen(false)} />}
    </div>
  );
}

/**
 * Attachment rendered inside a message bubble: an image thumbnail for image
 * types, a compact file row otherwise. Clicking opens an inline preview.
 */
export function MessageAttachment({ attachment }: { attachment: AttachmentDto }) {
  const [previewOpen, setPreviewOpen] = useState(false);
  if (isImageAttachment(attachment)) {
    return (
      <>
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          className="block rounded-lg overflow-hidden border border-white/10 mb-1.5 max-w-[260px]"
          title={`Preview ${attachment.fileName}`}
        >
          <AuthorizedImage url={attachment.url} alt={attachment.fileName} className="w-full h-auto max-h-48 object-cover" />
        </button>
        {previewOpen && <FilePreviewDialog attachment={attachment} onClose={() => setPreviewOpen(false)} />}
      </>
    );
  }
  return <FileRow attachment={attachment} className="mb-1.5" />;
}
