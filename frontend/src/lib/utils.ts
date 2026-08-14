import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Whether the user prefers reduced motion (checked once at load — safe for
 * module scope since it only affects animation fallbacks, not correctness).
 */
export const prefersReducedMotion =
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Extract a backend error message from an unknown thrown value. */
export function getErrorMessage(err: unknown, fallback = "Something went wrong"): string {
  if (typeof err === "object" && err !== null && "response" in err) {
    const res = (err as { response?: { data?: { message?: string } } }).response;
    return res?.data?.message ?? fallback;
  }
  return fallback;
}

/**
 * Status-aware error text for the team chat. Turns the backend's generic 500
 * message ("An unexpected error occurred") into something actionable, while
 * still surfacing meaningful backend 4xx messages (e.g. "This project is
 * private") verbatim.
 */
export function getHttpErrorMessage(
  err: unknown,
  fallback = "Unable to load team chat. Please try again."
): string {
  if (typeof err === "object" && err !== null && "response" in err) {
    const res = (err as { response?: { status?: number; data?: { message?: string } } }).response;
    if (res?.status === 401) return "Your session has expired. Please sign in again.";
    if (res?.status === 403) return "You don't have permission to access this project's chat.";
    if (res?.status === 404) return "Project chat could not be found.";
    if (res?.status && res.status >= 500) return fallback;
    return res?.data?.message ?? fallback;
  }
  if (typeof err === "object" && err !== null && "code" in err) {
    const code = (err as { code?: string }).code;
    if (code === "ERR_NETWORK" || code === "ECONNABORTED") {
      return "Unable to connect to the server.";
    }
  }
  return fallback;
}
