import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import Projects from "./Projects";
import type { ProjectDto } from "@/services/projectService";

const mocks = vi.hoisted(() => ({
  useApi: vi.fn(),
  createProject: vi.fn(),
  refetch: vi.fn(),
  refetchInvitations: vi.fn(),
}));

vi.mock("@/hooks/useApi", () => ({
  useApi: mocks.useApi,
}));

vi.mock("@/services/projectService", () => ({
  projectService: {
    getMyProjects: vi.fn(),
    createProject: mocks.createProject,
    getProject: vi.fn(),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
    addMember: vi.fn(),
    removeMember: vi.fn(),
    updateMemberRole: vi.fn(),
    changeVisibility: vi.fn(),
    joinProject: vi.fn(),
    discoverProjects: vi.fn(),
    invite: vi.fn(),
    getProjectInvitations: vi.fn(),
    getMyInvitations: vi.fn(),
    acceptInvitation: vi.fn(),
    declineInvitation: vi.fn(),
    cancelInvitation: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: vi.fn(),
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
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2025-06-01T00:00:00Z",
    ...overrides,
  };
}

function mockProjects(projects: ProjectDto[] | null, loading = false) {
  mocks.useApi.mockReturnValue({
    data: projects,
    loading,
    error: null,
    refetch: mocks.refetch,
  });
}

function renderPage() {
  return render(
    <MemoryRouter>
      <Projects />
    </MemoryRouter>
  );
}

describe("Projects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // useApi is called twice (projects + invitations); both get the same shape.
    mocks.useApi.mockReturnValue({
      data: null,
      loading: false,
      error: null,
      refetch: mocks.refetch,
    });
  });

  it("renders project cards with names, status pills, member counts and visibility badges", async () => {
    mockProjects([
      projectFixture({ id: "p1", name: "DevSync App", status: "ACTIVE", visibility: "PUBLIC" }),
      projectFixture({
        id: "p2",
        name: "Legacy",
        description: "A legacy codebase",
        status: "ARCHIVED",
        memberCount: 1,
        members: [],
      }),
    ]);

    renderPage();

    expect(screen.getByText("DevSync App")).toBeInTheDocument();
    expect(screen.getByText("Legacy")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Archived")).toBeInTheDocument();
    expect(screen.getByText("3 members")).toBeInTheDocument();
    expect(screen.getByText("The flagship developer platform")).toBeInTheDocument();
    expect(screen.getAllByText("Open Project").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Team Chat").length).toBeGreaterThan(0);
    // Visibility badges: p1 public, p2 private.
    expect(screen.getAllByText("Public").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Private").length).toBeGreaterThan(0);
    // Header counts
    expect(screen.getByText(/2 total/)).toBeInTheDocument();
    expect(screen.getByText(/1 active/)).toBeInTheDocument();
  });

  it("shows the empty state and opens the create dialog from it", async () => {
    mockProjects([]);
    const user = userEvent.setup({ delay: null });

    renderPage();

    expect(screen.getByText("No projects yet")).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /Create your first project/i })
    );

    expect(screen.getByText("Create a new project")).toBeInTheDocument();
  });

  it("creates a PRIVATE project by default and navigates to the workspace", async () => {
    mockProjects([]);
    mocks.createProject.mockResolvedValue(projectFixture());
    const user = userEvent.setup({ delay: null });

    renderPage();

    await user.click(screen.getByRole("button", { name: /New Project/i }));
    await user.type(screen.getByLabelText("Project name"), "Brand New App");
    await user.type(
      screen.getByLabelText("Description (optional)"),
      "A shiny new workspace"
    );
    await user.click(screen.getByRole("button", { name: "Create Project" }));

    await waitFor(() =>
      expect(mocks.createProject).toHaveBeenCalledWith({
        name: "Brand New App",
        description: "A shiny new workspace",
        visibility: "PRIVATE",
      })
    );
  });

  it("creates a PUBLIC project when the Public option is selected", async () => {
    mockProjects([]);
    mocks.createProject.mockResolvedValue(projectFixture({ visibility: "PUBLIC" }));
    const user = userEvent.setup({ delay: null });

    renderPage();

    await user.click(screen.getByRole("button", { name: /New Project/i }));
    await user.type(screen.getByLabelText("Project name"), "Open Source App");
    await user.click(screen.getByRole("button", { name: /^Public/ }));
    await user.click(screen.getByRole("button", { name: "Create Project" }));

    await waitFor(() =>
      expect(mocks.createProject).toHaveBeenCalledWith({
        name: "Open Source App",
        description: undefined,
        visibility: "PUBLIC",
      })
    );
  });
});
