import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/lib/utils";

interface UseCountUpOptions {
  /** Animation length in ms. Defaults to 1600. */
  duration?: number;
  /** Number of decimal places to show in the formatted output. */
  decimals?: number;
  /** When false, the value stays at 0 and no animation runs. */
  enabled?: boolean;
}

/**
 * Animates a number from 0 to `target` with an easeOutExpo curve and returns
 * the formatted string. Falls back to the final value instantly when the user
 * prefers reduced motion.
 */
export function useCountUp(
  target: number,
  { duration = 1600, decimals = 0, enabled = true }: UseCountUpOptions = {}
): string {
  const [value, setValue] = useState(0);
  const frameRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    if (prefersReducedMotion) {
      setValue(target);
      return;
    }

    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      // easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setValue(target * eased);
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration, enabled]);

  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
