import api from "./api";

export interface ProjectRequest {
  title: string;
  description?: string;
  techStack?: string;
  githubRepo?: string;
  liveDemo?: string;
  videoDemo?: string;
  tags?: string[];
}

export interface Project {
  id: number;
  userId?: number;
  user?: { id: number; fullName?: string; email?: string };
  title: string;
  description: string;
  techStack: string;
  githubRepo: string;
  liveDemo: string;
  videoDemo: string;
  tags: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
}

export const projectService = {
  async create(data: ProjectRequest): Promise<Project> {
    const response = await api.post("/projects", data);
    return response.data.data;
  },

  async getAll(): Promise<Project[]> {
    const response = await api.get("/projects");
    return response.data.data;
  },

  async getById(id: number): Promise<Project> {
    const response = await api.get(`/projects/${id}`);
    return response.data.data;
  },

  async update(id: number, data: ProjectRequest): Promise<Project> {
    const response = await api.put(`/projects/${id}`, data);
    return response.data.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/projects/${id}`);
  },
};
