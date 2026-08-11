import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Feed from "./Feed";
import type { PostDto, CommentDto } from "@/services/postService";

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  getFeed: vi.fn(),
  create: vi.fn(),
  toggleLike: vi.fn(),
  getComments: vi.fn(),
  addComment: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: mocks.useAuth,
}));

vi.mock("@/services/postService", () => ({
  postService: {
    getFeed: mocks.getFeed,
    create: mocks.create,
    toggleLike: mocks.toggleLike,
    getComments: mocks.getComments,
    addComment: mocks.addComment,
    delete: mocks.delete,
  },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function postFixture(overrides: Partial<PostDto> = {}): PostDto {
  return {
    id: "p1",
    content: "Hello world",
    imageUrl: null,
    postType: "TEXT",
    likeCount: 0,
    commentCount: 0,
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

function commentFixture(overrides: Partial<CommentDto> = {}): CommentDto {
  return {
    id: "c1",
    content: "Nice work!",
    createdAt: "2026-08-01T00:00:00Z",
    user: {
      id: "u2",
      fullName: "Ada Lovelace",
      avatarUrl: null,
      username: "ada",
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

describe("Feed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser();
  });

  it("renders posts from the feed with author names and content", async () => {
    mocks.getFeed.mockResolvedValue({
      content: [
        postFixture({ id: "p1", content: "First post", user: { ...postFixture().user, fullName: "Buffy Test" } }),
        postFixture({
          id: "p2",
          content: "Second post",
          user: { id: "u2", fullName: "Ada Lovelace", avatarUrl: null, username: "ada" },
        }),
      ],
      totalPages: 1,
      last: true,
    });

    render(<Feed />);

    expect(await screen.findByText("First post")).toBeInTheDocument();
    expect(screen.getByText("Second post")).toBeInTheDocument();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    // Own post shows the "You" badge
    expect(screen.getByText("You")).toBeInTheDocument();
  });

  it("shows the empty state when the feed has no posts", async () => {
    mocks.getFeed.mockResolvedValue({ content: [], totalPages: 0, last: true });

    render(<Feed />);

    expect(await screen.findByText("No posts yet")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /write the first post/i })
    ).toBeInTheDocument();
  });

  it("likes a post optimistically and syncs with the server response", async () => {
    mocks.getFeed.mockResolvedValue({
      content: [postFixture({ id: "p1", likeCount: 0 })],
      totalPages: 1,
      last: true,
    });
    mocks.toggleLike.mockResolvedValue({ liked: true, count: 1 });
    const user = userEvent.setup();

    render(<Feed />);
    await screen.findByText("Hello world");

    await user.click(screen.getByRole("button", { name: "Like post" }));

    expect(mocks.toggleLike).toHaveBeenCalledWith("p1");
    // Count reflects the server response
    await waitFor(() => expect(screen.getByText("1")).toBeInTheDocument());
  });

  it("creates a post and prepends it to the feed", async () => {
    mocks.getFeed.mockResolvedValue({ content: [], totalPages: 0, last: true });
    mocks.create.mockResolvedValue(postFixture({ id: "p9", content: "New update" }));
    const user = userEvent.setup();

    render(<Feed />);
    await screen.findByText("No posts yet");

    await user.type(
      screen.getByPlaceholderText(/share something/i),
      "New update"
    );
    await user.click(screen.getByRole("button", { name: "Post" }));

    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith({
        content: "New update",
        imageUrl: undefined,
      })
    );
    expect(await screen.findByText("New update")).toBeInTheDocument();
  });

  it("submits an image URL with a post", async () => {
    mocks.getFeed.mockResolvedValue({ content: [], totalPages: 0, last: true });
    mocks.create.mockResolvedValue(
      postFixture({ id: "p10", content: "With image", imageUrl: "https://example.com/img.png" })
    );
    const user = userEvent.setup();

    render(<Feed />);
    await screen.findByText("No posts yet");

    await user.type(screen.getByPlaceholderText(/share something/i), "With image");
    await user.click(screen.getByRole("button", { name: "Image" }));
    await user.type(
      screen.getByPlaceholderText(/paste image url/i),
      "https://example.com/img.png"
    );
    await user.click(screen.getByRole("button", { name: "Post" }));

    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith({
        content: "With image",
        imageUrl: "https://example.com/img.png",
      })
    );
  });

  it("inserts emoji from the picker into the composer", async () => {
    mocks.getFeed.mockResolvedValue({ content: [], totalPages: 0, last: true });
    const user = userEvent.setup();

    render(<Feed />);
    await screen.findByText("No posts yet");

    await user.click(screen.getByTitle("Add emoji"));
    await user.click(screen.getByTitle("😀"));

    const composer = screen.getByPlaceholderText(
      /share something/i
    ) as HTMLTextAreaElement;
    expect(composer.value).toContain("😀");
  });

  it("loads and adds comments", async () => {
    mocks.getFeed.mockResolvedValue({
      content: [postFixture({ id: "p1", commentCount: 0 })],
      totalPages: 1,
      last: true,
    });
    mocks.getComments.mockResolvedValue([commentFixture()]);
    mocks.addComment.mockResolvedValue(
      commentFixture({
        id: "c2",
        content: "Thanks!",
        user: { id: "u1", fullName: "Buffy Test", avatarUrl: null, username: "buffytest" },
      })
    );
    const user = userEvent.setup();

    render(<Feed />);
    await screen.findByText("Hello world");

    // Open comments
    await user.click(screen.getByRole("button", { name: "Toggle comments" }));
    expect(mocks.getComments).toHaveBeenCalledWith("p1");
    expect(await screen.findByText("Nice work!")).toBeInTheDocument();

    // Add a comment
    await user.type(
      screen.getByPlaceholderText(/write a comment/i),
      "Thanks!"
    );
    await user.click(screen.getByRole("button", { name: "Send comment" }));

    await waitFor(() =>
      expect(mocks.addComment).toHaveBeenCalledWith("p1", { content: "Thanks!" })
    );
    expect(await screen.findByText("Thanks!")).toBeInTheDocument();
  });
});
