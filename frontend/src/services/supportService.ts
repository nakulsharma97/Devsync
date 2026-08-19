import api from "./api";

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  userId: string;
  userName?: string | null;
  userEmail?: string | null;
  userAvatarUrl?: string | null;
  subject: string;
  description: string;
  status: string;
  priority: string;
  category?: string | null;
  replyCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SupportTicketReply {
  id: string;
  ticketId: string;
  userId: string;
  userName?: string | null;
  userAvatarUrl?: string | null;
  message: string;
  adminReply: boolean;
  internalNote: boolean;
  createdAt: string;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export const supportService = {
  async getTickets(query: {
    page?: number;
    size?: number;
    search?: string;
  } = {}): Promise<PageResponse<SupportTicket>> {
    const res = await api.get("/support/tickets", { params: query });
    return res.data;
  },

  async getTicket(ticketId: string): Promise<SupportTicket> {
    const res = await api.get(`/support/tickets/${ticketId}`);
    return res.data;
  },

  async createTicket(data: {
    subject: string;
    description: string;
    category?: string;
    priority?: string;
  }): Promise<SupportTicket> {
    const res = await api.post("/support/tickets", data);
    return res.data?.data ?? res.data;
  },

  async getTicketReplies(ticketId: string): Promise<SupportTicketReply[]> {
    const res = await api.get(`/support/tickets/${ticketId}/replies`);
    return res.data;
  },

  async addReply(ticketId: string, message: string): Promise<SupportTicketReply> {
    const res = await api.post(`/support/tickets/${ticketId}/replies`, { message });
    return res.data?.data ?? res.data;
  },
};
