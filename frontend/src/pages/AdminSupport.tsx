import { useCallback, useEffect, useState } from "react";
import {
  Headphones,
  Inbox,
  Loader2,
  RefreshCw,
  Search,
  Send,
} from "lucide-react";
import {
  adminService,
  type SupportTicketListItem,
  type SupportTicketReply,
  type SupportTicketStats,
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
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getErrorMessage } from "@/lib/utils";
import { toast } from "sonner";

const STATUS_META: Record<string, { label: string; badge: string }> = {
  OPEN: { label: "Open", badge: "bg-blue-500/10 text-blue-600" },
  IN_PROGRESS: { label: "In Progress", badge: "bg-amber-500/10 text-amber-600" },
  WAITING_USER: { label: "Waiting", badge: "bg-orange-500/10 text-orange-600" },
  RESOLVED: { label: "Resolved", badge: "bg-emerald-500/10 text-emerald-600" },
  CLOSED: { label: "Closed", badge: "bg-slate-500/10 text-slate-600" },
};

const PRIORITY_META: Record<string, { label: string; badge: string }> = {
  LOW: { label: "Low", badge: "bg-slate-500/10 text-slate-600" },
  MEDIUM: { label: "Medium", badge: "bg-blue-500/10 text-blue-600" },
  HIGH: { label: "High", badge: "bg-orange-500/10 text-orange-600" },
  URGENT: { label: "Urgent", badge: "bg-red-500/10 text-red-600" },
};

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

