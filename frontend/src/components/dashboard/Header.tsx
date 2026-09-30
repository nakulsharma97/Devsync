import { Mail, Menu, Search } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/UserMenu";
import { cn } from "@/lib/utils";

interface HeaderProps {
  /** Current page name. Rendered for assistive tech; the sidebar carries it visually. */
  pageTitle: string;
  onOpenMenu: () => void;
  onOpenSearch: () => void;
  unreadCount: number;
  onUnreadCountChange: (next: number | ((prev: number) => number)) => void;
  msgUnreadCount: number;
  onOpenMessages: () => void;
  /** "Upgrade" on the free plan, "Manage Plan" otherwise. */
  billingLabel: string;
  onOpenBilling: () => void;
}

export function Header({
  pageTitle,
  onOpenMenu,
  onOpenSearch,
  unreadCount,
  onUnreadCountChange,
  msgUnreadCount,
  onOpenMessages,
  billingLabel,
  onOpenBilling,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 h-[82px] border-b border-border-subtle bg-surface-nav">
      <div className="flex h-full items-center gap-4 px-4 sm:px-6 lg:px-7">
        <button
          onClick={onOpenMenu}
          aria-label="Open menu"
          className="-ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Kept in the DOM (visually hidden) so the shell still announces the page. */}
        <h1 data-testid="page-title" className="sr-only">
          {pageTitle}
        </h1>

        <button
          onClick={onOpenSearch}
          aria-label="Open search"
          className="hidden h-[52px] min-w-0 max-w-[740px] flex-1 items-center gap-3.5 rounded-full border border-border-subtle bg-surface-input px-5 text-left transition-colors hover:border-border sm:flex"
        >
          <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
          <span className="truncate text-[15px] text-muted-foreground">
            Search projects, people, or skills...
          </span>
          <kbd className="ml-auto hidden shrink-0 items-center gap-1 rounded-lg border border-border bg-muted px-2 py-1 font-sans text-[12px] font-medium text-muted-foreground lg:inline-flex">
            ⌘ K
          </kbd>
        </button>

        {/* Mobile search trigger */}
        <button
          onClick={onOpenSearch}
          aria-label="Search"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:hidden"
        >
          <Search className="h-5 w-5" />
        </button>

        <div className="ml-auto flex shrink-0 items-center gap-3 sm:gap-5">
          <button
            onClick={onOpenBilling}
            className={cn(
              "hidden h-12 min-w-[110px] items-center justify-center rounded-[10px] px-4 text-[14px] font-semibold transition-colors sm:inline-flex",
              billingLabel === "Upgrade"
                ? "bg-primary text-primary-foreground hover:bg-accent-hover"
                : "border border-border bg-card text-foreground hover:bg-muted"
            )}
          >
            {billingLabel}
          </button>

          <NotificationBell
            unreadCount={unreadCount}
            onUnreadCountChange={onUnreadCountChange}
          />

          <button
            onClick={onOpenMessages}
            aria-label={`Messages${msgUnreadCount > 0 ? ` — ${msgUnreadCount} unread` : ""}`}
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-[11px] text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Mail className="h-5 w-5" />
            {msgUnreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-danger ring-2 ring-surface-nav" />
            )}
          </button>

          <ThemeToggle />
          <UserMenu showName />
        </div>
      </div>
    </header>
  );
}

export default Header;
