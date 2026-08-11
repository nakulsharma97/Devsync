/**
 * Lightweight page wrapper.
 *
 * Navigation is immediate: route changes swap the content in the same frame —
 * no setTimeout delays, no exit animations blocking the transition.
 * A subtle opacity fade-in plays once when the app first paints.
 */
export default function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="page-enter"
      style={{
        animationDuration: "250ms",
        animationTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      {children}
    </div>
  );
}
