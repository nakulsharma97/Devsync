import api from "./api";

/** Matches PinnedProjectResponse on the backend. */
export interface PinnedProjectDto {
  id: string;
  projectId: string;
  name: string;
  status: string;
  memberCount: number;
}

export const pinnedProjectService = {
  /** All projects pinned by the authenticated user. */
  async getPinned(): Promise<PinnedProjectDto[]> {
    const res = await api.get("/projects/pinned");
    return res.data;
  },

  async pin(projectId: string): Promise<PinnedProjectDto> {
    const res = await api.post(`/projects/${projectId}/pin`);
    return res.data;
  },

  async unpin(projectId: string): Promise<void> {
    await api.delete(`/projects/${projectId}/pin`);
  },
};
