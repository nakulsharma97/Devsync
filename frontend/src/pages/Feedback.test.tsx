import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { Toaster } from "@/components/ui/sonner";
import Feedback from "./Feedback";

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  getMyReview: vi.fn(),
  getMyFeedback: vi.fn(),
  submitReview: vi.fn(),
  updateMyReview: vi.fn(),
  submitFeedback: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: mocks.useAuth,
}));

vi.mock("@/services/reviewService", () => ({
  reviewService: {
    getMyReview: mocks.getMyReview,
    getMyFeedback: mocks.getMyFeedback,
    submitReview: mocks.submitReview,
    updateMyReview: mocks.updateMyReview,
    submitFeedback: mocks.submitFeedback,
  },
}));

function mockAuth() {
  mocks.useAuth.mockReturnValue({
    user: {
      id: "u1",
      email: "me@test.com",
      fullName: "Me",
      username: "me",
      avatarUrl: null,
      role: "USER",
    },
    isAuthenticated: true,
    isAdmin: false,
    isLoading: false,
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
      <Feedback />
      <Toaster />
    </MemoryRouter>
  );
}

describe("Feedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth();
    mocks.getMyReview.mockResolvedValue(null);
    mocks.getMyFeedback.mockResolvedValue([]);
  });

  it("shows the review form when the user has no review yet", async () => {
    renderPage();

    expect(await screen.findByRole("button", { name: /submit review/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/review \*/i)).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "Review rating" })).toBeInTheDocument();
  });

  it("shows the existing review with an Edit button instead of a second form", async () => {
    mocks.getMyReview.mockResolvedValue({
      id: "r1",
      rating: 5,
      title: "Nice",
      comment: "Love it.",
      category: "OVERALL_EXPERIENCE",
      status: "APPROVED",
      featured: false,
      createdAt: "2026-07-01T00:00:00Z",
      updatedAt: "2026-07-01T00:00:00Z",
    });

    renderPage();

    expect(await screen.findByText(/Love it\./)).toBeInTheDocument();
    expect(screen.getByText("Published")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /edit review/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /submit review/i })).not.toBeInTheDocument();
  });

  it("submits a valid review to the API", async () => {
    mocks.submitReview.mockResolvedValue({
      id: "r2",
      rating: 4,
      title: "Solid",
      comment: "Great for teams.",
      category: "OVERALL_EXPERIENCE",
      status: "PENDING",
      featured: false,
      createdAt: "2026-07-02T00:00:00Z",
      updatedAt: "2026-07-02T00:00:00Z",
    });
    const user = userEvent.setup();

    renderPage();
    await screen.findByRole("button", { name: /submit review/i });

    await user.click(screen.getByRole("radio", { name: /review rating: 4 stars/i }));
    await user.type(screen.getByLabelText(/review \*/i), "Great for teams.");
    await user.click(screen.getByRole("button", { name: /submit review/i }));

    await waitFor(() => {
      expect(mocks.submitReview).toHaveBeenCalledWith(
        expect.objectContaining({ rating: 4, comment: "Great for teams." })
      );
    });
    expect(await screen.findByText(/appear on the landing page once approved/i)).toBeInTheDocument();
  });

  it("blocks empty review submissions with a validation message", async () => {
    const user = userEvent.setup();

    renderPage();
    await screen.findByRole("button", { name: /submit review/i });

    await user.click(screen.getByRole("button", { name: /submit review/i }));

    expect(await screen.findByText(/please select a rating/i)).toBeInTheDocument();
    expect(mocks.submitReview).not.toHaveBeenCalled();
  });

  it("submits private feedback", async () => {
    mocks.submitFeedback.mockResolvedValue({
      id: "f1",
      category: "BUG",
      message: "Broken on mobile.",
      rating: null,
      status: "OPEN",
      createdAt: "2026-07-03T00:00:00Z",
      updatedAt: "2026-07-03T00:00:00Z",
    });
    const user = userEvent.setup();

    renderPage();
    await screen.findByRole("button", { name: /submit review/i });

    await user.type(screen.getByLabelText(/message \*/i), "Broken on mobile.");
    await user.click(screen.getByRole("button", { name: /submit feedback/i }));

    await waitFor(() => {
      expect(mocks.submitFeedback).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Broken on mobile." })
      );
    });
  });
});
