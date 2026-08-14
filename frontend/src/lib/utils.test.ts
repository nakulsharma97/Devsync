import { describe, it, expect } from "vitest";
import { getHttpErrorMessage } from "./utils";

describe("getHttpErrorMessage", () => {
  it("maps 401 to a session-expired message", () => {
    expect(getHttpErrorMessage({ response: { status: 401 } })).toBe(
      "Your session has expired. Please sign in again."
    );
  });

  it("maps 403 to a permission message", () => {
    expect(getHttpErrorMessage({ response: { status: 403 } })).toBe(
      "You don't have permission to access this project's chat."
    );
  });

  it("maps 404 to a not-found message", () => {
    expect(getHttpErrorMessage({ response: { status: 404 } })).toBe(
      "Project chat could not be found."
    );
  });

  it("maps any 5xx to the retryable fallback instead of the generic 500 text", () => {
    expect(
      getHttpErrorMessage({ response: { status: 500, data: { message: "An unexpected error occurred" } } })
    ).toBe("Unable to load team chat. Please try again.");
  });

  it("surfaces meaningful backend 4xx messages verbatim", () => {
    expect(
      getHttpErrorMessage({ response: { status: 400, data: { message: "This project is private" } } })
    ).toBe("This project is private");
  });

  it("maps network errors to a connect message", () => {
    expect(getHttpErrorMessage({ code: "ERR_NETWORK" })).toBe(
      "Unable to connect to the server."
    );
  });

  it("falls back for unknown errors", () => {
    expect(getHttpErrorMessage(new Error("boom"))).toBe(
      "Unable to load team chat. Please try again."
    );
  });
});
