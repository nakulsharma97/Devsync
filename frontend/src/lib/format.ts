import { formatDistanceToNow } from "date-fns";

/**
 * Human-friendly relative time ("5 minutes ago") with a safe fallback for
 * invalid or empty dates.
 */
export function timeAgo(dateStr: string, fallback = ""): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return fallback;
  return formatDistanceToNow(date, { addSuffix: true });
}

/** Compact wall-clock time for message bubbles, e.g. "14:32". */
export function formatChatTime(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Day label for message separators: "Today", "Yesterday", or a formatted
 * date like "Monday, Aug 10".
 */
export function formatDayLabel(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";
  const now = new Date();
  if (isSameDay(date, now)) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
}

/** Human-readable file size, e.g. "2.4 MB". */
export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
