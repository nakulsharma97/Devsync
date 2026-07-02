import api from "./api";

export interface TeamRequest {
  title: string;
  description?: string;
  rolesNeeded?: string[];
}

export interface ApplyTeamRequest {
  roleApplied?: string;
  message?: string;
}

export interface Team {
  id: number;
  ownerId?: number;
  owner?: { id: number; fullName?: string; email?: string };
  title: string;
  description: string;
  rolesNeeded: string[];
  open: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TeamApplication {
  id: number;
  teamId?: number;
  team?: { id: number; title?: string };
  applicantId?: number;
  applicant?: { id: number; fullName?: string; email?: string };
  roleApplied: string;
  message: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  createdAt: string;
}

export const teamService = {
  async create(data: TeamRequest): Promise<Team> {
    const response = await api.post("/teams", data);
    return response.data.data;
  },

  async getOpen(): Promise<Team[]> {
    const response = await api.get("/teams");
    return response.data.data;
  },

  async getById(id: number): Promise<Team> {
    const response = await api.get(`/teams/${id}`);
    return response.data.data;
  },

  async apply(teamId: number, data: ApplyTeamRequest): Promise<TeamApplication> {
    const response = await api.post(`/teams/${teamId}/apply`, data);
    return response.data.data;
  },

  async getApplications(teamId: number): Promise<TeamApplication[]> {
    const response = await api.get(`/teams/${teamId}/applications`);
    return response.data.data;
  },

  async acceptApplication(applicationId: number): Promise<TeamApplication> {
    const response = await api.post(`/teams/applications/${applicationId}/accept`);
    return response.data.data;
  },

  async rejectApplication(applicationId: number): Promise<TeamApplication> {
    const response = await api.post(`/teams/applications/${applicationId}/reject`);
    return response.data.data;
  },
};
