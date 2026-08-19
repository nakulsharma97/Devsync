import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { AuthProvider, useAuth } from "./AuthContext";

const authMocks = vi.hoisted(() => ({
  getStoredUser: vi.fn(),
  getMe: vi.fn(),
  clearSession: vi.fn(),
  saveSession: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  forgotPassword: vi.fn(),
  loginWithOAuth: vi.fn(),
}));

const wsMocks = vi.hoisted(() => ({
  connect: vi.fn(),
  disconnect: vi.fn(),
}));

vi.mock("@/services/authService", () => ({
  authService: {
    getStoredUser: authMocks.getStoredUser,
    getMe: authMocks.getMe,
    clearSession: authMocks.clearSession,
    saveSession: authMocks.saveSession,
    login: authMocks.login,
    register: authMocks.register,
    forgotPassword: authMocks.forgotPassword,
    loginWithOAuth: authMocks.loginWithOAuth,
  },
}));

vi.mock("@/services/websocketService", () => ({
  wsService: {
    connect: wsMocks.connect,
    disconnect: wsMocks.disconnect,
  },
}));

function userDto(role: "ADMIN" | "USER") {
  return {
    id: "u1",
    email: "dev@test.com",
    fullName: "Dev User",
    username: "dev",
    avatarUrl: null,
    role,
    bio: null,
    jobTitle: null,
    company: null,
    location: null,
    githubUrl: null,
    twitterUrl: null,
    websiteUrl: null,
    emailVerified: true,
    authProvider: "email",
    createdAt: "2026-01-01T00:00:00Z",
    lastLoginAt: null,
  };
}

function Consumer() {
  const { user, isAdmin, isLoading } = useAuth();
  if (isLoading) return <div>LOADING</div>;
  return (
    <div>
      <span data-testid="role">{user?.role ?? "none"}</span>
      <span data-testid="isAdmin">{String(isAdmin)}</span>
    </div>
  );
}

function renderProvider() {
  return render(
    <AuthProvider>
      <Consumer />
    </AuthProvider>
  );
}

describe("AuthContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // With cookie-based auth, tokens are HttpOnly. Mock getMe for authenticated state.
  });

  it("derives isAdmin=true when the authenticated user has the ADMIN role", async () => {
    authMocks.getStoredUser.mockReturnValue({ ...userDto("ADMIN"), password: "" });
    authMocks.getMe.mockResolvedValue(userDto("ADMIN"));

    renderProvider();

    expect(await screen.findByTestId("role")).toHaveTextContent("ADMIN");
    expect(screen.getByTestId("isAdmin")).toHaveTextContent("true");
  });

  it("derives isAdmin=false for a normal USER role", async () => {
    authMocks.getStoredUser.mockReturnValue({ ...userDto("USER"), password: "" });
    authMocks.getMe.mockResolvedValue(userDto("USER"));

    renderProvider();

    expect(await screen.findByTestId("role")).toHaveTextContent("USER");
    expect(screen.getByTestId("isAdmin")).toHaveTextContent("false");
  });

  it("re-fetches the authoritative role when authorization becomes stale (admin downgraded)", async () => {
    authMocks.getStoredUser.mockReturnValue({ ...userDto("ADMIN"), password: "" });
    authMocks.getMe
      .mockResolvedValueOnce(userDto("ADMIN"))
      .mockResolvedValueOnce(userDto("USER"));

    renderProvider();

    expect(await screen.findByTestId("role")).toHaveTextContent("ADMIN");
    expect(screen.getByTestId("isAdmin")).toHaveTextContent("true");

    // The backend rejects an admin API call with 403 -> api.ts dispatches this event
    act(() => {
      window.dispatchEvent(new Event("auth:authorization-changed"));
    });

    expect(await screen.findByTestId("role")).toHaveTextContent("USER");
    expect(screen.getByTestId("isAdmin")).toHaveTextContent("false");
  });

  it("clears the session when the profile can no longer be fetched", async () => {
    authMocks.getStoredUser.mockReturnValue({ ...userDto("ADMIN"), password: "" });
    authMocks.getMe.mockRejectedValue(new Error("Unauthorized"));

    renderProvider();

    expect(await screen.findByTestId("role")).toHaveTextContent("none");
    expect(screen.getByTestId("isAdmin")).toHaveTextContent("false");
    expect(authMocks.clearSession).toHaveBeenCalled();
    expect(wsMocks.disconnect).toHaveBeenCalled();
  });

  it("clears the session when getMe fails (expired cookies)", async () => {
    authMocks.getStoredUser.mockReturnValue(null);
    authMocks.getMe.mockRejectedValue(new Error("Unauthorized"));

    renderProvider();

    expect(await screen.findByTestId("role")).toHaveTextContent("none");
    expect(screen.getByTestId("isAdmin")).toHaveTextContent("false");
    expect(wsMocks.disconnect).toHaveBeenCalled();
  });
});
