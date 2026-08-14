import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  Shield,
  Search,
  RefreshCw,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Mail,
  ShieldAlert,
  MessageSquarePlus,
} from "lucide-react";
import {
  adminService,
  type AdminFeedbackListItem,
  type PageResponse,
  type FeedbackStatus,
} from "@/services/adminService";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const PAGE_SIZE = 10;

const statusStyles: Record<string, string> = {
  OPEN: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  IN_REVIEW: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  RESOLVED: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  CLOSED: "bg-muted text-muted-foreground border-border/50",
};

const FEEDBACK_STATUSES: FeedbackStatus[] = ["OPEN", "IN_REVIEW", "RESOLVED", "CLOSED"];

export default function AdminFeedback() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [data, setData] = useState<PageResponse<AdminFeedbackListItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [category, setCategory] = useState("ALL");
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminService.getAdminFeedback({
        page,
        size: PAGE_SIZE,
        search: search || undefined,
        status: status === "ALL" ? undefined : (status as any),
        category: category === "ALL" ? undefined : category,
      });
      setData(res);
    } catch {
      setError("Failed to load feedback. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [page, search, status, category]);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  const applySearch = () => {
    setPage(0);
    setSearch(searchInput.trim());
  };

  const handleStatusChange = async (item: AdminFeedbackListItem, newStatus: FeedbackStatus) => {
    setBusyId(item.id);
    try {
      await adminService.updateFeedbackStatus(item.id, newStatus);
      toast.success(`Feedback marked as ${newStatus.replace("_", " ")}`);
      fetchFeedback();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update status");
    } finally {
      setBusyId(null);
    }
  };

  if (currentUser && currentUser.role !== "ADMIN") {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center ring-1 ring-destructive/20">
            <Shield className="w-7 h-7 text-destructive" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Access Denied</h2>
            <p className="text-sm text-muted-foreground mt-1">
              You don't have admin privileges. Contact the platform owner if you believe this is a mistake.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => navigate("/dashboard")} className="text-sm">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative space-y-6">
      <div className="absolute -top-20 -right-20 w-72 h-72 bg-gradient-to-bl from-accent/[0.03] to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-5 h-5 rounded-md bg-accent/10 flex items-center justify-center">
            <ShieldAlert className="w-3 h-3 text-accent" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Private Feedback</h1>
        </div>
        <p className="ml-7 text-sm text-muted-foreground">
          Product feedback from users. This is private — it never appears on the public site.
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applySearch()}
            placeholder="Search by user or message..."
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(0); }}>
          <SelectTrigger className="w-full sm:w-40" aria-label="Filter by status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="IN_REVIEW">In Review</SelectItem>
            <SelectItem value="RESOLVED">Resolved</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={category} onValueChange={(v) => { setCategory(v); setPage(0); }}>
          <SelectTrigger className="w-full sm:w-44" aria-label="Filter by category">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Categories</SelectItem>
            <SelectItem value="BUG">Bug</SelectItem>
            <SelectItem value="FEATURE_REQUEST">Feature Request</SelectItem>
            <SelectItem value="UI_UX">UI/UX</SelectItem>
            <SelectItem value="PERFORMANCE">Performance</SelectItem>
            <SelectItem value="SECURITY">Security</SelectItem>
            <SelectItem value="GENERAL">General</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={fetchFeedback} disabled={loading} title="Refresh">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
        <Button size="sm" onClick={applySearch} className="sm:hidden">
          Search
        </Button>
      </div>

      {/* Table */}
      <Card className="border-border/50 gap-0 overflow-hidden">
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Skeleton className="w-8 h-8 rounded-full" />
                          <div className="space-y-1.5">
                            <Skeleton className="h-3 w-24" />
                            <Skeleton className="h-2.5 w-16" />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-3 w-56" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-3 w-20 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-14">
                      <div className="flex flex-col items-center gap-3 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center ring-1 ring-destructive/20">
                          <AlertTriangle className="w-6 h-6 text-destructive" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">Something went wrong</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{error}</p>
                        </div>
                        <Button size="sm" variant="outline" onClick={fetchFeedback}>
                          <RefreshCw className="w-3.5 h-3.5 mr-2" /> Retry
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (data?.content.length ?? 0) === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-14">
                      <div className="flex flex-col items-center gap-3 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-accent/5 flex items-center justify-center ring-1 ring-accent/20">
                          <MessageSquarePlus className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">No feedback found</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Try adjusting your search or filters</p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.content.map((f) => (
                    <TableRow key={f.id} className="hover:bg-accent/5 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8 ring-1 ring-accent/20">
                            {f.userAvatarUrl ? <AvatarImage src={f.userAvatarUrl} alt="" /> : null}
                            <AvatarFallback className="bg-gradient-to-br from-accent/20 to-accent/5 text-xs font-medium text-accent">
                              {(f.userName || "U").charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{f.userName}</p>
                            <p className="text-xs text-muted-foreground truncate">@{f.userUsername || "—"}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {f.category.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[320px]">
                        <p className="text-sm text-foreground line-clamp-2">{f.message}</p>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={f.status}
                          onValueChange={(v) => handleStatusChange(f, v as FeedbackStatus)}
                          disabled={busyId === f.id}
                        >
                          <SelectTrigger size="sm" className="w-[130px]" aria-label="Change status">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FEEDBACK_STATUSES.map((s) => (
                              <SelectItem key={s} value={s}>
                                {s.replace("_", " ")}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant="outline" className={statusStyles[f.status] || ""}>
                            {f.status.replace("_", " ")}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {new Date(f.createdAt).toLocaleDateString()}
                          </span>
                        </div>
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
      {(data?.totalPages ?? 0) > 1 && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Page {data!.page + 1} of {data!.totalPages} · {data!.totalElements.toLocaleString()} items
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page === 0 || loading}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Prev
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={data?.last || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <Mail className="w-3 h-3" /> Private feedback is visible only to admins — it is never exposed through public endpoints.
      </p>
    </div>
  );
}
