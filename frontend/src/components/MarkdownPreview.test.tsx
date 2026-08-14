import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MarkdownPreview } from "./MarkdownPreview";

describe("MarkdownPreview", () => {
  it("renders headings, bold, code and links", () => {
    render(
      <MarkdownPreview
        content={"# Title\n\nSome **bold** and `inline` text.\n\n[DevSync](https://devsync.example)"}
      />
    );
    expect(screen.getByRole("heading", { level: 1, name: "Title" })).toBeInTheDocument();
    expect(screen.getByText("bold").tagName).toBe("STRONG");
    expect(screen.getByText("inline").tagName).toBe("CODE");
    expect(screen.getByRole("link", { name: "DevSync" })).toHaveAttribute(
      "href",
      "https://devsync.example"
    );
  });

  it("never renders raw HTML from user content (XSS-safe)", () => {
    render(<MarkdownPreview content={'<script>alert("xss")</script>\n\n<img src=x onerror=alert(1)>'} />);
    expect(document.querySelector("script")).toBeNull();
    expect(document.querySelector("img")).toBeNull();
    // The payload is visible as escaped text, not executed markup.
    expect(screen.getByText(/<script>alert\("xss"\)<\/script>/)).toBeInTheDocument();
  });

  it("renders code blocks and lists", () => {
    render(<MarkdownPreview content={"- one\n- two\n\n```js\nconst x = 1;\n```"} />);
    expect(screen.getByText("one")).toBeInTheDocument();
    expect(screen.getByText("two")).toBeInTheDocument();
    expect(screen.getByText("const x = 1;")).toBeInTheDocument();
  });
});
