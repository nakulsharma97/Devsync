import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import AdminLayout from "./AdminLayout";
import type { AuthResponse } from "@/services/authService";

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: mocks.useAuth,
}));

// ThemeToggle lives in the topbar now; next-themes needs a provider/mock.
vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "light", setTheme: vi.fn() }),
}));

function mockAuth(role: "ADMIN" | "USER") {
  mocks.useAuth.mockReturnValue({
    user: {
      id: "u1",
      email: "admin@test.com",
      fullName: "Admin User",
      username: "admin",
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

function renderAdminLayout() {
  return render(
    <MemoryRouter initialEntries={["/admin/dashboard"]}>
      <Routes>
        <Route element={<AdminLayout />}>
          <Route path="/admin/dashboard" element={<div>ADMIN DASHBOARD</div>} />
          <Route path="/admin/users" element={<div>ADMIN USERS</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe("AdminLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders admin navigation links", () => {
    mockAuth("ADMIN");
    renderAdminLayout();

    // Administration section
    expect(screen.getByText("Administration")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Users" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Projects" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Reports" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Billing" })).toBeInTheDocument();

    // Monitoring section
    expect(screen.getByText("Monitoring")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Activity" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Audit Logs" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Reviews" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Feedback" })).toBeInTheDocument();

    // Account section
    expect(screen.getByText("Account")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "My Profile" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Settings" })).toBeInTheDocument();

    // Switch section
    expect(screen.getByText("Switch")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open User App" })).toBeInTheDocument();
  });

  it("renders the current page title in the header", () => {
    mockAuth("ADMIN");
    renderAdminLayout();

    expect(screen.getByTestId("page-title")).toHaveTextContent("Admin Dashboard");
  });

  it("shows the page title for different admin pages", () => {
    mockAuth("ADMIN");
    render(
      <MemoryRouter initialEntries={["/admin/users"]}>
        <Routes>
          <Route element={<AdminLayout />}>
            <Route path="/admin/dashboard" element={<div>ADMIN DASHBOARD</div>} />
            <Route path="/admin/users" element={<div>ADMIN USERS</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId("page-title")).toHaveTextContent("User Management");
  });

  it("opens the mobile sidebar when the menu button is clicked", async () => {
    mockAuth("ADMIN");
    const user = userEvent.setup();

    renderAdminLayout();

    // Sidebar is closed initially: no overlay
    expect(screen.queryByRole("presentation")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Open menu" }));

    // Overlay appears and admin links are reachable in the open drawer
    expect(screen.getByRole("presentation")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
  });

  it("closes the mobile sidebar when the close button is clicked", async () => {
    mockAuth("ADMIN");
    const user = userEvent.setup();

    renderAdminLayout();

    await user.click(screen.getByRole("button", { name: "Open menu" }));
    expect(screen.getByRole("presentation")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close menu" }));
    expect(screen.queryByRole("presentation")).not.toBeInTheDocument();
  });

  it("shows the admin panel title in the sidebar", () => {
    mockAuth("ADMIN");
    renderAdminLayout();

    expect(screen.getByText("DevSync Admin")).toBeInTheDocument();
  });
});
