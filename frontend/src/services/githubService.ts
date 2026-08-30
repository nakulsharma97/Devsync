import api from "./api";

export interface GitHubConnection {
  connected: boolean;
  githubUsername: string | null;
  tokenScopes: string | null;
  connectedAt: string | null;
  lastSyncedAt: string | null;
}

export interface GitHubRepo {
  id: number;
  fullName: string;
  name: string;
  description: string | null;
  htmlUrl: string;
  visibility: string | null;
  language: string | null;
  stargazersCount: number;
  forksCount: number;
  defaultBranch: string | null;
  updatedAt: string | null;
}

export interface GitHubLink {
  projectId: string;
  repoId: number;
  repoFullName: string;
  repoUrl: string;
  repoDescription: string | null;
  repoVisibility: string | null;
  repoLanguage: string | null;
  repoDefaultBranch: string | null;
  linkedAt: string;
}

export interface GitHubCommit {
  sha: string;
  message: string;
  authorName: string | null;
  authorLogin: string | null;
  timestamp: string | null;
}

export interface GitHubIssue {
  number: number;
  title: string;
  state: string;
  htmlUrl: string;
  authorLogin: string | null;
  assigneeLogin: string | null;
  labels: string[];
  createdAt: string | null;
}

export interface GitHubBranch {
  name: string;
  protected: boolean;
}

export interface GitHubPullRequest {
  number: number;
  title: string;
  state: string;
  reviewStatus: string; // OPEN | DRAFT | MERGED
  htmlUrl: string;
  authorLogin: string | null;
  createdAt: string | null;
  mergedAt: string | null;
}

export const githubService = {
  async getConnection(): Promise<GitHubConnection> {
    const res = await api.get("/github/connection");
    return res.data;
  },

  async getAuthUrl(): Promise<string> {
    const res = await api.get("/github/auth-url");
    return res.data.url;
  },

  async disconnect(): Promise<void> {
    await api.delete("/github/connection");
  },

  async listRepos(): Promise<GitHubRepo[]> {
    const res = await api.get("/github/repos");
    return res.data;
  },

  async getLink(projectId: string): Promise<GitHubLink | null> {
    const res = await api.get(`/github/projects/${projectId}/link`);
    return res.data;
  },

  async linkRepo(projectId: string, repoFullName: string): Promise<GitHubLink> {
    const res = await api.post(`/github/projects/${projectId}/link`, { repoFullName });
    return res.data;
  },

  async unlinkRepo(projectId: string): Promise<void> {
    await api.delete(`/github/projects/${projectId}/link`);
  },

  async getBranches(projectId: string): Promise<GitHubBranch[]> {
    const res = await api.get(`/github/projects/${projectId}/branches`);
    return res.data;
  },

  async getCommits(projectId: string, branch?: string): Promise<GitHubCommit[]> {
    const res = await api.get(`/github/projects/${projectId}/commits`, {
      params: branch ? { branch } : {},
    });
    return res.data;
  },

  async getIssues(projectId: string, state: "open" | "closed" = "open"): Promise<GitHubIssue[]> {
    const res = await api.get(`/github/projects/${projectId}/issues`, { params: { state } });
    return res.data;
  },

  async getPullRequests(projectId: string, state: "open" | "closed" = "open"): Promise<GitHubPullRequest[]> {
    const res = await api.get(`/github/projects/${projectId}/pulls`, { params: { state } });
    return res.data;
  },
};
