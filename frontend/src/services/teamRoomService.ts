import api from "./api";
import type { TeamRoomDto } from "./roomService";

export const teamRoomService = {
  async createOrGet(projectId: string, name: string): Promise<string> {
    const res = await api.post("/rooms", { projectId, name });
    return res.data?.id || "";
  },
  async joinRoom(roomId: string): Promise<void> {
    await api.post(`/rooms/${roomId}/join`);
  },
  async inviteToRoom(roomId: string, userId: string): Promise<{ success: boolean; alreadyMember: boolean }> {
    const res = await api.post(`/rooms/${roomId}/invite`, { userId });
    return res.data;
  },
  async getRoomParticipants(roomId: string): Promise<TeamRoomDto["participants"]> {
    const res = await api.get(`/rooms/${roomId}/participants`);
    return res.data;
  },
  async getMyTeamRooms(): Promise<TeamRoomDto[]> {
    const res = await api.get("/rooms");
    return res.data;
  },
  async getOrCreateProjectRoom(projectId: string): Promise<TeamRoomDto> {
    const res = await api.post(`/rooms/project/${projectId}`);
    return res.data;
  },
};
