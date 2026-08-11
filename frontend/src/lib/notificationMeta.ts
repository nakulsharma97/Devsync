import {
  Bell,
  UserPlus,
  UserCheck,
  UserX,
  CheckCheck,
  XCircle,
  Shield,
  FolderKanban,
  MessageSquare,
  Heart,
  MessageCircle,
  Users,
  FileWarning,
  type LucideIcon,
} from "lucide-react";
import type { NotificationDto } from "@/services/notificationService";

export interface NotificationMeta {
  icon: LucideIcon;
  /** Tailwind classes for the icon chip background + color. */
  colorClass: string;
  label: string;
}

/**
 * Icons/colors for the notification types emitted by the backend
 * (see NotificationService.createNotification call sites).
 */
const META: Record<string, NotificationMeta> = {
  PROJECT_INVITE: { icon: UserPlus, colorClass: "text-purple-500 bg-purple-500/10", label: "Invitation" },
  PROJECT_INVITE_ACCEPTED: { icon: UserCheck, colorClass: "text-emerald-500 bg-emerald-500/10", label: "Invitation accepted" },
  JOIN_REQUEST_APPROVED: { icon: CheckCheck, colorClass: "text-emerald-500 bg-emerald-500/10", label: "Request approved" },
  JOIN_REQUEST_REJECTED: { icon: XCircle, colorClass: "text-red-500 bg-red-500/10", label: "Request declined" },
  MEMBER_ADDED: { icon: UserPlus, colorClass: "text-blue-500 bg-blue-500/10", label: "Added to project" },
  MEMBER_REMOVED: { icon: UserX, colorClass: "text-red-500 bg-red-500/10", label: "Removed from project" },
  MEMBER_ROLE_CHANGED: { icon: Shield, colorClass: "text-amber-500 bg-amber-500/10", label: "Role changed" },
  PROJECT_VISIBILITY_CHANGED: { icon: FolderKanban, colorClass: "text-emerald-500 bg-emerald-500/10", label: "Project visibility" },
  PROJECT_UPDATE: { icon: FolderKanban, colorClass: "text-emerald-500 bg-emerald-500/10", label: "Project update" },
  TASK_ASSIGNED: { icon: CheckCheck, colorClass: "text-indigo-500 bg-indigo-500/10", label: "Task assigned" },
  TASK_UPDATE: { icon: FolderKanban, colorClass: "text-blue-500 bg-blue-500/10", label: "Task update" },
  MENTION: { icon: MessageSquare, colorClass: "text-blue-500 bg-blue-500/10", label: "Mention" },
  LIKE: { icon: Heart, colorClass: "text-red-500 bg-red-500/10", label: "Like" },
  COMMENT: { icon: MessageCircle, colorClass: "text-blue-500 bg-blue-500/10", label: "Comment" },
  CONNECTION: { icon: Users, colorClass: "text-green-500 bg-green-500/10", label: "Connection" },
  REPORT: { icon: FileWarning, colorClass: "text-orange-500 bg-orange-500/10", label: "Report" },
};

const FALLBACK: NotificationMeta = {
  icon: Bell,
  colorClass: "text-indigo-500 bg-indigo-500/10",
  label: "Notification",
};

export function getNotificationMeta(type: string | null | undefined): NotificationMeta {
  return (type && META[type]) || FALLBACK;
}

/**
 * Resolves the client-side route for a notification.
 *
 * The backend stores legacy actionUrls — notably "/projects/<id>" for project
 * notifications (there is no /projects/:id route; the board lives at
 * /board/:projectId) and "/reports" (no public route for the reporter).
 * Known-good routes are used as-is; everything else falls back to
 * referenceType navigation, then to the notification center.
 */
export function resolveNotificationUrl(
  n: Pick<NotificationDto, "actionUrl" | "referenceType" | "referenceId">
): string {
  if (n.actionUrl) {
    // Legacy: "/projects/<id>" -> kanban board route.
    const projectsMatch = /^\/projects\/([^/]+)$/.exec(n.actionUrl);
    if (projectsMatch) return `/board/${projectsMatch[1]}`;
    // Known-good frontend routes.
    if (
      n.actionUrl.startsWith("/board/") ||
      n.actionUrl.startsWith("/messages") ||
      n.actionUrl === "/feed" ||
      n.actionUrl === "/dashboard" ||
      n.actionUrl === "/notifications"
    ) {
      return n.actionUrl;
    }
  }
  // Fall back to reference-based navigation.
  if (n.referenceType === "project" && n.referenceId) return `/board/${n.referenceId}`;
  return "/notifications";
}
