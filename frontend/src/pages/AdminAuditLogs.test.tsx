import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import AdminAuditLogs, { ACTION_OPTIONS } from "./AdminAuditLogs";
import type { AuditLogItem, PageResponse } from "@/services/adminService";

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  getAuditLogs: vi.fn(),
  getAuditLogDetail: vi.fn(),
  exportAuditLogsCsv: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: mocks.useAuth,
}));

vi.mock("@/services/adminService", () => ({
  adminService: {
    getAuditLogs: mocks.getAuditLogs,
    getAuditLogDetail: mocks.getAuditLogDetail,
    exportAuditLogsCsv: mocks.exportAuditLogsCsv,
  },
}));

const sampleLog: AuditLogItem = {
  id: "l1",
  performedBy: "admin-1",
  performedByName: "Admin One",
  targetUserId: "u1",
  targetUserName: "Dev User",
  action: "USER_BLOCKED",
  status: "SUCCESS",
  ipAddress: "127.0.0.1",
  device: "Desktop",
  browser: "Chrome",
  details: "Blocked user u1",
  createdAt: "2026-06-01T12:00:00Z",
};

const samplePage: PageResponse<AuditLogItem> = {
  content: [sampleLog],
  page: 0,
  size: 10,
  totalElements: 1,
  totalPages: 1,
  last: true,
};

function mockAdminUser() {
  mocks.useAuth.mockReturnValue({
    user: { id: "admin-1", email: "admin@test.com", fullName: "Admin One", username: "admin", avatarUrl: null, role: "ADMIN" },
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
      <AdminAuditLogs />
    </MemoryRouter>
  );
}

describe("AdminAuditLogs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAdminUser();
  });

  it("renders audit rows with action, actor, target, status and IP", async () => {
    mocks.getAuditLogs.mockResolvedValue(samplePage);

    renderPage();

    expect(await screen.findByText("User Blocked")).toBeInTheDocument();
    expect(screen.getByText("Admin One")).toBeInTheDocument();
    expect(screen.getByText("Dev User")).toBeInTheDocument();
    expect(screen.getByText("127.0.0.1")).toBeInTheDocument();
  });

  it("passes date range filters to the server-side query", async () => {
    mocks.getAuditLogs.mockResolvedValue(samplePage);
    const user = userEvent.setup();

    renderPage();
    await screen.findByText("User Blocked");

    await user.type(screen.getByLabelText("From date"), "2026-01-01");
    await user.type(screen.getByLabelText("To date"), "2026-01-31");

    await waitFor(() => {
      const calls = mocks.getAuditLogs.mock.calls;
      const lastCall = calls[calls.length - 1]?.[0];
      expect(lastCall?.from).toBe("2026-01-01T00:00:00.000Z");
      expect(lastCall?.to).toBe("2026-01-31T00:00:00.000Z");
    });
  });

  it("action filter options are in sync with the backend AuditAction enum", () => {
    for (const action of [
      "REGISTER",
      "LOGIN_SUCCESS",
      "LOGIN_FAILURE",
      "LOGOUT",
      "JWT_REFRESH",
      "OTP_VERIFIED",
      "OAUTH_LOGIN",
      "ROLE_CHANGED",
      "USER_BLOCKED",
      "USER_UNBLOCKED",
      "USER_DELETED",
      "PROJECT_ARCHIVED",
      "PROJECT_RESTORED",
      "PROJECT_DELETED",
      "VISIBILITY_CHANGED",
      "MODERATION_ACTION",
    ]) {
      expect(ACTION_OPTIONS).toContain(action);
    }
  });

  it("sends the user filter as both admin and target user", async () => {
    mocks.getAuditLogs.mockResolvedValue(samplePage);
    const user = userEvent.setup();

    renderPage();
    await screen.findByText("User Blocked");

    await user.type(screen.getByPlaceholderText(/filter by user or admin/i), "u1");
    await user.click(screen.getByRole("button", { name: "Apply" }));

    await waitFor(() => {
      const calls = mocks.getAuditLogs.mock.calls;
      const lastCall = calls[calls.length - 1]?.[0];
      expect(lastCall?.adminId).toBe("u1");
      expect(lastCall?.userId).toBe("u1");
    });
  });
});
