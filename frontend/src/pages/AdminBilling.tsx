import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  CreditCard,
  Loader2,
  Search,
  Users,
  X,
  XCircle,
  CheckCircle,
  AlertTriangle,
  Ban,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Inbox,
  IndianRupee,
} from "lucide-react";
import { adminService, type AdminSubscriptionListItem, type AdminBillingStats, type AdminRefundRequestListItem } from "@/services/adminService";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  TRIALING: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  PAST_DUE: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  CANCELLED: "bg-red-500/10 text-red-500 border-red-500/20",
  EXPIRED: "bg-muted text-muted-foreground border-border/40",
  INCOMPLETE: "bg-red-500/10 text-red-500 border-red-500/20",
};

const PLAN_STYLES: Record<string, string> = {
  PRO: "bg-violet-500/10 text-violet-500 border-violet-500/20",
  ENTERPRISE: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  FREE: "bg-muted text-muted-foreground border-border/40",
};

function formatINR(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function AdminBilling() {
  const [items, setItems] = useState<AdminSubscriptionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [planCode, setPlanCode] = useState("all");
  const [status, setStatus] = useState("all");
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [stats, setStats] = useState<AdminBillingStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"subscriptions" | "refunds">("subscriptions");
  const [refundItems, setRefundItems] = useState<AdminRefundRequestListItem[]>([]);
  const [refundLoading, setRefundLoading] = useState(true);
  const [refundPage, setRefundPage] = useState(0);
  const [refundTotalPages, setRefundTotalPages] = useState(0);
  const [refundStatusFilter, setRefundStatusFilter] = useState("PENDING");
  const [processingRefund, setProcessingRefund] = useState<string | null>(null);
  const [rejectModal, setRejectModal] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const s = await adminService.getBillingStats();
      setStats(s);
    } catch {
      // Stats unavailable
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const fetchPage = useCallback(
    async (p: number, q?: { search?: string; planCode?: string; status?: string }) => {
      setLoading(true);
      try {
        const res = await adminService.getSubscriptionsPage({
          page: p,
          size: 10,
          search: q?.search || undefined,
          planCode: q?.planCode && q.planCode !== "all" ? q.planCode : undefined,
          status: q?.status && q.status !== "all" ? q.status : undefined,
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
    },
    []
  );

  useEffect(() => {
    fetchPage(0);
  }, [fetchPage]);

  const fetchRefundRequests = useCallback(
    async (p: number, status?: string) => {
      setRefundLoading(true);
      try {
        const res = await adminService.getRefundRequestsPage({
          page: p,
          size: 10,
          status: status && status !== "all" ? status : undefined,
        });
        setRefundItems(res.content);
        setRefundTotalPages(res.totalPages);
        setRefundPage(res.page);
      } catch {
        toast.error("Could not load refund requests");
      } finally {
        setRefundLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (activeTab === "refunds") {
      fetchRefundRequests(0, refundStatusFilter);
    }
  }, [activeTab, refundStatusFilter, fetchRefundRequests]);

  const approveRefund = async (id: string) => {
    setProcessingRefund(id);
    try {
      await adminService.approveRefundRequest(id, "Approved");
      toast.success("Refund approved — Razorpay refund API called");
      fetchRefundRequests(refundPage, refundStatusFilter);
      fetchStats();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Could not approve refund");
    } finally {
      setProcessingRefund(null);
    }
  };

  const rejectRefund = async (id: string) => {
    if (!rejectNote.trim()) return;
    setProcessingRefund(id);
    try {
      await adminService.rejectRefundRequest(id, rejectNote.trim());
      toast.success("Refund request rejected");
      setRejectModal(null);
      setRejectNote("");
      fetchRefundRequests(refundPage, refundStatusFilter);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Could not reject refund");
    } finally {
      setProcessingRefund(null);
    }
  };

  const applyFilters = () => {
    setPage(0);
    setSearch(searchInput.trim());
    fetchPage(0, { search: searchInput.trim(), planCode, status });
  };

  const resetFilters = () => {
    setSearchInput("");
    setSearch("");
    setPlanCode("all");
    setStatus("all");
    setPage(0);
    fetchPage(0, { search: "", planCode: "all", status: "all" });
  };

  const cancel = async (id: string, userName: string) => {
    if (!window.confirm(`Cancel ${userName}'s subscription at period end?`)) return;
    setCancelling(id);
    try {
      await adminService.cancelSubscription(id);
      toast.success("Subscription cancelled at period end");
      fetchPage(page, { search, planCode, status });
      fetchStats();
    } catch {
      toast.error("Could not cancel the subscription");
    } finally {
      setCancelling(null);
    }
  };

  const statCards = [
    {
      label: "Total Revenue",
      value: stats ? formatINR(stats.totalRevenuePaise) : "—",
      icon: IndianRupee,
      color: "text-emerald-500",
      sub: stats ? `${formatINR(stats.revenueThisMonthPaise)} this month` : undefined,
    },
    {
      label: "Active Subscriptions",
      value: stats ? String(stats.activeSubscriptions) : "0",
      icon: CheckCircle,
      color: "text-blue-500",
      sub: stats ? `${stats.proUsers} Pro · ${stats.enterpriseUsers} Enterprise` : undefined,
    },
    {
      label: "Free Users",
      value: stats ? String(stats.freeUsers) : "0",
      icon: Users,
      color: "text-violet-500",
      sub: stats ? `${stats.totalSubscriptions} total subs` : undefined,
    },
    {
      label: "Failed Payments",
      value: stats ? String(stats.failedPayments) : "0",
      icon: XCircle,
      color: "text-red-500",
      sub: stats ? `${stats.refundedPayments} refunded` : undefined,
    },
    {
      label: "Past Due",
      value: stats ? String(stats.pastDueSubscriptions) : "0",
      icon: AlertTriangle,
      color: "text-amber-500",
      sub: stats ? `${stats.cancelledSubscriptions} cancelled` : undefined,
    },
  ];

  return (
    <div className="relative space-y-6">
      <div className="absolute -top-20 -right-20 w-72 h-72 bg-gradient-to-bl from-accent/[0.03] to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-5 h-5 rounded-md bg-accent/10 flex items-center justify-center">
            <CreditCard className="w-3 h-3 text-accent" />
          </div>
          <span className="text-xs font-medium uppercase tracking-wider text-accent">Billing</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Billing Management</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Overview of subscriptions, payments and revenue.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {statCards.map((s) => (
          <Card key={s.label} className="border-border/40 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <p className="text-2xl font-bold mt-2">
                {statsLoading ? <Skeleton className="h-6 w-16 inline-block" /> : s.value}
              </p>
              {s.sub && (
                <p className="text-[10px] text-muted-foreground mt-1">{s.sub}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border/40">
        <button
          onClick={() => setActiveTab("subscriptions")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "subscriptions"
              ? "border-accent text-accent"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Subscriptions
        </button>
        <button
          onClick={() => setActiveTab("refunds")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "refunds"
              ? "border-accent text-accent"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Refund Requests
        </button>
      </div>

      {activeTab === "subscriptions" ? (
      <>
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email or plan..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyFilters();
            }}
            className="pl-9"
          />
        </div>
        <Select value={planCode} onValueChange={setPlanCode}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All plans" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All plans</SelectItem>
            <SelectItem value="PRO">Pro</SelectItem>
            <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="PAST_DUE">Past due</SelectItem>
            <SelectItem value="TRIALING">Trialing</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
            <SelectItem value="EXPIRED">Expired</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" onClick={applyFilters}>
          Apply
        </Button>
        <Button variant="outline" size="icon" onClick={resetFilters} title="Reset filters">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Table */}
      <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Renewal / end</TableHead>
                  <TableHead>Cancels at period end</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <Inbox className="w-8 h-8 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">No subscriptions found</p>
                        <p className="text-xs text-muted-foreground">
                          No active subscriptions match the current filters.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((s) => (
                    <TableRow key={s.id} className="hover:bg-accent/5">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center text-[10px] font-bold text-accent shrink-0">
                            {s.userName?.charAt(0) || "U"}
                          </div>
                          <span className="text-sm font-medium truncate max-w-[140px]">
                            {s.userName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground truncate max-w-[180px]">
                        {s.userEmail}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[11px] ${PLAN_STYLES[s.planCode] ?? "bg-muted text-muted-foreground border-border/40"}`}
                        >
                          {s.planCode}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[11px] ${STATUS_STYLES[s.status] ?? "bg-muted text-muted-foreground border-border/40"}`}
                        >
                          {s.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(s.currentPeriodEnd)}
                      </TableCell>
                      <TableCell>
                        {s.cancelAtPeriodEnd ? (
                          <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-500 border-amber-500/20">
                            Yes
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">No</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {s.status === "ACTIVE" && !s.cancelAtPeriodEnd && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => cancel(s.id, s.userName)}
                            disabled={cancelling === s.id}
                          >
                            {cancelling === s.id ? (
                              <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                            ) : (
                              <Ban className="w-3.5 h-3.5 mr-1" />
                            )}
                            Cancel
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Page {page + 1} of {totalPages} · {total.toLocaleString()} results
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page === 0 || loading}
              onClick={() => fetchPage(Math.max(0, page - 1), { search, planCode, status })}
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Prev
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages - 1 || loading}
              onClick={() => fetchPage(Math.min(totalPages - 1, page + 1), { search, planCode, status })}
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
      </>
      ) : (
      <>
      {/* Refund requests toolbar */}
      <div className="flex gap-3 flex-wrap">
        <Select value={refundStatusFilter} onValueChange={setRefundStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Refund requests table */}
      <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>User</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {refundLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : refundItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <Inbox className="w-8 h-8 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">No refund requests found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  refundItems.map((rr) => (
                    <TableRow key={rr.id} className="hover:bg-accent/5">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center text-[10px] font-bold text-accent shrink-0">
                            {rr.userName?.charAt(0) || "U"}
                          </div>
                          <div>
                            <div className="text-sm font-medium truncate max-w-[140px]">{rr.userName}</div>
                            <div className="text-[10px] text-muted-foreground truncate max-w-[140px]">{rr.userEmail}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[11px] ${PLAN_STYLES[rr.planCode ?? ""] ?? "bg-muted text-muted-foreground border-border/40"}`}>
                          {rr.planCode ?? "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{formatINR(rr.amountPaise)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{rr.reason}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[11px] ${
                          rr.status === "PENDING" ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                          : rr.status === "APPROVED" || rr.status === "COMPLETED" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                          : "bg-red-500/10 text-red-500 border-red-500/20"
                        }`}>
                          {rr.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(rr.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        {rr.status === "PENDING" && (
                          <div className="flex gap-1 justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => approveRefund(rr.id)}
                              disabled={processingRefund === rr.id}
                            >
                              {processingRefund === rr.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <CheckCircle className="w-3.5 h-3.5 mr-1" />
                              )}
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setRejectModal(rr.id)}
                              disabled={processingRefund === rr.id}
                            >
                              <XCircle className="w-3.5 h-3.5 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Refund requests pagination */}
      {refundTotalPages > 1 && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Page {refundPage + 1} of {refundTotalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={refundPage === 0 || refundLoading}
              onClick={() => fetchRefundRequests(Math.max(0, refundPage - 1), refundStatusFilter)}
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Prev
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={refundPage >= refundTotalPages - 1 || refundLoading}
              onClick={() => fetchRefundRequests(Math.min(refundTotalPages - 1, refundPage + 1), refundStatusFilter)}
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="bg-card border border-border/40 rounded-2xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-semibold">Reject refund request</h2>
              <button onClick={() => { setRejectModal(null); setRejectNote(""); }} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">Provide a reason for rejecting this refund request (required).</p>
            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              placeholder="Reason for rejection"
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-border/50 bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setRejectModal(null); setRejectNote(""); }} className="text-sm px-4 py-2 rounded-lg border border-border/50">
                Cancel
              </button>
              <button
                onClick={() => rejectRefund(rejectModal)}
                disabled={!rejectNote.trim() || processingRefund === rejectModal}
                className="text-sm px-4 py-2 rounded-lg bg-destructive text-white hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {processingRefund === rejectModal ? "Rejecting…" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
}
