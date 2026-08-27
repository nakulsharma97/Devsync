import api from "./api";

export interface AdminUserSummary {
  id: string;
  email: string;
  fullName: string;
  username: string;
  avatarUrl?: string;
  role: string;
  blocked: boolean;
  createdAt: string;
}

export interface AdminProjectSummary {
  id: string;
  name: string;
  status: string;
  ownerId: string;
  createdAt: string;
}

export interface AdminDashboard {
  totalUsers: number;
  activeUsers: number;
  blockedUsers: number;
  totalProjects: number;
  totalTeams: number;
  totalTasks: number;
  totalMessages: number;
  totalPosts: number;
  recentUsers: AdminUserSummary[];
  recentProjects: AdminProjectSummary[];
}

export interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  username: string;
  role: string;
  avatarUrl?: string;
  blocked: boolean;
  postCount: number;
  followerCount: number;
  createdAt: string;
}

export interface AdminPostAuthor {
  id: string;
  fullName: string;
  email: string;
  username?: string;
  avatarUrl?: string;
}

export interface AdminPost {
  id: string;
  content: string;
  imageUrl?: string;
  postType?: string;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  author: AdminPostAuthor | null;
}

export interface PlatformStats {
  totalUsers: number;
  totalPosts: number;
  totalProjects: number;
  totalTeams: number;
  totalConnections: number;
}

export type UserStatus = "ACTIVE" | "BLOCKED" | "DELETED";

export interface AdminUserListItem {
  id: string;
  avatarUrl?: string | null;
  fullName: string;
  username?: string | null;
  email: string;
  role: string;
  status: UserStatus;
  createdAt: string;
  lastLoginAt?: string | null;
}

export interface AdminTeamSummary {
  id: string;
  name: string;
  createdAt: string;
}

