import api from "./api";

// ── Types matching the backend BookmarkResponse ─────────────

export interface BookmarkResponse {
  id: string;
  entityType: string;
  entityId: string;
  title: string;
  subtitle: string;
  url: string;
  createdAt: string;
}

export interface BookmarkRequest {
  entityType: string;
  entityId: string;
}

// ── Service ────────────────────────────────────────────────

export const bookmarkService = {
  /** Create a bookmark for an entity (POST, PROJECT, TASK, USER). */
  async create(data: BookmarkRequest): Promise<BookmarkResponse> {
    const res = await api.post("/bookmarks", data);
    return res.data;
  },

  /** Get all bookmarks for the current user. */
  async getAll(): Promise<BookmarkResponse[]> {
    const res = await api.get("/bookmarks");
    return res.data;
  },

  /** Delete a bookmark by its bookmark ID. */
  async delete(id: string): Promise<void> {
    await api.delete(`/bookmarks/${id}`);
  },

  /** Delete a bookmark by entity type + entity id. */
  async deleteByEntity(
    entityType: string,
    entityId: string,
  ): Promise<void> {
    await api.delete("/bookmarks", {
      params: { entityType, entityId },
    });
  },

  /** Check whether a specific entity is bookmarked by the current user. */
  async isBookmarked(
    entityType: string,
    entityId: string,
  ): Promise<boolean> {
    const res = await api.get("/bookmarks/status", {
      params: { entityType, entityId },
    });
    return res.data.bookmarked;
  },

  /** Convenience: toggle bookmark for a post. Returns the new bookmarked state. */
  async togglePostBookmark(postId: string): Promise<boolean> {
    const statusRes = await api.get("/bookmarks/status", {
      params: { entityType: "POST", entityId: postId },
    });
    const bookmarked = statusRes.data.bookmarked;
    if (bookmarked) {
      await api.delete("/bookmarks", {
        params: { entityType: "POST", entityId: postId },
      });
      return false;
    } else {
      await api.post("/bookmarks", {
        entityType: "POST",
        entityId: postId,
      });
      return true;
    }
  },
};
