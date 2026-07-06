import { api } from "@/convex/_generated/api";
import { convexClient } from "@/lib/convexClient";
import { getAuthToken } from "./api";

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
  id: string;
  userId?: string;
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

function getToken(): string {
  const token = getAuthToken();
  if (!token) throw new Error("Not authenticated");
  return token;
}

export const projectService = {
  async create(data: ProjectRequest): Promise<Project> {
    const token = getToken();
    return await convexClient.mutation(api.projects.create, {
      token,
      ...data,
    });
  },

  async getAll(): Promise<Project[]> {
    const token = getToken();
    return await convexClient.query(api.projects.getAll, { token });
  },

  async getById(id: string): Promise<Project> {
    const token = getToken();
    return await convexClient.query(api.projects.getById, { token, id: id as any });
  },

  async update(id: string, data: ProjectRequest): Promise<Project> {
    const token = getToken();
    return await convexClient.mutation(api.projects.update, {
      token,
      id: id as any,
      ...data,
    });
  },

  async delete(id: string): Promise<void> {
    const token = getToken();
    await convexClient.mutation(api.projects.deleteProject, {
      token,
      id: id as any,
    });
  },
};

// Also export as default for backward compatibility
export default projectService;
