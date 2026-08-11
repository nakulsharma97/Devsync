import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import ProjectWorkspace from "./ProjectWorkspace";
import type { ProjectDto } from "@/services/projectService";

const mocks = vi.hoisted(() => ({
  user: { id: "u1", fullName: "Buffy Test", email: "buffy@test.com", role: "USER" },
  getProject: vi.fn(),
  getProjectInvitations: vi.fn(),
  getProjectBoard: vi.fn(),
  getProjectActivities: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: mocks.user, isAdmin: false, logout: vi.fn() }),
}));

vi.mock("@/services/projectService", () => ({
  projectService: {
    getProject: mocks.getProject,
    getMyProjects: vi.fn(),
    getProjectInvitations: mocks.getProjectInvitations,
    getMyInvitations: vi.fn(),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
    changeVisibility: vi.fn(),
    updateMemberRole: vi.fn(),
    removeMember: vi.fn(),
    invite: vi.fn(),
    acceptInvitation: vi.fn(),
    declineInvitation: vi.fn(),
    cancelInvitation: vi.fn(),
  },
}));

vi.mock("@/services/boardService", () => ({
  boardService: {
    getProjectBoard: mocks.getProjectBoard,
    createBoard: vi.fn(),
  },
}));

vi.mock("@/services/activityService", () => ({
  activityService: {
    getProjectActivities: mocks.getProjectActivities,
  },
}));

vi.mock("sonner", () => ({
  toast: vi.fn(),
}));

// BoardPage is imported by the workspace; it reads router params and its own
// APIs. We never activate that tab in these tests, but the import must load.
vi.mock("./BoardPage", () => ({
  default: () => <div>Mock Board</div>,
}));

function projectFixture(overrides: Partial<ProjectDto> = {}): ProjectDto {
  return {
    id: "p1",
    name: "DevSync App",
    description: "The flagship developer platform",
    ownerId: "u1",
    status: "ACTIVE",
    visibility: "PRIVATE",
    currentUserRole: "OWNER",
    repositoryUrl: null,
    imageUrl: null,
    memberCount: 2,
    members: [
      {
        id: "m1",
        userId: "u1",
        role: "OWNER",
        fullName: "Buffy Test",
        email: "buffy@test.com",
        avatarUrl: null,
      },
      {
        id: "m2",
        userId: "u2",
        role: "MEMBER",
        fullName: "Rahul Sharma",
        email: "rahul@test.com",
        avatarUrl: null,
      },
    ],
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2025-06-01T00:00:00Z",
    ...overrides,
  };
}

function renderWorkspace() {
  return render(
    <MemoryRouter initialEntries={["/projects/p1"]}>
      <Routes>
        <Route path="/projects/:projectId" element={<ProjectWorkspace />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ProjectWorkspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getProject.mockResolvedValue(projectFixture());
    mocks.getProjectBoard.mockResolvedValue(null);
    mocks.getProjectActivities.mockResolvedValue({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0, last: true });
    mocks.getProjectInvitations.mockResolvedValue([]);
  });

  it("renders the project header with name, badge and member count", async () => {
    renderWorkspace();

    expect(await screen.findByText("DevSync App")).toBeInTheDocument();
    expect(screen.getByText("Private")).toBeInTheDocument();
    expect(screen.getByText("2 members")).toBeInTheDocument();
    expect(screen.getByText("Owner:")).toBeInTheDocument();
    expect(screen.getAllByText("Buffy Test").length).toBeGreaterThan(0);
  });

  it("shows an unauthorized state for private projects", async () => {
    mocks.getProject.mockRejectedValue(new Error("This project is private"));
    renderWorkspace();

    expect(await screen.findByText("You don't have access to this project")).toBeInTheDocument();
  });

  it("hides manage controls for regular members", async () => {
    mocks.getProject.mockResolvedValue(
      projectFixture({ currentUserRole: "MEMBER", ownerId: "u9" })
    );
    renderWorkspace();

    await screen.findByText("DevSync App");
    expect(screen.queryByRole("button", { name: /Invite Member/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Project Settings/i })).not.toBeInTheDocument();
  });

  it("shows manage controls for the owner", async () => {
    renderWorkspace();

    await screen.findByText("DevSync App");
    expect(screen.getAllByRole("button", { name: /Invite Member/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /Project Settings/i })).toBeInTheDocument();
  });

  it("switches tabs without leaving the page", async () => {
    const user = userEvent.setup({ delay: null });
    renderWorkspace();

    await screen.findByText("DevSync App");
    await user.click(screen.getByRole("button", { name: /Members/i }));
    expect(screen.getByText(/Members \(2\)/)).toBeInTheDocument();
    expect(screen.getByText("Rahul Sharma")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Activity/i }));
    await waitFor(() =>
      expect(screen.getByText(/No activity yet/i)).toBeInTheDocument()
    );
  });
});
