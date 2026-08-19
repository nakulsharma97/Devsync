import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";

/**
 * Wraps admin page content and triggers a subtle fade-in on each route change.
 *
 * Uses `useLocation` to detect navigation. On each pathname change a brief
 * opacity + translateY animation plays. Reduced-motion users see no animation.
 */
export default function AdminPageTransition({
  children,
}: {
  children: React.ReactNode;
}) {
  const { pathname } = useLocation();
  const [visible, setVisible] = useState(false);
  const prevPath = useRef(pathname);

  useEffect(() => {
    // Skip animation on the very first paint (content is already there)
    if (prevPath.current === pathname) {
      setVisible(true);
      return;
    }
    prevPath.current = pathname;
    // Reset to invisible, then fade in on next frame
    setVisible(false);
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, [pathname]);

  return (
    <div
      className="transition-all duration-200 ease-out"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(6px)",
        willChange: "opacity, transform",
      }}
      aria-busy={!visible}
    >
      {children}
    </div>
  );
}
