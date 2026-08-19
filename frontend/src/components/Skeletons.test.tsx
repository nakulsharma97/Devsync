import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { RouteSkeleton, SkeletonCardList } from "./Skeletons";

/** Number of shimmer blocks (the custom Skeleton carries the bg-muted/50 class). */
const shimmerCount = (container: HTMLElement) =>
  container.querySelectorAll('[class*="bg-muted/50"]').length;

/** Number of card-shaped wrappers (cards carry the border-border/40 class). */
const cardCount = (container: HTMLElement) =>
  container.querySelectorAll('[class*="border-border/40"]').length;

describe("RouteSkeleton", () => {
  it("renders a dashboard-shaped skeleton (4 stat cards + 3 project cards)", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <RouteSkeleton />
      </MemoryRouter>
    );
    // 4 SkeletonStatCards + 3 SkeletonProjectCards each with a bordered wrapper
    expect(cardCount(container)).toBe(7);
    expect(shimmerCount(container)).toBeGreaterThan(10);
  });

  it("renders a messages-shaped skeleton with a conversation column", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/messages"]}>
        <RouteSkeleton />
      </MemoryRouter>
    );
    // Distinct from the dashboard shape: only the list column wrapper is bordered,
    // and the two-column grid layout token (280px) is present.
    expect(cardCount(container)).toBe(1);
    expect(container.querySelector('[class*="280px"]')).not.toBeNull();
    expect(shimmerCount(container)).toBeGreaterThan(10);
  });

  it("renders a feed-shaped skeleton as exactly 3 cards", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/feed"]}>
        <RouteSkeleton />
      </MemoryRouter>
    );
    expect(cardCount(container)).toBe(3);
  });

  it("handles nested admin routes via the first path segment", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/admin/users"]}>
        <RouteSkeleton />
      </MemoryRouter>
    );
    // Admin shape: title, search/filter bar, 1 bordered table wrapper with header + 6 rows
    expect(cardCount(container)).toBe(1);
    expect(shimmerCount(container)).toBeGreaterThan(5);
  });

  it("SkeletonCardList renders the requested number of cards", () => {
    const { container } = render(<SkeletonCardList count={3} />);
    expect(cardCount(container)).toBe(3);
  });
});
