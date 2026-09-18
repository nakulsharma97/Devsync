import { cn } from "@/lib/utils";

/**
 * The DevSync brand mark — an orange rounded square holding a white code
 * glyph. This is the ONLY brand mark in the app: the navbar, the app shell
 * sidebar, the admin sidebar, the footer, the auth pages and the browser
 * favicon (/logo.svg) all render this same geometry.
 *
 * Geometry is duplicated deliberately in `public/logo.svg` (a favicon cannot
 * import a React component) — keep the two in sync if the mark ever changes.
 */
export function LogoMark({
  size = 28,
  className,
}: {
  /** Rendered square size in px. */
  size?: number;
  className?: string;
}) {
  const glyph = Math.round(size * 0.58);
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex items-center justify-center shrink-0 bg-primary text-white",
        className
      )}
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.28) }}
    >
      <svg
        viewBox="0 0 24 24"
        width={glyph}
        height={glyph}
        fill="none"
        stroke="currentColor"
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m18 16 4-4-4-4" />
        <path d="m6 8-4 4 4 4" />
        <path d="m14.5 4-5 16" />
      </svg>
    </span>
  );
}

export function Logo({
  size = 28,
  wordmark = true,
  className,
  wordClassName,
}: {
  size?: number;
  /** Render the "DevSync" wordmark next to the mark. */
  wordmark?: boolean;
  className?: string;
  wordClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      {wordmark && (
        <span
          className={cn(
            "font-display font-semibold tracking-tight text-foreground",
            wordClassName
          )}
        >
          DevSync
        </span>
      )}
    </span>
  );
}

export default Logo;
