import { describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router";
import ScrollToTop from "./ScrollToTop";

function NavigationLink() {
  const navigate = useNavigate();
  return <button onClick={() => navigate("/next")}>Next</button>;
}

describe("ScrollToTop", () => {
  it("scrolls on a new client-side navigation", () => {
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    const view = render(
      <MemoryRouter initialEntries={["/start", "/previous"]} initialIndex={1}>
        <ScrollToTop />
        <Routes>
          <Route path="/previous" element={<NavigationLink />} />
          <Route path="/next" element={<div>Next</div>} />
        </Routes>
      </MemoryRouter>
    );

    scrollTo.mockClear();
    fireEvent.click(view.getByRole("button", { name: "Next" }));
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
    scrollTo.mockRestore();
  });
});
