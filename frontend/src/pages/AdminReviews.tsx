import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  Shield,
  Star,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Trash2,
  Loader2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Mail,
  ShieldAlert,
} from "lucide-react";
import {
  adminService,
  type AdminReviewListItem,
  type PageResponse,
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

const PAGE_SIZE = 10;

const statusStyles: Record<string, string> = {
  PENDING: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  APPROVED: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  REJECTED: "bg-red-500/10 text-red-500 border-red-500/20",
};

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" role="img" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          aria-hidden
          className={`w-3.5 h-3.5 ${
            i <= rating
              ? "fill-amber-500 text-amber-500"
              : "text-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  );
}

export default function AdminReviews() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [data, setData] = useState<PageResponse<AdminReviewListItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");

  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminReviewListItem | null>(null);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminService.getAdminReviews({
        page,
        size: PAGE_SIZE,
        search: search || undefined,
        status: status === "ALL" ? undefined : (status as any),
      });
      setData(res);
    } catch {
      setError("Failed to load reviews. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const applySearch = () => {
    setPage(0);
    setSearch(searchInput.trim());
  };

  const handleApprove = async (review: AdminReviewListItem) => {
    setBusyId(review.id);
    try {
      await adminService.approveReview(review.id);
      toast.success("Review approved — now visible on the landing page");
      fetchReviews();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to approve review");
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (review: AdminReviewListItem) => {
    setBusyId(review.id);
    try {
      await adminService.rejectReview(review.id);
      toast.success("Review rejected");
      fetchReviews();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to reject review");
    } finally {
      setBusyId(null);
    }
  };

  const handleFeature = async (review: AdminReviewListItem) => {
    setBusyId(review.id);
    try {
      const updated = await adminService.setReviewFeatured(review.id, !review.featured);
      toast.success(updated.featured ? "Review featured" : "Review unfeatured");
      fetchReviews();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update featured status");
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      await adminService.deleteReview(deleteTarget.id);
      toast.success("Review deleted");
      setDeleteTarget(null);
      if (data && data.content.length === 1 && page > 0) {
        setPage(page - 1);
      } else {
        fetchReviews();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to delete review");
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
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Review Moderation</h1>
        </div>
        <p className="ml-7 text-sm text-muted-foreground">
          Approve, reject or feature user reviews. Only approved reviews appear on the landing page.
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
            placeholder="Search by reviewer or review text..."
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(0); }}>
          <SelectTrigger className="w-full sm:w-40" aria-label="Filter by status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={fetchReviews} disabled={loading} title="Refresh">
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
                  <TableHead>Reviewer</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Review</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
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
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-3 w-56" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-32 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-14">
                      <div className="flex flex-col items-center gap-3 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center ring-1 ring-destructive/20">
                          <AlertTriangle className="w-6 h-6 text-destructive" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">Something went wrong</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{error}</p>
                        </div>
                        <Button size="sm" variant="outline" onClick={fetchReviews}>
                          <RefreshCw className="w-3.5 h-3.5 mr-2" /> Retry
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (data?.content.length ?? 0) === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-14">
                      <div className="flex flex-col items-center gap-3 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-accent/5 flex items-center justify-center ring-1 ring-accent/20">
                          <Star className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">No reviews found</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Try adjusting your search or filters</p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.content.map((r) => (
                    <TableRow key={r.id} className="hover:bg-accent/5 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8 ring-1 ring-accent/20">
                            {r.reviewerAvatarUrl ? <AvatarImage src={r.reviewerAvatarUrl} alt="" /> : null}
                            <AvatarFallback className="bg-gradient-to-br from-accent/20 to-accent/5 text-xs font-medium text-accent">
                              {(r.reviewerName || "U").charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{r.reviewerName}</p>
                            <p className="text-xs text-muted-foreground truncate">@{r.reviewerUsername || "—"}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <Stars rating={r.rating} />
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(r.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[280px]">
                        <p className="text-sm text-foreground font-medium truncate">
                          {r.title || "Untitled"}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{r.comment}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {r.category.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusStyles[r.status] || ""}>
                          {r.status}
                          {r.featured && (
                            <Sparkles className="w-3 h-3 ml-1 text-amber-500" aria-label="Featured" />
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1.5">
                          {r.status === "PENDING" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-emerald-500 hover:text-emerald-600"
                                onClick={() => handleApprove(r)}
                                disabled={busyId === r.id}
                              >
                                {busyId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-500 hover:text-red-600"
                                onClick={() => handleReject(r)}
                                disabled={busyId === r.id}
                              >
                                {busyId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                                Reject
                              </Button>
                            </>
                          )}
                          {r.status === "APPROVED" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleFeature(r)}
                              disabled={busyId === r.id}
                              className={r.featured ? "text-amber-500 border-amber-500/40" : "text-muted-foreground"}
                              title={r.featured ? "Unfeature" : "Feature on landing page"}
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              {r.featured ? "Featured" : "Feature"}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-muted-foreground hover:text-destructive px-2"
                            onClick={() => setDeleteTarget(r)}
                            disabled={busyId === r.id}
                            title="Delete review"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
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
            Page {data!.page + 1} of {data!.totalPages} · {data!.totalElements.toLocaleString()} reviews
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

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-destructive" /> Delete this review?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The review will be permanently removed and will never appear on the landing page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={busyId === deleteTarget?.id}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              {busyId === deleteTarget?.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Delete Review
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <Mail className="w-3 h-3" /> Reviewer emails are only visible to admins and are never sent to the public API.
      </p>
    </div>
  );
}
