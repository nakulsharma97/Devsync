import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { TrendingUp, UserPlus, Activity } from "lucide-react";
import type { PostStats, FollowerGrowth, ActivityStats } from "@/services/analyticsService";

/**
 * The charting half of the Analytics page.
 *
 * Deliberately a separate module: it is the only consumer of `recharts`
 * (~420 kB), and lazy-loading it keeps that weight out of the Analytics route
 * chunk so the page shell and summary cards paint immediately.
 *
 * Chart colours read the design tokens directly (`var(--border)`, not
 * `hsl(var(--border))`) because the tokens are authored as hex/oklch values —
 * wrapping them in `hsl()` produced invalid colours, which rendered axes and
 * grid lines as near-black on a dark background.
 */

const PIE_COLORS = [
  "var(--chart-1)",
  "var(--chart-4)",
  "var(--chart-3)",
  "var(--chart-5)",
  "var(--chart-2)",
];

const axisTick = { fontSize: 10, fill: "var(--muted-foreground)" };
const axisLine = { stroke: "var(--border)" };

const tooltipStyle = {
  backgroundColor: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "8px",
  fontSize: "12px",
  color: "var(--popover-foreground)",
};

interface Props {
  postStats: PostStats | null;
  followerGrowth: FollowerGrowth | null;
  activityStats: ActivityStats | null;
}

export function AnalyticsCharts({ postStats, followerGrowth, activityStats }: Props) {
  const activityPieData = activityStats
    ? [
        { name: "Posts", value: activityStats.posts },
        { name: "Likes", value: activityStats.likes },
        { name: "Comments", value: activityStats.comments },
        { name: "Follows", value: activityStats.follows },
        { name: "Projects", value: activityStats.projects },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Daily Posts Chart */}
        <div className="bg-card border border-border rounded-xl p-5 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Posts per Day (30 days)</h3>
          </div>
          {(postStats?.dailyData?.length ?? 0) > 0 ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={postStats?.dailyData || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="date"
                    tick={axisTick}
                    tickFormatter={(v) => v.slice(5)}
                    axisLine={axisLine}
                  />
                  <YAxis allowDecimals={false} tick={axisTick} axisLine={axisLine} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-56 text-center">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mb-3">
                <TrendingUp className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No posting activity yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1 max-w-[200px]">
                Create your first post to start tracking your activity.
              </p>
            </div>
          )}
        </div>

        {/* Follower Growth Chart */}
        <div className="bg-card border border-border rounded-xl p-5 animate-fade-in-up">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus className="w-4 h-4 text-success" />
            <h3 className="text-sm font-semibold text-foreground">Follower Growth (30 days)</h3>
          </div>
          {(followerGrowth?.dailyData?.length ?? 0) > 0 ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={followerGrowth?.dailyData || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="date"
                    tick={axisTick}
                    tickFormatter={(v) => v.slice(5)}
                    axisLine={axisLine}
                  />
                  <YAxis allowDecimals={false} tick={axisTick} axisLine={axisLine} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="var(--chart-3)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-56 text-center">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mb-3">
                <UserPlus className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No follower growth yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1 max-w-[200px]">
                Connect with developers and share your profile to start building your network.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Activity Breakdown */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Activity Breakdown</h3>
        </div>
        {activityPieData.length > 0 ? (
          <div className="flex items-center justify-center h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={activityPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {activityPieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend
                  formatter={(value) => (
                    <span style={{ color: "var(--foreground)", fontSize: "12px" }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mb-3">
              <Activity className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No activity yet</p>
            <p className="text-xs text-muted-foreground/70 mt-1 max-w-[240px]">
              Your posts, likes, comments, and follower activity will appear here.
            </p>
          </div>
        )}
      </div>
    </>
  );
}

export default AnalyticsCharts;
