import { api } from "@/convex/_generated/api";
import { convexClient } from "@/lib/convexClient";
import { getAuthToken } from "./api";

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
  id: string;
  ownerId?: string;
  owner?: { id: string; fullName?: string; email?: string };
  title: string;
  description: string;
  rolesNeeded: string[];
  open: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TeamApplication {
  id: string;
  teamId?: string;
  applicantId?: string;
  applicant?: { id: string; fullName?: string; email?: string };
  roleApplied: string;
  message: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  createdAt: string;
}

function getToken(): string {
  const token = getAuthToken();
  if (!token) throw new Error("Not authenticated");
  return token;
}

export const teamService = {
  async create(data: TeamRequest): Promise<Team> {
    const token = getToken();
    return await convexClient.mutation(api.teams.create, { token, ...data });
  },

  async getOpen(): Promise<Team[]> {
    return await convexClient.query(api.teams.getOpen, {});
  },

  async apply(teamId: string, data: ApplyTeamRequest): Promise<TeamApplication> {
    const token = getToken();
    return await convexClient.mutation(api.teams.apply, {
      token,
      teamId: teamId as any,
      ...data,
    });
  },

  async getApplications(teamId: string): Promise<TeamApplication[]> {
    const token = getToken();
    return await convexClient.query(api.teams.getApplications, {
      token,
      teamId: teamId as any,
    });
  },

  async acceptApplication(applicationId: string): Promise<void> {
    const token = getToken();
    await convexClient.mutation(api.teams.acceptApplication, {
      token,
      applicationId: applicationId as any,
    });
  },

  async rejectApplication(applicationId: string): Promise<void> {
    const token = getToken();
    await convexClient.mutation(api.teams.rejectApplication, {
      token,
      applicationId: applicationId as any,
    });
  },
};