export interface AdminUserDetail {
  id: string;
  email: string;
  fullName: string;
  username?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  jobTitle?: string | null;
  company?: string | null;
  location?: string | null;
  role: string;
  status: UserStatus;
  emailVerified: boolean;
  authProvider: string;
  createdAt: string;
  lastLoginAt?: string | null;
  projectsJoined: AdminProjectSummary[];
  projectsOwned: AdminProjectSummary[];
  teams: AdminTeamSummary[];
  postsCount: number;
  messagesCount: number;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface AdminUsersQuery {
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  search?: string;
  role?: string;
  status?: string;
  /** ISO date (yyyy-MM-dd) or instant - created-after bound, inclusive. */
  from?: string;
  /** ISO date (yyyy-MM-dd) or instant - created-before bound, inclusive. */
  to?: string;
}

// ---------- Admin Project Management types ----------

export interface AdminProjectOwner {
  id: string;
  fullName: string;
  email?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
}

export interface AdminProjectMember {
  userId: string;
  fullName: string;
  email?: string | null;
  avatarUrl?: string | null;
  role: string;
}

export interface AdminKanbanStats {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
}

export interface AdminActivityItem {
  type: string;
  title: string;
  timestamp: string;
}

export interface AdminProjectListItem {
  id: string;
  name: string;
  description?: string | null;
  ownerId: string;
  ownerName: string;
  ownerEmail?: string | null;
  ownerAvatarUrl?: string | null;
  visibility: string;
  status: string;
  membersCount: number;
  tasksCount: number;
  postsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminProjectDetail {
  id: string;
  name: string;
  description?: string | null;
  owner: AdminProjectOwner;
  visibility: string;
  status: string;
  memberCount: number;
  members: AdminProjectMember[];
  kanbanStats: AdminKanbanStats;
  postsCount: number;
  messagesCount: number;
  recentActivity: AdminActivityItem[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminProjectStats {
  total: number;
  active: number;
  archived: number;
  publicCount: number;
  privateCount: number;
}

export interface AdminProjectsQuery {
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  search?: string;
  visibility?: string;
  status?: string;
}

// ---------- Admin Reports & Moderation types ----------

export type ReportEntityType = "USER" | "PROJECT" | "POST" | "COMMENT" | "MESSAGE";
export type ReportReason =
  | "SPAM"
  | "HARASSMENT"
  | "INAPPROPRIATE_CONTENT"
  | "FAKE_ACCOUNT"
  | "COPYRIGHT"
  | "ABUSE"
  | "OTHER";
export type ReportStatus = "PENDING" | "UNDER_REVIEW" | "RESOLVED" | "REJECTED";

export interface AdminReporter {
  id: string;
  fullName: string;
  email: string;
  username?: string | null;
  avatarUrl?: string | null;
}

export interface AdminReportListItem {
  id: string;
  reporter: AdminReporter;
  entityType: ReportEntityType;
  entityId: string;
  entityTitle: string;
  reason: ReportReason;
  status: ReportStatus;
  createdAt: string;
}

export interface AdminReportDetail {
  id: string;
  reporter: AdminReporter;
  entityType: ReportEntityType;
  entityId: string;
  entityTitle: string;
  entityOwnerId?: string | null;
  entityOwnerName?: string | null;
  reason: ReportReason;
  description?: string | null;
  status: ReportStatus;
  reviewedBy?: string | null;
  reviewedByName?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminReportStats {
  total: number;
  pending: number;
  underReview: number;
  resolved: number;
  rejected: number;
}

export type ModerationAction =
  | "BLOCK_USER"
  | "UNBLOCK_USER"
  | "DELETE_USER"
  | "ARCHIVE_PROJECT"
  | "DELETE_PROJECT"
  | "SET_VISIBILITY"
  | "DELETE_POST"
  | "HIDE_POST"
  | "RESTORE_POST"
  | "DELETE_COMMENT"
  | "RESTORE_COMMENT"
  | "DELETE_MESSAGE"
  | "HIDE_MESSAGE";

export interface AdminReportsQuery {
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  search?: string;
  status?: string;
  reason?: string;
  entityType?: string;
}

// ---------- Activity & Audit Logs types ----------

export interface ActivityUser {
  id: string;
  fullName: string;
  username?: string | null;
  avatarUrl?: string | null;
}

export interface ActivityItem {
  id: string;
  user: ActivityUser;
  projectId?: string | null;
  activityType: string;
  title: string;
  description?: string | null;
  createdAt: string;
}

export interface AdminActivityStats {
  todayCount: number;
  projects: number;
  tasks: number;
  messages: number;
}

export interface AdminActivityQuery {
  page?: number;
  size?: number;
  projectId?: string;
  userId?: string;
  activityType?: string;
  from?: string;
  to?: string;
}

export type AuditStatus = "SUCCESS" | "FAILURE";

export interface AuditLogItem {
  id: string;
  performedBy?: string | null;
  performedByName?: string | null;
  targetUserId?: string | null;
  targetUserName?: string | null;
  action: string;
  status: AuditStatus;
  ipAddress?: string | null;
  device?: string | null;
  browser?: string | null;
  details?: string | null;
  createdAt: string;
}

export interface AuditLogQuery {
  page?: number;
  size?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  search?: string;
  action?: string;
  status?: string;
  adminId?: string;
  userId?: string;
  from?: string;
  to?: string;
}

// ---------- Admin Reviews & Feedback types ----------

export type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED";
export type FeedbackStatus = "OPEN" | "IN_REVIEW" | "RESOLVED" | "CLOSED";

export interface AdminReviewListItem {
  id: string;
  userId: string;
  reviewerName: string;
  reviewerUsername?: string | null;
  reviewerEmail?: string | null;
  reviewerAvatarUrl?: string | null;
  rating: number;
  title?: string | null;
  comment: string;
  category: string;
  status: ReviewStatus;
  featured: boolean;
  moderatedBy?: string | null;
  moderatedAt?: string | null;
  createdAt: string;
}

export interface AdminReviewStats {
  pending: number;
  approved: number;
  rejected: number;
}

export interface AdminFeedbackListItem {
  id: string;
  userId: string;
  userName: string;
  userUsername?: string | null;
  userEmail?: string | null;
  userAvatarUrl?: string | null;
  category: string;
  message: string;
  rating?: number | null;
  status: FeedbackStatus;
  adminNote?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminFeedbackStats {
  open: number;
  inReview: number;
  resolved: number;
  closed: number;
}

export interface AdminReviewsQuery {
  page?: number;
  size?: number;
  search?: string;
  status?: ReviewStatus | "ALL";
}

export interface AdminFeedbackQuery {
  page?: number;
  size?: number;
  search?: string;
  status?: FeedbackStatus | "ALL";
  category?: string | "ALL";
}

// ---------- Frontend helper types ----------

export interface CreateReportInput {
  entityType: ReportEntityType;
  entityId: string;
  reason: ReportReason;
  description?: string;
}

export interface ReportResponse {
  id: string;
  entityType: ReportEntityType;
  entityId: string;
  reason: ReportReason;
  description?: string;
  status: ReportStatus;
  createdAt: string;
}

export const adminService = {
  async isAdmin(): Promise<boolean> {
    try {
      const res = await api.get("/admin/check");
      return res.data?.isAdmin || false;
    } catch {
      return false;
    }
  },

  async getDashboard(): Promise<AdminDashboard> {
    try {
      const res = await api.get("/admin/dashboard");
      return res.data;
    } catch {
      return {
        totalUsers: 0,
        activeUsers: 0,
        blockedUsers: 0,
        totalProjects: 0,
        totalTeams: 0,
        totalTasks: 0,
        totalMessages: 0,
        totalPosts: 0,
        recentUsers: [],
        recentProjects: [],
      };
    }
  },

  async getPlatformStats(): Promise<PlatformStats> {
    try {
      const res = await api.get("/admin/stats");
      return res.data;
    } catch {
      return { totalUsers: 0, totalPosts: 0, totalProjects: 0, totalTeams: 0, totalConnections: 0 };
    }
  },

  async getAllUsers(): Promise<AdminUser[]> {
    try {
      const res = await api.get("/admin/users");
      return res.data;
    } catch {
      return [];
    }
  },

  async getUsersPage(query: AdminUsersQuery = {}): Promise<PageResponse<AdminUserListItem>> {
    const res = await api.get("/admin/users/paged", { params: query });
    return res.data;
  },

  async getUserDetail(userId: string): Promise<AdminUserDetail> {
    const res = await api.get(`/admin/users/${userId}`);
    return res.data;
  },

  async deleteUser(userId: string): Promise<void> {
    await api.delete(`/admin/users/${userId}`);
  },

  async getAllPosts(): Promise<AdminPost[]> {
    try {
      const res = await api.get("/admin/posts");
      return res.data;
    } catch {
      return [];
    }
  },

  async updateUserRole(userId: string, role: string): Promise<AdminUser> {
    const res = await api.put(`/admin/users/${userId}/role`, { role });
    return res.data;
  },

  async setUserBlocked(userId: string, blocked: boolean, reason?: string): Promise<AdminUser> {
    const res = await api.put(`/admin/users/${userId}/${blocked ? "block" : "unblock"}`, {
      reason: reason || undefined,
    });
    return res.data;
  },

  async deletePost(postId: string): Promise<void> {
    await api.delete(`/admin/posts/${postId}`);
  },

  // ---------- Admin Project Management ----------

  async getProjectsPage(query: AdminProjectsQuery = {}): Promise<PageResponse<AdminProjectListItem>> {
    const res = await api.get("/admin/projects", { params: query });
    return res.data;
  },

  async getProjectStats(): Promise<AdminProjectStats> {
    const res = await api.get("/admin/projects/stats");
    return res.data;
  },

  async getProjectDetail(projectId: string): Promise<AdminProjectDetail> {
    const res = await api.get(`/admin/projects/${projectId}`);
    return res.data;
  },

  async archiveProject(projectId: string): Promise<AdminProjectListItem> {
    const res = await api.put(`/admin/projects/${projectId}/archive`);
    return res.data;
  },

  async restoreProject(projectId: string): Promise<AdminProjectListItem> {
    const res = await api.put(`/admin/projects/${projectId}/restore`);
    return res.data;
  },

  async setProjectVisibility(projectId: string, visibility: string): Promise<AdminProjectListItem> {
    const res = await api.put(`/admin/projects/${projectId}/visibility`, { visibility });
    return res.data;
  },

  async deleteProject(projectId: string): Promise<void> {
    await api.delete(`/admin/projects/${projectId}`);
  },

  // ---------- Reports & Moderation ----------

  async getReportsPage(query: AdminReportsQuery = {}): Promise<PageResponse<AdminReportListItem>> {
    const res = await api.get("/admin/reports", { params: query });
    return res.data;
  },

  async getReportStats(): Promise<AdminReportStats> {
    const res = await api.get("/admin/reports/stats");
    return res.data;
  },

  async getReportDetail(reportId: string): Promise<AdminReportDetail> {
    const res = await api.get(`/admin/reports/${reportId}`);
    return res.data;
  },

  async reviewReport(reportId: string, status: ReportStatus): Promise<AdminReportDetail> {
    const res = await api.put(`/admin/reports/${reportId}/review`, { status });
    return res.data;
  },

  async moderateReport(reportId: string, action: ModerationAction, value?: string): Promise<AdminReportDetail> {
    const res = await api.put(`/admin/reports/${reportId}/moderate`, { action, value });
    return res.data;
  },

  async createReport(input: CreateReportInput): Promise<ReportResponse> {
    const res = await api.post("/reports", input);
    return res.data?.data;
  },

  // ---------- Activity & Audit Logs ----------

  async getAdminActivity(query: AdminActivityQuery = {}): Promise<PageResponse<ActivityItem>> {
    const res = await api.get("/admin/activity", { params: query });
    return res.data;
  },

  async getAdminActivityStats(): Promise<AdminActivityStats> {
    const res = await api.get("/admin/activity/stats");
    return res.data;
  },

  async getAuditLogs(query: AuditLogQuery = {}): Promise<PageResponse<AuditLogItem>> {
    const res = await api.get("/admin/audit-logs", { params: query });
    return res.data;
  },

  async getAuditLogDetail(id: string): Promise<AuditLogItem> {
    const res = await api.get(`/admin/audit-logs/${id}`);
    return res.data;
  },

  async exportAuditLogsCsv(query: AuditLogQuery = {}): Promise<void> {
    const res = await api.get("/admin/audit-logs/export", { params: query, responseType: "blob" });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");
    link.href = url;
    link.download = "audit-logs.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  async exportActivityCsv(query: AdminActivityQuery = {}): Promise<void> {
    const res = await api.get("/admin/activity/export", { params: query, responseType: "blob" });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement("a");
    link.href = url;
    link.download = "activities.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  // ---------- Reviews & Feedback moderation ----------

  async getAdminReviews(query: AdminReviewsQuery = {}): Promise<PageResponse<AdminReviewListItem>> {
    const res = await api.get("/admin/reviews", { params: query });
    return res.data;
  },

  async getAdminReviewStats(): Promise<AdminReviewStats> {
    const res = await api.get("/admin/reviews/stats");
    return res.data;
  },

  async approveReview(reviewId: string): Promise<AdminReviewListItem> {
    const res = await api.put(`/admin/reviews/${reviewId}/approve`);
    return res.data;
  },

  async rejectReview(reviewId: string): Promise<AdminReviewListItem> {
    const res = await api.put(`/admin/reviews/${reviewId}/reject`);
    return res.data;
  },

  async setReviewFeatured(reviewId: string, featured: boolean): Promise<AdminReviewListItem> {
    const res = await api.put(`/admin/reviews/${reviewId}/feature`, { featured });
    return res.data;
  },

  async deleteReview(reviewId: string): Promise<void> {
    await api.delete(`/admin/reviews/${reviewId}`);
  },

  async getAdminFeedback(query: AdminFeedbackQuery = {}): Promise<PageResponse<AdminFeedbackListItem>> {
    const res = await api.get("/admin/feedback", { params: query });
    return res.data;
  },

  async getAdminFeedbackStats(): Promise<AdminFeedbackStats> {
    const res = await api.get("/admin/feedback/stats");
    return res.data;
  },

  async updateFeedbackStatus(feedbackId: string, status: FeedbackStatus): Promise<AdminFeedbackListItem> {
    const res = await api.put(`/admin/feedback/${feedbackId}/status`, { status });
    return res.data;
  },

  // ---------- Billing ----------

  async getSubscriptionsPage(query: {
    page?: number;
    size?: number;
    search?: string;
    planCode?: string;
    status?: string;
  } = {}): Promise<PageResponse<AdminSubscriptionListItem>> {
    const res = await api.get("/admin/billing/subscriptions", { params: query });
    return res.data;
  },

  async cancelSubscription(subscriptionId: string): Promise<void> {
    await api.post(`/admin/billing/subscriptions/${subscriptionId}/cancel`);
  },

  async getBillingStats(): Promise<AdminBillingStats> {
    const res = await api.get("/admin/billing/stats");
    return res.data;
  },

  async getRefundRequestsPage(query: {
    page?: number;
    size?: number;
    status?: string;
  } = {}): Promise<PageResponse<AdminRefundRequestListItem>> {
    const res = await api.get("/admin/billing/refund-requests", { params: query });
    return res.data;
  },

  async approveRefundRequest(requestId: string, adminNote: string): Promise<void> {
    await api.post(`/admin/billing/refund-requests/${requestId}/approve`, { adminNote });
  },

  async rejectRefundRequest(requestId: string, adminNote: string): Promise<void> {
    await api.post(`/admin/billing/refund-requests/${requestId}/reject`, { adminNote });
  },

  // ---------- Support Tickets ----------

  async getSupportTickets(query: {
    page?: number;
    size?: number;
    search?: string;
    status?: string;
    priority?: string;
    assignedTo?: string;
    from?: string;
    to?: string;
  } = {}): Promise<PageResponse<SupportTicketListItem>> {
    const res = await api.get("/admin/support", { params: query });
    return res.data;
  },

  async getSupportTicketStats(): Promise<SupportTicketStats> {
    const res = await api.get("/admin/support/stats");
    return res.data;
  },

  async getSupportTicketDetail(ticketId: string): Promise<SupportTicketListItem> {
    const res = await api.get(`/admin/support/${ticketId}`);
    return res.data;
  },

  async getSupportTicketReplies(ticketId: string): Promise<SupportTicketReply[]> {
    const res = await api.get(`/admin/support/${ticketId}/replies`);
    return res.data;
  },

  async replySupportTicket(ticketId: string, message: string, internalNote = false): Promise<SupportTicketReply> {
    const res = await api.post(`/admin/support/${ticketId}/replies`, { message, internalNote });
    return res.data?.data ?? res.data;
  },

  async updateSupportTicketStatus(ticketId: string, status: string): Promise<SupportTicketListItem> {
    const res = await api.put(`/admin/support/${ticketId}/status`, { status });
    return res.data;
  },

  async assignSupportTicket(ticketId: string, assignedTo: string): Promise<SupportTicketListItem> {
    const res = await api.put(`/admin/support/${ticketId}/assign`, { assignedTo });
    return res.data;
  },
};

export interface AdminSubscriptionListItem {
  id: string;
  userId: string;
  userName: string;
  userEmail?: string | null;
  planCode: string;
  status: string;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
}

export interface AdminBillingStats {
  totalSubscriptions: number;
  activeSubscriptions: number;
  cancelledSubscriptions: number;
  expiredSubscriptions: number;
  pastDueSubscriptions: number;
  freeUsers: number;
  proUsers: number;
  enterpriseUsers: number;
  totalPayments: number;
  successfulPayments: number;
  failedPayments: number;
  refundedPayments: number;
  totalRevenuePaise: number;
  revenueThisMonthPaise: number;
  revenueThisYearPaise: number;
}

// ---------- Support Tickets ----------

export type SupportTicketStatus = "OPEN" | "IN_PROGRESS" | "WAITING_USER" | "RESOLVED" | "CLOSED";
export type SupportTicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface SupportTicketListItem {
  id: string;
  ticketNumber: string;
  userId: string;
  userName?: string | null;
  userEmail?: string | null;
  userAvatarUrl?: string | null;
  subject: string;
  description: string;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  category?: string | null;
  assignedTo?: string | null;
  assignedToName?: string | null;
  replyCount: number;
  resolvedAt?: string | null;
  closedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SupportTicketReply {
  id: string;
  ticketId: string;
  userId: string;
  userName?: string | null;
  userAvatarUrl?: string | null;
  message: string;
  adminReply: boolean;
  internalNote: boolean;
  createdAt: string;
}

export interface SupportTicketStats {
  OPEN: number;
  IN_PROGRESS: number;
  WAITING_USER: number;
  RESOLVED: number;
  CLOSED: number;
}

// ---------- Refund Requests ----------

export interface AdminRefundRequestListItem {
  id: string;
  userId: string;
  userName: string;
  userEmail?: string | null;
  paymentId: string;
  planCode?: string | null;
  amountPaise: number;
  currency?: string | null;
  reason: string;
  status: string;
  adminNote?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
}
