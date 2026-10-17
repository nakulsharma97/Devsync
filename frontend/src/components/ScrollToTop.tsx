import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router";

/**
 * Resets the browser scroll position to the top whenever the pathname changes.
 *
 * The DevSync layout uses a single `min-h-screen` root div — the window
 * (document) is the only scrolling element.  `window.scrollTo(0, 0)` is
 * therefore sufficient and there is no custom scroll container to reset.
 *
 * Placed inside `<BrowserRouter>` so it runs for every route transition.
 * Browser back/forward still works correctly because the browser natively
 * restores scroll position for those events — this component only fires on
 * React-Router-driven navigations (Link clicks, programmatic navigate()).
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    // Let the browser restore the saved scroll position for Back/Forward.
    // PUSH and REPLACE navigations represent a new view and should start at
    // the top instead of inheriting the previous page's position.
    if (navigationType === "POP") return;
    window.scrollTo(0, 0);
  }, [navigationType, pathname]);

  return null;
}
