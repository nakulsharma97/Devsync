import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import TestimonialsSection from "./TestimonialsSection";
import type { PublicReviewsResponse } from "@/services/landingService";

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: mocks.useAuth,
}));

const sampleResponse: PublicReviewsResponse = {
  featured: [
    {
      id: "r1",
      rating: 5,
      title: "Loving it",
      comment: "Smooth collaboration experience.",
      category: "OVERALL_EXPERIENCE",
      displayName: "Real Person",
      username: "realperson",
      avatarUrl: null,
      jobTitle: "Backend Engineer",
      company: "Acme",
      createdAt: "2026-07-01T00:00:00Z",
    },
  ],
  reviews: [
    {
      id: "r2",
      rating: 4,
      title: null,
      comment: "Kanban boards work well.",
      category: "KANBAN",
      displayName: "Another Dev",
      username: "anotherdev",
      avatarUrl: null,
      jobTitle: null,
      company: null,
      createdAt: "2026-07-02T00:00:00Z",
    },
  ],
  summary: {
    averageRating: 4.5,
    totalReviews: 2,
    distribution: { "1": 0, "2": 0, "3": 0, "4": 1, "5": 1 },
  },
};

function mockAuth(authenticated = true) {
  mocks.useAuth.mockReturnValue({
    user: authenticated
      ? { id: "u1", email: "me@test.com", fullName: "Me", username: "me", avatarUrl: null, role: "USER" }
      : null,
    isAuthenticated: authenticated,
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

function renderSection(reviews: PublicReviewsResponse | null) {
  return render(
    <MemoryRouter>
      <TestimonialsSection reviews={reviews} />
    </MemoryRouter>
  );
}

describe("TestimonialsSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth();
  });

  it("renders approved reviews with name, rating and title", () => {
    renderSection(sampleResponse);

    expect(screen.getByText("Real Person")).toBeInTheDocument();
    expect(screen.getByText(/Smooth collaboration experience/)).toBeInTheDocument();
    expect(screen.getByText("Loving it")).toBeInTheDocument();
    // Only profile info the user actually provided:
    expect(screen.getByText("Backend Engineer, Acme")).toBeInTheDocument();
    // The second review has no title/company — those stay absent.
    expect(screen.getByText(/Kanban boards work well/)).toBeInTheDocument();
    expect(screen.queryByText(/CEO|CTO|Founder/i)).not.toBeInTheDocument();
  });

  it("shows the real average rating and review count", () => {
    renderSection(sampleResponse);
    expect(screen.getByText("4.5")).toBeInTheDocument();
    expect(screen.getByText(/Based on 2 approved reviews/)).toBeInTheDocument();
  });

  it("shows an honest empty state when there are no approved reviews", () => {
    renderSection({
      featured: [],
      reviews: [],
      summary: { averageRating: 0, totalReviews: 0, distribution: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 } },
    });

    expect(screen.getByText("Your feedback can be the first")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /share your feedback/i })).toBeInTheDocument();
    expect(screen.queryByText(/stripe|vercel|railway/i)).not.toBeInTheDocument();
  });

  it("never fabricates a rating when reviews are still loading", () => {
    renderSection(null);
    expect(screen.queryByText(/based on/i)).not.toBeInTheDocument();
  });
});
