import { api } from "@/convex/_generated/api";
import { convexClient } from "@/lib/convexClient";
import { getAuthToken } from "./api";

function getToken(): string {
  const token = getAuthToken();
  if (!token) throw new Error("Not authenticated");
  return token;
}

export interface TeamRoom {
  _id: string;
  roomName: string;
  isTeamRoom: boolean;
  projectId?: string;
  projectName?: string | null;
  participantCount: number;
  lastMessageText?: string;
  lastMessageAt: number;
  unreadCount: number;
}

export const teamRoomService = {
  async createOrGet(projectId: string, name: string): Promise<string> {
    const token = getToken();
    return await convexClient.mutation(api.teamRooms.createOrGet, {
      token,
      projectId: projectId as any,
      name,
    });
  },

  async joinRoom(roomId: string): Promise<void> {
    const token = getToken();
    await convexClient.mutation(api.teamRooms.joinRoom, {
      token,
      roomId: roomId as any,
    });
  },

  async getMyTeamRooms(): Promise<TeamRoom[]> {
    const token = getToken();
    return await convexClient.query(api.teamRooms.getMyTeamRooms, { token });
  },
};
