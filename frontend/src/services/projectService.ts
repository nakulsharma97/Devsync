import api from "./api";

export interface ProjectMemberDto {
  id: string;
  userId: string;
  role: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  username?: string | null;
  presenceStatus?: string | null;
  lastActiveAt?: string | null;
  lastLoginAt?: string | null;
}

export interface ProjectDto {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  status: string;
  visibility: string;
  currentUserRole: string | null;
  repositoryUrl: string | null;
  imageUrl: string | null;
  memberCount: number;
  members: ProjectMemberDto[];
  createdAt: string;
  updatedAt: string;
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

  async addMember(projectId: string, userId: string, role?: string): Promise<void> {
    await api.post(`/projects/${projectId}/members?userId=${userId}&role=${role || "MEMBER"}`);
  },

  async removeMember(projectId: string, userId: string): Promise<void> {
    await api.delete(`/projects/${projectId}/members/${userId}`);
  },

  async updateMemberRole(projectId: string, userId: string, role: string): Promise<void> {
    await api.put(`/projects/${projectId}/members/${userId}/role?role=${encodeURIComponent(role)}`);
  },

  // ── Invitations ───────────────────────────────────────────

  async invite(projectId: string, usernameOrEmail: string, message?: string): Promise<InvitationDto> {
    const res = await api.post(`/projects/${projectId}/invite`, {
      usernameOrEmail,
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
};
