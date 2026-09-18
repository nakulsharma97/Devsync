/**
 * Route chunk prefetching.
 *
 * Every page is code-split, so the first click on a nav item pays for that
 * page's chunk (download + parse) before anything renders. Warming the chunk
 * on hover/focus — i.e. when the user has shown intent but not yet clicked —
 * makes the click resolve from the module registry instead.
 *
 * Vite turns each of these `import()` calls into a separate chunk, and React's
 * `lazy()` shares the same module registry, so a prefetched chunk is reused
 * rather than downloaded twice.
 */

export type RouteLoaders = Record<string, () => Promise<unknown>>;

/**
 * Builds a prefetcher over a route→loader map. Split out from the default
 * instance so the one-shot/retry behaviour can be tested directly instead of
 * through module mocks.
 */
export function createPrefetchRegistry(loaders: RouteLoaders) {
  const started = new Set<string>();

  return function prefetchRoute(path: string): void {
    if (!path || started.has(path)) return;
    const loader = loaders[path];
    if (!loader) return;
    started.add(path);
    // A failed prefetch must never surface as an error — the real navigation
    // retries and shows its own loading state.
    void loader().catch(() => started.delete(path));
  };
}

const loaders: RouteLoaders = {
  "/dashboard": () => import("@/pages/Dashboard"),
  "/projects": () => import("@/pages/Projects"),
  "/feed": () => import("@/pages/Feed"),
  "/bookmarks": () => import("@/pages/Bookmarks"),
  "/messages": () => import("@/pages/Messages"),
  "/analytics": () => import("@/pages/Analytics"),
  "/search": () => import("@/pages/SearchPage"),
  "/network": () => import("@/pages/Network"),
  "/notifications": () => import("@/pages/Notifications"),
  "/profile": () => import("@/pages/Profile"),
  "/settings": () => import("@/pages/Settings"),
  "/support": () => import("@/pages/Support"),
  "/admin/dashboard": () => import("@/pages/Admin"),
  "/admin/users": () => import("@/pages/AdminUsers"),
  "/admin/projects": () => import("@/pages/AdminProjects"),
  "/admin/reports": () => import("@/pages/AdminReports"),
  "/admin/activity": () => import("@/pages/AdminActivity"),
  "/admin/audit-logs": () => import("@/pages/AdminAuditLogs"),
  "/admin/reviews": () => import("@/pages/AdminReviews"),
  "/admin/feedback": () => import("@/pages/AdminFeedback"),
  "/admin/billing": () => import("@/pages/AdminBilling"),
  "/admin/support": () => import("@/pages/AdminSupport"),
  // These two reuse the user-facing pages, so they share its chunk.
  "/admin/profile": () => import("@/pages/Profile"),
  "/admin/settings": () => import("@/pages/Settings"),
};

/** Warm the chunk for a route. Safe to call repeatedly; each chunk loads once. */
export const prefetchRoute = createPrefetchRegistry(loaders);
