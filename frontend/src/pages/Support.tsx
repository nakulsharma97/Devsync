import { useCallback, useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Headphones,
  Loader2,
  MessageSquare,
  Plus,
  Search,
  Send,
  Ticket,
  HelpCircle,
  FileText,
  MessageCircle,
  GitBranch,
  AlertCircle,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Label } from "@/components/ui/label";
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
  OPEN: { label: "Open", badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  IN_PROGRESS: { label: "In Progress", badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  WAITING_USER: { label: "Waiting for You", badge: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
  RESOLVED: { label: "Resolved", badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  CLOSED: { label: "Closed", badge: "bg-slate-500/10 text-slate-600 dark:text-slate-400" },
};

const PRIORITY_META: Record<string, { label: string; badge: string }> = {
  LOW: { label: "Low", badge: "bg-slate-500/10 text-slate-600 dark:text-slate-400" },
  MEDIUM: { label: "Medium", badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  HIGH: { label: "High", badge: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
  URGENT: { label: "Urgent", badge: "bg-red-500/10 text-red-600 dark:text-red-400" },
};

const FAQ_ITEMS = [
  {
    icon: AlertCircle,
    category: "Authentication",
    question: "Can't log in or forgot password?",
    answer: "Use the 'Forgot Password' link on the login page to reset your password via email.",
  },
  {
    icon: FileText,
    category: "Projects",
    question: "How do I create a project?",
    answer: "Go to Projects and click 'New Project'. Fill in the details and invite team members.",
  },
  {
    icon: MessageCircle,
    category: "Messaging",
    question: "How do I message another developer?",
    answer: "Visit the Network page, find a developer, and click the message icon to start a conversation.",
  },
  {
    icon: GitBranch,
    category: "GitHub",
    question: "How do I connect GitHub?",
    answer: "Go to Settings > GitHub Integration and click 'Connect GitHub' to authorize access.",
  },
  {
    icon: User,
    category: "Account",
    question: "How do I edit my profile?",
    answer: "Go to Profile and click 'Edit' to update your name, bio, job title, and other details.",
  },
];

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
  const [createErrors, setCreateErrors] = useState<{
    subject?: string;
    description?: string;
  }>({});

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

  const validateCreate = (): boolean => {
    const errors: { subject?: string; description?: string } = {};
    if (!createSubject.trim()) {
      errors.subject = "Subject is required";
    }
    if (!createDescription.trim()) {
      errors.description = "Description is required";
    }
    setCreateErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async () => {
    if (!validateCreate()) return;
    setCreating(true);
    try {
      await supportService.createTicket({
        subject: createSubject.trim(),
        description: createDescription.trim(),
        category: createCategory || undefined,
        priority: createPriority,
      });
      toast.success("Support ticket created successfully");
      setCreateOpen(false);
      setCreateSubject("");
      setCreateDescription("");
      setCreateCategory("");
      setCreatePriority("MEDIUM");
      setCreateErrors({});
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/15 to-purple-500/10 flex items-center justify-center ring-1 ring-indigo-500/20">
              <Headphones className="w-4.5 h-4.5 text-indigo-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Support</h1>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-1 ml-[46px]">
            Get help from the DevSync team. We typically respond within 24 hours.
          </p>
        </div>
        <Button
          onClick={() => setCreateOpen(true)}
          className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 shrink-0"
        >
          <Plus className="w-4 h-4 mr-2" /> New Ticket
        </Button>
      </div>

      {/* Quick Help */}
      <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border/40">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-indigo-500" />
            <h3 className="text-sm font-semibold text-foreground">Quick Help</h3>
          </div>
        </div>
        <div className="p-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {FAQ_ITEMS.map((item, i) => {
            const Icon = item.icon;
            return (
              <div
                key={i}
                className="p-3 rounded-xl bg-muted/20 border border-border/30 hover:border-indigo-500/20 hover:bg-indigo-500/5 transition-all cursor-default"
              >
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="w-3.5 h-3.5 text-indigo-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground leading-snug">
                      {item.question}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                      {item.answer}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Search + Ticket List */}
      <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border/40">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Ticket className="w-4 h-4 text-indigo-500" />
              <h3 className="text-sm font-semibold text-foreground">
                My Tickets
              </h3>
              <span className="text-xs text-muted-foreground">
                ({totalElements})
              </span>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9 h-8 text-sm"
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
          </div>
        </div>

        <div className="min-h-[200px]">
          {loading ? (
            <div className="divide-y">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-4 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              ))}
            </div>
          ) : tickets.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={Ticket}
                title="No support tickets yet"
                description="Create a ticket if you need help from the DevSync team."
                actionLabel="Create Ticket"
                onAction={() => setCreateOpen(true)}
              />
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {tickets.map((ticket) => {
                const sm =
                  STATUS_META[ticket.status] ?? {
                    label: ticket.status,
                    badge: "",
                  };
                const pm =
                  PRIORITY_META[ticket.priority] ?? {
                    label: ticket.priority,
                    badge: "",
                  };
                return (
                  <div
                    key={ticket.id}
                    className="p-4 hover:bg-muted/30 cursor-pointer transition-colors group"
                    onClick={() => openTicket(ticket)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="text-xs font-mono text-indigo-500 dark:text-indigo-400 font-medium">
                            {ticket.ticketNumber}
                          </span>
                          <h3 className="font-medium text-sm text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                            {ticket.subject}
                          </h3>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                          {ticket.description}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant="secondary"
                            className={`text-[10px] ${sm.badge}`}
                          >
                            {sm.label}
                          </Badge>
                          <Badge
                            variant="secondary"
                            className={`text-[10px] ${pm.badge}`}
                          >
                            {pm.label}
                          </Badge>
                          {ticket.replyCount > 0 && (
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" />
                              {ticket.replyCount}{" "}
                              {ticket.replyCount === 1 ? "reply" : "replies"}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-[11px] text-muted-foreground">
                          {timeAgo(ticket.createdAt)}
                        </span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-indigo-500 transition-colors" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-border/40">
            <p className="text-xs text-muted-foreground">
              Page {page + 1} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="h-8"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
                className="h-8"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Create ticket sheet */}
      <Sheet
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) setCreateErrors({});
        }}
      >
        <SheetContent className="w-full sm:w-[440px] sm:max-w-[440px] flex flex-col p-0">
          <SheetHeader className="px-6 pt-6 pb-0">
            <SheetTitle className="text-lg">Create Support Ticket</SheetTitle>
            <SheetDescription>
              Describe your issue and our team will respond as soon as possible.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="support-subject" className="text-sm">
                  Subject <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="support-subject"
                  placeholder="Brief summary of your issue"
                  value={createSubject}
                  onChange={(e) => {
                    setCreateSubject(e.target.value);
                    if (createErrors.subject)
                      setCreateErrors((prev) => ({
                        ...prev,
                        subject: undefined,
                      }));
                  }}
                  aria-invalid={!!createErrors.subject}
                  aria-describedby={
                    createErrors.subject ? "support-subject-error" : undefined
                  }
                  disabled={creating}
                />
                {createErrors.subject && (
                  <p
                    id="support-subject-error"
                    className="text-xs text-destructive"
                    role="alert"
                  >
                    {createErrors.subject}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="support-description" className="text-sm">
                  Description <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="support-description"
                  placeholder="Describe your issue in detail..."
                  value={createDescription}
                  onChange={(e) => {
                    setCreateDescription(e.target.value);
                    if (createErrors.description)
                      setCreateErrors((prev) => ({
                        ...prev,
                        description: undefined,
                      }));
                  }}
                  className="min-h-[120px] resize-y"
                  aria-invalid={!!createErrors.description}
                  aria-describedby={
                    createErrors.description
                      ? "support-description-error"
                      : undefined
                  }
                  disabled={creating}
                />
                {createErrors.description && (
                  <p
                    id="support-description-error"
                    className="text-xs text-destructive"
                    role="alert"
                  >
                    {createErrors.description}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr] gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="support-category" className="text-sm">
                    Category
                  </Label>
                  <Select
                    value={createCategory}
                    onValueChange={setCreateCategory}
                    disabled={creating}
                  >
                    <SelectTrigger
                      id="support-category"
                      className="w-full"
                    >
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BUG">Bug Report</SelectItem>
                      <SelectItem value="FEATURE_REQUEST">
                        Feature Request
                      </SelectItem>
                      <SelectItem value="ACCOUNT">Account Issue</SelectItem>
                      <SelectItem value="BILLING">Billing</SelectItem>
                      <SelectItem value="GENERAL">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="support-priority" className="text-sm">
                    Priority
                  </Label>
                  <Select
                    value={createPriority}
                    onValueChange={setCreatePriority}
                    disabled={creating}
                  >
                    <SelectTrigger
                      id="support-priority"
                      className="w-full"
                    >
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
            </div>
          </div>
          <div className="border-t px-6 py-4">
            <Button
              className="w-full h-10 bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700"
              onClick={handleCreate}
              disabled={creating}
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Ticket
                </>
              )}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Ticket detail sheet */}
      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full sm:w-[500px] sm:max-w-[500px] flex flex-col p-0">
          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-border/40">
            <SheetHeader className="text-left">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Ticket className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span className="text-xs font-mono text-indigo-500 dark:text-indigo-400 font-medium">
                    {selected?.ticketNumber}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {selected && (
                    <>
                      <Badge
                        variant="secondary"
                        className={`text-xs ${STATUS_META[selected.status]?.badge ?? ""}`}
                      >
                        {STATUS_META[selected.status]?.label ?? selected.status}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className={`text-xs ${PRIORITY_META[selected.priority]?.badge ?? ""}`}
                      >
                        {PRIORITY_META[selected.priority]?.label ?? selected.priority}
                      </Badge>
                    </>
                  )}
                </div>
              </div>
              <SheetTitle className="text-base font-semibold mt-2 leading-snug">
                {selected?.subject}
              </SheetTitle>
              {selected && (
                <p className="text-xs text-muted-foreground mt-1">
                  Created {timeAgo(selected.createdAt)}
                </p>
              )}
            </SheetHeader>
          </div>

          {/* Description summary */}
          {selected && (
            <div className="px-6 py-3 border-b border-border/40 bg-muted/20">
              <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
                {selected.description}
              </p>
            </div>
          )}

          {/* Replies area */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {loadingReplies ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-16 w-full rounded-lg" />
                  </div>
                ))}
              </div>
            ) : replies.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[180px] text-center">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500/15 to-purple-500/10 flex items-center justify-center ring-1 ring-indigo-500/20 mb-4">
                  <MessageSquare className="w-5 h-5 text-indigo-400" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">
                  No replies yet
                </p>
                <p className="text-xs text-muted-foreground max-w-[220px]">
                  Our support team hasn&apos;t replied yet. You&apos;ll see
                  responses here when available.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {replies.map((reply) => (
                  <div
                    key={reply.id}
                    className={`rounded-xl border p-4 transition-colors ${
                      reply.adminReply
                        ? "bg-gradient-to-br from-indigo-500/5 to-purple-500/5 border-indigo-500/15"
                        : "bg-muted/30 border-border/40"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          reply.adminReply
                            ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {(reply.userName ?? "U").charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium">
                        {reply.userName ?? "Unknown"}
                      </span>
                      {reply.adminReply && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                        >
                          Support
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground ml-auto">
                        {timeAgo(reply.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed pl-8">
                      {reply.message}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Reply composer — fixed at bottom */}
          {selected && selected.status !== "CLOSED" && (
            <div className="border-t border-border/40 bg-background px-6 py-4">
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
                  className="flex-1 h-10"
                />
                <Button
                  size="icon"
                  onClick={handleReply}
                  disabled={!replyText.trim() || sendingReply}
                  className="h-10 w-10 shrink-0 bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700"
                >
                  {sendingReply ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          )}
          {selected && selected.status === "CLOSED" && (
            <div className="border-t border-border/40 bg-muted/20 px-6 py-4 text-center">
              <p className="text-sm text-muted-foreground">
                This support request is closed.
              </p>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
