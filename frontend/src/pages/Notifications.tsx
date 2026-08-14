import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { notificationService, type NotificationDto } from "@/services/notificationService";
import { projectService, type InvitationDto } from "@/services/projectService";
import { wsService } from "@/services/websocketService";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/Skeletons";
import { toast } from "sonner";
import { timeAgo } from "@/lib/format";
import { getNotificationMeta, resolveNotificationUrl } from "@/lib/notificationMeta";
import { cn, getErrorMessage } from "@/lib/utils";
import {
  Bell,
  CheckCheck,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Loader2,
  Check,
  X,
  Circle,
  UserPlus,
  Sparkles,
  Inbox,
} from "lucide-react";

type Filter = "all" | "unread" | "read";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "read", label: "Read" },
];

/** Per-page options; the backend clamps size to 1..100. */
const SIZE_OPTIONS = [10, 25, 50] as const;
const DEFAULT_SIZE = 10;

/**
 * Broadcast that unread state changed so the dashboard bell badge can refetch
 * immediately instead of waiting for its 30s poll. No new API, no new socket.
 */
function notifyChanged() {
  window.dispatchEvent(new Event("devsync:notifications-changed"));
}

export default function Notifications() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>("all");
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [unread, setUnread] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState<number>(DEFAULT_SIZE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invitations, setInvitations] = useState<InvitationDto[]>([]);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  // Server-side pagination: GET /notifications?page=&size= returns content plus
  // totalElements/totalPages, so the summary and tab counts stay accurate no
  // matter which page (or page size) is loaded.
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pageData, count] = await Promise.all([
        notificationService.getNotifications({ page, size }),
        notificationService.getUnreadCount(),
      ]);
      setNotifications(pageData.content);
      setTotalElements(pageData.totalElements);
      setUnread(count);
    } catch {
      setError("Unable to load notifications. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [page, size]);

  useEffect(() => {
    load();
  }, [load]);

  // Load the user's invitations only when the page actually shows an
  // invitation notification (no extra requests for the common case).
  const needsInvitations = useMemo(
    () => notifications.some((n) => n.type === "PROJECT_INVITE"),
    [notifications]
  );
  useEffect(() => {
    if (!needsInvitations) return;
    let cancelled = false;
    projectService
      .getMyInvitations()
      .then((list) => {
        if (!cancelled) setInvitations(list);
      })
      .catch(() => {
        // Non-fatal: invitation cards simply won't render actions.
      });
    return () => {
      cancelled = true;
    };
  }, [needsInvitations]);

  // Real-time: prepend notifications arriving over the existing STOMP
  // connection (/user/queue/notifications) — no new socket, no page refresh.
  useEffect(() => {
    const unsub = wsService.onNotification((n: NotificationDto) => {
      if (!n || !n.id) return;
      setNotifications((prev) =>
        prev.some((x) => x.id === n.id) ? prev : [n, ...prev].slice(0, size)
      );
      if (!n.read) setUnread((c) => c + 1);
      setTotalElements((e) => e + 1);
      // A fresh invitation needs the invitations list refreshed so the
      // Accept/Reject buttons render on the new card.
      if (n.type === "PROJECT_INVITE") {
        projectService.getMyInvitations().then(setInvitations).catch(() => {});
      }
    });
    return () => {
      unsub();
    };
  }, [size]);

  const markRead = useCallback(async (n: NotificationDto) => {
    if (n.read) return;
    setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    setUnread((c) => Math.max(0, c - 1));
    try {
      await notificationService.markAsRead(n.id);
    } catch {
      toast("Failed to mark as read");
    } finally {
      // Dispatch after the server write settles so the bell's refetch reads
      // the new count instead of a stale one.
      notifyChanged();
    }
  }, []);

  const markAllRead = useCallback(async () => {
    if (unread === 0) return;
    setNotifications((prev) => prev.map((x) => ({ ...x, read: true })));
    setUnread(0);
    try {
      await notificationService.markAllAsRead();
      toast("All notifications marked as read");
    } catch {
      toast("Failed to mark all as read");
    } finally {
      notifyChanged();
    }
  }, [unread]);

  const openNotification = useCallback(
    (n: NotificationDto) => {
      markRead(n);
      // Project invitations are accepted/declined right here — a non-member
      // can't open the project itself.
      if (n.type === "PROJECT_INVITE") return;
      navigate(resolveNotificationUrl(n));
    },
    [markRead, navigate]
  );

  // Pending invitations keyed by `${projectId}:${senderId}` so a PROJECT_INVITE
  // notification (which carries projectId + actorId) can find its invitation.
  const pendingByProject = useMemo(() => {
    const map = new Map<string, InvitationDto>();
    for (const inv of invitations) {
      if (inv.status === "PENDING") map.set(`${inv.projectId}:${inv.senderId}`, inv);
    }
    return map;
  }, [invitations]);

  const respondToInvitation = useCallback(
    async (n: NotificationDto, inv: InvitationDto, accept: boolean) => {
      setRespondingId(inv.id);
      try {
        if (accept) {
          await projectService.acceptInvitation(inv.id);
          toast("Invitation accepted — you can now access the project");
        } else {
          await projectService.declineInvitation(inv.id);
          toast("Invitation declined");
        }
        setInvitations((prev) =>
          prev.map((i) =>
            i.id === inv.id ? { ...i, status: accept ? "ACCEPTED" : "DECLINED" } : i
          )
        );
        if (!n.read) {
          setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
          setUnread((c) => Math.max(0, c - 1));
          try {
            await notificationService.markAsRead(n.id);
          } catch {
            // Non-fatal — the bell's periodic poll re-syncs the count.
          } finally {
            notifyChanged();
          }
        }
      } catch (err: unknown) {
        toast(getErrorMessage(err, accept ? "Failed to accept invitation" : "Failed to decline invitation"));
      } finally {
        setRespondingId(null);
      }
    },
    []
  );

  // Server-accurate totals: All/Read come from the paginated response's
  // totalElements, Unread from /notifications/unread-count — so the summary and
  // the filter badges never drift when browsing deeper pages.
  const totalPages = Math.max(1, Math.ceil(totalElements / size));
  const tabCounts: Record<Filter, number> = {
    all: totalElements,
    unread: unread,
    read: Math.max(0, totalElements - unread),
  };

  const visible = notifications.filter((n) =>
    filter === "all" ? true : filter === "unread" ? !n.read : n.read
  );

  const selectFilter = (f: Filter) => {
    setFilter(f);
    // The filter applies to the currently loaded page; jump back to the first
    // page so a narrower filter starts from the newest notifications.
    if (page !== 0) setPage(0);
  };

  const changeSize = (next: number) => {
    setSize(next);
    setPage(0);
  };

  const goToPage = (next: number) => {
    setPage(Math.min(Math.max(0, next), totalPages - 1));
  };

  return (
    <div className="mx-auto w-full max-w-6xl min-w-0 space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] items-start">
        {/* ── Main column ─────────────────────────────────────── */}
        <div className="min-w-0 space-y-5">
          {/* Page header */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-[1.75rem]">Notifications</h1>
              <p className="text-sm text-muted-foreground mt-1.5">
                Stay updated on activity across DevSync
              </p>
            </div>
            {unread > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={markAllRead}
                className="border-indigo-500/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/5 hover:border-indigo-500/60"
              >
                <CheckCheck className="w-4 h-4 mr-1.5" />
                Mark all as read
              </Button>
            )}
          </div>

          {/* Filter tabs — counts come from real server totals */}
          <div
            role="tablist"
            aria-label="Filter notifications"
            className="inline-flex items-center gap-1 rounded-full border border-border/40 bg-card/60 p-1"
          >
            {FILTERS.map((f) => (
              <button
                key={f.id}
                role="tab"
                aria-selected={filter === f.id}
                onClick={() => selectFilter(f.id)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50",
                  filter === f.id
                    ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                )}
              >
                {f.label}
                <span
                  className={cn(
                    "min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold inline-flex items-center justify-center",
                    filter === f.id
                      ? "bg-white/20 text-white"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {tabCounts[f.id]}
                </span>
              </button>
            ))}
          </div>

          {/* States */}
          {loading ? (
            <div className="space-y-2.5" role="status" aria-live="polite" aria-label="Loading notifications">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3.5 p-4 rounded-2xl border border-border/40 bg-card/50"
                >
                  <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                  <div className="space-y-2 flex-1 min-w-0">
                    <Skeleton className="h-2.5 w-20" />
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-2 w-16" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center rounded-2xl border border-border/40 bg-card/50">
              <AlertCircle className="w-10 h-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button variant="outline" size="sm" onClick={load}>
                Retry
              </Button>
            </div>
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-20 rounded-2xl border border-border/40 bg-card/50">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500/15 to-purple-500/10 flex items-center justify-center ring-1 ring-indigo-500/20 mb-5">
                <Inbox className="w-7 h-7 text-indigo-400" />
              </div>
              <h3 className="text-lg font-semibold mb-1.5">
                {totalElements === 0
                  ? "You're all caught up"
                  : filter === "unread"
                    ? "No unread notifications"
                    : "No read notifications"}
              </h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                {totalElements === 0
                  ? "No new notifications right now. We'll let you know when something needs your attention."
                  : "Try another filter to see more notifications."}
              </p>
            </div>
          ) : (
            <>
              <ul className="space-y-2.5">
                {visible.map((n) => {
                  const invitation =
                    n.type === "PROJECT_INVITE"
                      ? pendingByProject.get(`${n.referenceId}:${n.actorId}`)
                      : undefined;
                  return (
                    <NotificationCard
                      key={n.id}
                      notification={n}
                      invitation={invitation}
                      responding={respondingId === invitation?.id}
                      onOpen={() => openNotification(n)}
                      onRespond={(accept) =>
                        invitation && respondToInvitation(n, invitation, accept)
                      }
                    />
                  );
                })}
              </ul>

              {/* Pagination — real backend page/size params */}
              {totalElements > size && (
                <PaginationBar
                  page={page}
                  totalPages={totalPages}
                  totalElements={totalElements}
                  size={size}
                  onPageChange={goToPage}
                  onSizeChange={changeSize}
                />
              )}
            </>
          )}
        </div>

        {/* ── Right sidebar ───────────────────────────────────── */}
        <aside className="min-w-0 space-y-5 lg:sticky lg:top-20">
          <SummaryCard total={totalElements} unread={unread} read={tabCounts.read} />
          <QuickTipsCard />
          {/* Only when there is genuinely nothing unread — never during load or on error. */}
          {!loading && !error && unread === 0 && <CaughtUpCard />}
        </aside>
      </div>
    </div>
  );
}

// ── Notification card ────────────────────────────────────

function NotificationCard({
  notification: n,
  invitation,
  responding,
  onOpen,
  onRespond,
}: {
  notification: NotificationDto;
  invitation?: InvitationDto;
  responding: boolean;
  onOpen: () => void;
  onRespond: (accept: boolean) => void;
}) {
  const meta = getNotificationMeta(n.type);
  const Icon = meta.icon;

  return (
    <li
      className={cn(
        "group rounded-2xl border transition-colors overflow-hidden",
        n.read
          ? "border-border/30 bg-card/50 hover:border-border/60 hover:bg-card/80"
          : "border-indigo-500/25 bg-indigo-500/[0.04] hover:border-indigo-500/40 hover:bg-indigo-500/[0.07]"
      )}
    >
      <button
        onClick={onOpen}
        className="w-full text-left flex items-start gap-3.5 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 rounded-t-2xl"
      >
        {/* Icon chip */}
        <span className={cn("relative w-10 h-10 rounded-full shrink-0 flex items-center justify-center", meta.colorClass)}>
          <Icon className="w-[18px] h-[18px]" />
          {!n.read && (
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-indigo-500 ring-2 ring-background" />
          )}
        </span>

        {/* Content */}
        <span className="flex-1 min-w-0">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/60 mb-0.5">
            {meta.label}
          </span>
          <span className={cn("block text-sm leading-snug", n.read ? "text-muted-foreground" : "text-foreground font-medium")}>
            {n.title}
          </span>
          {n.message && (
            <span className={cn("block text-xs mt-0.5 leading-relaxed", n.read ? "text-muted-foreground/70" : "text-muted-foreground")}>
              {n.message}
            </span>
          )}
          <span className="block text-[11px] text-muted-foreground/60 mt-1.5">
            {timeAgo(n.createdAt, "recently")}
          </span>
        </span>

        {/* Status + chevron */}
        <span className="shrink-0 flex flex-col items-end gap-2 self-center">
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border",
              n.read
                ? "text-muted-foreground border-border/40 bg-muted/40"
                : "text-indigo-500 dark:text-indigo-400 border-indigo-500/25 bg-indigo-500/10"
            )}
          >
            {n.read ? "Read" : "New"}
          </span>
          <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-indigo-400 transition-colors" />
        </span>
      </button>

      {/* Invitation actions — only for pending invitations */}
      {invitation && (
        <div className="flex items-center gap-2 px-4 pb-4 pl-[3.75rem] border-t border-border/40 pt-3 mt-0.5">
          <Button
            size="sm"
            disabled={responding}
            onClick={() => onRespond(true)}
            className="text-xs bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 shadow-sm"
          >
            {responding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 mr-1" />}
            Accept
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={responding}
            onClick={() => onRespond(false)}
            className="text-xs"
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Reject
          </Button>
          <span className="text-[11px] text-muted-foreground/60 ml-auto hidden sm:inline">
            {invitation.projectName}
          </span>
        </div>
      )}
    </li>
  );
}

// ── Pagination ───────────────────────────────────────────

/** Compact page-number list with ellipses, e.g. [0, 1, "…", 7]. */
function pageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  const pages: (number | "…")[] = [0];
  if (current > 3) pages.push("…");
  for (let p = Math.max(1, current - 1); p <= Math.min(total - 2, current + 1); p++) pages.push(p);
  if (current < total - 4) pages.push("…");
  pages.push(total - 1);
  return pages;
}

