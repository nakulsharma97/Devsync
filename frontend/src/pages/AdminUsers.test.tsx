import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import AdminUsers from "./AdminUsers";
import type { AdminUserListItem, PageResponse } from "@/services/adminService";

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  getUsersPage: vi.fn(),
  getUserDetail: vi.fn(),
  updateUserRole: vi.fn(),
  setUserBlocked: vi.fn(),
  deleteUser: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: mocks.useAuth,
}));

vi.mock("@/services/adminService", () => ({
  adminService: {
    getUsersPage: mocks.getUsersPage,
    getUserDetail: mocks.getUserDetail,
    updateUserRole: mocks.updateUserRole,
    setUserBlocked: mocks.setUserBlocked,
    deleteUser: mocks.deleteUser,
  },
}));

const sampleUser: AdminUserListItem = {
  id: "u1",
  fullName: "Dev User",
  username: "dev",
  email: "dev@test.com",
  role: "USER",
  status: "ACTIVE",
  createdAt: "2026-01-01T00:00:00Z",
  lastLoginAt: "2026-06-01T00:00:00Z",
};

const samplePage: PageResponse<AdminUserListItem> = {
  content: [sampleUser],
  page: 0,
  size: 10,
  totalElements: 1,
  totalPages: 1,
  last: true,
};

function mockAdminUser() {
  mocks.useAuth.mockReturnValue({
    user: {
      id: "admin-1",
      email: "admin@test.com",
      fullName: "Admin One",
      username: "admin",
      avatarUrl: null,
      role: "ADMIN",
    },
    isLoading: false,
    isAuthenticated: true,
    isAdmin: true,
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
      <AdminUsers />
    </MemoryRouter>
  );
}

describe("AdminUsers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminUser();
  });

  it("renders user rows with role, status and dates", async () => {
    mocks.getUsersPage.mockResolvedValue(samplePage);

    renderPage();

    expect(await screen.findByText("Dev User")).toBeInTheDocument();
    expect(screen.getByText("dev@test.com")).toBeInTheDocument();
    expect(screen.getAllByText("USER").length).toBeGreaterThan(0);
    expect(screen.getAllByText("ACTIVE").length).toBeGreaterThan(0);
    // Created + Last Login columns render dates (not the em-dash placeholder)
    expect(screen.getAllByText(/2026/).length).toBeGreaterThanOrEqual(2);
  });

  it("passes the search term to the server-side query", async () => {
    mocks.getUsersPage.mockResolvedValue(samplePage);
    const user = userEvent.setup();

    renderPage();
    await screen.findByText("Dev User");

    await user.type(screen.getByPlaceholderText(/search by name/i), "alice");
    await user.click(screen.getByRole("button", { name: "Search" }));

    await waitFor(() => {
      const calls = mocks.getUsersPage.mock.calls;
      const lastCall = calls[calls.length - 1]?.[0];
      expect(lastCall?.search).toBe("alice");
    });
  });

  it("passes date range filters and sorting to the server-side query", async () => {
    mocks.getUsersPage.mockResolvedValue(samplePage);
    const user = userEvent.setup();

    renderPage();
    await screen.findByText("Dev User");

    await user.click(screen.getByRole("button", { name: "Sort by Last Login" }));

    await waitFor(() => {
      const calls = mocks.getUsersPage.mock.calls;
      const lastCall = calls[calls.length - 1]?.[0];
      expect(lastCall?.sortBy).toBe("lastLoginAt");
      expect(lastCall?.sortDir).toBe("desc");
    });

    await user.type(screen.getByLabelText("Created from"), "2026-01-01");
    await user.type(screen.getByLabelText("Created to"), "2026-01-31");

    await waitFor(() => {
      const calls = mocks.getUsersPage.mock.calls;
      const lastCall = calls[calls.length - 1]?.[0];
      expect(lastCall?.from).toBe("2026-01-01");
      expect(lastCall?.to).toBe("2026-01-31");
    });
  });

  it("shows an empty state when no users match", async () => {
    mocks.getUsersPage.mockResolvedValue({
      content: [],
      page: 0,
      size: 10,
      totalElements: 0,
      totalPages: 0,
      last: true,
    });

    renderPage();

    expect(await screen.findByText("No users found")).toBeInTheDocument();
  });

  it("shows an error state with retry when the request fails", async () => {
    mocks.getUsersPage.mockRejectedValue(new Error("boom"));

    renderPage();

    expect(await screen.findByText("Failed to load users. Please try again.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });
});
