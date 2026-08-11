import api from "./api";

export interface AttachmentDto {
  id: string;
  uploaderId: string;
  uploaderName: string;
  uploaderAvatar: string | null;
  projectId: string | null;
  contextType: string | null;
  contextId: string | null;
  fileName: string;
  contentType: string | null;
  size: number;
  url: string;
  createdAt: string;
}

/** Extension whitelist mirrors AttachmentService on the backend. */
const ALLOWED_EXTENSIONS = new Set([
  "png", "jpg", "jpeg", "gif", "webp", "svg", "bmp",
  "pdf", "doc", "docx", "txt", "md", "zip", "xlsx", "xls", "csv",
]);

/** Backend default: app.upload.max-size (10 MB). */
const MAX_SIZE = 10 * 1024 * 1024;

export function validateAttachment(file: File): string | null {
  const dot = file.name.lastIndexOf(".");
  const ext = dot >= 0 ? file.name.slice(dot + 1).toLowerCase() : "";
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return "Unsupported file type. Allowed: images, pdf, docx, txt, md, zip, xlsx, csv";
  }
  if (file.size > MAX_SIZE) {
    return "File exceeds the maximum allowed size (10MB)";
  }
  return null;
}

export const attachmentService = {
  /**
   * Upload a file as a MESSAGE attachment. The backend requires the uploader
   * to be authorized; downloads go through the authenticated endpoint.
   */
  async listByProject(projectId: string): Promise<AttachmentDto[]> {
    const res = await api.get(`/attachments/project/${projectId}`);
    return res.data;
  },

  async upload(file: File, contextId: string, projectId?: string | null): Promise<AttachmentDto> {
    const form = new FormData();
    form.append("file", file);
    form.append("contextType", "MESSAGE");
    form.append("contextId", contextId);
    if (projectId) form.append("projectId", projectId);
    const res = await api.post("/attachments", form);
    return res.data;
  },

  /**
   * Downloads are authenticated (the API client attaches the JWT) and the
   * server responds with Content-Disposition: attachment — a plain <a>/<img>
   * cannot carry the token. Fetch a blob and hand it to the browser.
   */
  async downloadBlob(url: string): Promise<Blob> {
    // Backend urls are absolute ("/api/attachments/...") — make them relative
    // to the axios baseURL so the token interceptor applies.
    const relative = url.startsWith("/api/") ? url.slice(4) : url;
    const res = await api.get(relative, { responseType: "blob" });
    return res.data as Blob;
  },
};

/** Trigger a browser download for an authenticated attachment url. */
export async function downloadAttachment(url: string, fileName: string): Promise<void> {
  try {
    const blob = await attachmentService.downloadBlob(url);
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = fileName || "download";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  } catch {
    // Authorization / network failure — the caller surfaces the error.
    throw new Error("Failed to download file");
  }
}
