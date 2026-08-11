import api from "./api";

export interface TeamRoomDto {
  id: string;
  name: string;
  projectId: string | null;
  projectName: string | null;
  description: string | null;
  createdBy: string;
  participantCount: number;
  participants: Array<{
    userId: string;
    fullName: string;
    avatarUrl: string | null;
    invitedBy: string | null;
  }>;
  createdAt: string;
}

export const roomService = {
  async getMyRooms(): Promise<TeamRoomDto[]> {
    const res = await api.get("/rooms");
    return res.data;
  },

  async createRoom(data: { name: string; projectId?: string; description?: string }): Promise<TeamRoomDto> {
    const res = await api.post("/rooms", data);
    return res.data;
  },

  async getRoom(roomId: string): Promise<TeamRoomDto> {
    const res = await api.get(`/rooms/${roomId}`);
    return res.data;
  },

  async inviteToRoom(roomId: string, userId: string): Promise<TeamRoomDto> {
    const res = await api.post(`/rooms/${roomId}/invite`, { userId });
    return res.data;
  },

  async getParticipants(roomId: string): Promise<TeamRoomDto["participants"]> {
    const res = await api.get(`/rooms/${roomId}/participants`);
    return res.data;
  },
};
