import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import DashboardLayout from "./DashboardLayout";
import type { AuthResponse } from "@/services/authService";

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: mocks.useAuth,
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
  });

  it("shows a separated Administration section with all admin links for ADMIN users", () => {
    mockAuth("ADMIN");

    renderLayout();

    expect(screen.getByText("Administration")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Admin Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Admin Users" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Admin Projects" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Admin Reports" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Admin Activity" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Admin Audit Logs" })).toBeInTheDocument();
    // Regular nav still present
    expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
  });

  it("never shows admin links for normal USERs", () => {
    mockAuth("USER");

    renderLayout();

    expect(screen.queryByText("Administration")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Admin Dashboard" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Admin Users" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Admin Projects" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Admin Reports" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Admin Activity" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Admin Audit Logs" })).not.toBeInTheDocument();
    // Regular nav still present
    expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
  });

  it("opens the mobile sidebar with admin links for ADMIN users", async () => {
    mockAuth("ADMIN");
    const user = userEvent.setup();

    renderLayout();

    // Sidebar is closed initially: no overlay
    expect(screen.queryByRole("presentation")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Open menu" }));

    // Overlay appears and admin links are reachable in the open drawer
    expect(screen.getByRole("presentation")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Admin Dashboard" })).toBeInTheDocument();
  });

  it("opens the mobile sidebar without admin links for normal USERs", async () => {
    mockAuth("USER");
    const user = userEvent.setup();

    renderLayout();

    await user.click(screen.getByRole("button", { name: "Open menu" }));

    expect(screen.getByRole("presentation")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Admin Dashboard" })).not.toBeInTheDocument();
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
});
