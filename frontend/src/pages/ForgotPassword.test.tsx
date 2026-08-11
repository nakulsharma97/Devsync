import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import ForgotPassword from "./ForgotPassword";

const mocks = vi.hoisted(() => ({
  forgotPassword: vi.fn(),
}));

vi.mock("@/services/authService", () => ({
  authService: {
    forgotPassword: mocks.forgotPassword,
  },
}));

function renderForgotPassword() {
  return render(
    <MemoryRouter initialEntries={["/forgot-password"]}>
      <Routes>
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/auth" element={<div>AUTH PAGE</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ForgotPassword", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.forgotPassword.mockResolvedValue(undefined);
  });

  it("submits the email and shows the generic success state", async () => {
    renderForgotPassword();

    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "user@test.dev" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));

    await waitFor(() =>
      expect(mocks.forgotPassword).toHaveBeenCalledWith("user@test.dev")
    );
    expect(await screen.findByText(/check your inbox/i)).toBeInTheDocument();
    expect(screen.getByText(/expires in 15 minutes/i)).toBeInTheDocument();
  });

  it("shows the same generic success for unknown emails (no enumeration)", async () => {
    mocks.forgotPassword.mockResolvedValue(undefined);
    renderForgotPassword();

    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "ghost@test.dev" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));

    // The server always returns success — the UI never distinguishes.
    expect(await screen.findByText(/check your inbox/i)).toBeInTheDocument();
  });

  it("surfaces server errors and links back to sign in", async () => {
    mocks.forgotPassword.mockRejectedValue({
      response: { data: { message: "Too many requests" } },
    });
    renderForgotPassword();

    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "user@test.dev" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send reset link/i }));

    expect(await screen.findByText(/too many requests/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /sign in/i })).toHaveAttribute(
      "href",
      "/auth"
    );
  });

  it("disables the submit button until an email is entered", () => {
    renderForgotPassword();

    const submit = screen.getByRole("button", { name: /send reset link/i });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "user@test.dev" },
    });
    expect(submit).toBeEnabled();
  });
});
