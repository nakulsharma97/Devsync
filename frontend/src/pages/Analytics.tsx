import { useState, useEffect, lazy, Suspense } from "react";
import { BarChart3, Heart, MessageCircle, Rss, Users } from "lucide-react";
import { analyticsService, type PostStats, type FollowerGrowth, type ActivityStats } from "@/services/analyticsService";

// The charts (and therefore recharts, ~420 kB) live in their own chunk so this
// route paints its header and summary cards without waiting on a chart library.
const AnalyticsCharts = lazy(() => import("@/components/analytics/AnalyticsCharts"));

/** Placeholder shown while the chart chunk (recharts) is still downloading. */
function ChartsFallback() {
  return (
    <div aria-hidden className="animate-pulse">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="h-4 w-44 bg-muted rounded mb-4" />
          <div className="h-56 bg-muted/60 rounded-lg" />
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="h-4 w-48 bg-muted rounded mb-4" />
          <div className="h-56 bg-muted/60 rounded-lg" />
        </div>
      </div>
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="h-4 w-40 bg-muted rounded mb-4" />
        <div className="h-64 bg-muted/60 rounded-lg" />
      </div>
    </div>
  );
}

export default function Analytics() {
  const [postStats, setPostStats] = useState<PostStats | null>(null);
  const [followerGrowth, setFollowerGrowth] = useState<FollowerGrowth | null>(null);
  const [activityStats, setActivityStats] = useState<ActivityStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [posts, followers, activity] = await Promise.all([
          analyticsService.getPostStats(),
          analyticsService.getFollowerGrowth(),
          analyticsService.getActivityStats(),
        ]);
        setPostStats(posts);
        setFollowerGrowth(followers);
        setActivityStats(activity);
      } catch (err) {
        console.error("Failed to load analytics:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const summary = [
    { icon: Rss, label: "Total Posts", value: postStats?.totalPosts ?? 0, color: "text-info-text" },
    { icon: Heart, label: "Total Likes", value: postStats?.totalLikes ?? 0, color: "text-danger-text" },
    { icon: MessageCircle, label: "Comments", value: postStats?.totalComments ?? 0, color: "text-info-text" },
    { icon: Users, label: "Followers", value: followerGrowth?.totalFollowers ?? 0, color: "text-success-text" },
  ];

  return (
    <div className="relative">
      {/* Header — renders immediately; the charts stream in below */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center">
            <BarChart3 className="w-3 h-3 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Analytics</h1>
        </div>
        <p className="ml-7 text-sm text-muted-foreground">
          Track your growth, engagement, and activity over time
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {summary.map((stat) => (
          <div
            key={stat.label}
            className="bg-card border border-border rounded-xl p-4 relative overflow-hidden group hover:border-muted-foreground/30 transition-colors duration-200"
          >
            <div className="flex items-center gap-3 relative">
              <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <div>
                {loading ? (
                  <div className="h-6 w-10 bg-muted rounded animate-pulse" />
                ) : (
                  <p className="text-xl font-semibold text-foreground tabular-nums">{stat.value}</p>
                )}
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <Suspense fallback={<ChartsFallback />}>
        {loading ? (
          <ChartsFallback />
        ) : (
          <AnalyticsCharts
            postStats={postStats}
            followerGrowth={followerGrowth}
            activityStats={activityStats}
          />
        )}
      </Suspense>
    </div>
  );
}
