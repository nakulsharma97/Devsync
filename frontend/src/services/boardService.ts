import api from "./api";

export interface TaskDto {
  id: string;
  title: string;
  description: string | null;
  columnId: string;
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
      dueDate?: string;
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

  // ── Calendar ─────────────────────────────────────────────

  /** Tasks with due dates in [from, to] across the caller's projects. */
  async calendarTasks(from: string, to: string): Promise<TaskDto[]> {
    const res = await api.get("/boards/tasks/calendar", { params: { from, to } });
    return res.data;
  },
};
