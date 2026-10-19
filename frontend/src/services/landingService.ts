import api from "./api";
import { billingService, type Plan } from "./billingService";

export interface PublicStats {
  users: number;
  projects: number;
  publicProjects: number;
  completedProjects: number;
  tasks: number;
  tasksCompleted: number;
  members: number;
  messages: number;
  githubRepos: number;
  reviews: number;
  averageRating: number;
}

export interface PublicReview {
  id: string;
  rating: number;
  title: string | null;
  comment: string;
  category: string;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  jobTitle: string | null;
  company: string | null;
  createdAt: string;
}

export interface RatingSummary {
  averageRating: number;
  totalReviews: number;
  distribution: Record<string, number>;
}

export interface PublicReviewsResponse {
  reviews: PublicReview[];
  featured: PublicReview[];
  summary: RatingSummary;
}

/**
 * Landing data is public, slow-moving (aggregates + approved reviews + the
 * static plan catalogue) and rendered by three separate sections. Without a
 * cache every visit to "/" — including Back/Forward and returning from
 * /auth — remounted those sections, reset them to their skeleton state and
 * fired the same three requests again. That is what made the cards appear to
 * "reload" and replay their entrance animations.
 *
 * Each entry therefore keeps one committed value plus one shared in-flight
 * promise:
 *  - `peek()` returns the last value synchronously so a remount paints the
 *    real cards immediately (no skeleton flash, no layout shift);
 *  - `get()` de-duplicates concurrent callers and serves the cached value
 *    while it is fresh;
 *  - a stale value is still returned by `peek()` for the instant paint while
 *    `get()` refreshes it in the background.
 */
const FRESH_FOR_MS = 60_000;

interface CacheEntry<T> {
  value: T;
  storedAt: number;
}

function createCachedRequest<T>(load: () => Promise<T>) {
  let entry: CacheEntry<T> | null = null;
  let inFlight: Promise<T> | null = null;

  const isFresh = () => entry !== null && Date.now() - entry.storedAt < FRESH_FOR_MS;

  return {
    /** Last known value, or null before the first successful load. */
    peek(): T | null {
      return entry ? entry.value : null;
    },
    get(): Promise<T> {
      if (inFlight) return inFlight;
      if (entry && isFresh()) return Promise.resolve(entry.value);

      inFlight = load()
        .then((value) => {
          entry = { value, storedAt: Date.now() };
          return value;
        })
        .finally(() => {
          inFlight = null;
        });
      return inFlight;
    },
    /** Test hook — drops the cache so each test starts from a clean slate. */
    clear() {
      entry = null;
      inFlight = null;
    },
  };
}

const statsRequest = createCachedRequest<PublicStats>(
  async () => (await api.get("/public/stats")).data
);

const reviewsRequest = createCachedRequest<PublicReviewsResponse>(
  async () => (await api.get("/public/reviews")).data
);

const plansRequest = createCachedRequest<Plan[]>(() => billingService.getPlans());

export const landingService = {
  getStats: (): Promise<PublicStats> => statsRequest.get(),
  peekStats: (): PublicStats | null => statsRequest.peek(),

  getReviews: (): Promise<PublicReviewsResponse> => reviewsRequest.get(),
  peekReviews: (): PublicReviewsResponse | null => reviewsRequest.peek(),

  getPlans: (): Promise<Plan[]> => plansRequest.get(),
  peekPlans: (): Plan[] | null => plansRequest.peek(),

  clearCache(): void {
    statsRequest.clear();
    reviewsRequest.clear();
    plansRequest.clear();
  },
};
