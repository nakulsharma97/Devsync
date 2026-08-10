import { useCallback, useEffect, useState } from "react";
import {
  Flag,
  Search,
  RefreshCw,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  User,
  FolderGit2,
  Rss,
  MessageSquare,
  MessageCircle,
  Ban,
  Trash2,
  Archive,
  Globe,
  EyeOff,
  Undo2,
  ShieldAlert,
  Inbox,
} from "lucide-react";
import {
  adminService,
  type AdminReportDetail,
  type AdminReportListItem,
  type AdminReportStats,
  type ModerationAction,
  type PageResponse,
  type ReportEntityType,
  type ReportReason,
  type ReportStatus,
} from "@/services/adminService";

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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const REASONS: ReportReason[] = [
  "SPAM",
  "HARASSMENT",
  "INAPPROPRIATE_CONTENT",
  "FAKE_ACCOUNT",
  "COPYRIGHT",
  "ABUSE",
  "OTHER",
];

const STATUSES: ReportStatus[] = ["PENDING", "UNDER_REVIEW", "RESOLVED", "REJECTED"];
const ENTITY_TYPES: ReportEntityType[] = ["USER", "PROJECT", "POST", "COMMENT", "MESSAGE"];

const statusStyles: Record<ReportStatus, string> = {
  PENDING: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  UNDER_REVIEW: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  RESOLVED: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  REJECTED: "bg-red-500/10 text-red-500 border-red-500/20",
};

