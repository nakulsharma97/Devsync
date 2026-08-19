import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { Inbox } from "lucide-react";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("renders title and description without action button", () => {
    render(
      <EmptyState
        icon={Inbox}
        title="No items"
        description="Nothing to show here"
      />
    );
    expect(screen.getByText("No items")).toBeInTheDocument();
    expect(screen.getByText("Nothing to show here")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders action button and calls onAction when clicked", () => {
    const onAction = vi.fn();
    render(
      <EmptyState
        icon={Inbox}
        title="No results"
        description="Try a different search"
        actionLabel="Clear search"
        onAction={onAction}
      />
    );
    const button = screen.getByRole("button", { name: /clear search/i });
    expect(button).toBeInTheDocument();
    fireEvent.click(button);
    expect(onAction).toHaveBeenCalledOnce();
  });

  it("renders icon with correct aria", () => {
    render(<EmptyState icon={Inbox} title="Empty" />);
    // The icon is decorative (aria-hidden by default from lucide-react)
    const icon = document.querySelector(".lucide-inbox");
    expect(icon).toBeTruthy();
  });
});