function PaginationBar({
  page,
  totalPages,
  totalElements,
  size,
  onPageChange,
  onSizeChange,
}: {
  page: number;
  totalPages: number;
  totalElements: number;
  size: number;
  onPageChange: (p: number) => void;
  onSizeChange: (s: number) => void;
}) {
  const start = totalElements === 0 ? 0 : page * size + 1;
  const end = Math.min((page + 1) * size, totalElements);
  const pages = pageNumbers(page, totalPages);

  return (
    <nav
      aria-label="Notifications pagination"
      className="flex flex-wrap items-center justify-between gap-3 pt-1"
    >
      <p className="text-xs text-muted-foreground tabular-nums">
        Showing {start}–{end} of {totalElements}
      </p>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 0}
          aria-label="Previous page"
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 disabled:opacity-35 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`e-${i}`} className="w-8 h-8 inline-flex items-center justify-center text-xs text-muted-foreground/60">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              aria-label={`Page ${p + 1}`}
              aria-current={p === page ? "page" : undefined}
              className={cn(
                "inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 transition-colors",
                p === page
                  ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              {p + 1}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages - 1}
          aria-label="Next page"
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/50 disabled:opacity-35 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="sr-only">Notifications per page</span>
        <select
          value={size}
          onChange={(e) => onSizeChange(Number(e.target.value))}
          className="h-8 rounded-lg border border-border/40 bg-card px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50"
        >
          {SIZE_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        per page
      </label>
    </nav>
  );
}

