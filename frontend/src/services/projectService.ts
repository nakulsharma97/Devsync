import api from "./api";

export interface ProjectMemberDto {
  id: string;
  userId: string;
  role: string;
  fullName: string;
  avatarUrl: string | null;
  username?: string | null;
  presenceStatus?: string | null;
  lastActiveAt?: string | null;
  /** When this user joined the project (member row creation). */
  joinedAt?: string | null;
}

export interface ProjectDto {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  status: string;
  visibility: string;
  currentUserRole: string | null;
  /** The current user's own join-request status (PENDING/APPROVED/REJECTED/CANCELLED), null if none. */
  currentUserJoinRequestStatus?: string | null;
  repositoryUrl: string | null;
  imageUrl: string | null;
  memberCount: number;
  members: ProjectMemberDto[];
  createdAt: string;
  updatedAt: string;
}

export interface JoinRequestDto {
  id: string;
  projectId: string;
  projectName: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  status: string;
  message: string | null;
  createdAt: string;
}

export interface InvitationDto {
  id: string;
  projectId: string;
  projectName: string;
  senderId: string;
  senderName: string;
  senderAvatar: string | null;
  receiverId: string;
  receiverName: string;
  receiverAvatar: string | null;
  status: string;
  message: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export const projectService = {
  async getMyProjects(): Promise<ProjectDto[]> {
    const res = await api.get("/projects");
    return res.data;
  },

  async getProject(id: string): Promise<ProjectDto> {
    const res = await api.get(`/projects/${id}`);
    return res.data;
  },

  async discoverProjects(search?: string): Promise<ProjectDto[]> {
    const res = await api.get("/projects/discover", {
      params: search?.trim() ? { search: search.trim() } : undefined,
    });
    return res.data;
  },

  async createProject(data: {
    name: string;
    description?: string;
    visibility?: string;
    repositoryUrl?: string;
    imageUrl?: string;
    /** Optional project template: SPRINT_BOARD | BUG_TRACKER | FEATURE_BACKLOG. */
    template?: string;
  }): Promise<ProjectDto> {
    const res = await api.post("/projects", data);
    return res.data;
  },

  async updateProject(
    id: string,
    data: {
      name?: string;
      description?: string;
      status?: string;
      repositoryUrl?: string;
      imageUrl?: string;
    }
  ): Promise<ProjectDto> {
    const res = await api.put(`/projects/${id}`, data);
    return res.data;
  },

  async deleteProject(id: string): Promise<void> {
    await api.delete(`/projects/${id}`);
  },

  async changeVisibility(id: string, visibility: string): Promise<ProjectDto> {
    const res = await api.put(`/projects/${id}/visibility`, { visibility });
    return res.data;
  },

  async joinProject(projectId: string): Promise<void> {
    await api.post(`/projects/${projectId}/join`);
  },

  // ── Join requests ────────────────────────────────────────

  /** Request to join a PUBLIC project — membership is granted only after the owner/admin approves. */
  async requestJoin(projectId: string, message?: string): Promise<JoinRequestDto> {
    const res = await api.post(`/projects/${projectId}/join-request`, {
      message: message || undefined,
    });
    return res.data;
  },

  /** All join requests for a project — managers only. */
  async getProjectJoinRequests(projectId: string): Promise<JoinRequestDto[]> {
    const res = await api.get(`/projects/${projectId}/join-requests`);
    return res.data;
  },

  /** The caller's own join requests, optionally narrowed to one project. */
  async getMyJoinRequests(projectId?: string): Promise<JoinRequestDto[]> {
    const res = await api.get("/join-requests/mine", {
      params: projectId ? { projectId } : undefined,
    });
    return res.data;
  },

  /** The caller's own join requests for a single project (e.g. to cancel). */
  async getMyJoinRequestsForProject(projectId: string): Promise<JoinRequestDto[]> {
    return this.getMyJoinRequests(projectId);
  },

  async approveJoinRequest(id: string): Promise<void> {
    await api.put(`/join-requests/${id}/approve`);
  },

  async rejectJoinRequest(id: string): Promise<void> {
    await api.put(`/join-requests/${id}/reject`);
  },

  /** Withdraw a pending join request (requester or manager). */
  async cancelJoinRequest(id: string): Promise<void> {
    await api.delete(`/join-requests/${id}`);
  },

  async addMember(projectId: string, userId: string, role?: string): Promise<void> {
    await api.post(`/projects/${projectId}/members?userId=${userId}&role=${role || "MEMBER"}`);
  },

  async removeMember(projectId: string, userId: string): Promise<void> {
    await api.delete(`/projects/${projectId}/members/${userId}`);
  },

  async updateMemberRole(projectId: string, userId: string, role: string): Promise<void> {
    await api.put(`/projects/${projectId}/members/${userId}/role?role=${encodeURIComponent(role)}`);
  },

  /** Transfers project ownership to an existing member. The caller must be the current owner. */
  async transferOwnership(projectId: string, userId: string): Promise<ProjectDto> {
    const res = await api.post(`/projects/${projectId}/transfer-ownership`, { userId });
    return res.data;
  },

  // ── Invitations ───────────────────────────────────────────

  /** Invite by user id — search results are privacy-scoped and carry no email. */
  async invite(projectId: string, userId: string, message?: string): Promise<InvitationDto> {
    const res = await api.post(`/projects/${projectId}/invite`, {
      userId,
      message: message || undefined,
    });
    return res.data;
  },

  async getProjectInvitations(projectId: string): Promise<InvitationDto[]> {
    const res = await api.get(`/projects/${projectId}/invitations`);
    return res.data;
  },

  async getMyInvitations(): Promise<InvitationDto[]> {
    const res = await api.get("/invitations/mine");
    return res.data;
  },

  async acceptInvitation(id: string): Promise<InvitationDto> {
    const res = await api.put(`/invitations/${id}/accept`);
    return res.data;
  },

  async declineInvitation(id: string): Promise<void> {
    await api.put(`/invitations/${id}/decline`);
  },

  async cancelInvitation(id: string): Promise<void> {
    await api.delete(`/invitations/${id}`);
  },

  // ── Shared project notes (Markdown doc) ───────────────────

  /** The note stores opaque Yjs state — the client keeps Markdown text inside it. */
  async getNote(projectId: string): Promise<{ projectId: string; version: number; yjsState: string | null; updatedBy: string | null; updatedAt: string | null }> {
    const res = await api.get(`/projects/${projectId}/notes`);
    return res.data;
  },

  async saveNote(projectId: string, version: number, yjsState: string): Promise<{ projectId: string; version: number; yjsState: string; updatedBy: string | null; updatedAt: string | null }> {
    const res = await api.put(`/projects/${projectId}/notes`, { version, yjsState });
    return res.data;
  },
};
