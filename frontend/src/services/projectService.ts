import api from "./api";

export interface ProjectDto {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  status: string;
  repositoryUrl: string | null;
  imageUrl: string | null;
  memberCount: number;
  members: Array<{
    id: string;
    userId: string;
    role: string;
    fullName: string;
    email: string;
    avatarUrl: string | null;
  }>;
  createdAt: string;
  updatedAt: string;
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

  async createProject(data: {
    name: string;
    description?: string;
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

  async addMember(projectId: string, userId: string, role?: string): Promise<void> {
    await api.post(`/projects/${projectId}/members?userId=${userId}&role=${role || "MEMBER"}`);
  },

  async removeMember(projectId: string, userId: string): Promise<void> {
    await api.delete(`/projects/${projectId}/members/${userId}`);
  },
};
