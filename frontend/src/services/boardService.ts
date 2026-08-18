import api from "./api";

export interface TaskDto {
  id: string;
  title: string;
  description: string | null;
  columnId: string;
  /** Resolved column name — populated by the calendar feed for status display. */
  columnName?: string | null;
  position: number;
  assigneeId: string | null;
  assigneeName: string | null;
  assigneeAvatar: string | null;
  priority: string;
  dueDate: string | null;
  labels: string[];
  createdAt: string;
  /** Sprint / milestone grouping fields. */
  milestone?: string | null;
  sprint?: string | null;
  /** Task ids this task depends on (blocked-by). */
  dependencies?: string[];
  /** GitHub-based development workflow. */
  branchName?: string | null;
  pullRequestNumber?: number | null;
  pullRequestUrl?: string | null;
  pullRequestState?: string | null;
  startedAt?: string | null;
  prCreatedAt?: string | null;
  prMergedAt?: string | null;
}

export interface ColumnDto {
  id: string;
  name: string;
  position: number;
  color: string | null;
  tasks: TaskDto[];
}

export interface BoardDto {
  id: string;
  name: string;
  projectId: string;
  description: string | null;
  columns: ColumnDto[];
  createdAt: string;
}

export const boardService = {
  async getBoard(boardId: string): Promise<BoardDto> {
    const res = await api.get(`/boards/${boardId}`);
    return res.data;
  },

  async getProjectBoard(projectId: string): Promise<BoardDto | null> {
    const res = await api.get(`/boards/project/${projectId}`);
    return res.data || null;
  },

  async createBoard(name: string, projectId: string, columns: string[]): Promise<BoardDto> {
    const res = await api.post(
      `/boards?name=${encodeURIComponent(name)}&projectId=${projectId}&columns=${columns.join(",")}`
    );
    return res.data;
  },

  async createTask(data: {
    title: string;
    description?: string;
    columnId: string;
    assigneeId?: string;
    priority?: string;
    dueDate?: string;
    labels?: string;
    milestone?: string;
    sprint?: string;
  }): Promise<TaskDto> {
    const res = await api.post("/boards/tasks", data);
    return res.data;
  },

  async updateTaskPosition(taskId: string, newColumnId: string, newPosition: number): Promise<void> {
    await api.put("/boards/tasks/position", { taskId, newColumnId, newPosition });
  },

  async updateTask(
    taskId: string,
    data: {
      title?: string;
      description?: string;
      columnId: string;
      assigneeId?: string;
      priority?: string;
      dueDate?: string | null;
      /** Explicitly remove the task's due date (e.g. cleared in the form). */
      clearDueDate?: boolean;
      labels?: string;
      milestone?: string;
      sprint?: string;
    }
  ): Promise<TaskDto> {
    const res = await api.put(`/boards/tasks/${taskId}`, data);
    return res.data;
  },

  async deleteTask(taskId: string): Promise<void> {
    await api.delete(`/boards/tasks/${taskId}`);
  },

  // ── Task dependencies ────────────────────────────────────

  /** Mark {@code taskId} as depending on {@code dependsOnId} (blocked-by). */
  async addDependency(taskId: string, dependsOnId: string): Promise<void> {
    await api.post(`/boards/tasks/${taskId}/dependencies`, { dependsOnId });
  },

  async removeDependency(taskId: string, dependsOnId: string): Promise<void> {
    await api.delete(`/boards/tasks/${taskId}/dependencies/${dependsOnId}`);
  },

  // ── GitHub-based development workflow ────────────────────

  /** Marks the task as started and suggests a deterministic feature branch. */
  async startTask(taskId: string): Promise<TaskDto> {
    const res = await api.post(`/boards/tasks/${taskId}/start`);
    return res.data;
  },

  /** Creates the feature branch on GitHub (member's own access). */
  async createBranch(taskId: string, branchName?: string): Promise<TaskDto> {
    const res = await api.post(`/boards/tasks/${taskId}/branch`, { branchName });
    return res.data;
  },

  /** Opens a real pull request on GitHub from the task's branch. */
  async createPullRequest(taskId: string, data?: { title?: string; description?: string }): Promise<TaskDto> {
    const res = await api.post(`/boards/tasks/${taskId}/pull-request`, data ?? {});
    return res.data;
  },

  /** Re-reads the real PR state from GitHub. */
  async refreshPullRequest(taskId: string): Promise<TaskDto> {
    const res = await api.get(`/boards/tasks/${taskId}/pull-request/refresh`);
    return res.data;
  },

  /** Approves the linked PR on GitHub (owner/admin only). */
  async approvePullRequest(taskId: string, comment?: string): Promise<TaskDto> {
    const res = await api.post(`/boards/tasks/${taskId}/pull-request/approve`, { comment });
    return res.data;
  },

  /** Requests changes on the linked PR (owner/admin only). */
  async requestChanges(taskId: string, comment?: string): Promise<TaskDto> {
    const res = await api.post(`/boards/tasks/${taskId}/pull-request/request-changes`, { comment });
    return res.data;
  },

  /** Merges the linked PR into main on GitHub (owner/admin only). */
  async mergePullRequest(taskId: string): Promise<TaskDto> {
    const res = await api.post(`/boards/tasks/${taskId}/pull-request/merge`);
    return res.data;
  },

  // ── Calendar ─────────────────────────────────────────────

  /** Tasks with due dates in [from, to] for one project's calendar. */
  async calendarTasks(projectId: string, from: string, to: string): Promise<TaskDto[]> {
    const res = await api.get("/boards/tasks/calendar", { params: { projectId, from, to } });
    return res.data;
  },
};
