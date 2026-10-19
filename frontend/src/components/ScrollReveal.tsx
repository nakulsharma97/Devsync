import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

/** Longest stagger we ever apply. A card 12 positions down the grid should not
 *  wait 700 ms before it starts: the whole entrance stays inside ~450 ms. */
const MAX_DELAY_S = 0.3;

/**
 * Reveals its children exactly once, when they first enter the viewport.
 *
 * Design notes:
 *  - The observer disconnects on the first intersection and `revealed` is never
 *    set back to false, so ordinary re-renders, scrolling back up or a parent
 *    state update (e.g. stats arriving) cannot restart the animation.
 *  - `prefers-reduced-motion` is read reactively: the content is rendered
 *    immediately with no animation instead of being faded in.
 *  - Without IntersectionObserver (older browsers, non-DOM environments) the
 *    content is shown immediately — it must never stay at opacity 0.
 */
function useRevealOnce<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || revealed) return;

    if (typeof IntersectionObserver === "undefined") {
      setRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      // A small negative top margin keeps cards from animating while they are
      // still tucked under the fixed header; 0.15 of the target must be visible
      // so short cards reveal on approach rather than after they are centred.
      { threshold: 0.15, rootMargin: "-24px 0px" }
    );
    observer.observe(el);

    // Safety net: browsers deliver IntersectionObserver callbacks on a
    // rendering frame. If frames are throttled (background tab, heavy main
    // thread, embedded webview) the card must not stay invisible forever —
    // after a short grace period reveal it if it is actually on screen.
    const fallback = window.setTimeout(() => {
      const rect = el.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      if (rect.top < viewportHeight && rect.bottom > 0) setRevealed(true);
    }, 1200);

    return () => {
      observer.disconnect();
      window.clearTimeout(fallback);
    };
  }, [revealed]);

  return { ref, revealed };
}

function Reveal({
  children,
  className = "",
  delay = 0,
  animationClass,
}: ScrollRevealProps & { animationClass: string }) {
  const reducedMotion = usePrefersReducedMotion();
  const { ref, revealed } = useRevealOnce<HTMLDivElement>();
  const cappedDelay = Math.min(Math.max(delay, 0), MAX_DELAY_S);

  if (reducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      ref={ref}
      className={`${className} ${revealed ? animationClass : "opacity-0"}`}
      style={revealed ? { animationDelay: `${cappedDelay}s` } : undefined}
    >
      {children}
    </div>
  );
}

export function ScrollReveal({ children, className = "", delay = 0 }: ScrollRevealProps) {
  return (
    <Reveal className={className} delay={delay} animationClass="animate-fade-in-up">
      {children}
    </Reveal>
  );
}

export function ScrollRevealFromLeft({ children, className = "", delay = 0 }: ScrollRevealProps) {
  return (
    <Reveal className={className} delay={delay} animationClass="animate-slide-in-left">
      {children}
    </Reveal>
  );
}

export function ScrollRevealFromRight({ children, className = "", delay = 0 }: ScrollRevealProps) {
  return (
    <Reveal className={className} delay={delay} animationClass="animate-slide-in-right">
      {children}
    </Reveal>
  );
}
