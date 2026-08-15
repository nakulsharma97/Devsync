import { useCallback, useEffect, useState } from "react";
import {
  Ban,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  Eye,
  Inbox,
  Loader2,
  LogIn,
  RefreshCw,
  Search,
  ShieldCheck,
  ShieldOff,
  Trash2,
  UserCog,
  XCircle,
} from "lucide-react";
import { getErrorMessage } from "@/lib/utils";
import {
  adminService,
  type AuditLogItem,
  type PageResponse,
} from "@/services/adminService";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

const ACTION_META: Record<string, { label: string; badge: string }> = {
  REGISTER: { label: "Register", badge: "bg-slate-500/10 text-slate-600" },
  LOGIN_SUCCESS: { label: "Login Success", badge: "bg-emerald-500/10 text-emerald-600" },
  LOGIN_FAILURE: { label: "Login Failure", badge: "bg-red-500/10 text-red-600" },
  LOGOUT: { label: "Logout", badge: "bg-slate-500/10 text-slate-600" },
  JWT_REFRESH: { label: "JWT Refresh", badge: "bg-blue-500/10 text-blue-600" },
  PASSWORD_RESET: { label: "Password Reset", badge: "bg-amber-500/10 text-amber-600" },
  PASSWORD_CHANGED: { label: "Password Changed", badge: "bg-amber-500/10 text-amber-600" },
  EMAIL_CHANGED: { label: "Email Changed", badge: "bg-amber-500/10 text-amber-600" },
  OTP_VERIFIED: { label: "OTP Verified", badge: "bg-violet-500/10 text-violet-600" },
  OAUTH_LOGIN: { label: "OAuth Login", badge: "bg-cyan-500/10 text-cyan-600" },
  ROLE_CHANGED: { label: "Role Changed", badge: "bg-fuchsia-500/10 text-fuchsia-600" },
  ADMIN_CREATED: { label: "Admin Created", badge: "bg-fuchsia-500/10 text-fuchsia-600" },
  USER_BLOCKED: { label: "User Blocked", badge: "bg-red-500/10 text-red-600" },
  USER_UNBLOCKED: { label: "User Unblocked", badge: "bg-emerald-500/10 text-emerald-600" },
  USER_DELETED: { label: "User Deleted", badge: "bg-red-500/10 text-red-600" },
  PROJECT_DELETED: { label: "Project Deleted", badge: "bg-red-500/10 text-red-600" },
  PROJECT_ARCHIVED: { label: "Project Archived", badge: "bg-amber-500/10 text-amber-600" },
  PROJECT_RESTORED: { label: "Project Restored", badge: "bg-emerald-500/10 text-emerald-600" },
  VISIBILITY_CHANGED: { label: "Visibility Changed", badge: "bg-blue-500/10 text-blue-600" },
  MODERATION_ACTION: { label: "Moderation Action", badge: "bg-orange-500/10 text-orange-600" },
};

const STATUS_META: Record<string, { label: string; badge: string }> = {
  SUCCESS: { label: "Success", badge: "bg-emerald-500/10 text-emerald-600" },
  FAILURE: { label: "Failure", badge: "bg-red-500/10 text-red-600" },
};

export const ACTION_OPTIONS = Object.keys(ACTION_META);
const STATUS_OPTIONS = ["SUCCESS", "FAILURE"];

