import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import BoardPage from "./BoardPage";
import type { BoardDto, TaskDto } from "@/services/boardService";
import type { ProjectDto } from "@/services/projectService";

const mocks = vi.hoisted(() => ({
  getProjectBoard: vi.fn(),
  createBoard: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  updateTaskPosition: vi.fn(),
  deleteTask: vi.fn(),
  addDependency: vi.fn(),
  removeDependency: vi.fn(),
  calendarTasks: vi.fn(),
  getProject: vi.fn(),
}));

vi.mock("@/services/boardService", () => ({
  boardService: {
    getBoard: vi.fn(),
    getProjectBoard: mocks.getProjectBoard,
    createBoard: mocks.createBoard,
    createTask: mocks.createTask,
    updateTask: mocks.updateTask,
    updateTaskPosition: mocks.updateTaskPosition,
    deleteTask: mocks.deleteTask,
    addDependency: mocks.addDependency,
    removeDependency: mocks.removeDependency,
    calendarTasks: mocks.calendarTasks,
    startTask: vi.fn(),
    createBranch: vi.fn(),
    createPullRequest: vi.fn(),
    refreshPullRequest: vi.fn(),
    approvePullRequest: vi.fn(),
    requestChanges: vi.fn(),
    mergePullRequest: vi.fn(),
  },
}));

vi.mock("@/services/projectService", () => ({
  projectService: {
    getProject: mocks.getProject,
  },
}));

vi.mock("sonner", () => ({
  toast: vi.fn(),
}));

// GitHubSection hits real APIs; the calendar tests never use it, stub it out.
vi.mock("@/components/GitHubSection", () => ({
  GitHubSection: () => null,
}));

function taskFixture(overrides: Partial<TaskDto> = {}): TaskDto {
  return {
    id: "t1",
    title: "Ship calendar",
    description: null,
    columnId: "col-1",
    columnName: "In Progress",
    position: 0,
    assigneeId: null,
    assigneeName: null,
    assigneeAvatar: null,
    priority: "MEDIUM",
    dueDate: null,
    labels: [],
    createdAt: "2026-08-01T10:00:00Z",
    ...overrides,
  };
}

function boardFixture(tasks: TaskDto[] = []): BoardDto {
  return {
    id: "b1",
    name: "Sprint Board",
    projectId: "p1",
    description: null,
    columns: [
      { id: "col-1", name: "In Progress", position: 0, color: null, tasks },
    ],
    createdAt: "2026-08-01T10:00:00Z",
  };
}

function projectFixture(): ProjectDto {
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
    memberCount: 1,
    members: [{ id: "m1", userId: "u1", role: "OWNER", fullName: "Buffy Test", avatarUrl: null }],
    createdAt: "2026-08-01T00:00:00Z",
    updatedAt: "2026-08-01T00:00:00Z",
  };
}

function renderBoardPage() {
  return render(
    <MemoryRouter initialEntries={["/projects/p1"]}>
      <Routes>
        <Route path="/projects/:projectId" element={<BoardPage />} />
      </Routes>
    </MemoryRouter>
  );
}

/** A due date in the current month at local noon, so the calendar groups it on a visible day. */
function dueInCurrentMonth(day: number): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), day, 12, 0, 0).toISOString();
}

