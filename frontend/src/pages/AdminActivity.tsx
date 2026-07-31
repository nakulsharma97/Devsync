import { useCallback, useEffect, useState } from "react";
import {
  Activity as ActivityIcon,
  ChevronLeft,
  ChevronRight,
  FolderGit2,
  Inbox,
  ListTodo,
  MessageSquare,
  RefreshCw,
} from "lucide-react";
import {
  adminService,
  type ActivityItem,
  type AdminActivityStats,
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

const ACTIVITY_TYPES = [
  "PROJECT_CREATED",
  "PROJECT_UPDATED",
  "PROJECT_ARCHIVED",
  "PROJECT_RESTORED",
  "PROJECT_DELETED",
  "USER_JOINED_PROJECT",
  "USER_LEFT_PROJECT",
  "TASK_CREATED",
  "TASK_ASSIGNED",
  "TASK_UPDATED",
  "TASK_MOVED",
  "TASK_COMPLETED",
  "TASK_DELETED",
  "MESSAGE_SENT",
  "POST_CREATED",
  "COMMENT_ADDED",
  "ROLE_CHANGED",
  "USER_BLOCKED",
  "USER_UNBLOCKED",
];

const typeBadge = (type: string) => {
  if (type.startsWith("PROJECT")) return "border-accent/30 bg-accent/10 text-accent";
  if (type.startsWith("TASK")) return "border-blue-500/30 bg-blue-500/10 text-blue-500";
  if (type === "MESSAGE_SENT") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-500";
  if (type === "POST_CREATED" || type === "COMMENT_ADDED")
    return "border-purple-500/30 bg-purple-500/10 text-purple-500";
  return "border-border/40 bg-muted/40 text-muted-foreground";
};

const typeDot = (type: string) => {
  if (type.startsWith("PROJECT")) return "bg-accent";
  if (type.startsWith("TASK")) return "bg-blue-500";
  if (type === "MESSAGE_SENT") return "bg-emerald-500";
  if (type === "POST_CREATED" || type === "COMMENT_ADDED") return "bg-purple-500";
  return "bg-muted-foreground";
};

const toIso = (value: string) => (value ? new Date(value).toISOString() : undefined);
const fmt = (value?: string | null) => (value ? new Date(value).toLocaleString() : "—");

export default function AdminActivity() {
  const [stats, setStats] = useState<AdminActivityStats | null>(null);
  const [data, setData] = useState<PageResponse<ActivityItem> | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [projectId, setProjectId] = useState("");
  const [userId, setUserId] = useState("");
  const [activityType, setActivityType] = useState("ALL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const fetchStats = useCallback(async () => {
    try {
      setStats(await adminService.getAdminActivityStats());
    } catch {
      // stats are best-effort
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminService.getAdminActivity({
        page,
        size: 20,
        projectId: projectId || undefined,
        userId: userId || undefined,
        activityType: activityType === "ALL" ? undefined : activityType,
        from: toIso(from),
        to: toIso(to),
      });
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [page, projectId, userId, activityType, from, to]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetFilters = () => {
    setProjectId("");
    setUserId("");
    setActivityType("ALL");
    setFrom("");
    setTo("");
    setPage(0);
  };

  const statCards = [
    { label: "Today's Activities", value: stats?.todayCount ?? 0, icon: ActivityIcon, color: "text-accent" },
    { label: "Projects", value: stats?.projects ?? 0, icon: FolderGit2, color: "text-blue-500" },
    { label: "Tasks", value: stats?.tasks ?? 0, icon: ListTodo, color: "text-emerald-500" },
    { label: "Messages", value: stats?.messages ?? 0, icon: MessageSquare, color: "text-purple-500" },
  ];

  return (
    <div className="relative space-y-6">
      <div className="absolute -top-20 -right-20 w-72 h-72 bg-gradient-to-bl from-accent/[0.03] to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
            <ActivityIcon className="w-4 h-4 text-accent" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Activity Timeline</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Every project, task, message, post and moderation event across DevSync.
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Card key={card.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                  <p className="text-2xl font-bold mt-1">
                    {stats ? card.value : <Skeleton className="h-7 w-10" />}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-muted/40 border border-border/40 flex items-center justify-center">
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[180px]">
            <label className="text-xs text-muted-foreground mb-1 block">Project ID</label>
            <Input placeholder="Filter by project" value={projectId} onChange={(e) => setProjectId(e.target.value)} />
          </div>
          <div className="flex-1 min-w-[180px]">
            <label className="text-xs text-muted-foreground mb-1 block">User ID</label>
            <Input placeholder="Filter by user" value={userId} onChange={(e) => setUserId(e.target.value)} />
          </div>
          <div className="min-w-[200px]">
            <label className="text-xs text-muted-foreground mb-1 block">Activity Type</label>
            <Select value={activityType} onValueChange={setActivityType}>
              <SelectTrigger>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All types</SelectItem>
                {ACTIVITY_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">From</label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">To</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button variant="outline" size="icon" onClick={fetchData} title="Refresh">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="ghost" onClick={resetFilters}>
            Reset
          </Button>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardContent className="p-5">
          {loading ? (
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="w-3 h-3 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : data && data.content.length > 0 ? (
            <div className="relative pl-6">
              <div className="absolute left-[5px] top-2 bottom-2 w-px bg-border/60" />
              {data.content.map((item) => (
                <div key={item.id} className="relative pb-6">
                  <span
                    className={`absolute -left-[19px] top-1.5 w-3 h-3 rounded-full ${typeDot(
                      item.activityType
                    )} ring-4 ring-background`}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-sm">{item.title}</span>
                    <Badge variant="outline" className={`text-[10px] ${typeBadge(item.activityType)}`}>
                      {item.activityType}
                    </Badge>
                  </div>
                  {item.description ? (
                    <p className="text-sm text-muted-foreground mt-0.5">{item.description}</p>
                  ) : null}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                      {item.user.avatarUrl ? (
                        <img src={item.user.avatarUrl} alt="" className="w-4 h-4 rounded-full" />
                      ) : (
                        <span className="w-4 h-4 rounded-full bg-accent/20 flex items-center justify-center text-[9px] font-bold">
                          {item.user.fullName.charAt(0)}
                        </span>
                      )}
                      {item.user.fullName}
                    </span>
                    {item.projectId ? <span>· project {item.projectId.slice(0, 8)}</span> : null}
                    <span>· {fmt(item.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <div className="w-12 h-12 rounded-full bg-muted/40 flex items-center justify-center mb-3">
                <Inbox className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">No activities found</p>
              <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters.</p>
            </div>
          )}

          {/* Pagination */}
          {(data?.totalPages ?? 0) > 1 && (
            <div className="flex items-center justify-between gap-3 mt-4 pt-4 border-t border-border/40">
              <p className="text-xs text-muted-foreground">
                Page {data!.page + 1} of {data!.totalPages} · {data!.totalElements.toLocaleString()} activities
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
        </CardContent>
      </Card>
    </div>
  );
}
