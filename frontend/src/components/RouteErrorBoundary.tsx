import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  /** Shown in the fallback heading, so the message names the area that failed. */
  label?: string;
}

interface State {
  error: Error | null;
}

/**
 * Keeps one broken page from taking down the whole app.
 *
 * React unmounts the entire tree when a render throws with no boundary above
 * it, so a single failing component (e.g. a page reading a context its route
 * tree does not provide) used to leave the user on a blank screen with no way
 * back except a manual reload — the sidebar, navbar and router all vanished
 * with it. Mounting this around the layout's <Outlet /> confines the failure
 * to the content area and offers a way to recover in place.
 *
 * `key` on the boundary (see the layouts) resets it on navigation, so a page
 * that failed does not poison every later route.
 */
export default class RouteErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep the stack in the console for local debugging; a remote reporter
    // (Sentry is initialised in main.tsx when a DSN is configured) can hook here.
    console.error("Route render failed:", error, info.componentStack);
  }

  private reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div
        role="alert"
        className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center"
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-card text-danger-text">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-foreground">
            {this.props.label ? `${this.props.label} couldn't load` : "This page couldn't load"}
          </h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Something went wrong while rendering this screen. The rest of the app still works —
            you can retry, or move to another page from the sidebar.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button size="sm" onClick={this.reset} className="gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" />
            Try again
          </Button>
          <Button size="sm" variant="outline" onClick={() => window.location.assign("/dashboard")}>
            Back to dashboard
          </Button>
        </div>
        {import.meta.env.DEV && (
          <pre className="mt-2 max-w-2xl overflow-auto rounded-md border border-border bg-muted p-3 text-left text-[11px] leading-relaxed text-muted-foreground">
            {error.message}
          </pre>
        )}
      </div>
    );
  }
}
