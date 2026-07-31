import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  Shield,
  ShieldAlert,
  FolderGit2,
  Search,
  RefreshCw,
  Eye,
  Archive,
  ArchiveRestore,
  Trash2,
  Loader2,
  Globe,
  Lock,
  Users,
  ListChecks,
  MessagesSquare,
  Rss,
  Activity,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  CircleCheck,
  CircleDashed,
  Calendar,
  User,
} from "lucide-react";
import {
  adminService,
  type AdminProjectDetail,
  type AdminProjectListItem,
  type AdminProjectStats,
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
  ARCHIVED: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  COMPLETED: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  DELETED: "bg-muted text-muted-foreground border-border/50",
};

const visibilityStyles: Record<string, string> = {
  PUBLIC: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  PRIVATE: "bg-purple-500/10 text-purple-500 border-purple-500/20",
};

function fmtDate(value?: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

function fmtDateTime(value?: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

export default function AdminProjects() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [data, setData] = useState<PageResponse<AdminProjectListItem> | null>(null);
  const [stats, setStats] = useState<AdminProjectStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [visibility, setVisibility] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [sortKey, setSortKey] = useState("newest");

  const [detail, setDetail] = useState<AdminProjectDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<AdminProjectListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminProjectListItem | null>(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sortMap: Record<string, { sortBy: string; sortDir: "asc" | "desc" }> = {
        newest: { sortBy: "createdAt", sortDir: "desc" },
        oldest: { sortBy: "createdAt", sortDir: "asc" },
        mostActive: { sortBy: "updatedAt", sortDir: "desc" },
        mostMembers: { sortBy: "mostMembers", sortDir: "desc" },
        mostTasks: { sortBy: "mostTasks", sortDir: "desc" },
      };
      const s = sortMap[sortKey] || sortMap.newest;
      const res = await adminService.getProjectsPage({
        page,
        size: PAGE_SIZE,
        sortBy: s.sortBy,
        sortDir: s.sortDir,
        search: search || undefined,
        visibility: visibility === "ALL" ? undefined : visibility,
        status: status === "ALL" ? undefined : status,
      });
      setData(res);
    } catch {
      setError("Failed to load projects. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [page, search, visibility, status, sortKey]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const fetchStats = useCallback(async () => {
    try {
      setStats(await adminService.getProjectStats());
    } catch {
      setStats(null);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const applySearch = () => {
    setPage(0);
    setSearch(searchInput.trim());
  };

  const openDetail = async (projectId: string) => {
    setSheetOpen(true);
    setDetail(null);
    setDetailLoading(true);
    try {
      setDetail(await adminService.getProjectDetail(projectId));
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!archiveTarget) return;
    setBusyId(archiveTarget.id);
    try {
      await adminService.archiveProject(archiveTarget.id);
      toast.success(`${archiveTarget.name} has been archived`);
      setArchiveTarget(null);
      fetchProjects();
      fetchStats();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to archive project");
    } finally {
      setBusyId(null);
    }
  };

  const handleRestore = async (project: AdminProjectListItem) => {
    setBusyId(project.id);
    try {
      await adminService.restoreProject(project.id);
      toast.success(`${project.name} has been restored`);
      fetchProjects();
      fetchStats();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to restore project");
    } finally {
      setBusyId(null);
    }
  };

  const handleVisibility = async (project: AdminProjectListItem, next: string) => {
    setBusyId(project.id);
    try {
      await adminService.setProjectVisibility(project.id, next);
      toast.success(`Visibility set to ${next}`);
      fetchProjects();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update visibility");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      await adminService.deleteProject(deleteTarget.id);
      toast.success(`${deleteTarget.name} has been deleted`);
      setDeleteTarget(null);
      fetchStats();
      if (data && data.content.length === 1 && page > 0) {
        setPage(page - 1);
      } else {
        fetchProjects();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to delete project");
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

  const statCards = [
    { label: "Total Projects", value: stats?.total ?? 0, icon: FolderGit2, color: "text-accent" },
    { label: "Active", value: stats?.active ?? 0, icon: CircleCheck, color: "text-emerald-500" },
    { label: "Archived", value: stats?.archived ?? 0, icon: Archive, color: "text-amber-500" },
    { label: "Public", value: stats?.publicCount ?? 0, icon: Globe, color: "text-blue-500" },
    { label: "Private", value: stats?.privateCount ?? 0, icon: Lock, color: "text-purple-500" },
  ];

  return (
    <div className="relative space-y-6">
      <div className="absolute -top-20 -right-20 w-72 h-72 bg-gradient-to-bl from-accent/[0.03] to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-5 h-5 rounded-md bg-accent/10 flex items-center justify-center">
            <ShieldAlert className="w-3 h-3 text-accent" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Project Management</h1>
        </div>
        <p className="ml-7 text-sm text-muted-foreground">
          Review, archive and manage every project on the platform
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {statCards.map((s) => (
          <Card key={s.label} className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-accent/5 ring-1 ring-accent/10 flex items-center justify-center shrink-0">
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold leading-tight">{s.value.toLocaleString()}</p>
                <p className="text-[11px] text-muted-foreground truncate">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applySearch()}
            placeholder="Search by name, owner or email..."
            className="pl-9"
          />
        </div>
        <Select value={sortKey} onValueChange={(v) => { setSortKey(v); setPage(0); }}>
          <SelectTrigger className="w-full lg:w-40">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="oldest">Oldest</SelectItem>
            <SelectItem value="mostActive">Most Active</SelectItem>
            <SelectItem value="mostMembers">Most Members</SelectItem>
            <SelectItem value="mostTasks">Most Tasks</SelectItem>
          </SelectContent>
        </Select>
        <Select value={visibility} onValueChange={(v) => { setVisibility(v); setPage(0); }}>
          <SelectTrigger className="w-full lg:w-36">
            <SelectValue placeholder="Visibility" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Visibility</SelectItem>
            <SelectItem value="PUBLIC">Public</SelectItem>
            <SelectItem value="PRIVATE">Private</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(0); }}>
          <SelectTrigger className="w-full lg:w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="ARCHIVED">Archived</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="DELETED">Deleted</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={fetchProjects} disabled={loading} title="Refresh">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Table */}
      <Card className="border-border/50 gap-0 overflow-hidden">
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Visibility</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Tasks</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Skeleton className="w-8 h-8 rounded-lg" />
                          <div className="space-y-1.5">
                            <Skeleton className="h-3 w-28" />
                            <Skeleton className="h-2.5 w-20" />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><div className="flex items-center gap-2"><Skeleton className="w-6 h-6 rounded-full" /><Skeleton className="h-3 w-24" /></div></TableCell>
                      <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                      <TableCell><Skeleton className="h-3 w-8" /></TableCell>
                      <TableCell><Skeleton className="h-3 w-8" /></TableCell>
                      <TableCell><Skeleton className="h-3 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-14">
                      <div className="flex flex-col items-center gap-3 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center ring-1 ring-destructive/20">
                          <AlertTriangle className="w-6 h-6 text-destructive" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">Something went wrong</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{error}</p>
                        </div>
                        <Button size="sm" variant="outline" onClick={fetchProjects}>
                          <RefreshCw className="w-3.5 h-3.5 mr-2" /> Retry
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (data?.content.length ?? 0) === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-14">
                      <div className="flex flex-col items-center gap-3 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-accent/5 flex items-center justify-center ring-1 ring-accent/20">
                          <FolderGit2 className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">No projects found</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Try adjusting your search or filters</p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.content.map((p) => {
                    const isArchived = p.status === "ARCHIVED";
                    const isDeleted = p.status === "DELETED";
                    return (
                      <TableRow key={p.id} className="hover:bg-accent/5 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-accent/10 ring-1 ring-accent/20 flex items-center justify-center shrink-0">
                              <FolderGit2 className="w-4 h-4 text-accent" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                              <p className="text-xs text-muted-foreground truncate max-w-[220px]">
                                {p.description || "No description"}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="w-6 h-6 ring-1 ring-accent/20">
                              {p.ownerAvatarUrl ? <AvatarImage src={p.ownerAvatarUrl} alt="" /> : null}
                              <AvatarFallback className="bg-gradient-to-br from-accent/20 to-accent/5 text-[10px] font-medium text-accent">
                                {(p.ownerName || "U").charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-foreground truncate">{p.ownerName}</p>
                              <p className="text-[10px] text-muted-foreground truncate max-w-[140px]">{p.ownerEmail || ""}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={visibilityStyles[p.visibility] || ""}>
                            {p.visibility === "PRIVATE" ? <Lock className="w-2.5 h-2.5 mr-1" /> : <Globe className="w-2.5 h-2.5 mr-1" />}
                            {p.visibility}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusStyles[p.status] || ""}>
                            {p.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Users className="w-3 h-3" /> {p.membersCount}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <ListChecks className="w-3 h-3" /> {p.tasksCount}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {fmtDate(p.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="ghost" className="px-2 text-muted-foreground hover:text-foreground">
                                  {busyId === p.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <span className="text-xs font-medium">•••</span>
                                  )}
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel className="text-xs">Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => openDetail(p.id)} disabled={busyId === p.id}>
                                  <Eye className="w-3.5 h-3.5 mr-2" /> View Details
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {isArchived ? (
                                  <DropdownMenuItem
                                    onClick={() => handleRestore(p)}
                                    disabled={busyId === p.id || isDeleted}
                                    className="text-emerald-500 focus:text-emerald-500"
                                  >
                                    <ArchiveRestore className="w-3.5 h-3.5 mr-2" /> Restore
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={() => setArchiveTarget(p)}
                                    disabled={busyId === p.id || isDeleted}
                                    className="text-amber-500 focus:text-amber-500"
                                  >
                                    <Archive className="w-3.5 h-3.5 mr-2" /> Archive
                                  </DropdownMenuItem>
                                )}
                                {p.visibility !== "PRIVATE" ? (
                                  <DropdownMenuItem
                                    onClick={() => handleVisibility(p, "PRIVATE")}
                                    disabled={busyId === p.id || isDeleted}
                                  >
                                    <Lock className="w-3.5 h-3.5 mr-2" /> Make Private
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={() => handleVisibility(p, "PUBLIC")}
                                    disabled={busyId === p.id || isDeleted}
                                  >
                                    <Globe className="w-3.5 h-3.5 mr-2" /> Make Public
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setDeleteTarget(p)}
                                  disabled={busyId === p.id || isDeleted}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete Project
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
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
            Page {data!.page + 1} of {data!.totalPages} · {data!.totalElements.toLocaleString()} projects
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

      {/* Archive confirmation dialog */}
      <AlertDialog open={!!archiveTarget} onOpenChange={(open) => !open && setArchiveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Archive className="w-4 h-4 text-amber-500" /> Archive {archiveTarget?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Archived projects become read-only until restored: no new tasks, no messages and no edits.
              All data remains visible and can be restored at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchive}
              disabled={busyId === archiveTarget?.id}
              className="bg-amber-500 hover:bg-amber-600 text-white"
            >
              {busyId === archiveTarget?.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Archive Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-destructive" /> Delete {deleteTarget?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The project will be soft-deleted: it is hidden from the platform
              and becomes read-only, while its data is preserved for recovery.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={busyId === deleteTarget?.id}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              {busyId === deleteTarget?.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Delete Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Project detail drawer */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="border-b border-border/40 pb-4">
            <SheetTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/10 ring-1 ring-accent/20 flex items-center justify-center shrink-0">
                <FolderGit2 className="w-5 h-5 text-accent" />
              </div>
              <div className="min-w-0">
                <p className="text-base font-semibold truncate">{detail?.name}</p>
                {detail?.description ? (
                  <p className="text-xs text-muted-foreground truncate">{detail.description}</p>
                ) : null}
              </div>
            </SheetTitle>
            <SheetDescription className="sr-only">Project details</SheetDescription>
          </SheetHeader>

          {detailLoading ? (
            <div className="space-y-4 p-1">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-4 w-32" />
              <div className="grid grid-cols-3 gap-3">
                <Skeleton className="h-16 rounded-lg" />
                <Skeleton className="h-16 rounded-lg" />
                <Skeleton className="h-16 rounded-lg" />
              </div>
              <Skeleton className="h-24 rounded-lg" />
            </div>
          ) : detail ? (
            <div className="space-y-6 p-1">
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={visibilityStyles[detail.visibility] || ""}>
                  {detail.visibility === "PRIVATE" ? <Lock className="w-3 h-3 mr-1" /> : <Globe className="w-3 h-3 mr-1" />}
                  {detail.visibility}
                </Badge>
                <Badge variant="outline" className={statusStyles[detail.status] || ""}>
                  {detail.status}
                </Badge>
                <Badge variant="outline" className="bg-accent/10 text-accent border-accent/20">
                  <Users className="w-3 h-3 mr-1" /> {detail.memberCount} members
                </Badge>
              </div>

              {/* Owner */}
              <div className="border border-border/50 rounded-lg p-3">
                <p className="text-[11px] text-muted-foreground mb-2 flex items-center gap-1.5">
                  <User className="w-3 h-3" /> Owner
                </p>
                <div className="flex items-center gap-2.5">
                  <Avatar className="w-8 h-8 ring-1 ring-accent/20">
                    {detail.owner.avatarUrl ? <AvatarImage src={detail.owner.avatarUrl} alt="" /> : null}
                    <AvatarFallback className="bg-gradient-to-br from-accent/20 to-accent/5 text-xs font-medium text-accent">
                      {(detail.owner.fullName || "U").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{detail.owner.fullName}</p>
                    <p className="text-xs text-muted-foreground truncate">{detail.owner.email || ""}</p>
                  </div>
                </div>
              </div>

              {/* Kanban stats */}
              <div>
                <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  <ListChecks className="w-3.5 h-3.5 text-accent" /> Kanban Statistics
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="border border-border/50 rounded-lg p-3">
                    <CircleDot className="w-4 h-4 text-accent mb-1" />
                    <p className="text-lg font-bold">{detail.kanbanStats.totalTasks}</p>
                    <p className="text-[11px] text-muted-foreground">Total Tasks</p>
                  </div>
                  <div className="border border-border/50 rounded-lg p-3">
                    <CircleCheck className="w-4 h-4 text-emerald-500 mb-1" />
                    <p className="text-lg font-bold">{detail.kanbanStats.completedTasks}</p>
                    <p className="text-[11px] text-muted-foreground">Completed</p>
                  </div>
                  <div className="border border-border/50 rounded-lg p-3">
                    <CircleDashed className="w-4 h-4 text-amber-500 mb-1" />
                    <p className="text-lg font-bold">{detail.kanbanStats.pendingTasks}</p>
                    <p className="text-[11px] text-muted-foreground">Pending</p>
                  </div>
                </div>
              </div>

              {/* Posts and messages */}
              <div className="grid grid-cols-2 gap-3">
                <div className="border border-border/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Rss className="w-3.5 h-3.5 text-purple-400" />
                    <p className="text-[11px] text-muted-foreground">Posts</p>
                  </div>
                  <p className="text-lg font-bold">{detail.postsCount.toLocaleString()}</p>
                </div>
                <div className="border border-border/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <MessagesSquare className="w-3.5 h-3.5 text-cyan-400" />
                    <p className="text-[11px] text-muted-foreground">Messages</p>
                  </div>
                  <p className="text-lg font-bold">{detail.messagesCount.toLocaleString()}</p>
                </div>
              </div>

              {/* Members */}
              {detail.members.length > 0 && (
                <div className="border-t border-border/40 pt-4">
                  <p className="text-xs font-semibold text-foreground mb-2">Members ({detail.members.length})</p>
                  <div className="space-y-2">
                    {detail.members.slice(0, 8).map((m) => (
                      <div key={m.userId} className="flex items-center gap-2.5">
                        <Avatar className="w-6 h-6 ring-1 ring-accent/20">
                          {m.avatarUrl ? <AvatarImage src={m.avatarUrl} alt="" /> : null}
                          <AvatarFallback className="bg-gradient-to-br from-accent/20 to-accent/5 text-[10px] font-medium text-accent">
                            {(m.fullName || "U").charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <p className="text-xs font-medium truncate flex-1">{m.fullName}</p>
                        <Badge variant="outline" className="text-[10px]">{m.role}</Badge>
                      </div>
                    ))}
                    {detail.members.length > 8 && (
                      <p className="text-[11px] text-muted-foreground">
                        +{detail.members.length - 8} more members
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Recent activity */}
              {detail.recentActivity.length > 0 && (
                <div className="border-t border-border/40 pt-4">
                  <p className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-accent" /> Recent Activity
                  </p>
                  <div className="space-y-2.5">
                    {detail.recentActivity.map((a, idx) => (
                      <div key={idx} className="flex items-start gap-2.5">
                        <Badge
                          variant="outline"
                          className={
                            a.type === "TASK"
                              ? "bg-blue-500/10 text-blue-500 border-blue-500/20 text-[10px]"
                              : "bg-cyan-500/10 text-cyan-500 border-cyan-500/20 text-[10px]"
                          }
                        >
                          {a.type}
                        </Badge>
                        <div className="min-w-0">
                          <p className="text-xs text-foreground break-words">{a.title}</p>
                          <p className="text-[10px] text-muted-foreground">{fmtDateTime(a.timestamp)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
                    <Activity className="w-3.5 h-3.5" /> Updated
                  </span>
                  <span>{fmtDateTime(detail.updatedAt)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-14 text-center">
              <AlertTriangle className="w-6 h-6 text-destructive" />
              <p className="text-sm text-muted-foreground">Failed to load project details</p>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
