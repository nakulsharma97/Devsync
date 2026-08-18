import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import MyPosts from "./MyPosts";
import type { PostDto } from "@/services/postService";

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  getPostsByUser: vi.fn(),
  delete: vi.fn(),
  updatePost: vi.fn(),
  getComments: vi.fn(),
  addComment: vi.fn(),
  toggleLike: vi.fn(),
  downloadBlob: vi.fn(),
  uploadPostImage: vi.fn(),
  updatePostImage: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: mocks.useAuth,
}));

vi.mock("@/services/postService", () => ({
  postService: {
    getPostsByUser: mocks.getPostsByUser,
    getFeed: vi.fn(),
    create: vi.fn(),
    delete: mocks.delete,
    updatePost: mocks.updatePost,
    updatePostImage: mocks.updatePostImage,
    toggleLike: mocks.toggleLike,
    getComments: mocks.getComments,
    addComment: mocks.addComment,
    deleteComment: vi.fn(),
  },
}));

vi.mock("@/services/attachmentService", () => ({
  attachmentService: {
    uploadPostImage: mocks.uploadPostImage,
    downloadBlob: mocks.downloadBlob,
  },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function postFixture(overrides: Partial<PostDto> = {}): PostDto {
  return {
    id: "p1",
    content: "My post",
    imageUrl: null,
    postType: "TEXT",
    likeCount: 2,
    commentCount: 1,
    createdAt: "2026-08-01T00:00:00Z",
    updatedAt: "2026-08-01T00:00:00Z",
    user: {
      id: "u1",
      fullName: "Buffy Test",
      avatarUrl: null,
      username: "buffytest",
    },
    ...overrides,
  };
}

function mockUser() {
  mocks.useAuth.mockReturnValue({
    user: {
      id: "u1",
      email: "buffy@test.com",
      fullName: "Buffy Test",
      username: "buffytest",
      avatarUrl: null,
      role: "MEMBER",
    },
    isLoading: false,
    isAuthenticated: true,
    isAdmin: false,
    error: null,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    clearError: vi.fn(),
    forgotPassword: vi.fn(),
    loginWithOAuth: vi.fn(),
    refreshUser: vi.fn(),
  });
}

function renderPage() {
  return render(
    <MemoryRouter>
      <MyPosts />
    </MemoryRouter>
  );
}

describe("MyPosts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser();
  });

  it("shows only the authenticated user's posts", async () => {
    mocks.getPostsByUser.mockResolvedValue({
      content: [postFixture({ id: "p1", content: "My first post" })],
      totalPages: 1,
      last: true,
    });

    renderPage();

    expect(await screen.findByText("My first post")).toBeInTheDocument();
    expect(mocks.getPostsByUser).toHaveBeenCalledWith("u1", 0, 10);
    expect(screen.getByText("My Posts")).toBeInTheDocument();
  });

  it("shows an empty state with a Create Post action when there are no posts", async () => {
    mocks.getPostsByUser.mockResolvedValue({
      content: [],
      totalPages: 0,
      last: true,
    });

    renderPage();

    expect(await screen.findByText("No posts yet")).toBeInTheDocument();
    expect(
      screen.getByText("Share your first update with the DevSync community.")
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /create post/i }).length).toBeGreaterThan(0);
  });

  it("deletes a post from the list after confirmation", async () => {
    mocks.getPostsByUser.mockResolvedValue({
      content: [postFixture({ id: "p1", content: "Doomed post" })],
      totalPages: 1,
      last: true,
    });
    mocks.delete.mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderPage();
    await screen.findByText("Doomed post");

    await user.click(screen.getByRole("button", { name: "Post actions" }));
    await user.click(screen.getByRole("menuitem", { name: /delete/i }));
    expect(screen.getByText("Delete post?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(mocks.delete).toHaveBeenCalledWith("p1"));
    await waitFor(() =>
      expect(screen.queryByText("Doomed post")).not.toBeInTheDocument()
    );
  });
});
