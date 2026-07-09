import { api } from "@/convex/_generated/api";
import { convexClient } from "@/lib/convexClient";
import { getAuthToken } from "./api";

function getToken(): string {
  const token = getAuthToken();
  if (!token) throw new Error("Not authenticated");
  return token;
}

export interface BoardColumn {
  _id: string;
  title: string;
  sortOrder: number;
  tasks: BoardTask[];
}

export interface BoardTask {
  _id: string;
  title: string;
  description?: string;
  priority?: string;
  sortOrder: number;
  assignee?: { id: string; fullName: string; avatarUrl?: string } | null;
  createdAt: number;
}

export const boardService = {
  async initDefaults(projectId: string): Promise<any> {
    const token = getToken();
    return await convexClient.mutation(api.boards.initDefaults, {
      token,
      projectId: projectId as any,
    });
  },

  async addColumn(projectId: string, title: string): Promise<any> {
    const token = getToken();
    return await convexClient.mutation(api.boards.addColumn, {
      token,
      projectId: projectId as any,
      title,
    });
  },

  async addTask(columnId: string, projectId: string, title: string, description?: string, priority?: string): Promise<any> {
    const token = getToken();
    return await convexClient.mutation(api.boards.addTask, {
      token,
      columnId: columnId as any,
      projectId: projectId as any,
      title,
      description,
      priority,
    });
  },

  async moveTask(taskId: string, newColumnId: string, newSortOrder: number): Promise<void> {
    const token = getToken();
    await convexClient.mutation(api.boards.moveTask, {
      token,
      taskId: taskId as any,
      newColumnId: newColumnId as any,
      newSortOrder,
    });
  },

  async updateTask(taskId: string, data: { title?: string; description?: string; priority?: string }): Promise<void> {
    const token = getToken();
    await convexClient.mutation(api.boards.updateTask, {
      token,
      taskId: taskId as any,
      ...data,
    });
  },

  async deleteTask(taskId: string): Promise<void> {
    const token = getToken();
    await convexClient.mutation(api.boards.deleteTask, {
      token,
      taskId: taskId as any,
    });
  },

  async getBoard(projectId: string): Promise<BoardColumn[]> {
    const token = getToken();
    return await convexClient.query(api.boards.getBoard, {
      token,
      projectId: projectId as any,
    });
  },
};
