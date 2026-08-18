import api from "./api";

// ── Backend-Matching Types ─────────────────────────────────────

export interface PostUserDto {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  username: string | null;
}

export interface PostDto {
  id: string;
  content: string;
  imageUrl: string | null;
  postType: string;
  likeCount?: number;
  commentCount?: number;
  createdAt: string;
  updatedAt: string;
  user: PostUserDto;
}

export interface CommentDto {
  id: string;
  content: string;
  createdAt: string;
  user: PostUserDto;
}

export interface PageDto<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  last: boolean;
  first: boolean;
  size: number;
  number: number;
  numberOfElements: number;
  empty: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  error: string | null;
}

// ── Service ────────────────────────────────────────────────────

export const postService = {
  async create(data: { content: string; imageUrl?: string; postType?: string }): Promise<PostDto> {
    const res = await api.post<ApiResponse<PostDto>>("/posts", {
      content: data.content,
      imageUrl: data.imageUrl || undefined,
      postType: data.postType || "TEXT",
    });
    return res.data.data;
  },

  async getFeed(
    page = 0,
    size = 20
  ): Promise<{ content: PostDto[]; totalPages: number; last: boolean }> {
    const res = await api.get<ApiResponse<PageDto<PostDto>>>(
      `/posts/feed?page=${page}&size=${size}`
    );
    return {
      content: res.data.data.content,
      totalPages: res.data.data.totalPages,
      last: res.data.data.last,
    };
  },

  async getPost(id: string): Promise<PostDto> {
    const res = await api.get<ApiResponse<PostDto>>(`/posts/${id}`);
    return res.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/posts/${id}`);
  },

  /** Update an existing post's content (author-only). Preserves the post id. */
  async updatePost(id: string, data: { content: string }): Promise<PostDto> {
    const res = await api.put<ApiResponse<PostDto>>(`/posts/${id}`, {
      content: data.content,
    });
    return res.data.data;
  },

  /** Set or clear (imageUrl = null) the image on an existing post. */
  async updatePostImage(id: string, imageUrl: string | null): Promise<PostDto> {
    const res = await api.put<ApiResponse<PostDto>>(`/posts/${id}/image`, {
      imageUrl,
    });
    return res.data.data;
  },

  async toggleLike(postId: string): Promise<{ liked: boolean; count: number }> {
    const res = await api.post<ApiResponse<{ liked: boolean; count: number }>>(
      `/posts/${postId}/like`
    );
    return res.data.data;
  },

  async addComment(postId: string, data: { content: string }): Promise<CommentDto> {
    const res = await api.post<ApiResponse<CommentDto>>(
      `/posts/${postId}/comments`,
      data
    );
    return res.data.data;
  },

  async getComments(postId: string): Promise<CommentDto[]> {
    const res = await api.get<ApiResponse<CommentDto[]>>(
      `/posts/${postId}/comments`
    );
    return res.data.data;
  },

  /** Delete a comment. Authorized server-side: comment author OR post owner. */
  async deleteComment(commentId: string): Promise<void> {
    await api.delete(`/posts/comments/${commentId}`);
  },

  /** Posts authored by a specific user (My Posts page / profile lists). */
  async getPostsByUser(
    userId: string,
    page = 0,
    size = 20
  ): Promise<{ content: PostDto[]; totalPages: number; last: boolean }> {
    const res = await api.get<ApiResponse<PageDto<PostDto>>>(
      `/posts/user/${userId}?page=${page}&size=${size}`
    );
    return {
      content: res.data.data.content,
      totalPages: res.data.data.totalPages,
      last: res.data.data.last,
    };
  },
};