// ── Right sidebar cards ──────────────────────────────────

function SummaryCard({ total, unread, read }: { total: number; unread: number; read: number }) {
  const rows = [
    { icon: Bell, label: "Total notifications", value: total, color: "text-indigo-500 bg-indigo-500/10" },
    { icon: Circle, label: "Unread", value: unread, color: "text-red-500 bg-red-500/10" },
    { icon: CheckCheck, label: "Read", value: read, color: "text-emerald-500 bg-emerald-500/10" },
  ];
  return (
    <section className="rounded-2xl border border-border/40 bg-card/60 p-5">
      <h2 className="text-sm font-semibold mb-4">Summary</h2>
      <ul className="divide-y divide-border/40">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
            <span className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", row.color)}>
              <row.icon className="w-4 h-4" />
            </span>
            <span className="flex-1 min-w-0 text-sm text-muted-foreground truncate">{row.label}</span>
            <span className="text-sm font-semibold tabular-nums">{row.value}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function QuickTipsCard() {
  const tips = [
    {
      icon: UserPlus,
      title: "Accept project invitations",
      body: "Collaborate with your team and get more done.",
      color: "text-purple-500 bg-purple-500/10",
    },
    {
      icon: Bell,
      title: "Stay updated",
      body: "Never miss an important project update.",
      color: "text-blue-500 bg-blue-500/10",
    },
    {
      icon: CheckCheck,
      title: "Mark as read",
      body: "Keep your notification center clean.",
      color: "text-emerald-500 bg-emerald-500/10",
    },
  ];
  return (
    <section className="rounded-2xl border border-border/40 bg-card/60 p-5">
      <h2 className="text-sm font-semibold mb-1">Quick tips</h2>
      <p className="text-xs text-muted-foreground mb-4">Get the most out of DevSync</p>
      <ul className="space-y-4">
        {tips.map((tip) => (
          <li key={tip.title} className="flex items-start gap-3">
            <span className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", tip.color)}>
              <tip.icon className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-medium">{tip.title}</p>
              <p className="text-xs text-muted-foreground leading-snug mt-0.5">{tip.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CaughtUpCard() {
  return (
    <section className="rounded-2xl border border-border/40 bg-gradient-to-b from-indigo-500/[0.04] to-transparent p-5 text-center">
      <div className="w-14 h-14 mx-auto rounded-full bg-gradient-to-br from-indigo-500/15 to-purple-500/10 flex items-center justify-center ring-1 ring-indigo-500/20 mb-4">
        <Sparkles className="w-6 h-6 text-indigo-400" />
      </div>
      <h2 className="text-sm font-semibold">You&apos;re all caught up!</h2>
      <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
        We&apos;ll notify you when something needs your attention.
      </p>
    </section>
  );
}
