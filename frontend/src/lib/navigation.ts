import type { NavigateFunction } from "react-router";

export function navigateBackOr(
  navigate: NavigateFunction,
  fallback: string
): void {
  const historyIndex = window.history.state?.idx;
  if (typeof historyIndex === "number" && historyIndex > 0) {
    navigate(-1);
    return;
  }
  navigate(fallback, { replace: true });
}
