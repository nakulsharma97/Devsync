import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  Shield,
  Users,
  Search,
  RefreshCw,
  Eye,
  Ban,
  ShieldCheck,
  Trash2,
  Loader2,
  Mail,
  Calendar,
  FolderGit2,
  Rss,
  MessagesSquare,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  UserCog,
  Building2,
  MapPin,
} from "lucide-react";
import {
  adminService,
  type AdminUserDetail,
  type AdminUserListItem,
  type PageResponse,
} from "@/services/adminService";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";

const PAGE_SIZE = 10;

const statusStyles: Record<string, string> = {
  ACTIVE: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  BLOCKED: "bg-red-500/10 text-red-500 border-red-500/20",
  DELETED: "bg-muted text-muted-foreground border-border/50",
};

const roleStyles: Record<string, string> = {
  ADMIN: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  USER: "bg-blue-500/10 text-blue-500 border-blue-500/20",
};

function fmtDate(value?: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

function fmtDateTime(value?: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export default function AdminUsers() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [data, setData] = useState<PageResponse<AdminUserListItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("ALL");
  const [status, setStatus] = useState("ALL");

  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [blockTarget, setBlockTarget] = useState<AdminUserListItem | null>(null);
  const [blockReason, setBlockReason] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<AdminUserListItem | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminService.getUsersPage({
        page,
        size: PAGE_SIZE,
        sortBy: "createdAt",
        sortDir: "desc",
        search: search || undefined,
        role: role === "ALL" ? undefined : role,
        status: status === "ALL" ? undefined : status,
      });
      setData(res);
    } catch {
      setError("Failed to load users. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [page, search, role, status]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const applySearch = () => {
    setPage(0);
    setSearch(searchInput.trim());
  };

  const openDetail = async (userId: string) => {
    setSheetOpen(true);
    setDetail(null);
    setDetailLoading(true);
    try {
      const d = await adminService.getUserDetail(userId);
      setDetail(d);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    setBusyId(userId);
    try {
      await adminService.updateUserRole(userId, newRole);
      toast.success(`Role updated to ${newRole}`);
      fetchUsers();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update role");
    } finally {
      setBusyId(null);
    }
  };

  const confirmBlock = async () => {
    if (!blockTarget) return;
    setBusyId(blockTarget.id);
    try {
      await adminService.setUserBlocked(blockTarget.id, true);
      toast.success(`${blockTarget.fullName} has been blocked`);
      setBlockTarget(null);
      setBlockReason("");
      fetchUsers();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to block user");
    } finally {
      setBusyId(null);
    }
  };

  const confirmUnblock = async (user: AdminUserListItem) => {
    setBusyId(user.id);
    try {
      await adminService.setUserBlocked(user.id, false);
      toast.success(`${user.fullName} has been unblocked`);
      fetchUsers();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to unblock user");
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      await adminService.deleteUser(deleteTarget.id);
      toast.success(`${deleteTarget.fullName} has been deleted`);
      setDeleteTarget(null);
      if (data && data.content.length === 1 && page > 0) {
        setPage(page - 1);
      } else {
        fetchUsers();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to delete user");
    } finally {
      setBusyId(null);
    }
  };

  const isSelf = (userId: string) => currentUser?.id === userId;

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
          <h1 className="text-2xl font-bold tracking-tight text-foreground">User Management</h1>
        </div>
        <p className="ml-7 text-sm text-muted-foreground">
          Search, review and manage every account on the platform
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
            placeholder="Search by name, username or email..."
            className="pl-9"
          />
        </div>
        <Select value={role} onValueChange={(v) => { setRole(v); setPage(0); }}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Roles</SelectItem>
            <SelectItem value="USER">User</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(0); }}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="BLOCKED">Blocked</SelectItem>
            <SelectItem value="DELETED">Deleted</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={fetchUsers} disabled={loading} title="Refresh">
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
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
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
                            <Skeleton className="h-3 w-28" />
                            <Skeleton className="h-2.5 w-20" />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><Skeleton className="h-3 w-36" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-14 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-3 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
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
                        <Button size="sm" variant="outline" onClick={fetchUsers}>
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
                          <Users className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">No users found</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Try adjusting your search or filters</p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.content.map((u) => (
                    <TableRow key={u.id} className="hover:bg-accent/5 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8 ring-1 ring-accent/20">
                            {u.avatarUrl ? (
                              <AvatarImage src={u.avatarUrl} alt="" />
                            ) : null}
                            <AvatarFallback className="bg-gradient-to-br from-accent/20 to-accent/5 text-xs font-medium text-accent">
                              {(u.fullName || "U").charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {u.fullName}
                              {isSelf(u.id) && (
                                <span className="ml-1.5 text-[10px] text-muted-foreground">(you)</span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">@{u.username || "—"}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <Mail className="w-3 h-3" /> {u.email}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={roleStyles[u.role] || ""}>
                          {u.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusStyles[u.status] || ""}>
                          {u.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {fmtDate(u.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1.5">
                          <Select
                            value={u.role}
                            onValueChange={(v) => handleRoleChange(u.id, v)}
                            disabled={busyId === u.id || isSelf(u.id) || u.status === "DELETED"}
                          >
                            <SelectTrigger size="sm" className="w-[92px]" aria-label="Change role">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="USER">User</SelectItem>
                              <SelectItem value="ADMIN">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost" className="px-2 text-muted-foreground hover:text-foreground">
                                {busyId === u.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <span className="text-xs font-medium">•••</span>
                                )}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuLabel className="text-xs">Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => openDetail(u.id)} disabled={u.status === "DELETED"}>
                                <Eye className="w-3.5 h-3.5 mr-2" /> View Details
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {u.status === "BLOCKED" ? (
                                <DropdownMenuItem
                                  onClick={() => confirmUnblock(u)}
                                  disabled={busyId === u.id || isSelf(u.id) || u.status === "DELETED"}
                                  className="text-emerald-500 focus:text-emerald-500"
                                >
                                  <ShieldCheck className="w-3.5 h-3.5 mr-2" /> Unblock
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => { setBlockTarget(u); setBlockReason(""); }}
                                  disabled={busyId === u.id || isSelf(u.id) || u.status === "DELETED"}
                                  className="text-amber-500 focus:text-amber-500"
                                >
                                  <Ban className="w-3.5 h-3.5 mr-2" /> Block User
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setDeleteTarget(u)}
                                disabled={busyId === u.id || isSelf(u.id) || u.status === "DELETED"}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete User
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
            Page {data!.page + 1} of {data!.totalPages} · {data!.totalElements.toLocaleString()} users
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

      {/* Block confirmation dialog */}
      <AlertDialog open={!!blockTarget} onOpenChange={(open) => !open && setBlockTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Ban className="w-4 h-4 text-amber-500" /> Block {blockTarget?.fullName}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Blocked users can no longer log in, refresh tokens or access any secured API. Their data is preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">Reason (optional)</label>
            <Textarea
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              placeholder="e.g. Spam, abusive behaviour, policy violation..."
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBlock}
              disabled={busyId === blockTarget?.id}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              {busyId === blockTarget?.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Block User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-destructive" /> Delete {deleteTarget?.fullName}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The account will be soft-deleted: their data is preserved but they
              can no longer log in. Their account status will be shown as Deleted.
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
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* User detail drawer */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="border-b border-border/40 pb-4">
            <SheetTitle className="flex items-center gap-3">
              <Avatar className="w-12 h-12 ring-1 ring-accent/20">
                {detail?.avatarUrl ? <AvatarImage src={detail.avatarUrl} alt="" /> : null}
                <AvatarFallback className="bg-gradient-to-br from-accent/20 to-accent/5 text-sm font-medium text-accent">
                  {(detail?.fullName || "U").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-base font-semibold truncate">{detail?.fullName}</p>
                <p className="text-xs text-muted-foreground truncate">@{detail?.username || "—"}</p>
              </div>
            </SheetTitle>
            <SheetDescription className="sr-only">User details</SheetDescription>
          </SheetHeader>

          {detailLoading ? (
            <div className="space-y-4 p-1">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-4 w-32" />
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-16 rounded-lg" />
                <Skeleton className="h-16 rounded-lg" />
                <Skeleton className="h-16 rounded-lg" />
                <Skeleton className="h-16 rounded-lg" />
              </div>
            </div>
          ) : detail ? (
            <div className="space-y-6 p-1">
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={roleStyles[detail.role] || ""}>
                  {detail.role}
                </Badge>
                <Badge variant="outline" className={statusStyles[detail.status] || ""}>
                  {detail.status}
                </Badge>
                {detail.emailVerified ? (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                    Verified
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-muted text-muted-foreground border-border/50">
                    Unverified
                  </Badge>
                )}
              </div>

              {/* Contact info */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2.5 text-sm">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-foreground break-all">{detail.email}</span>
                </div>
                {detail.company && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span>{detail.company}</span>
                  </div>
                )}
                {detail.location && (
                  <div className="flex items-center gap-2.5 text-sm">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span>{detail.location}</span>
                  </div>
                )}
                {detail.bio && <p className="text-sm text-muted-foreground leading-relaxed">{detail.bio}</p>}
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: FolderGit2, label: "Projects Owned", value: detail.projectsOwned.length, color: "text-indigo-400" },
                  { icon: UserCog, label: "Projects Joined", value: detail.projectsJoined.length, color: "text-blue-400" },
                  { icon: Users, label: "Teams", value: detail.teams.length, color: "text-amber-400" },
                  { icon: Rss, label: "Posts", value: detail.postsCount, color: "text-purple-400" },
                  { icon: MessagesSquare, label: "Messages", value: detail.messagesCount, color: "text-cyan-400" },
                ].map((s) => (
                  <div key={s.label} className="border border-border/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <s.icon className={`w-3.5 h-3.5 ${s.color}`} />
                      <p className="text-[11px] text-muted-foreground">{s.label}</p>
                    </div>
                    <p className="text-lg font-bold">{s.value.toLocaleString()}</p>
                  </div>
                ))}
              </div>

              {/* Dates */}
              <div className="space-y-2.5 border-t border-border/40 pt-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5" /> Created
                  </span>
                  <span>{fmtDateTime(detail.createdAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <UserCog className="w-3.5 h-3.5" /> Last Login
                  </span>
                  <span>{fmtDateTime(detail.lastLoginAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Auth Provider</span>
                  <span className="capitalize">{detail.authProvider}</span>
                </div>
              </div>

              {/* Owned projects */}
              {detail.projectsOwned.length > 0 && (
                <div className="border-t border-border/40 pt-4">
                  <p className="text-xs font-semibold text-foreground mb-2">Owned Projects</p>
                  <div className="flex flex-wrap gap-1.5">
                    {detail.projectsOwned.map((p) => (
                      <Badge key={p.id} variant="secondary" className="text-xs">
                        {p.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Joined projects */}
              {detail.projectsJoined.length > 0 && (
                <div className="border-t border-border/40 pt-4">
                  <p className="text-xs font-semibold text-foreground mb-2">Joined Projects</p>
                  <div className="flex flex-wrap gap-1.5">
                    {detail.projectsJoined.map((p) => (
                      <Badge key={p.id} variant="secondary" className="text-xs">
                        {p.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Teams */}
              {detail.teams.length > 0 && (
                <div className="border-t border-border/40 pt-4">
                  <p className="text-xs font-semibold text-foreground mb-2">Teams</p>
                  <div className="flex flex-wrap gap-1.5">
                    {detail.teams.map((t) => (
                      <Badge key={t.id} variant="secondary" className="text-xs">
                        {t.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-14 text-center">
              <AlertTriangle className="w-6 h-6 text-destructive" />
              <p className="text-sm text-muted-foreground">Failed to load user details</p>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
