import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router";
import UserProfilePage from "./UserProfilePage";

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  getProfile: vi.fn(),
  getFollowers: vi.fn(),
  getFollowing: vi.fn(),
  follow: vi.fn(),
  unfollow: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: mocks.useAuth,
}));

vi.mock("@/services/socialService", () => ({
  socialService: {
    getProfile: mocks.getProfile,
    getFollowers: mocks.getFollowers,
    getFollowing: mocks.getFollowing,
    follow: mocks.follow,
    unfollow: mocks.unfollow,
  },
}));

vi.mock("@/services/publicProfileService", () => ({
  publicProfileService: {
    getProfile: vi.fn().mockResolvedValue({
      username: "ada",
      displayName: "Ada Lovelace",
      avatarUrl: null,
      bio: "Mathematician",
      jobTitle: null,
      company: null,
      location: null,
      memberSince: "2025-01-01T00:00:00Z",
      presenceStatus: "ONLINE",
      contributions: {
        projectsCreated: 5,
        tasksCompleted: 10,
        messagesSent: 20,
        postsCreated: 3,
        commentsAdded: 4,
        currentStreak: 0,
        monthlyActivity: [],
        heatmap: [],
      },
    }),
  },
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function baseSocial(overrides: Record<string, unknown> = {}) {
  return {
    id: "u2",
    username: "ada",
    displayName: "Ada Lovelace",
    avatarUrl: null,
    bio: "Mathematician",
    jobTitle: null,
    company: null,
    location: null,
    memberSince: "2025-01-01T00:00:00Z",
    posts: 3,
    followerCount: 12,
    followingCount: 4,
    isFollowing: false,
    followsYou: false,
    isSelf: false,
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
    <MemoryRouter initialEntries={["/profile/ada"]}>
      <Routes>
        <Route path="/profile/:username" element={<UserProfilePage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("UserProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser();
  });

  it("shows social stats and a Follow button for another user", async () => {
    mocks.getProfile.mockResolvedValue(baseSocial());

    renderPage();

    expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument();
    // stats
    expect(screen.getByText("Followers")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("Following")).toBeInTheDocument();
    expect(screen.getAllByText("4").length).toBeGreaterThanOrEqual(1);
    // Follow button for a stranger's profile
    expect(screen.getByRole("button", { name: "Follow" })).toBeInTheDocument();
    // No owner controls for another user's profile
    expect(
      screen.queryByRole("button", { name: /edit profile/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /my posts/i })
    ).not.toBeInTheDocument();
  });

  it("follows and then unfollows a user", async () => {
    mocks.getProfile.mockResolvedValue(baseSocial());
    mocks.follow.mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderPage();
    await screen.findByText("Ada Lovelace");

    await user.click(screen.getByRole("button", { name: "Follow" }));
    await waitFor(() => expect(mocks.follow).toHaveBeenCalledWith("u2"));
    // The button becomes "Following"
    expect(await screen.findByRole("button", { name: "Following" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Following" }));
    await waitFor(() => expect(mocks.unfollow).toHaveBeenCalledWith("u2"));
  });

  it("shows Edit Profile and My Posts for the user's own profile", async () => {
    mocks.getProfile.mockResolvedValue(baseSocial({ isSelf: true }));

    renderPage();

    expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /edit profile/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /my posts/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^follow$/i })
    ).not.toBeInTheDocument();
  });

  it("opens the followers list dialog", async () => {
    mocks.getProfile.mockResolvedValue(baseSocial({ followerCount: 1 }));
    mocks.getFollowers.mockResolvedValue([
      {
        id: "u1",
        username: "buffytest",
        fullName: "Buffy Test",
        avatarUrl: null,
        bio: null,
        followerCount: 0,
        followingCount: 0,
        isFollowing: false,
        followsYou: false,
        isSelf: true,
      },
    ]);
    const user = userEvent.setup();

    renderPage();
    await screen.findByText("Ada Lovelace");

    await user.click(screen.getByRole("button", { name: /view followers/i }));
    expect(await screen.findByText("Buffy Test")).toBeInTheDocument();
    expect(mocks.getFollowers).toHaveBeenCalledWith("u2");
  });
});
