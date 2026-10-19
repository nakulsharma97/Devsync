import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
  getPlans: vi.fn(),
}));

vi.mock("./api", () => ({
  default: { get: mocks.apiGet },
}));

vi.mock("./billingService", () => ({
  billingService: { getPlans: mocks.getPlans },
}));

import { landingService, type PublicStats } from "./landingService";

const stats: PublicStats = {
  users: 3,
  projects: 2,
  publicProjects: 1,
  completedProjects: 1,
  tasks: 10,
  tasksCompleted: 4,
  members: 5,
  messages: 42,
  githubRepos: 1,
  reviews: 0,
  averageRating: 0,
};

describe("landingService cache", () => {
  beforeEach(() => {
    landingService.clearCache();
    mocks.apiGet.mockReset();
    mocks.getPlans.mockReset();
  });

  it("de-duplicates concurrent stats requests", async () => {
    mocks.apiGet.mockResolvedValue({ data: stats });

    const [a, b] = await Promise.all([landingService.getStats(), landingService.getStats()]);

    expect(a).toEqual(stats);
    expect(b).toEqual(stats);
    expect(mocks.apiGet).toHaveBeenCalledTimes(1);
  });

  it("serves the cached value to a remounting page without a second request", async () => {
    mocks.apiGet.mockResolvedValue({ data: stats });
    await landingService.getStats();

    // A remount (Back/Forward, returning from /auth) peeks synchronously so the
    // cards paint immediately instead of flashing skeletons.
    expect(landingService.peekStats()).toEqual(stats);
    await expect(landingService.getStats()).resolves.toEqual(stats);
    expect(mocks.apiGet).toHaveBeenCalledTimes(1);
  });

  it("does not cache failures, so a retry can recover", async () => {
    mocks.apiGet.mockRejectedValueOnce(new Error("offline"));
    await expect(landingService.getStats()).rejects.toThrow("offline");
    expect(landingService.peekStats()).toBeNull();

    mocks.apiGet.mockResolvedValueOnce({ data: stats });
    await expect(landingService.getStats()).resolves.toEqual(stats);
    expect(mocks.apiGet).toHaveBeenCalledTimes(2);
  });

  it("caches the public plan catalogue used by the pricing cards", async () => {
    mocks.getPlans.mockResolvedValue([
      {
        code: "FREE",
        name: "Free",
        description: "",
        priceInr: 0,
        currency: "INR",
        privateProjectLimit: 1,
        membersPerProject: 3,
        storageBytes: 0,
        advancedAnalytics: false,
        customDomain: false,
        sso: false,
        auditLevel: "NONE",
        prioritySupport: false,
      },
    ]);

    await landingService.getPlans();
    expect(landingService.peekPlans()).toHaveLength(1);
    await landingService.getPlans();
    expect(mocks.getPlans).toHaveBeenCalledTimes(1);
  });

  it("dedupes reviews and exposes them for the initial render", async () => {
    const reviews = {
      reviews: [],
      featured: [],
      summary: { averageRating: 0, totalReviews: 0, distribution: {} },
    };
    mocks.apiGet.mockResolvedValue({ data: reviews });

    expect(landingService.peekReviews()).toBeNull();
    await landingService.getReviews();
    expect(landingService.peekReviews()).toEqual(reviews);
    expect(mocks.apiGet).toHaveBeenCalledWith("/public/reviews");
  });
});
