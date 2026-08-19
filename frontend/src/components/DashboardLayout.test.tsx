import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import DashboardLayout from "./DashboardLayout";
import type { AuthResponse } from "@/services/authService";

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  getUnreadCount: vi.fn(),
  getMsgUnreadCount: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: mocks.useAuth,
}));

vi.mock("@/services/notificationService", () => ({
  notificationService: { getUnreadCount: mocks.getUnreadCount },
}));

vi.mock("@/services/conversationService", () => ({
  conversationService: { getUnreadCount: mocks.getMsgUnreadCount },
}));

// ThemeToggle lives in the topbar now; next-themes needs a provider/mock.
vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "light", setTheme: vi.fn() }),
}));

function mockAuth(role: "ADMIN" | "USER") {
  mocks.useAuth.mockReturnValue({
    user: {
      id: "u1",
      email: "dev@test.com",
      fullName: "Dev User",
      username: "dev",
      avatarUrl: null,
      role,
    } satisfies AuthResponse["user"],
    isLoading: false,
    isAuthenticated: true,
    isAdmin: role === "ADMIN",
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

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <Routes>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<div>MAIN CONTENT</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe("DashboardLayout admin navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUnreadCount.mockResolvedValue(0);
    mocks.getMsgUnreadCount.mockResolvedValue(0);
  });

  it("shows normal user navigation for USERs", () => {
    mockAuth("USER");

    renderLayout();

    // Regular nav present
    expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Projects" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Feed" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Messages" })).toBeInTheDocument();
    // No admin section
    expect(screen.queryByText("Admin")).not.toBeInTheDocument();
  });

  it("opens the mobile sidebar with normal user links", async () => {
    mockAuth("USER");
    const user = userEvent.setup();

    renderLayout();

    // Sidebar is closed initially: no overlay
    expect(screen.queryByRole("presentation")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Open menu" }));

    // Overlay appears and normal user links are reachable
    expect(screen.getByRole("presentation")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
  });

  it("closes the mobile sidebar when the close button is clicked", async () => {
    mockAuth("ADMIN");
    const user = userEvent.setup();

    renderLayout();

    await user.click(screen.getByRole("button", { name: "Open menu" }));
    expect(screen.getByRole("presentation")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close menu" }));
    expect(screen.queryByRole("presentation")).not.toBeInTheDocument();
  });

  it("shows the current page title in the header", () => {
    mockAuth("USER");

    renderLayout();

    expect(screen.getByTestId("page-title")).toHaveTextContent("Dashboard");
  });

  it("shows unread badges on Notifications and Messages for unread counts", async () => {
    mockAuth("USER");
    mocks.getUnreadCount.mockResolvedValue(4);
    mocks.getMsgUnreadCount.mockResolvedValue(2);

    renderLayout();

    // The badge appears on the sidebar nav item and the topbar bell.
    expect((await screen.findAllByText("4")).length).toBeGreaterThan(0);
    expect((await screen.findAllByText("2")).length).toBeGreaterThan(0);
  });

  it("opens the command palette from the header trigger", async () => {
    mockAuth("USER");
    const user = userEvent.setup({ delay: null });

    renderLayout();

    await user.click(screen.getByRole("button", { name: "Open search" }));

    expect(
      screen.getByPlaceholderText(/type a command or search/i)
    ).toBeInTheDocument();

    await user.type(
      screen.getByPlaceholderText(/type a command or search/i),
      "proj"
    );
    // Palette results are buttons (avoids colliding with the sidebar nav link)
    expect(screen.getByRole("button", { name: "Projects" })).toBeInTheDocument();
  });

  it("opens the command palette with the Ctrl+K shortcut", async () => {
    mockAuth("USER");

    renderLayout();

    fireEvent.keyDown(document, { key: "k", ctrlKey: true });

    expect(
      await screen.findByPlaceholderText(/type a command or search/i)
    ).toBeInTheDocument();
  });
});
