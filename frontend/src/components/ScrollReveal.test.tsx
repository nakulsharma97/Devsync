import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { ScrollReveal, ScrollRevealFromLeft } from "./ScrollReveal";

const mocks = vi.hoisted(() => ({
  reducedMotion: { current: false },
}));

vi.mock("@/hooks/usePrefersReducedMotion", () => ({
  usePrefersReducedMotion: () => mocks.reducedMotion.current,
}));

class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = [];
  callback: IntersectionObserverCallback;
  disconnect = vi.fn();
  observe = vi.fn();
  unobserve = vi.fn();

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    FakeIntersectionObserver.instances.push(this);
  }

  trigger(isIntersecting: boolean) {
    this.callback(
      [{ isIntersecting } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver
    );
  }
}

describe("ScrollReveal", () => {
  const originalIO = globalThis.IntersectionObserver;

  beforeEach(() => {
    mocks.reducedMotion.current = false;
    FakeIntersectionObserver.instances = [];
    globalThis.IntersectionObserver =
      FakeIntersectionObserver as unknown as typeof IntersectionObserver;
  });

  afterEach(() => {
    globalThis.IntersectionObserver = originalIO;
  });

  it("starts hidden and reveals exactly once when it enters the viewport", () => {
    const { container } = render(
      <ScrollReveal>
        <p>Card</p>
      </ScrollReveal>
    );

    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain("opacity-0");
    expect(wrapper.className).not.toContain("animate-fade-in-up");

    act(() => FakeIntersectionObserver.instances[0].trigger(true));

    expect(wrapper.className).toContain("animate-fade-in-up");
    expect(wrapper.className).not.toContain("opacity-0");
    // The observer disconnects after the first intersection, so scrolling away
    // and back cannot restart the animation.
    expect(FakeIntersectionObserver.instances[0].disconnect).toHaveBeenCalled();
  });

  it("does not fall back to hidden when the element is re-rendered", () => {
    const { container, rerender } = render(
      <ScrollReveal>
        <p>Card</p>
      </ScrollReveal>
    );

    act(() => FakeIntersectionObserver.instances[0].trigger(true));
    const wrapper = container.firstElementChild as HTMLElement;

    // A parent state update (stats arriving, theme change, …) must not replay
    // the entrance or hide the card again.
    rerender(
      <ScrollReveal>
        <p>Card updated</p>
      </ScrollReveal>
    );

    expect(screen.getByText("Card updated")).toBeInTheDocument();
    expect(wrapper.className).toContain("animate-fade-in-up");
    expect(wrapper.className).not.toContain("opacity-0");
  });

  it("caps staggered delays so the grid never waits more than ~300 ms", () => {
    const { container } = render(
      <ScrollReveal delay={5}>
        <p>Late card</p>
      </ScrollReveal>
    );

    act(() => FakeIntersectionObserver.instances[0].trigger(true));

    expect((container.firstElementChild as HTMLElement).style.animationDelay).toBe("0.3s");
  });

  it("renders content immediately when the user prefers reduced motion", () => {
    mocks.reducedMotion.current = true;

    render(
      <ScrollRevealFromLeft className="slide">
        <p>Visible</p>
      </ScrollRevealFromLeft>
    );

    expect(screen.getByText("Visible")).toBeInTheDocument();
    const wrapper = screen.getByText("Visible").parentElement as HTMLElement;
    expect(wrapper.className).toContain("slide");
    expect(wrapper.className).not.toContain("opacity-0");
    expect(FakeIntersectionObserver.instances).toHaveLength(0);
  });

  it("reveals without an IntersectionObserver instead of staying invisible", () => {
    // @ts-expect-error — simulating an environment without IO support.
    globalThis.IntersectionObserver = undefined;

    render(
      <ScrollReveal>
        <p>Fallback</p>
      </ScrollReveal>
    );

    expect(screen.getByText("Fallback")).toBeInTheDocument();
    const wrapper = screen.getByText("Fallback").parentElement as HTMLElement;
    expect(wrapper.className).toContain("animate-fade-in-up");
    expect(wrapper.className).not.toContain("opacity-0");
  });
});
