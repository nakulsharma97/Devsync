import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { UserRoute } from "./UserRoute";

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: mocks.useAuth,
}));

function mockAuth(auth: {
  role: "ADMIN" | "USER" | null;
  isLoading?: boolean;
  isAuthenticated?: boolean;
}) {
  mocks.useAuth.mockReturnValue({
    user: auth.role
      ? {
          id: "u1",
          email: "dev@test.com",
          fullName: "Dev User",
          username: "dev",
          avatarUrl: null,
          role: auth.role,
        }
      : null,
    isLoading: auth.isLoading ?? false,
    isAuthenticated: auth.isAuthenticated ?? auth.role !== null,
    isAdmin: auth.role === "ADMIN",
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

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/dashboard"
          element={
            <UserRoute>
              <div>USER APP</div>
            </UserRoute>
          }
        />
        <Route path="/projects" element={<div>PROJECTS PAGE</div>} />
        <Route path="/admin/dashboard" element={<div>ADMIN DASHBOARD</div>} />
        <Route path="/auth" element={<div>AUTH PAGE</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("UserRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the user app for a USER account", async () => {
    mockAuth({ role: "USER" });
    renderAt("/dashboard");

    expect(await screen.findByText("USER APP")).toBeInTheDocument();
  });

  it("redirects an ADMIN account to the admin dashboard", async () => {
    mockAuth({ role: "ADMIN" });
    renderAt("/dashboard");

    expect(await screen.findByText("ADMIN DASHBOARD")).toBeInTheDocument();
    expect(screen.queryByText("USER APP")).not.toBeInTheDocument();
  });

  it("redirects unauthenticated visitors to /auth", async () => {
    mockAuth({ role: null });
    renderAt("/dashboard");

    expect(await screen.findByText("AUTH PAGE")).toBeInTheDocument();
    expect(screen.queryByText("USER APP")).not.toBeInTheDocument();
  });

  it("shows a loader while auth is loading and never renders the app", () => {
    mockAuth({ role: null, isLoading: true, isAuthenticated: false });
    renderAt("/dashboard");

    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(screen.queryByText("USER APP")).not.toBeInTheDocument();
    expect(screen.queryByText("ADMIN DASHBOARD")).not.toBeInTheDocument();
    expect(screen.queryByText("AUTH PAGE")).not.toBeInTheDocument();
  });
});
