import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import Dashboard from "./Dashboard";
import type { ProjectDto } from "@/services/projectService";

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  useApi: vi.fn(),
  useCountUp: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: mocks.useAuth,
}));

vi.mock("@/hooks/useApi", () => ({
  useApi: mocks.useApi,
}));

// Return the target immediately — keeps assertions deterministic without rAF.
vi.mock("@/hooks/useCountUp", () => ({
  useCountUp: (target: number) => String(target),
}));

const sampleProjects: ProjectDto[] = [
  {
    id: "p1",
    name: "Newer Project",
    description: "The flagship app",
    ownerId: "u1",
    status: "ACTIVE",
    visibility: "PRIVATE",
    currentUserRole: "OWNER",
    repositoryUrl: null,
    imageUrl: null,
    memberCount: 3,
    members: [
      {
        id: "m1",
        userId: "u1",
        role: "OWNER",
        fullName: "Buffy Test",
        avatarUrl: null,
      },
    ],
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-06-01T00:00:00Z",
  },
  {
    id: "p2",
    name: "Older Project",
    description: "Archived work",
    ownerId: "u1",
    status: "ARCHIVED",
    visibility: "PUBLIC",
    currentUserRole: null,
    repositoryUrl: null,
    imageUrl: null,
    memberCount: 1,
    members: [],
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
];

function mockUser(overrides: Partial<{ role: string; fullName: string }> = {}) {
  mocks.useAuth.mockReturnValue({
    user: {
      id: "u1",
      email: "buffy@test.com",
      fullName: overrides.fullName ?? "Buffy Test",
      username: "buffytest",
      avatarUrl: null,
      role: overrides.role ?? "MEMBER",
    },
    isLoading: false,
    isAuthenticated: true,
    isAdmin: overrides.role === "ADMIN",
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
      <Dashboard />
    </MemoryRouter>
  );
}

describe("Dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser();
    mocks.useApi.mockReturnValue({
      data: null,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it("renders the greeting header with first name and admin chip for admins", () => {
    mockUser({ role: "ADMIN" });
    mocks.useApi
      .mockReturnValueOnce({ data: sampleProjects, loading: false, error: null, refetch: vi.fn() })
      .mockReturnValueOnce({ data: 3, loading: false, error: null, refetch: vi.fn() });

    renderPage();

    expect(screen.getByText(/Good (morning|afternoon|evening),/)).toBeInTheDocument();
    expect(screen.getByText("Buffy")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });

  it("renders stat cards with counted values", async () => {
    mocks.useApi
      .mockReturnValueOnce({ data: sampleProjects, loading: false, error: null, refetch: vi.fn() })
      .mockReturnValueOnce({ data: 3, loading: false, error: null, refetch: vi.fn() });

    renderPage();

    expect(await screen.findByText("Projects")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument(); // project count
    expect(screen.getByText("3")).toBeInTheDocument(); // unread count
    expect(screen.getByText("Notifications")).toBeInTheDocument();
    expect(screen.getByText("Messages")).toBeInTheDocument();
    expect(screen.getByText("Team chats & DMs")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /New Project/i })).toBeInTheDocument();
  });

  it("sorts recent projects by updatedAt and renders status pills, members and update time", async () => {
    mocks.useApi
      .mockReturnValueOnce({ data: sampleProjects, loading: false, error: null, refetch: vi.fn() })
      .mockReturnValueOnce({ data: 0, loading: false, error: null, refetch: vi.fn() });

    renderPage();

    expect(await screen.findByText("Newer Project")).toBeInTheDocument();

    // Sorted newest-first (regex excludes the "New Project" button)
    const names = screen
      .getAllByText(/^(Newer|Older) Project$/)
      .map((el) => el.textContent);
    expect(names).toEqual(["Newer Project", "Older Project"]);

    // Status pills
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Archived")).toBeInTheDocument();

    // Member count + relative update time (fixtures use 2025 dates)
    expect(screen.getByText("3 members")).toBeInTheDocument();
    expect(screen.getByText(/over 1 year ago/)).toBeInTheDocument();

    // "View all" appears when projects exist
    expect(screen.getByRole("button", { name: /View all/i })).toBeInTheDocument();
  });

  it("shows the empty state when there are no projects", async () => {
    mocks.useApi
      .mockReturnValueOnce({ data: [], loading: false, error: null, refetch: vi.fn() })
      .mockReturnValueOnce({ data: 0, loading: false, error: null, refetch: vi.fn() });

    renderPage();

    expect(await screen.findByText("No projects yet")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Create your first project/i })
    ).toBeInTheDocument();
    expect(screen.queryByText("View all")).not.toBeInTheDocument();
  });
});