describe("BoardPage calendar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getProjectBoard.mockResolvedValue(boardFixture());
    mocks.getProject.mockResolvedValue(projectFixture());
    mocks.calendarTasks.mockResolvedValue([]);
  });

  it("renders board tasks that have a due date on the calendar", async () => {
    const user = userEvent.setup({ delay: null });
    const due = dueInCurrentMonth(15);
    mocks.calendarTasks.mockResolvedValue([
      taskFixture({ id: "t1", title: "Calendar Task", dueDate: due, priority: "HIGH" }),
    ]);
    renderBoardPage();

    await screen.findByText("Sprint Board");
    await user.click(screen.getByRole("button", { name: /Calendar/i }));

    expect(await screen.findByText("Calendar Task")).toBeInTheDocument();
    // Status renders alongside the title (uppercase styling, original casing in DOM).
    expect(screen.getByText(/In Progress/i)).toBeInTheDocument();
  });

  it("does not render tasks without a due date on the calendar", async () => {
    const user = userEvent.setup({ delay: null });
    // The board has a task, but the calendar feed returns nothing due.
    mocks.getProjectBoard.mockResolvedValue(boardFixture([taskFixture({ id: "t1", title: "No Due Date" })]));
    renderBoardPage();

    await screen.findByText("Sprint Board");
    await user.click(screen.getByRole("button", { name: /Calendar/i }));

    expect(
      await screen.findByText(/No tasks scheduled for this period/i)
    ).toBeInTheDocument();
    expect(screen.queryByText("No Due Date")).not.toBeInTheDocument();
  });

  it("shows the empty state when nothing is scheduled for the period", async () => {
    const user = userEvent.setup({ delay: null });
    renderBoardPage();

    await screen.findByText("Sprint Board");
    await user.click(screen.getByRole("button", { name: /Calendar/i }));

    expect(
      await screen.findByText(/No tasks scheduled for this period/i)
    ).toBeInTheDocument();
  });

  it("scopes the calendar feed to the current project", async () => {
    const user = userEvent.setup({ delay: null });
    renderBoardPage();

    await screen.findByText("Sprint Board");
    await user.click(screen.getByRole("button", { name: /Calendar/i }));

    await waitFor(() => expect(mocks.calendarTasks).toHaveBeenCalledTimes(1));
    const [projectId, from, to] = mocks.calendarTasks.mock.calls[0];
    expect(projectId).toBe("p1");
    // Valid ISO-8601 instants that the backend can parse with Instant.parse.
    expect(new Date(from).toString()).not.toBe("Invalid Date");
    expect(new Date(to).toString()).not.toBe("Invalid Date");
    expect(new Date(to).getTime()).toBeGreaterThanOrEqual(new Date(from).getTime());
  });

  it("opens the task detail dialog when a calendar chip is clicked", async () => {
    const user = userEvent.setup({ delay: null });
    const due = dueInCurrentMonth(10);
    mocks.calendarTasks.mockResolvedValue([
      taskFixture({ id: "t1", title: "Clickable Task", dueDate: due }),
    ]);
    renderBoardPage();

    await screen.findByText("Sprint Board");
    await user.click(screen.getByRole("button", { name: /Calendar/i }));

    const chip = await screen.findByRole("button", { name: /Clickable Task/i });
    await user.click(chip);

    expect(await screen.findByDisplayValue("Clickable Task")).toBeInTheDocument();
  });

  it("provides previous/next month and Today navigation", async () => {
    const user = userEvent.setup({ delay: null });
    renderBoardPage();

    await screen.findByText("Sprint Board");
    await user.click(screen.getByRole("button", { name: /Calendar/i }));

    expect(screen.getByRole("button", { name: /Previous month/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Next month/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Today$/i })).toBeInTheDocument();
  });

  it("refetches the calendar after a task mutation", async () => {
    const user = userEvent.setup({ delay: null });
    const due = dueInCurrentMonth(5);
    // The calendar feed reflects created tasks, like the real backend would.
    let feedTasks: TaskDto[] = [
      taskFixture({ id: "t1", title: "Mutation Task", dueDate: due }),
    ];
    mocks.calendarTasks.mockImplementation(() => Promise.resolve([...feedTasks]));
    mocks.createTask.mockImplementation(async (data) => {
      const created = taskFixture({ id: "t2", title: data.title, dueDate: data.dueDate ?? null });
      feedTasks = [...feedTasks, created];
      return created;
    });
    renderBoardPage();

    await screen.findByText("Sprint Board");
    await user.click(screen.getByRole("button", { name: /Calendar/i }));
    expect(await screen.findByText("Mutation Task")).toBeInTheDocument();

    // Add a task with a due date from the board view, then reopen the calendar.
    await user.click(screen.getByRole("button", { name: /^Board$/i }));
    await user.click(screen.getByRole("button", { name: "Add task to In Progress" }));
    await user.type(screen.getByPlaceholderText("Task title"), "New Task");
    const now = new Date();
    const ymd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-20`;
    fireEvent.change(screen.getByLabelText(/Due date/i), { target: { value: ymd } });
    await user.click(screen.getByRole("button", { name: /Add Task/i }));
    await user.click(screen.getByRole("button", { name: /Calendar/i }));

    // Creating a task bumps the refresh key, so the calendar feed runs again
    // and the newly created task is visible.
    await waitFor(() => expect(mocks.calendarTasks.mock.calls.length).toBeGreaterThanOrEqual(2));
    expect(await screen.findByText("New Task")).toBeInTheDocument();
  });
});
