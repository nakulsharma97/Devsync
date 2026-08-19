import { useCallback, useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Headphones,
  Inbox,
  Loader2,
  MessageSquare,
  Plus,
  Search,
  Send,
  Ticket,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/EmptyState";
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
  supportService,
  type SupportTicket,
  type SupportTicketReply,
} from "@/services/supportService";
import { getErrorMessage } from "@/lib/utils";
import { toast } from "sonner";

const STATUS_META: Record<string, { label: string; badge: string }> = {
  OPEN: { label: "Open", badge: "bg-blue-500/10 text-blue-600" },
  IN_PROGRESS: { label: "In Progress", badge: "bg-amber-500/10 text-amber-600" },
  WAITING_USER: { label: "Waiting for You", badge: "bg-orange-500/10 text-orange-600" },
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

export default function Support() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  // Create ticket sheet
  const [createOpen, setCreateOpen] = useState(false);
  const [createSubject, setCreateSubject] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createCategory, setCreateCategory] = useState("");
  const [createPriority, setCreatePriority] = useState("MEDIUM");
  const [creating, setCreating] = useState(false);

  // Ticket detail
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [replies, setReplies] = useState<SupportTicketReply[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await supportService.getTickets({
        page,
        size: 10,
        search: searchInput || undefined,
      });
      setTickets(res.content);
      setTotalPages(res.totalPages);
      setTotalElements(res.totalElements);
    } catch (e) {
      toast.error(getErrorMessage(e, "Failed to load support tickets"));
    } finally {
      setLoading(false);
    }
  }, [page, searchInput]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleCreate = async () => {
    if (!createSubject.trim() || !createDescription.trim()) {
      toast.error("Subject and description are required");
      return;
    }
    setCreating(true);
    try {
      await supportService.createTicket({
        subject: createSubject,
        description: createDescription,
        category: createCategory || undefined,
        priority: createPriority,
      });
      toast.success("Support ticket created");
      setCreateOpen(false);
      setCreateSubject("");
      setCreateDescription("");
      setCreateCategory("");
      setCreatePriority("MEDIUM");
      fetchTickets();
    } catch (e) {
      toast.error(getErrorMessage(e, "Failed to create ticket"));
    } finally {
      setCreating(false);
    }
  };

  const openTicket = async (ticket: SupportTicket) => {
    setSelected(ticket);
    setLoadingReplies(true);
    try {
      const data = await supportService.getTicketReplies(ticket.id);
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
      const reply = await supportService.addReply(selected.id, replyText);
      setReplies((prev) => [...prev, reply]);
      setReplyText("");
    } catch (e) {
      toast.error(getErrorMessage(e, "Failed to send reply"));
    } finally {
      setSendingReply(false);
    }
  };

  return (
    <div className="relative space-y-6">
      <div className="absolute -top-20 -right-20 w-72 h-72 bg-gradient-to-bl from-accent/[0.03] to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
              <Headphones className="w-4 h-4 text-accent" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Support</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Get help from the DevSync team. Create a ticket and we'll respond as soon as possible.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> New Ticket
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-5">
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
        </CardContent>
      </Card>

      {/* Ticket list */}
      <Card>
        <CardContent className="pt-5">
          <p className="text-sm text-muted-foreground mb-4">
            {loading ? "Loading..." : `${totalElements} ticket${totalElements !== 1 ? "s" : ""}`}
          </p>

          <div className="rounded-lg border overflow-x-auto">
            <div className="min-w-[600px]">
              {loading ? (
                <div className="divide-y">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="p-4 space-y-2">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                  ))}
                </div>
              ) : tickets.length === 0 ? (
                <EmptyState
                  icon={Ticket}
                  title="No support tickets"
                  description="Need help with DevSync? Create a support request and our team will get back to you."
                  actionLabel="Create Ticket"
                  onAction={() => setCreateOpen(true)}
                />
              ) : (
                <div className="divide-y">
                  {tickets.map((ticket) => {
                    const sm = STATUS_META[ticket.status] ?? { label: ticket.status, badge: "" };
                    const pm = PRIORITY_META[ticket.priority] ?? { label: ticket.priority, badge: "" };
                    return (
                      <div
                        key={ticket.id}
                        className="p-4 hover:bg-muted/40 cursor-pointer transition-colors"
                        onClick={() => openTicket(ticket)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-mono text-muted-foreground">{ticket.ticketNumber}</span>
                              <h3 className="font-medium text-sm truncate">{ticket.subject}</h3>
                              <Badge variant="secondary" className={`text-xs ${sm.badge}`}>{sm.label}</Badge>
                              <Badge variant="secondary" className={`text-xs ${pm.badge}`}>{pm.label}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {ticket.description}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {ticket.replyCount > 0 && (
                              <Badge variant="secondary" className="text-xs gap-1">
                                <MessageSquare className="w-3 h-3" />
                                {ticket.replyCount}
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {timeAgo(ticket.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-muted-foreground">
                Page {page + 1} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                  <ChevronLeft className="w-4 h-4" /> Prev
                </Button>
                <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
                  Next <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create ticket sheet */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Create Support Ticket</SheetTitle>
            <SheetDescription>
              Describe your issue and our team will get back to you.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium">Subject *</label>
              <Input
                placeholder="Brief summary of your issue"
                value={createSubject}
                onChange={(e) => setCreateSubject(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description *</label>
              <Textarea
                placeholder="Describe your issue in detail..."
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
                className="mt-1 min-h-[120px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Category</label>
                <Select value={createCategory} onValueChange={setCreateCategory}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BUG">Bug Report</SelectItem>
                    <SelectItem value="FEATURE_REQUEST">Feature Request</SelectItem>
                    <SelectItem value="ACCOUNT">Account Issue</SelectItem>
                    <SelectItem value="BILLING">Billing</SelectItem>
                    <SelectItem value="GENERAL">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Priority</label>
                <Select value={createPriority} onValueChange={setCreatePriority}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button className="w-full" onClick={handleCreate} disabled={creating}>
              {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Create Ticket
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Ticket detail sheet */}
      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto flex flex-col">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Ticket className="w-4 h-4 text-accent" />
              <span className="text-xs font-mono text-muted-foreground">{selected?.ticketNumber}</span>
              {selected?.subject}
            </SheetTitle>
            <SheetDescription>
              {selected && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className={STATUS_META[selected.status]?.badge ?? ""}>
                    {STATUS_META[selected.status]?.label ?? selected.status}
                  </Badge>
                  <Badge variant="secondary" className={PRIORITY_META[selected.priority]?.badge ?? ""}>
                    {PRIORITY_META[selected.priority]?.label ?? selected.priority}
                  </Badge>
                </div>
              )}
            </SheetDescription>
          </SheetHeader>

          {/* Description */}
          {selected && (
            <div className="p-3 rounded-lg border bg-muted/30 mt-4">
              <p className="text-sm whitespace-pre-wrap">{selected.description}</p>
              <p className="text-xs text-muted-foreground mt-2">Created {timeAgo(selected.createdAt)}</p>
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
                  className={`p-3 rounded-lg border ${reply.adminReply ? "bg-accent/5 border-accent/20" : "bg-muted/30"}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">{reply.userName ?? "Unknown"}</span>
                    {reply.adminReply && (
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
              <div className="flex gap-2">
                <Input
                  placeholder="Type your reply..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleReply();
                    }
                  }}
                  disabled={sendingReply}
                />
                <Button size="icon" onClick={handleReply} disabled={!replyText.trim() || sendingReply}>
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