export default function AdminSupport() {
  const [data, setData] = useState<PageResponse<SupportTicketListItem> | null>(null);
  const [stats, setStats] = useState<SupportTicketStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [page, setPage] = useState(0);

  // Detail sheet
  const [selected, setSelected] = useState<SupportTicketListItem | null>(null);
  const [replies, setReplies] = useState<SupportTicketReply[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const [ticketRes, statsRes] = await Promise.all([
        adminService.getSupportTickets({
          page,
          size: 10,
          search: searchInput || undefined,
          status: statusFilter && statusFilter !== "ALL" ? statusFilter : undefined,
          priority: priorityFilter && priorityFilter !== "ALL" ? priorityFilter : undefined,
        }),
        adminService.getSupportTicketStats(),
      ]);
      setData(ticketRes);
      setStats(statsRes);
    } catch (e) {
      toast.error(getErrorMessage(e, "Failed to load support tickets"));
    } finally {
      setLoading(false);
    }
  }, [page, searchInput, statusFilter, priorityFilter]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const openTicket = async (ticket: SupportTicketListItem) => {
    setSelected(ticket);
    setLoadingReplies(true);
    try {
      const data = await adminService.getSupportTicketReplies(ticket.id);
      setReplies(data);
    } catch (e) {
      toast.error(getErrorMessage(e, "Failed to load replies"));
    } finally {
      setLoadingReplies(false);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !selected) return;
    setSendingReply(true);
    try {
      const reply = await adminService.replySupportTicket(selected.id, replyText, isInternalNote);
      setReplies((prev) => [...prev, reply]);
      setReplyText("");
      setIsInternalNote(false);
      toast.success(isInternalNote ? "Internal note added" : "Reply sent");
    } catch (e) {
      toast.error(getErrorMessage(e, "Failed to send reply"));
    } finally {
      setSendingReply(false);
    }
  };

  const handleStatusChange = async (status: string) => {
    if (!selected) return;
    try {
      const updated = await adminService.updateSupportTicketStatus(selected.id, status);
      setSelected(updated);
      toast.success(`Status updated to ${STATUS_META[status]?.label ?? status}`);
      fetchTickets();
    } catch (e) {
      toast.error(getErrorMessage(e, "Failed to update status"));
    }
  };

  return (
    <div className="relative space-y-6">
      <div className="absolute -top-20 -right-20 w-72 h-72 bg-gradient-to-bl from-accent/[0.03] to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
            <Headphones className="w-4 h-4 text-accent" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Support Tickets</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Manage user support requests and respond to tickets.
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {(["OPEN", "IN_PROGRESS", "WAITING_USER", "RESOLVED", "CLOSED"] as const).map((s) => (
            <Card key={s}>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground">{STATUS_META[s]?.label}</p>
                <p className="text-2xl font-bold mt-1">{stats[s] ?? 0}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search tickets..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setSearchInput(search);
                    setPage(0);
                  }
                }}
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                {Object.entries(STATUS_META).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={(v) => { setPriorityFilter(v); setPage(0); }}>
              <SelectTrigger>
                <SelectValue placeholder="All priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All priorities</SelectItem>
                {Object.entries(PRIORITY_META).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchTickets} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="pt-5">
          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Subject</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Replies</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((__, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : !data || data.content.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <Inbox className="w-8 h-8 text-muted-foreground/50" />
                        <p className="text-sm text-muted-foreground">No support tickets found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  data.content.map((ticket) => {
                    const sm = STATUS_META[ticket.status] ?? { label: ticket.status, badge: "" };
                    const pm = PRIORITY_META[ticket.priority] ?? { label: ticket.priority, badge: "" };
                    return (
                      <TableRow
                        key={ticket.id}
                        className="cursor-pointer hover:bg-muted/40 transition-colors"
                        onClick={() => openTicket(ticket)}
                      >
                        <TableCell className="font-medium max-w-[250px]">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-muted-foreground">{ticket.ticketNumber}</span>
                            <span className="truncate">{ticket.subject}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{ticket.userName ?? "—"}</TableCell>
                        <TableCell><Badge variant="secondary" className={sm.badge}>{sm.label}</Badge></TableCell>
                        <TableCell><Badge variant="secondary" className={pm.badge}>{pm.label}</Badge></TableCell>
                        <TableCell className="text-sm">{ticket.replyCount}</TableCell>
                        <TableCell className="text-xs whitespace-nowrap">{timeAgo(ticket.createdAt)}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {(data?.totalPages ?? 0) > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-muted-foreground">
                Page {page + 1} of {data!.totalPages} · {data!.totalElements} tickets
              </p>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                  Prev
                </Button>
                <Button size="sm" variant="outline" disabled={data?.last} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ticket detail sheet */}
      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto flex flex-col">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Headphones className="w-4 h-4 text-accent" />
              <span className="text-xs font-mono text-muted-foreground">{selected?.ticketNumber}</span>
              {selected?.subject}
            </SheetTitle>
            <SheetDescription>
              {selected && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className={STATUS_META[selected.status]?.badge ?? ""}>
                    {STATUS_META[selected.status]?.label ?? selected.status}
                  </Badge>
                  <Badge variant="secondary" className={PRIORITY_META[selected.priority]?.badge ?? ""}>
                    {PRIORITY_META[selected.priority]?.label ?? selected.priority}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    from {selected.userName ?? "Unknown"}
                  </span>
                </div>
              )}
            </SheetDescription>
          </SheetHeader>

          {/* Status controls */}
          {selected && (
            <div className="flex items-center gap-2 mt-4 flex-wrap">
              <span className="text-xs text-muted-foreground">Change status:</span>
              {(["OPEN", "IN_PROGRESS", "WAITING_USER", "RESOLVED", "CLOSED"] as const).map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={selected.status === s ? "default" : "outline"}
                  onClick={() => handleStatusChange(s)}
                  className="h-7 text-xs"
                >
                  {STATUS_META[s]?.label}
                </Button>
              ))}
            </div>
          )}

          {/* Description */}
          {selected && (
            <div className="p-3 rounded-lg border bg-muted/30 mt-4">
              <p className="text-sm whitespace-pre-wrap">{selected.description}</p>
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span>Category: {selected.category ?? "—"}</span>
                <span>Created {timeAgo(selected.createdAt)}</span>
              </div>
            </div>
          )}

          {/* Replies */}
          <div className="flex-1 overflow-y-auto mt-4 space-y-3">
            {loadingReplies ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : replies.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No replies yet</p>
            ) : (
              replies.map((reply) => (
                <div
                  key={reply.id}
                  className={`p-3 rounded-lg border ${
                    reply.internalNote
                      ? "bg-amber-500/5 border-amber-500/20"
                      : reply.adminReply
                        ? "bg-accent/5 border-accent/20"
                        : "bg-muted/30"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">{reply.userName ?? "Unknown"}</span>
                    {reply.internalNote && (
                      <Badge variant="secondary" className="text-xs bg-amber-500/10 text-amber-600">
                        Internal Note
                      </Badge>
                    )}
                    {reply.adminReply && !reply.internalNote && (
                      <Badge variant="secondary" className="text-xs bg-accent/10 text-accent">
                        Support
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">{timeAgo(reply.createdAt)}</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{reply.message}</p>
                </div>
              ))
            )}
          </div>

          {/* Reply input */}
          {selected && selected.status !== "CLOSED" && (
            <div className="border-t pt-3 mt-3">
              <div className="flex items-center gap-2 mb-2">
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isInternalNote}
                    onChange={(e) => setIsInternalNote(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  Internal note (not visible to user)
                </label>
              </div>
              <div className="flex gap-2">
                <Textarea
                  placeholder={isInternalNote ? "Type an internal note..." : "Type your reply..."}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="min-h-[60px]"
                  disabled={sendingReply}
                />
                <Button
                  size="icon"
                  className="shrink-0 self-end"
                  onClick={handleReply}
                  disabled={!replyText.trim() || sendingReply}
                >
                  {sendingReply ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