const entityIcon: Record<ReportEntityType, typeof User> = {
  USER: User,
  PROJECT: FolderGit2,
  POST: Rss,
  COMMENT: MessageCircle,
  MESSAGE: MessageSquare,
};

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminReports() {
  const [data, setData] = useState<PageResponse<AdminReportListItem> | null>(null);
  const [stats, setStats] = useState<AdminReportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [reasonFilter, setReasonFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const [selected, setSelected] = useState<AdminReportDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ action: ModerationAction; label: string; description: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pageRes, statsRes] = await Promise.all([
        adminService.getReportsPage({
          page,
          size: 10,
          search: search || undefined,
          status: statusFilter !== "all" ? statusFilter : undefined,
          reason: reasonFilter !== "all" ? reasonFilter : undefined,
          entityType: typeFilter !== "all" ? typeFilter : undefined,
        }),
        adminService.getReportStats(),
      ]);
      setData(pageRes);
      setStats(statsRes);
    } catch {
      setError("Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, reasonFilter, typeFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openDetail = async (report: AdminReportListItem) => {
    setDetailLoading(true);
    setSelected(null);
    try {
      const detail = await adminService.getReportDetail(report.id);
      setSelected(detail);
    } catch {
      toast.error("Failed to load report details");
    } finally {
      setDetailLoading(false);
    }
  };

  const runModeration = async (action: ModerationAction, label: string, description: string) => {
    setConfirmAction({ action, label, description });
  };

  const confirmRunModeration = async () => {
    if (!selected || !confirmAction) return;
    setActionLoading(true);
    try {
      await adminService.moderateReport(selected.id, confirmAction.action);
      toast.success(`${confirmAction.label} applied`);
      const fresh = await adminService.getReportDetail(selected.id);
      setSelected(fresh);
      fetchData();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Moderation action failed");
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  };

  const setStatus = async (status: ReportStatus) => {
    if (!selected) return;
    setActionLoading(true);
    try {
      const fresh = await adminService.reviewReport(selected.id, status);
      setSelected(fresh);
      toast.success(status === "RESOLVED" ? "Report resolved — reporter notified" : status === "REJECTED" ? "Report rejected — reporter notified" : "Report moved to under review");
      fetchData();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Failed to update status");
    } finally {
      setActionLoading(false);
    }
  };

  const statCards = [
    { label: "Total Reports", value: stats?.total ?? 0, icon: Flag, color: "text-accent" },
    { label: "Pending", value: stats?.pending ?? 0, icon: Clock, color: "text-amber-500" },
    { label: "Under Review", value: stats?.underReview ?? 0, icon: Eye, color: "text-blue-500" },
    { label: "Resolved", value: stats?.resolved ?? 0, icon: CheckCircle2, color: "text-emerald-500" },
    { label: "Rejected", value: stats?.rejected ?? 0, icon: XCircle, color: "text-red-500" },
  ];

  const EntityIcon = selected ? entityIcon[selected.entityType] : User;

  return (
    <div className="relative space-y-6">
      <div className="absolute -top-20 -right-20 w-72 h-72 bg-gradient-to-bl from-accent/[0.03] to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-5 h-5 rounded-md bg-accent/10 flex items-center justify-center">
            <ShieldAlert className="w-3 h-3 text-accent" />
          </div>
          <span className="text-xs font-medium uppercase tracking-wider text-accent">Moderation Center</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review user-submitted reports and take moderation action.
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
              <p className="text-2xl font-bold mt-2">{s.value.toLocaleString()}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by reporter name, email or username..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setPage(0);
                setSearch(searchInput.trim());
              }
            }}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={reasonFilter} onValueChange={(v) => { setReasonFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Reason" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All reasons</SelectItem>
            {REASONS.map((r) => <SelectItem key={r} value={r}>{r.replace("_", " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Entity" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All entities</SelectItem>
            {ENTITY_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={() => { setPage(0); setSearch(""); setSearchInput(""); setStatusFilter("all"); setReasonFilter("all"); setTypeFilter("all"); }} title="Reset filters">
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
                  <TableHead>Report</TableHead>
                  <TableHead>Reporter</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((__, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <AlertTriangle className="w-8 h-8 text-red-500" />
                        <p className="text-sm text-muted-foreground">{error}</p>
                        <Button variant="outline" size="sm" onClick={fetchData}>Retry</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : !data || data.content.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <Inbox className="w-8 h-8 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">No reports found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  data.content.map((r) => {
                    const Icon = entityIcon[r.entityType];
                    return (
                      <TableRow key={r.id} className="hover:bg-accent/5">
                        <TableCell className="font-mono text-xs">{r.id.slice(0, 8)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center text-[10px] font-bold text-accent shrink-0 overflow-hidden">
                              {r.reporter.avatarUrl ? (
                                <img src={r.reporter.avatarUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                r.reporter.fullName?.charAt(0) || "U"
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate max-w-[140px]">{r.reporter.fullName}</p>
                              <p className="text-xs text-muted-foreground truncate max-w-[140px]">{r.reporter.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 min-w-0">
                            <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm truncate max-w-[180px]">{r.entityTitle}</p>
                              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{r.entityType}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[11px]">{r.reason.replace("_", " ")}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[11px] ${statusStyles[r.status]}`}>{r.status.replace("_", " ")}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(r.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => openDetail(r)}>
                            <Eye className="w-3.5 h-3.5 mr-1" /> View
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {(data?.totalPages ?? 0) > 1 && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Page {data!.page + 1} of {data!.totalPages} · {data!.totalElements.toLocaleString()} reports
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page === 0 || loading}
              onClick={() => setPage((prev) => Math.max(0, prev - 1))}
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Prev
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={data?.last || loading}
              onClick={() => setPage((prev) => prev + 1)}
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Confirmation dialog for destructive moderation actions */}
      <AlertDialog open={!!confirmAction} onOpenChange={(open) => { if (!open) setConfirmAction(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              {confirmAction?.label}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={actionLoading}
              onClick={(e) => {
                e.preventDefault();
                confirmRunModeration();
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Report detail drawer */}
      <Sheet open={!!selected || detailLoading} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {detailLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : selected ? (
            <>
              <SheetHeader>
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-accent" />
                  <SheetTitle>Report {selected.id.slice(0, 8)}</SheetTitle>
                </div>
                <SheetDescription>
                  <Badge variant="outline" className={`mt-1 ${statusStyles[selected.status]}`}>
                    {selected.status.replace("_", " ")}
                  </Badge>
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-5 mt-4">
                {/* Reporter */}
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Reporter</p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-sm font-bold text-accent overflow-hidden">
                      {selected.reporter.avatarUrl ? (
                        <img src={selected.reporter.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        selected.reporter.fullName?.charAt(0) || "U"
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{selected.reporter.fullName}</p>
                      <p className="text-xs text-muted-foreground">{selected.reporter.email}</p>
                    </div>
                  </div>
                </div>

                {/* Reported entity */}
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Reported Content</p>
                  <div className="rounded-lg border border-border/40 p-3 bg-muted/30">
                    <div className="flex items-center gap-2 mb-1">
                      <EntityIcon className="w-4 h-4 text-accent" />
                      <Badge variant="outline" className="text-[10px]">{selected.entityType}</Badge>
                    </div>
                    <p className="text-sm">{selected.entityTitle}</p>
                    {selected.entityOwnerName && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Owner: <span className="text-foreground">{selected.entityOwnerName}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Reason & description */}
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Details</p>
                  <div className="space-y-2">
                    <Badge variant="outline">{selected.reason.replace("_", " ")}</Badge>
                    {selected.description && (
                      <p className="text-sm text-muted-foreground rounded-lg border border-border/40 p-3 bg-muted/30">
                        {selected.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Review info */}
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Review</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-lg border border-border/40 p-3">
                      <p className="text-xs text-muted-foreground">Reviewed by</p>
                      <p className="font-medium truncate">{selected.reviewedByName || "—"}</p>
                    </div>
                    <div className="rounded-lg border border-border/40 p-3">
                      <p className="text-xs text-muted-foreground">Reviewed at</p>
                      <p className="font-medium">{formatDateTime(selected.reviewedAt)}</p>
                    </div>
                    <div className="rounded-lg border border-border/40 p-3">
                      <p className="text-xs text-muted-foreground">Created</p>
                      <p className="font-medium">{formatDateTime(selected.createdAt)}</p>
                    </div>
                    <div className="rounded-lg border border-border/40 p-3">
                      <p className="text-xs text-muted-foreground">Updated</p>
                      <p className="font-medium">{formatDateTime(selected.updatedAt)}</p>
                    </div>
                  </div>
                </div>

                {/* Workflow — only show actionable buttons for non-terminal states */}
                {selected.status !== "RESOLVED" && selected.status !== "REJECTED" && (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Workflow</p>
                    <div className="flex flex-wrap gap-2">
                      {selected.status === "PENDING" && (
                        <Button size="sm" variant="outline" disabled={actionLoading} onClick={() => setStatus("UNDER_REVIEW")}>
                          <Eye className="w-3.5 h-3.5 mr-1" /> Start Review
                        </Button>
                      )}
                      <Button size="sm" variant="outline" disabled={actionLoading} onClick={() => setStatus("RESOLVED")}>
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-500" /> Resolve
                      </Button>
                      <Button size="sm" variant="outline" disabled={actionLoading} onClick={() => setStatus("REJECTED")}>
                        <XCircle className="w-3.5 h-3.5 mr-1 text-red-500" /> Reject
                      </Button>
                    </div>
                  </div>
                )}

                {/* Moderation panel - dynamic per entity type */}
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Moderation Actions</p>
                  <div className="flex flex-wrap gap-2">
                    {selected.entityType === "USER" && (
                      <>
                        <Button size="sm" variant="outline" disabled={actionLoading} onClick={() => runModeration("BLOCK_USER", "Block user", "The reported user will be blocked from logging in and using the platform. This can be undone.")}>
                          <Ban className="w-3.5 h-3.5 mr-1" /> Block
                        </Button>
                        <Button size="sm" variant="outline" disabled={actionLoading} onClick={() => runModeration("UNBLOCK_USER", "Unblock user", "The reported user will be unblocked and can log in again.")}>
                          <Undo2 className="w-3.5 h-3.5 mr-1" /> Unblock
                        </Button>
                        <Button size="sm" variant="outline" disabled={actionLoading} onClick={() => runModeration("DELETE_USER", "Delete user", "This action cannot be undone. The user account will be soft-deleted.")}>
                          <Trash2 className="w-3.5 h-3.5 mr-1 text-red-500" /> Delete
                        </Button>
                      </>
                    )}
                    {selected.entityType === "PROJECT" && (
                      <>
                        <Button size="sm" variant="outline" disabled={actionLoading} onClick={() => runModeration("ARCHIVE_PROJECT", "Archive project", "The project becomes read-only until restored.")}>
                          <Archive className="w-3.5 h-3.5 mr-1" /> Archive
                        </Button>
                        <Button size="sm" variant="outline" disabled={actionLoading} onClick={() => runModeration("SET_VISIBILITY", "Change visibility", "Toggles project visibility between public and private.")}>
                          <Globe className="w-3.5 h-3.5 mr-1" /> Visibility
                        </Button>
                        <Button size="sm" variant="outline" disabled={actionLoading} onClick={() => runModeration("DELETE_PROJECT", "Delete project", "This action cannot be undone. The project will be soft-deleted.")}>
                          <Trash2 className="w-3.5 h-3.5 mr-1 text-red-500" /> Delete
                        </Button>
                      </>
                    )}
                    {selected.entityType === "POST" && (
                      <>
                        <Button size="sm" variant="outline" disabled={actionLoading} onClick={() => runModeration("HIDE_POST", "Hide post", "The post will be hidden from the public feed. It can be restored later.")}>
                          <EyeOff className="w-3.5 h-3.5 mr-1" /> Hide
                        </Button>
                        <Button size="sm" variant="outline" disabled={actionLoading} onClick={() => runModeration("RESTORE_POST", "Restore post", "The hidden post will become visible again.")}>
                          <Undo2 className="w-3.5 h-3.5 mr-1" /> Restore
                        </Button>
                        <Button size="sm" variant="outline" disabled={actionLoading} onClick={() => runModeration("DELETE_POST", "Delete post", "This action cannot be undone. The post and its likes/comments will be removed.")}>
                          <Trash2 className="w-3.5 h-3.5 mr-1 text-red-500" /> Delete
                        </Button>
                      </>
                    )}
                    {selected.entityType === "COMMENT" && (
                      <>
                        <Button size="sm" variant="outline" disabled={actionLoading} onClick={() => runModeration("DELETE_COMMENT", "Delete comment", "This action cannot be undone.")}>
                          <Trash2 className="w-3.5 h-3.5 mr-1 text-red-500" /> Delete
                        </Button>
                        <Button size="sm" variant="outline" disabled={actionLoading} onClick={() => runModeration("RESTORE_COMMENT", "Restore comment", "The hidden comment will become visible again.")}>
                          <Undo2 className="w-3.5 h-3.5 mr-1" /> Restore
                        </Button>
                      </>
                    )}
                    {selected.entityType === "MESSAGE" && (
                      <>
                        <Button size="sm" variant="outline" disabled={actionLoading} onClick={() => runModeration("HIDE_MESSAGE", "Hide message", "The message will be hidden from conversations. It can be restored by an admin.")}>
                          <EyeOff className="w-3.5 h-3.5 mr-1" /> Hide
                        </Button>
                        <Button size="sm" variant="outline" disabled={actionLoading} onClick={() => runModeration("DELETE_MESSAGE", "Delete message", "This action cannot be undone.")}>
                          <Trash2 className="w-3.5 h-3.5 mr-1 text-red-500" /> Delete
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
