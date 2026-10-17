import { describe, expect, it, vi } from "vitest";
import { navigateBackOr } from "./navigation";

describe("navigateBackOr", () => {
  it("uses browser back when React Router has an in-app history entry", () => {
    window.history.replaceState({ idx: 2 }, "", "/profile/alice");
    const navigate = vi.fn();

    navigateBackOr(navigate, "/profile");

    expect(navigate).toHaveBeenCalledWith(-1);
  });

  it("uses a replace fallback when there is no previous in-app entry", () => {
    window.history.replaceState({ idx: 0 }, "", "/profile/alice");
    const navigate = vi.fn();

    navigateBackOr(navigate, "/profile");

    expect(navigate).toHaveBeenCalledWith("/profile", { replace: true });
  });
});
