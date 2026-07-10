import { useEffect, useState } from "react";
import { useLocation } from "react-router";

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [transitionStage, setTransitionStage] = useState("page-enter");

  useEffect(() => {
    // When route changes, fade out, then swap content, then fade in
    setTransitionStage("page-exit");

    const timeout = setTimeout(() => {
      setDisplayChildren(children);
      setTransitionStage("page-enter");
    }, 200);

    return () => clearTimeout(timeout);
  }, [location.pathname, children]);

  return (
    <div
      className={transitionStage}
      style={{
        animationDuration: "300ms",
        animationFillMode: "forwards",
        animationTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      {displayChildren}
    </div>
  );
}
