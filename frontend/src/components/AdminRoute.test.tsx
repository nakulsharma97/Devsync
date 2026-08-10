import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { AdminRoute } from "./AdminRoute";
import type { AuthResponse } from "@/services/authService";

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: mocks.useAuth,
}));

type MockAuth = {
  user: AuthResponse["user"] | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
};

function mockAuth(auth: MockAuth) {
  mocks.useAuth.mockReturnValue({
    ...auth,
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

function adminUser(role: "ADMIN" | "USER") {
  return {
    id: "u1",
    email: "dev@test.com",
    fullName: "Dev User",
    username: "dev",
    avatarUrl: null,
    role,
  };
}

function renderAtAdminRoute() {
  return render(
    <MemoryRouter initialEntries={["/admin/dashboard"]}>
      <Routes>
        <Route
          path="/admin/dashboard"
          element={
            <AdminRoute>
              <div>ADMIN CONTENT</div>
            </AdminRoute>
          }
        />
        <Route path="/dashboard" element={<div>USER DASHBOARD</div>} />
        <Route path="/auth" element={<div>AUTH PAGE</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("AdminRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders admin content for an ADMIN user", async () => {
    mockAuth({
      user: adminUser("ADMIN"),
      isLoading: false,
      isAuthenticated: true,
      isAdmin: true,
    });

    renderAtAdminRoute();

    expect(await screen.findByText("ADMIN CONTENT")).toBeInTheDocument();
    expect(screen.queryByText("USER DASHBOARD")).not.toBeInTheDocument();
  });

  it("redirects a normal USER to /dashboard", async () => {
    mockAuth({
      user: adminUser("USER"),
      isLoading: false,
      isAuthenticated: true,
      isAdmin: false,
    });

    renderAtAdminRoute();

    expect(await screen.findByText("USER DASHBOARD")).toBeInTheDocument();
    expect(screen.queryByText("ADMIN CONTENT")).not.toBeInTheDocument();
  });

  it("redirects unauthenticated users to /auth", async () => {
    mockAuth({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      isAdmin: false,
    });

    renderAtAdminRoute();

    expect(await screen.findByText("AUTH PAGE")).toBeInTheDocument();
    expect(screen.queryByText("ADMIN CONTENT")).not.toBeInTheDocument();
  });

  it("shows a loader while auth is loading and never renders admin content", () => {
    mockAuth({
      user: null,
      isLoading: true,
      isAuthenticated: false,
      isAdmin: false,
    });

    renderAtAdminRoute();

    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(screen.queryByText("ADMIN CONTENT")).not.toBeInTheDocument();
    expect(screen.queryByText("USER DASHBOARD")).not.toBeInTheDocument();
    expect(screen.queryByText("AUTH PAGE")).not.toBeInTheDocument();
  });
});