function timeAgo(iso?: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ActionIcon({ action }: { action: string }) {
  if (action.includes("LOGIN")) return <LogIn className="w-3.5 h-3.5" />;
  if (action.includes("BLOCK")) return <Ban className="w-3.5 h-3.5" />;
  if (action.includes("DELETE") || action.includes("DELETED")) return <Trash2 className="w-3.5 h-3.5" />;
  if (action.includes("ROLE") || action.includes("ADMIN_CREATED")) return <UserCog className="w-3.5 h-3.5" />;
  if (action.includes("ARCHIVE")) return <ShieldOff className="w-3.5 h-3.5" />;
  if (action.includes("VISIBILITY")) return <Eye className="w-3.5 h-3.5" />;
  if (action.includes("FAILURE")) return <XCircle className="w-3.5 h-3.5" />;
  return <ClipboardList className="w-3.5 h-3.5" />;
}

export default function AdminAuditLogs() {
  const [data, setData] = useState<PageResponse<AuditLogItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [, setUserInput] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<AuditLogItem | null>(null);
  const [, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminService.getAuditLogs({
        page,
        size: 10,
        search: searchInput || undefined,
        action: actionFilter && actionFilter !== "ALL" ? actionFilter : undefined,
        status: statusFilter && statusFilter !== "ALL" ? statusFilter : undefined,
        adminId: userFilter || undefined,
        userId: userFilter || undefined,
        from: from ? new Date(from).toISOString() : undefined,
        to: to ? new Date(to).toISOString() : undefined,
      });
      setData(res);
    } catch (e) {
      setError(getErrorMessage(e, "Failed to load audit logs."));
      toast.error("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, [page, searchInput, actionFilter, statusFilter, userFilter, from, to]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const applyFilters = () => {
    setPage(0);
    setSearchInput(search);
    setUserInput(userFilter);
  };

  const resetFilters = () => {
    setSearch("");
    setSearchInput("");
    setActionFilter("");
    setStatusFilter("");
    setUserFilter("");
    setUserInput("");
    setFrom("");
    setTo("");
    setPage(0);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await adminService.exportAuditLogsCsv({
        search: searchInput || undefined,
        action: actionFilter && actionFilter !== "ALL" ? actionFilter : undefined,
        status: statusFilter && statusFilter !== "ALL" ? statusFilter : undefined,
        adminId: userFilter || undefined,
        userId: userFilter || undefined,
        from: from ? new Date(from).toISOString() : undefined,
        to: to ? new Date(to).toISOString() : undefined,
      });
      toast.success("Audit logs exported");
    } catch (e) {
      toast.error(getErrorMessage(e, "Export failed"));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="relative space-y-6">
      <div className="absolute -top-20 -right-20 w-72 h-72 bg-gradient-to-bl from-accent/[0.03] to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-accent" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Audit Logs</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Security-sensitive events across the platform — logins, role changes, blocks and more.
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-5">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search action, IP, details…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyFilters()}
              />
            </div>
            <div className="relative">
              <UserCog className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Filter by user or admin…"
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyFilters()}
              />
            </div>
            <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(0); }}>
              <SelectTrigger>
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {/* Radix Select forbids empty-string item values — "ALL" is the sentinel. */}
                <SelectItem value="ALL">All actions</SelectItem>
                {ACTION_OPTIONS.map((a) => (
                  <SelectItem key={a} value={a}>{ACTION_META[a]?.label ?? a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_META[s]?.label ?? s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date" />
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date" />
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={applyFilters}>
                <Search className="w-4 h-4 mr-1" /> Apply
              </Button>
              <Button variant="ghost" size="sm" onClick={resetFilters}>Reset</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table card */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              {loading ? "Loading…" : `${data?.totalElements?.toLocaleString() ?? 0} audit events`}
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={fetchLogs}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
              </Button>
              <Button size="sm" variant="outline" onClick={handleExport} disabled={exporting}>
                {exporting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />}
                Export CSV
              </Button>
            </div>
          </div>

          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Performed By</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead className="text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((__, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : !data || data.content.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <Inbox className="w-8 h-8 text-muted-foreground/50" />
                        <p className="text-sm text-muted-foreground">No audit logs found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  data.content.map((log) => {
                    const meta = ACTION_META[log.action] ?? { label: log.action, badge: "bg-slate-500/10 text-slate-600" };
                    const sm = STATUS_META[log.status] ?? { label: log.status, badge: "bg-slate-500/10 text-slate-600" };
                    return (
                      <TableRow
                        key={log.id}
                        className="cursor-pointer hover:bg-muted/40 transition-colors"
                        onClick={() => setSelected(log)}
                      >
                        <TableCell className="whitespace-nowrap text-xs">{timeAgo(log.createdAt)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={`gap-1 ${meta.badge}`}>
                            <ActionIcon action={log.action} />
                            {meta.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{log.performedByName ?? "—"}</TableCell>
                        <TableCell className="text-sm">{log.targetUserName ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={sm.badge}>{sm.label}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{log.ipAddress ?? "—"}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelected(log); }}>
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {(data?.totalPages ?? 0) > 1 && (
            <div className="flex items-center justify-between gap-3 mt-4">
              <p className="text-xs text-muted-foreground">
                Page {data!.page + 1} of {data!.totalPages} · {data!.totalElements.toLocaleString()} logs
              </p>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" disabled={page === 0 || loading} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                  <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                </Button>
                <Button size="sm" variant="outline" disabled={data?.last || loading} onClick={() => setPage((p) => p + 1)}>
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail drawer */}
      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-accent" />
              Audit Log Details
            </SheetTitle>
            <SheetDescription>
              {selected ? formatDate(selected.createdAt) : ""}
            </SheetDescription>
          </SheetHeader>
          {selected && (
            <div className="space-y-4 mt-2">
              <div className="flex items-center gap-3 p-4 rounded-xl border bg-muted/30">
                <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                  <ActionIcon action={selected.action} />
                </div>
                <div>
                  <p className="font-medium text-sm">{ACTION_META[selected.action]?.label ?? selected.action}</p>
                  <p className="text-xs text-muted-foreground">
                    {STATUS_META[selected.status]?.label ?? selected.status}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg border">
                  <p className="text-xs text-muted-foreground">Performed By</p>
                  <p className="text-sm font-medium mt-1">{selected.performedByName ?? "—"}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{selected.performedBy ? `ID: ${selected.performedBy}` : ""}</p>
                </div>
                <div className="p-3 rounded-lg border">
                  <p className="text-xs text-muted-foreground">Target User</p>
                  <p className="text-sm font-medium mt-1">{selected.targetUserName ?? "—"}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{selected.targetUserId ? `ID: ${selected.targetUserId}` : ""}</p>
                </div>
                <div className="p-3 rounded-lg border">
                  <p className="text-xs text-muted-foreground">IP Address</p>
                  <p className="text-sm font-medium font-mono mt-1">{selected.ipAddress ?? "—"}</p>
                </div>
                <div className="p-3 rounded-lg border">
                  <p className="text-xs text-muted-foreground">Device</p>
                  <p className="text-sm font-medium mt-1">{selected.device ?? "—"}</p>
                </div>
                <div className="p-3 rounded-lg border">
                  <p className="text-xs text-muted-foreground">Browser</p>
                  <p className="text-sm font-medium mt-1">{selected.browser ?? "—"}</p>
                </div>
                <div className="p-3 rounded-lg border">
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="text-sm font-medium mt-1">{formatDate(selected.createdAt)}</p>
                </div>
              </div>

              {selected.details && (
                <div className="p-3 rounded-lg border">
                  <p className="text-xs text-muted-foreground mb-1">Details</p>
                  <pre className="text-xs font-mono whitespace-pre-wrap break-words bg-muted/40 rounded p-2">
                    {selected.details}
                  </pre>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
