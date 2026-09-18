import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "./AuthContext";

const authMocks = vi.hoisted(() => ({
  getStoredUser: vi.fn(),
  getMe: vi.fn(),
  clearSession: vi.fn(),
  saveSession: vi.fn(),
  login: vi.fn(),
  forgotPassword: vi.fn(),
  loginWithOAuth: vi.fn(),
  initiateRegistration: vi.fn(),
  verifyRegistration: vi.fn(),
  resendRegistrationOtp: vi.fn(),
  // The service-level OTP verify (login codes) — distinct from the context's verifyOtp().
  verifyLoginOtp: vi.fn(),
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
    forgotPassword: authMocks.forgotPassword,
    loginWithOAuth: authMocks.loginWithOAuth,
    initiateRegistration: authMocks.initiateRegistration,
    verifyRegistration: authMocks.verifyRegistration,
    resendRegistrationOtp: authMocks.resendRegistrationOtp,
    verifyOtp: authMocks.verifyLoginOtp,
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

  // The registration flow is driven by Auth.tsx, which calls register() to send the
  // code and verifyOtp() to confirm it. These tests pin that contract so the two
  // cannot drift apart again (they had: the context exposed neither function).
  describe("registration and OTP verification", () => {
    function signedIn(username: string) {
      return {
        accessToken: "token",
        tokenType: "Bearer",
        user: {
          id: "u9",
          email: "new@test.com",
          fullName: username,
          username,
          avatarUrl: null,
          role: "USER",
        },
      };
    }

    function ActionsConsumer() {
      const { user, error, register, verifyOtp, resendOtp } = useAuth();
      return (
        <div>
          <span data-testid="username">{user?.username ?? "none"}</span>
          <span data-testid="error">{error ?? "no-error"}</span>
          <button
            onClick={() => {
              register("new@test.com", "secret123", "New User", "newuser").catch(() => {});
            }}
          >
            register
          </button>
          <button
            onClick={() => {
              verifyOtp("new@test.com", "123456", "registration").catch(() => {});
            }}
          >
            verify-registration
          </button>
          <button
            onClick={() => {
              verifyOtp("dev@test.com", "654321", "login").catch(() => {});
            }}
          >
            verify-login
          </button>
          <button
            onClick={() => {
              resendOtp("new@test.com").catch(() => {});
            }}
          >
            resend
          </button>
        </div>
      );
    }

    function renderActions() {
      authMocks.getStoredUser.mockReturnValue(null);
      authMocks.getMe.mockRejectedValue(new Error("Unauthorized"));
      return render(
        <AuthProvider>
          <ActionsConsumer />
        </AuthProvider>
      );
    }

    async function click(name: string) {
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name }));
      });
    }

    it("register() starts the pending registration and sends the code", async () => {
      authMocks.initiateRegistration.mockResolvedValue(undefined);
      renderActions();

      await click("register");

      expect(authMocks.initiateRegistration).toHaveBeenCalledWith(
        "new@test.com",
        "secret123",
        "New User",
        "newuser"
      );
      // Sending a code must NOT sign the user in — the account does not exist yet.
      expect(authMocks.saveSession).not.toHaveBeenCalled();
      expect(screen.getByTestId("username")).toHaveTextContent("none");
    });

    it("verifies a registration code against /auth/register/verify and opens the session", async () => {
      authMocks.verifyRegistration.mockResolvedValue(signedIn("newuser"));
      renderActions();

      await click("verify-registration");

      expect(authMocks.verifyRegistration).toHaveBeenCalledWith("new@test.com", "123456");
      expect(authMocks.verifyLoginOtp).not.toHaveBeenCalled();
      expect(authMocks.saveSession).toHaveBeenCalled();
      expect(screen.getByTestId("username")).toHaveTextContent("newuser");
    });

    it("verifies a login code against /auth/otp/verify, never the registration endpoint", async () => {
      authMocks.verifyLoginOtp.mockResolvedValue(signedIn("dev"));
      renderActions();

      await click("verify-login");

      expect(authMocks.verifyLoginOtp).toHaveBeenCalledWith("dev@test.com", "654321");
      expect(authMocks.verifyRegistration).not.toHaveBeenCalled();
      expect(screen.getByTestId("username")).toHaveTextContent("dev");
    });

    it("surfaces a failed verification and stays signed out", async () => {
      authMocks.verifyRegistration.mockRejectedValue(new Error("Invalid code"));
      renderActions();

      await click("verify-registration");

      await waitFor(() => expect(screen.getByTestId("error")).toHaveTextContent("Invalid code"));
      expect(authMocks.saveSession).not.toHaveBeenCalled();
      expect(screen.getByTestId("username")).toHaveTextContent("none");
    });

    it("resendOtp() resends the registration code", async () => {
      authMocks.resendRegistrationOtp.mockResolvedValue(undefined);
      renderActions();

      await click("resend");

      expect(authMocks.resendRegistrationOtp).toHaveBeenCalledWith("new@test.com");
    });
  });
});
