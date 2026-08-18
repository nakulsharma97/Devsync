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
  CreditCard,
  AlertCircle,
  PlayCircle,
  GitBranch,
  GitPullRequest,
  GitMerge,
  CheckCircle2,
  MessageSquarePlus,
  UserCog,
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
  PROJECT_INVITE_DECLINED: { icon: UserX, colorClass: "text-amber-500 bg-amber-500/10", label: "Invitation declined" },
  JOIN_REQUEST_APPROVED: { icon: CheckCheck, colorClass: "text-emerald-500 bg-emerald-500/10", label: "Request approved" },
  JOIN_REQUEST_REJECTED: { icon: XCircle, colorClass: "text-red-500 bg-red-500/10", label: "Request declined" },
  JOIN_REQUEST: { icon: UserPlus, colorClass: "text-blue-500 bg-blue-500/10", label: "Join request" },
  PROJECT_JOINED: { icon: Users, colorClass: "text-emerald-500 bg-emerald-500/10", label: "New member" },
  MEMBER_ADDED: { icon: UserPlus, colorClass: "text-blue-500 bg-blue-500/10", label: "Added to project" },
  MEMBER_REMOVED: { icon: UserX, colorClass: "text-red-500 bg-red-500/10", label: "Removed from project" },
  MEMBER_ROLE_CHANGED: { icon: Shield, colorClass: "text-amber-500 bg-amber-500/10", label: "Role changed" },
  OWNERSHIP_TRANSFERRED: { icon: UserCog, colorClass: "text-amber-500 bg-amber-500/10", label: "Ownership transferred" },
  PROJECT_VISIBILITY_CHANGED: { icon: FolderKanban, colorClass: "text-emerald-500 bg-emerald-500/10", label: "Project visibility" },
  PROJECT_UPDATE: { icon: FolderKanban, colorClass: "text-emerald-500 bg-emerald-500/10", label: "Project update" },
  TASK_ASSIGNED: { icon: CheckCheck, colorClass: "text-indigo-500 bg-indigo-500/10", label: "Task assigned" },
  TASK_UPDATE: { icon: FolderKanban, colorClass: "text-blue-500 bg-blue-500/10", label: "Task update" },
  // GitHub-based development workflow notifications.
  TASK_STARTED: { icon: PlayCircle, colorClass: "text-indigo-500 bg-indigo-500/10", label: "Task started" },
  BRANCH_CREATED: { icon: GitBranch, colorClass: "text-emerald-500 bg-emerald-500/10", label: "Branch created" },
  PR_OPENED: { icon: GitPullRequest, colorClass: "text-blue-500 bg-blue-500/10", label: "Pull request opened" },
  PR_APPROVED: { icon: CheckCircle2, colorClass: "text-emerald-500 bg-emerald-500/10", label: "Pull request approved" },
  PR_CHANGES_REQUESTED: { icon: MessageSquarePlus, colorClass: "text-amber-500 bg-amber-500/10", label: "Changes requested" },
  PR_MERGED: { icon: GitMerge, colorClass: "text-purple-500 bg-purple-500/10", label: "Pull request merged" },
  PR_CLOSED: { icon: XCircle, colorClass: "text-red-500 bg-red-500/10", label: "Pull request closed" },
  MENTION: { icon: MessageSquare, colorClass: "text-blue-500 bg-blue-500/10", label: "Mention" },
  LIKE: { icon: Heart, colorClass: "text-red-500 bg-red-500/10", label: "Like" },
  COMMENT: { icon: MessageCircle, colorClass: "text-blue-500 bg-blue-500/10", label: "Comment" },
  CONNECTION: { icon: Users, colorClass: "text-green-500 bg-green-500/10", label: "Connection" },
  REPORT: { icon: FileWarning, colorClass: "text-orange-500 bg-orange-500/10", label: "Report" },
  // Billing (Razorpay) notifications — see BillingService/PlanService.
  PAYMENT_SUCCESS: { icon: CreditCard, colorClass: "text-emerald-500 bg-emerald-500/10", label: "Payment" },
  PAYMENT_FAILED: { icon: CreditCard, colorClass: "text-red-500 bg-red-500/10", label: "Payment failed" },
  PAYMENT_REFUNDED: { icon: CreditCard, colorClass: "text-amber-500 bg-amber-500/10", label: "Refund" },
  SUBSCRIPTION_PAST_DUE: { icon: AlertCircle, colorClass: "text-amber-500 bg-amber-500/10", label: "Action needed" },
  SUBSCRIPTION_CANCELLED: { icon: CreditCard, colorClass: "text-orange-500 bg-orange-500/10", label: "Subscription" },
  SUBSCRIPTION_EXPIRED: { icon: CreditCard, colorClass: "text-slate-500 bg-slate-500/10", label: "Subscription expired" },
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
    // "/projects/<id>" -> the project workspace.
    const projectsMatch = /^\/projects\/([^/]+)$/.exec(n.actionUrl);
    if (projectsMatch) return `/projects/${projectsMatch[1]}`;
    // Known-good frontend routes.
    if (
      n.actionUrl.startsWith("/board/") ||
      n.actionUrl.startsWith("/projects/") ||
      n.actionUrl.startsWith("/messages") ||
      n.actionUrl.startsWith("/settings") ||
      n.actionUrl === "/feed" ||
      n.actionUrl === "/dashboard" ||
      n.actionUrl === "/notifications"
    ) {
      return n.actionUrl;
    }
  }
  // Fall back to reference-based navigation.
  if (n.referenceType === "project" && n.referenceId) return `/projects/${n.referenceId}`;
  return "/notifications";
}
