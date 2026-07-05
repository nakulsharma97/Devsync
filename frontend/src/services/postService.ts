import { api } from "@/convex/_generated/api";
import { convexClient } from "@/lib/convexClient";
import { getAuthToken } from "./api";

export interface PostRequest {
  content: string;
  fileUrl?: string;
  fileType?: string;
}

export interface Post {
  _id: string;
  content: string;
  fileUrl?: string;
  fileType?: string;
  postType: string;
  likeCount: number;
  commentCount: number;
  createdAt: number;
  user: {
    id: string;
    fullName: string;
    email: string;
  } | null;
}

export interface Comment {
  _id: string;
  content: string;
  createdAt: number;
  user: {
    id: string;
    fullName: string;
    email: string;
  } | null;
}

export interface FeedResponse {
  items: Post[];
  hasMore: boolean;
}

export const postService = {
  async create(data: PostRequest): Promise<any> {
    const token = getAuthToken();
    if (!token) throw new Error("Not authenticated");
    const result = await convexClient.mutation(api.posts.createPost, {
      token,
      content: data.content,
      fileUrl: data.fileUrl,
      fileType: data.fileType,
    });
    return result;
  },

  async getFeed(page = 0, size = 20): Promise<{ content: Post[] }> {
    try {
      const result = await convexClient.query(api.posts.getFeed, {
        limit: size,
      });
      return { content: result.items };
    } catch (error: any) {
      console.error("Failed to fetch feed:", error);
      return { content: [] };
    }
  },

  async delete(postId: string): Promise<void> {
    const token = getAuthToken();
    if (!token) throw new Error("Not authenticated");
    await convexClient.mutation(api.posts.deletePost, { postId, token });
  },

  async toggleLike(postId: string): Promise<{ liked: boolean; count: number }> {
    const token = getAuthToken();
    if (!token) throw new Error("Not authenticated");
    const result = await convexClient.mutation(api.posts.toggleLike, {
      postId,
      token,
    });
    return result;
  },

  async addComment(postId: string, data: { content: string }): Promise<Comment> {
    const token = getAuthToken();
    if (!token) throw new Error("Not authenticated");
    const result = await convexClient.mutation(api.posts.addComment, {
      postId,
      token,
      content: data.content,
    });
    return result;
  },

  async getComments(postId: string): Promise<Comment[]> {
    const result = await convexClient.query(api.posts.getComments, {
      postId,
    });
    return result;
  },

  async uploadFile(file: File): Promise<{ url: string; fileType: string }> {
    const token = getAuthToken();
    if (!token) throw new Error("Not authenticated");

    // Validate file size (max 10MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      throw new Error("File too large. Maximum size is 10MB.");
    }

    // Generate upload URL from Convex
    const uploadUrl = await convexClient.mutation(
      api.posts.generateUploadUrl,
      { token }
    );

    if (typeof uploadUrl !== "string" || !uploadUrl) {
      throw new Error("Failed to get upload URL from server");
    }

    // Upload the file to Convex storage
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(`Upload failed (${response.status}): ${errorText}`);
    }

    // Convex upload endpoint returns JSON: { storageId: "..." }
    let storageId: string;
    try {
      const json = await response.json();
      storageId = json.storageId;
      if (!storageId) throw new Error("No storageId in response");
    } catch {
      // Fallback: try parsing as plain text (older Convex versions)
      const text = await response.text();
      if (!text) throw new Error("Empty response from upload endpoint");
      storageId = text.trim();
    }

    // Get the permanent URL from the storage ID
    const url = await convexClient.mutation(api.posts.storeFile, {
      storageId,
      token,
    });

    if (!url) {
      throw new Error("Failed to retrieve file URL from storage");
    }

    return {
      url,
      fileType: file.type,
    };
  },
};
