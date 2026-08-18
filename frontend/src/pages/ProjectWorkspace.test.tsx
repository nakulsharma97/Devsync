import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import ProjectWorkspace from "./ProjectWorkspace";
import type { ProjectDto } from "@/services/projectService";
import { toast } from "sonner";

const mocks = vi.hoisted(() => ({
  user: { id: "u1", fullName: "Buffy Test", email: "buffy@test.com", role: "USER" },
  getProject: vi.fn(),
  getProjectInvitations: vi.fn(),
  getProjectJoinRequests: vi.fn(),
  getMyJoinRequestsForProject: vi.fn(),
  getProjectBoard: vi.fn(),
  getProjectActivities: vi.fn(),
  joinProject: vi.fn(),
  approveJoinRequest: vi.fn(),
  rejectJoinRequest: vi.fn(),
  requestJoin: vi.fn(),
  cancelJoinRequest: vi.fn(),
  removeMember: vi.fn(),
  transferOwnership: vi.fn(),
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
    removeMember: mocks.removeMember,
    transferOwnership: mocks.transferOwnership,
    invite: vi.fn(),
    acceptInvitation: vi.fn(),
    declineInvitation: vi.fn(),
    cancelInvitation: vi.fn(),
    joinProject: mocks.joinProject,
    requestJoin: mocks.requestJoin,
    getProjectJoinRequests: mocks.getProjectJoinRequests,
    getMyJoinRequests: vi.fn(),
    getMyJoinRequestsForProject: mocks.getMyJoinRequestsForProject,
    approveJoinRequest: mocks.approveJoinRequest,
    rejectJoinRequest: mocks.rejectJoinRequest,
    cancelJoinRequest: mocks.cancelJoinRequest,
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
        username: "buffy",
        avatarUrl: null,
      },
      {
        id: "m2",
        userId: "u2",
        role: "MEMBER",
        fullName: "Rahul Sharma",
        username: "rahul",
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
    mocks.getProjectJoinRequests.mockResolvedValue([]);
    mocks.getMyJoinRequestsForProject.mockResolvedValue([]);
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

  it("shows a join prompt for non-members of a public project and sends a join request", async () => {
    const user = userEvent.setup({ delay: null });
    mocks.getProject.mockResolvedValue(
      projectFixture({
        visibility: "PUBLIC",
        currentUserRole: null,
        currentUserJoinRequestStatus: null,
        ownerId: "u9",
        members: [
          {
            id: "m1",
            userId: "u9",
            role: "OWNER",
            fullName: "Nakul Sharma",
            avatarUrl: null,
          },
        ],
        memberCount: 1,
      })
    );
    mocks.requestJoin.mockResolvedValue({
      id: "jr-1",
      projectId: "p1",
      projectName: "DevSync App",
      userId: "u1",
      userName: "Buffy Test",
      userAvatar: null,
      status: "PENDING",
      message: null,
      createdAt: "2026-01-15T10:00:00Z",
    });
    renderWorkspace();

    // Member-only tabs must NOT be visible — just the join prompt.
    expect(await screen.findByText("DevSync App")).toBeInTheDocument();
    expect(screen.getByText("Public")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Board/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Request to Join/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Request to Join/i }));
    expect(mocks.requestJoin).toHaveBeenCalledWith("p1");
    expect(mocks.joinProject).not.toHaveBeenCalled();
    await waitFor(() => expect(mocks.getProject).toHaveBeenCalled());
  });

  it("shows Request Pending with a cancel action when a join request is pending", async () => {
    const user = userEvent.setup({ delay: null });
    mocks.getProject.mockResolvedValue(
      projectFixture({
        visibility: "PUBLIC",
        currentUserRole: null,
        currentUserJoinRequestStatus: "PENDING",
        ownerId: "u9",
        members: [
          {
            id: "m1",
            userId: "u9",
            role: "OWNER",
            fullName: "Nakul Sharma",
            avatarUrl: null,
          },
        ],
        memberCount: 1,
      })
    );
    mocks.getMyJoinRequestsForProject.mockResolvedValue([
      {
        id: "jr-9",
        projectId: "p1",
        projectName: "DevSync App",
        userId: "u1",
        userName: "Buffy Test",
        userAvatar: null,
        status: "PENDING",
        message: null,
        createdAt: "2026-01-15T10:00:00Z",
      },
    ]);
    mocks.cancelJoinRequest.mockResolvedValue(undefined);
    renderWorkspace();

    expect(await screen.findByText("Request Pending")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Request to Join/i })).not.toBeInTheDocument();

    // The cancel action resolves the pending request id asynchronously.
    await waitFor(() => expect(mocks.getMyJoinRequestsForProject).toHaveBeenCalledWith("p1"));
    await user.click(await screen.findByRole("button", { name: /Cancel Request/i }));
    expect(mocks.cancelJoinRequest).toHaveBeenCalledWith("jr-9");
    await waitFor(() => expect(mocks.getProject).toHaveBeenCalled());
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

  it("shows pending join requests for managers with accept/reject actions", async () => {
    const user = userEvent.setup({ delay: null });
    mocks.getProjectJoinRequests.mockResolvedValue([
      {
        id: "jr-1",
        projectId: "p1",
        projectName: "DevSync App",
        userId: "u3",
        userName: "Priya Patel",
        userAvatar: null,
        status: "PENDING",
        message: null,
        createdAt: "2026-01-15T10:00:00Z",
      },
    ]);
    renderWorkspace();

    await screen.findByText("DevSync App");
    await user.click(screen.getByRole("button", { name: /Members/i }));

    expect(await screen.findByText("Pending Join Requests")).toBeInTheDocument();
    expect(screen.getByText("Priya Patel")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Accept/i }));
    expect(mocks.approveJoinRequest).toHaveBeenCalledWith("jr-1");
  });

  it("hides join-request management from regular members", async () => {
    const user = userEvent.setup({ delay: null });
    mocks.getProject.mockResolvedValue(
      projectFixture({ currentUserRole: "MEMBER", ownerId: "u9" })
    );
    mocks.getProjectJoinRequests.mockResolvedValue([
      {
        id: "jr-1",
        projectId: "p1",
        projectName: "DevSync App",
        userId: "u3",
        userName: "Priya Patel",
        userAvatar: null,
        status: "PENDING",
        message: null,
        createdAt: "2026-01-15T10:00:00Z",
      },
    ]);
    renderWorkspace();

    await screen.findByText("DevSync App");
    await user.click(screen.getByRole("button", { name: /Members/i }));

    await screen.findByText("Rahul Sharma");
    expect(screen.queryByText("Pending Join Requests")).not.toBeInTheDocument();
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

  it("shows the member action menu to the owner on non-owner rows only", async () => {
    const user = userEvent.setup({ delay: null });
    renderWorkspace();

    await screen.findByText("DevSync App");
    await user.click(screen.getByRole("button", { name: /Members/i }));

    // Exactly one 3-dot menu: on Rahul's row. The owner's own row has none.
    expect(await screen.findByRole("button", { name: "Member actions" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Member actions" })).toHaveLength(1);
  });

  it("hides owner-only member actions from regular members", async () => {
    const user = userEvent.setup({ delay: null });
    mocks.getProject.mockResolvedValue(
      projectFixture({ currentUserRole: "MEMBER", ownerId: "u9" })
    );
    renderWorkspace();

    await screen.findByText("DevSync App");
    await user.click(screen.getByRole("button", { name: /Members/i }));

    expect(await screen.findByText("Rahul Sharma")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Member actions" })).not.toBeInTheDocument();
    expect(screen.queryByText("Promote to Owner")).not.toBeInTheDocument();
  });

  it("removes a member after confirming in the modal", async () => {
    const user = userEvent.setup({ delay: null });
    mocks.removeMember.mockResolvedValue(undefined);
    renderWorkspace();

    await screen.findByText("DevSync App");
    await user.click(screen.getByRole("button", { name: /Members/i }));

    await user.click(await screen.findByRole("button", { name: "Member actions" }));
    await user.click(screen.getByText("Remove from Project"));

    // Confirmation modal matches the spec copy.
    expect(screen.getByText("Remove member?")).toBeInTheDocument();
    expect(
      screen.getByText(/Are you sure you want to remove @rahul from this project\?/)
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Remove Member/i }));
    await waitFor(() => expect(mocks.removeMember).toHaveBeenCalledWith("p1", "u2"));
    await waitFor(() => expect(mocks.getProject).toHaveBeenCalled());
  });

  it("cancelling the remove modal does not remove the member", async () => {
    const user = userEvent.setup({ delay: null });
    renderWorkspace();

    await screen.findByText("DevSync App");
    await user.click(screen.getByRole("button", { name: /Members/i }));

    await user.click(await screen.findByRole("button", { name: "Member actions" }));
    await user.click(screen.getByText("Remove from Project"));
    await user.click(screen.getByRole("button", { name: /Cancel/i }));

    expect(mocks.removeMember).not.toHaveBeenCalled();
  });

  it("transfers ownership after confirming in the modal", async () => {
    const user = userEvent.setup({ delay: null });
    mocks.transferOwnership.mockResolvedValue(projectFixture({ ownerId: "u2", currentUserRole: "MEMBER" }));
    renderWorkspace();

    await screen.findByText("DevSync App");
    await user.click(screen.getByRole("button", { name: /Members/i }));

    await user.click(await screen.findByRole("button", { name: "Member actions" }));
    await user.click(screen.getByText("Promote to Owner"));

    // Confirmation modal matches the spec copy and names the chosen member.
    expect(screen.getByText("Transfer project ownership?")).toBeInTheDocument();
    expect(
      screen.getByText(/@rahul will become the new project owner\. You will lose owner permissions\./)
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Transfer Ownership/i }));
    await waitFor(() => expect(mocks.transferOwnership).toHaveBeenCalledWith("p1", "u2"));
  });

  it("shows a user-friendly error when removing a member fails", async () => {
    const user = userEvent.setup({ delay: null });
    // Empty message → the UI falls back to its friendly copy instead of a raw error.
    mocks.removeMember.mockRejectedValue(new Error());
    renderWorkspace();

    await screen.findByText("DevSync App");
    await user.click(screen.getByRole("button", { name: /Members/i }));

    await user.click(await screen.findByRole("button", { name: "Member actions" }));
    await user.click(screen.getByText("Remove from Project"));
    await user.click(screen.getByRole("button", { name: /Remove Member/i }));

    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith(
        expect.stringContaining("Failed to remove member")
      )
    );
  });
});
