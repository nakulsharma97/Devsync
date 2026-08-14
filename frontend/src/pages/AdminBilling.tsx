import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Ban, Loader2, Search } from "lucide-react";
import { adminService, type AdminSubscriptionListItem } from "@/services/adminService";

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  TRIALING: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  PAST_DUE: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  CANCELLED: "bg-muted text-muted-foreground",
  EXPIRED: "bg-muted text-muted-foreground",
  INCOMPLETE: "bg-red-500/15 text-red-600 dark:text-red-400",
};

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function AdminBilling() {
  const [items, setItems] = useState<AdminSubscriptionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [planCode, setPlanCode] = useState("");
  const [status, setStatus] = useState("");
  const [cancelling, setCancelling] = useState<string | null>(null);

  const fetchPage = useCallback(async (p: number, q?: { search?: string; planCode?: string; status?: string }) => {
    setLoading(true);
    try {
      const res = await adminService.getSubscriptionsPage({
        page: p,
        size: 20,
        search: q?.search || undefined,
        planCode: q?.planCode || undefined,
        status: q?.status || undefined,
      });
      setItems(res.content);
      setTotalPages(res.totalPages);
      setTotal(res.totalElements);
      setPage(res.page);
    } catch {
      toast.error("Could not load subscriptions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPage(0);
  }, [fetchPage]);

  const applyFilters = () => {
    fetchPage(0, { search, planCode, status });
  };

  const cancel = async (id: string, userName: string) => {
    if (!window.confirm(`Cancel ${userName}'s subscription at period end?`)) return;
    setCancelling(id);
    try {
      await adminService.cancelSubscription(id);
      toast.success("Subscription cancelled at period end");
      fetchPage(page, { search, planCode, status });
    } catch {
      toast.error("Could not cancel the subscription");
    } finally {
      setCancelling(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Billing Management</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {total} subscription{total === 1 ? "" : "s"} · all cancellations are audit-logged.
        </p>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
            placeholder="Search user, email or plan"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border/50 bg-card text-sm focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
        </div>
        <select
          value={planCode}
          onChange={(e) => setPlanCode(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border/50 bg-card text-sm"
        >
          <option value="">All plans</option>
          <option value="PRO">Pro</option>
          <option value="ENTERPRISE">Enterprise</option>
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border/50 bg-card text-sm"
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="PAST_DUE">Past due</option>
          <option value="TRIALING">Trialing</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="EXPIRED">Expired</option>
        </select>
        <button
          onClick={applyFilters}
          className="px-4 py-2 rounded-lg bg-accent text-white text-sm hover:opacity-90 transition-opacity"
        >
          Apply
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-border/40 bg-card/60 p-12 text-center text-muted-foreground">
          No subscriptions match the current filters.
        </div>
      ) : (
        <div className="rounded-2xl border border-border/40 bg-card/70 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border/40">
                <th className="py-3 px-4 font-medium">User</th>
                <th className="py-3 px-4 font-medium">Plan</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium">Renewal / end</th>
                <th className="py-3 px-4 font-medium">Cancels at period end</th>
                <th className="py-3 px-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id} className="border-b border-border/20 last:border-0">
                  <td className="py-3 px-4">
                    <div className="font-medium">{s.userName}</div>
                    <div className="text-xs text-muted-foreground">{s.userEmail}</div>
                  </td>
                  <td className="py-3 px-4 font-medium">{s.planCode}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${STATUS_STYLES[s.status] ?? "bg-muted text-muted-foreground"}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">{formatDate(s.currentPeriodEnd)}</td>
                  <td className="py-3 px-4">{s.cancelAtPeriodEnd ? "Yes" : "No"}</td>
                  <td className="py-3 px-4 text-right">
                    {s.status === "ACTIVE" && !s.cancelAtPeriodEnd && (
                      <button
                        onClick={() => cancel(s.id, s.userName)}
                        disabled={cancelling === s.id}
                        className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border/50 hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-60"
                      >
                        {cancelling === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => fetchPage(Math.max(0, page - 1), { search, planCode, status })}
              disabled={page === 0}
              className="px-3 py-1.5 rounded-lg border border-border/50 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => fetchPage(Math.min(totalPages - 1, page + 1), { search, planCode, status })}
              disabled={page >= totalPages - 1}
              className="px-3 py-1.5 rounded-lg border border-border/50 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
