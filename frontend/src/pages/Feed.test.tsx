import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import Feed from "./Feed";
import type { PostDto, CommentDto } from "@/services/postService";

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  getFeed: vi.fn(),
  create: vi.fn(),
  updatePost: vi.fn(),
  updatePostImage: vi.fn(),
  uploadPostImage: vi.fn(),
  downloadBlob: vi.fn(),
  toggleLike: vi.fn(),
  getComments: vi.fn(),
  addComment: vi.fn(),
  delete: vi.fn(),
  deleteComment: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: mocks.useAuth,
}));

vi.mock("@/services/postService", () => ({
  postService: {
    getFeed: mocks.getFeed,
    create: mocks.create,
    updatePost: mocks.updatePost,
    updatePostImage: mocks.updatePostImage,
    toggleLike: mocks.toggleLike,
    getComments: mocks.getComments,
    addComment: mocks.addComment,
    delete: mocks.delete,
    deleteComment: mocks.deleteComment,
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

function imageFile(name = "photo.png", type = "image/png"): File {
  return new File(["fake-image-bytes"], name, { type });
}

function renderFeed() {
  return render(
    <MemoryRouter>
      <Feed />
    </MemoryRouter>
  );
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

    renderFeed();

    expect(await screen.findByText("First post")).toBeInTheDocument();
    expect(screen.getByText("Second post")).toBeInTheDocument();
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    // Own post shows the "You" badge
    expect(screen.getByText("You")).toBeInTheDocument();
  });

  it("shows the empty state when the feed has no posts", async () => {
    mocks.getFeed.mockResolvedValue({ content: [], totalPages: 0, last: true });

    renderFeed();

    expect(await screen.findByText("No posts yet")).toBeInTheDocument();
    // There are Create Post buttons in both the header and the empty state
    const createButtons = screen.getAllByRole("button", { name: /create post/i });
    expect(createButtons.length).toBeGreaterThanOrEqual(1);
  });

  it("likes a post optimistically and syncs with the server response", async () => {
    mocks.getFeed.mockResolvedValue({
      content: [postFixture({ id: "p1", likeCount: 0 })],
      totalPages: 1,
      last: true,
    });
    mocks.toggleLike.mockResolvedValue({ liked: true, count: 1 });
    const user = userEvent.setup();

    renderFeed();
    await screen.findByText("Hello world");

    await user.click(screen.getByRole("button", { name: "Like post" }));

    expect(mocks.toggleLike).toHaveBeenCalledWith("p1");
    // Count reflects the server response
    await waitFor(() => expect(screen.getByText("1")).toBeInTheDocument());
  });

  it("creates a text-only post and prepends it to the feed", async () => {
    mocks.getFeed.mockResolvedValue({ content: [], totalPages: 0, last: true });
    mocks.create.mockResolvedValue(postFixture({ id: "p9", content: "New update" }));
    const user = userEvent.setup();

    renderFeed();
    await screen.findByText("No posts yet");

    // Open composer — click the first Create Post button (header)
    const createBtns = screen.getAllByRole("button", { name: /create post/i });
    await user.click(createBtns[0]);
    await screen.findByPlaceholderText(/share something/i);

    await user.type(
      screen.getByPlaceholderText(/share something/i),
      "New update"
    );
    await user.click(screen.getByRole("button", { name: "Post" }));

    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith({ content: "New update" })
    );
    expect(await screen.findByText("New update")).toBeInTheDocument();
  });

  it("rejects an unsupported image type with a clear error", async () => {
    mocks.getFeed.mockResolvedValue({ content: [], totalPages: 0, last: true });
    const user = userEvent.setup();

    renderFeed();
    await screen.findByText("No posts yet");

    // Open composer
    const createBtns = screen.getAllByRole("button", { name: /create post/i });
    await user.click(createBtns[0]);
    await screen.findByPlaceholderText(/share something/i);

    const input = document.getElementById("feed-image-input") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [imageFile("notes.txt", "text/plain")] } });

    expect(
      await screen.findByText(/unsupported image type/i)
    ).toBeInTheDocument();
  });

  it("rejects an oversized image with a clear error", async () => {
    mocks.getFeed.mockResolvedValue({ content: [], totalPages: 0, last: true });
    const user = userEvent.setup();

    renderFeed();
    await screen.findByText("No posts yet");

    // Open composer
    const createBtns = screen.getAllByRole("button", { name: /create post/i });
    await user.click(createBtns[0]);
    await screen.findByPlaceholderText(/share something/i);

    const big = imageFile("big.png", "image/png");
    Object.defineProperty(big, "size", { value: 11 * 1024 * 1024 });

    const input = document.getElementById("feed-image-input") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [big] } });

    expect(await screen.findByText(/image is too large/i)).toBeInTheDocument();
  });

  it("uploads a selected image, attaches it to the post and shows it in the feed", async () => {
    mocks.getFeed.mockResolvedValue({ content: [], totalPages: 0, last: true });
    mocks.create.mockResolvedValue(postFixture({ id: "p9", content: "With image" }));
    mocks.uploadPostImage.mockResolvedValue({
      id: "att-1",
      url: "/api/attachments/att-1/download",
    });
    mocks.updatePostImage.mockResolvedValue(
      postFixture({
        id: "p9",
        content: "With image",
        imageUrl: "/api/attachments/att-1/download",
      })
    );
    mocks.downloadBlob.mockRejectedValue(new Error("no network"));
    const user = userEvent.setup();

    renderFeed();
    await screen.findByText("No posts yet");

    // Open composer
    const createBtns = screen.getAllByRole("button", { name: /create post/i });
    await user.click(createBtns[0]);
    await screen.findByPlaceholderText(/share something/i);

    await user.type(
      screen.getByPlaceholderText(/share something/i),
      "With image"
    );
    const input = document.getElementById("feed-image-input") as HTMLInputElement;
    await user.upload(input, imageFile());

    expect(
      await screen.findByAltText(/selected image preview/i)
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Replace" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /remove/i })
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Post" }));

    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(mocks.uploadPostImage).toHaveBeenCalledWith(
        expect.any(File),
        "p9",
        expect.any(Function)
      )
    );
    await waitFor(() =>
      expect(mocks.updatePostImage).toHaveBeenCalledWith(
        "p9",
        "/api/attachments/att-1/download"
      )
    );
    expect(await screen.findByText("With image")).toBeInTheDocument();
  });

  it("lets the user remove the selected image before posting", async () => {
    mocks.getFeed.mockResolvedValue({ content: [], totalPages: 0, last: true });
    mocks.create.mockResolvedValue(postFixture({ id: "p9", content: "Text only" }));
    const user = userEvent.setup();

    renderFeed();
    await screen.findByText("No posts yet");

    // Open composer
    const createBtns = screen.getAllByRole("button", { name: /create post/i });
    await user.click(createBtns[0]);
    await screen.findByPlaceholderText(/share something/i);

    const input = document.getElementById("feed-image-input") as HTMLInputElement;
    await user.upload(input, imageFile());

    expect(
      await screen.findByAltText(/selected image preview/i)
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /remove/i })
    );

    expect(
      screen.queryByAltText(/selected image preview/i)
    ).not.toBeInTheDocument();

    await user.type(
      screen.getByPlaceholderText(/share something/i),
      "Text only"
    );
    await user.click(screen.getByRole("button", { name: "Post" }));

    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith({ content: "Text only" })
    );
    expect(mocks.uploadPostImage).not.toHaveBeenCalled();
  });

  it("inserts emoji from the picker into the composer", async () => {
    mocks.getFeed.mockResolvedValue({ content: [], totalPages: 0, last: true });
    const user = userEvent.setup();

    renderFeed();
    await screen.findByText("No posts yet");

    // Open composer
    const createBtns = screen.getAllByRole("button", { name: /create post/i });
    await user.click(createBtns[0]);
    await screen.findByPlaceholderText(/share something/i);

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

    renderFeed();
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

  it("shows the Post actions menu only on the user's own posts", async () => {
    mocks.getFeed.mockResolvedValue({
      content: [
        postFixture({ id: "p1", content: "Mine" }),
        postFixture({
          id: "p2",
          content: "Theirs",
          user: { id: "u2", fullName: "Ada Lovelace", avatarUrl: null, username: "ada" },
        }),
      ],
      totalPages: 1,
      last: true,
    });
    const user = userEvent.setup();

    renderFeed();
    await screen.findByText("Mine");

    // Own post: menu present. Other user's post: no menu.
    const menus = screen.getAllByRole("button", { name: "Post actions" });
    expect(menus).toHaveLength(1);
    expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();

    await user.click(menus[0]);
    expect(screen.getByRole("menuitem", { name: /edit/i })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /delete/i })).toBeInTheDocument();
  });

  it("edits the user's own post and updates it in place", async () => {
    mocks.getFeed.mockResolvedValue({
      content: [postFixture({ id: "p1", content: "Original text" })],
      totalPages: 1,
      last: true,
    });
    mocks.updatePost.mockResolvedValue(
      postFixture({
        id: "p1",
        content: "Edited text",
        updatedAt: "2026-08-01T01:00:00Z",
      })
    );
    const user = userEvent.setup();

    renderFeed();
    await screen.findByText("Original text");

    await user.click(screen.getByRole("button", { name: "Post actions" }));
    await user.click(screen.getByRole("menuitem", { name: /edit/i }));

    // Dialog opens with the existing content.
    const editor = screen.getByRole("textbox", {
      name: "Edit post content",
    }) as HTMLTextAreaElement;
    expect(editor.value).toBe("Original text");

    await user.clear(editor);
    await user.type(editor, "Edited text");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() =>
      expect(mocks.updatePost).toHaveBeenCalledWith("p1", { content: "Edited text" })
    );
    expect(await screen.findByText("Edited text")).toBeInTheDocument();
    // Edited indicator shows; post id preserved (no duplicate).
    expect(screen.getByText("· Edited")).toBeInTheDocument();
    expect(screen.getAllByText(/edited text/i)).toHaveLength(1);
  });

  it("cancel closes the edit dialog without saving", async () => {
    mocks.getFeed.mockResolvedValue({
      content: [postFixture({ id: "p1", content: "Original text" })],
      totalPages: 1,
      last: true,
    });
    const user = userEvent.setup();

    renderFeed();
    await screen.findByText("Original text");

    await user.click(screen.getByRole("button", { name: "Post actions" }));
    await user.click(screen.getByRole("menuitem", { name: /edit/i }));
    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(mocks.updatePost).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("textbox", { name: "Edit post content" })
    ).not.toBeInTheDocument();
  });

  it("deletes the user's own post after confirmation", async () => {
    mocks.getFeed.mockResolvedValue({
      content: [postFixture({ id: "p1", content: "Doomed post" })],
      totalPages: 1,
      last: true,
    });
    mocks.delete.mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderFeed();
    await screen.findByText("Doomed post");

    await user.click(screen.getByRole("button", { name: "Post actions" }));
    await user.click(screen.getByRole("menuitem", { name: /delete/i }));

    // Confirmation modal copy.
    expect(screen.getByText("Delete post?")).toBeInTheDocument();
    expect(screen.getByText("This action cannot be undone.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(mocks.delete).toHaveBeenCalledWith("p1"));
    await waitFor(() =>
      expect(screen.queryByText("Doomed post")).not.toBeInTheDocument()
    );
  });

  it("cancel closes the delete confirmation without deleting", async () => {
    mocks.getFeed.mockResolvedValue({
      content: [postFixture({ id: "p1", content: "Safe post" })],
      totalPages: 1,
      last: true,
    });
    const user = userEvent.setup();

    renderFeed();
    await screen.findByText("Safe post");

    await user.click(screen.getByRole("button", { name: "Post actions" }));
    await user.click(screen.getByRole("menuitem", { name: /delete/i }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(mocks.delete).not.toHaveBeenCalled();
    expect(screen.getByText("Safe post")).toBeInTheDocument();
  });

  it("post owner sees a delete option on other users' comments", async () => {
    mocks.getFeed.mockResolvedValue({
      content: [postFixture({ id: "p1", commentCount: 1 })],
      totalPages: 1,
      last: true,
    });
    mocks.getComments.mockResolvedValue([commentFixture()]); // by u2 (Ada)
    mocks.deleteComment.mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderFeed();
    await screen.findByText("Hello world");

    await user.click(screen.getByRole("button", { name: "Toggle comments" }));
    expect(await screen.findByText("Nice work!")).toBeInTheDocument();

    // u1 owns the post, so u1 may delete u2's comment.
    const deleteButtons = screen.getAllByRole("button", { name: "Delete comment" });
    expect(deleteButtons).toHaveLength(1);

    await user.click(deleteButtons[0]);
    expect(screen.getByText("Delete comment?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(mocks.deleteComment).toHaveBeenCalledWith("c1"));
    await waitFor(() =>
      expect(screen.queryByText("Nice work!")).not.toBeInTheDocument()
    );
  });

  it("does not show a comment delete option to an unrelated user", async () => {
    mocks.getFeed.mockResolvedValue({
      content: [
        postFixture({
          id: "p2",
          content: "Someone else's post",
          user: { id: "u2", fullName: "Ada Lovelace", avatarUrl: null, username: "ada" },
          commentCount: 1,
        }),
      ],
      totalPages: 1,
      last: true,
    });
    mocks.getComments.mockResolvedValue([commentFixture()]); // by u2 (Ada)
    const user = userEvent.setup();

    renderFeed();
    await screen.findByText("Someone else's post");

    await user.click(screen.getByRole("button", { name: "Toggle comments" }));
    expect(await screen.findByText("Nice work!")).toBeInTheDocument();

    // u1 is neither the comment author (u2) nor the post owner (u2).
    expect(
      screen.queryByRole("button", { name: "Delete comment" })
    ).not.toBeInTheDocument();
  });
});
