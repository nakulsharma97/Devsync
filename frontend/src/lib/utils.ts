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

/**
 * Extract a readable message from an unknown thrown value: prefers the
 * backend's `response.data.message`, then a plain `Error.message`, else the
 * caller-provided fallback.
 */
export function getErrorMessage(err: unknown, fallback = "Something went wrong"): string {
  if (typeof err === "object" && err !== null) {
    if ("response" in err) {
      const res = (err as { response?: { status?: number; data?: { message?: string; error?: string }; headers?: Record<string, string | undefined> } }).response;
      if (res?.status === 429) {
        const retryAfter = res?.headers?.["retry-after"];
        if (retryAfter) {
          return `Too many attempts. Please wait ${retryAfter} seconds and try again.`;
        }
        return "Too many attempts. Please wait a moment and try again.";
      }
      if (res?.data?.message) return res.data.message;
      if (res?.data?.error) return res.data.error;
    }
    if ("message" in err) {
      const msg = (err as { message?: unknown }).message;
      if (typeof msg === "string" && msg) return msg;
    }
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

// ── Billing / Feature-limit helpers ───────────────────────

export interface FeatureLimitError {
  status: number;
  code: string;
  message: string;
}

/**
 * Detects a 403 FeatureLimitException from the billing entitlement service.
 * Returns the structured limit error or null if the error is unrelated.
 */
export function getFeatureLimitError(err: unknown): FeatureLimitError | null {
  if (typeof err !== "object" || err === null || !("response" in err)) return null;
  const res = (err as { response?: { status?: number; data?: { code?: string; message?: string } } }).response;
  if (res?.status !== 403 || !res?.data?.code) return null;
  const code = res.data.code;
  if (
    code === "PRIVATE_PROJECT_LIMIT" ||
    code === "MEMBER_LIMIT" ||
    code === "STORAGE_LIMIT" ||
    code === "ADVANCED_ANALYTICS"
  ) {
    return { status: 403, code, message: res.data.message || "Plan limit reached" };
  }
  return null;
}
