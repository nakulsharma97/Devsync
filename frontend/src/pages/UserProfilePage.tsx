import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  User,
  AtSign,
  MapPin,
  MessageCircle,
  ArrowLeft,
  Briefcase,
  Building2,
  Flame,
  FolderKanban,
  CheckCircle2,
  MessageSquare,
  FileText,
  CalendarDays,
} from "lucide-react";
import { publicProfileService, type PublicProfileDto } from "@/services/publicProfileService";
import { cn } from "@/lib/utils";

const HEATMAP_DAYS = 13 * 7; // 13 weeks

/** Build a dense [date → count] map from the server's sparse heatmap points. */
function useHeatmap(profile: PublicProfileDto | null): Map<string, number> {
  return useMemo(() => {
    const map = new Map<string, number>();
    for (const p of profile?.contributions.heatmap ?? []) {
      map.set(p.date.slice(0, 10), p.count);
    }
    return map;
  }, [profile]);
}

/** GitHub-style contribution grid for the last {@link HEATMAP_DAYS} days. */
function ContributionHeatmap({ counts }: { counts: Map<string, number> }) {
  const days = useMemo(() => {
    const result: { date: string; count: number }[] = [];
    const today = new Date();
    for (let i = HEATMAP_DAYS - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      result.push({ date: key, count: counts.get(key) ?? 0 });
    }
    return result;
  }, [counts]);

  const max = Math.max(1, ...days.map((d) => d.count));

  return (
    <div className="overflow-x-auto pb-1">
      <div className="grid grid-flow-col grid-rows-7 gap-1 min-w-max">
        {days.map(({ date, count }) => {
          const intensity = count === 0 ? 0 : count >= max * 0.75 ? 4 : count >= max * 0.5 ? 3 : count >= max * 0.25 ? 2 : 1;
          return (
            <span
              key={date}
              title={`${date}: ${count} contribution${count !== 1 ? "s" : ""}`}
              className={cn(
                "w-3 h-3 rounded-[3px]",
                intensity === 0 && "bg-muted/50",
                intensity === 1 && "bg-indigo-500/30",
                intensity === 2 && "bg-indigo-500/50",
                intensity === 3 && "bg-indigo-500/75",
                intensity === 4 && "bg-indigo-500"
              )}
            />
          );
        })}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border/40 bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-1.5">
        {icon}
        <span className="text-[11px] font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value.toLocaleString()}</p>
    </div>
  );
}

export default function UserProfilePage() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<PublicProfileDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const counts = useHeatmap(profile);

  const fetchProfile = useCallback(async () => {
    if (!username) return;
    setLoading(true);
    setError(null);
    try {
      setProfile(await publicProfileService.getProfile(username));
    } catch {
      setError("This profile doesn't exist or is no longer available.");
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
          <p className="text-sm text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center mb-4 ring-1 ring-accent/20">
          <User className="w-6 h-6 text-accent" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">Profile not found</h3>
        <p className="text-sm text-muted-foreground mt-1">This user doesn't exist or has been removed.</p>
        <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="mt-4">
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Go back
        </Button>
      </div>
    );
  }

  const c = profile.contributions;
  const memberSince = profile.memberSince
    ? new Date(profile.memberSince).toLocaleDateString(undefined, { month: "short", year: "numeric" })
    : null;
  const badges: string[] = [];
  if (c.currentStreak >= 30) badges.push("🔥 30+ day streak");
  else if (c.currentStreak >= 7) badges.push("🔥 7+ day streak");
  else if (c.currentStreak >= 3) badges.push("🔥 On a roll");
  if (c.projectsCreated >= 5) badges.push("🚀 Builder");
  if (c.tasksCompleted >= 25) badges.push("✅ Task Master");
  if (c.messagesSent >= 100) badges.push("💬 Team Communicator");

  return (
    <div className="relative">
      <div className="absolute -top-20 -right-20 w-72 h-72 bg-gradient-to-bl from-accent/[0.03] to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back
      </button>

      {/* Profile card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border/50 rounded-xl p-6 mb-6 relative overflow-hidden hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5 transition-all duration-300"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.02] to-transparent pointer-events-none" />

        <div className="flex items-start gap-5 relative flex-wrap">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center ring-1 ring-accent/20 shrink-0 overflow-hidden shadow-sm">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <User className="w-8 h-8 text-accent" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-foreground truncate">{profile.displayName}</h2>
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
              <AtSign className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">@{profile.username}</span>
            </p>

            {/* Badges — only from data the user actually provided */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {profile.jobTitle && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20 font-medium flex items-center gap-1">
                  <Briefcase className="w-2.5 h-2.5" /> {profile.jobTitle}
                </span>
              )}
              {profile.company && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted/50 text-muted-foreground border border-border/30 flex items-center gap-1">
                  <Building2 className="w-2.5 h-2.5" /> {profile.company}
                </span>
              )}
              {profile.location && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted/50 text-muted-foreground border border-border/30 flex items-center gap-1">
                  <MapPin className="w-2.5 h-2.5" /> {profile.location}
                </span>
              )}
            </div>

            {/* Bio */}
            {profile.bio && (
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{profile.bio}</p>
            )}

            {/* Earned badges */}
            {badges.length > 0 && (
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {badges.map((b) => (
                  <span
                    key={b}
                    className="text-[10px] px-2 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-medium"
                  >
                    {b}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
              {memberSince && (
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="w-3.5 h-3.5" /> Member since {memberSince}
                </span>
              )}
              {c.currentStreak > 0 && (
                <span className="inline-flex items-center gap-1 text-orange-500">
                  <Flame className="w-3.5 h-3.5" /> {c.currentStreak} day streak
                </span>
              )}
            </div>
          </div>

        </div>
      </motion.div>

      {/* Contribution stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <StatCard icon={<FolderKanban className="w-3.5 h-3.5" />} label="Projects" value={c.projectsCreated} />
        <StatCard icon={<CheckCircle2 className="w-3.5 h-3.5" />} label="Tasks done" value={c.tasksCompleted} />
        <StatCard icon={<MessageSquare className="w-3.5 h-3.5" />} label="Messages" value={c.messagesSent} />
        <StatCard icon={<FileText className="w-3.5 h-3.5" />} label="Posts" value={c.postsCreated} />
        <StatCard icon={<MessageCircle className="w-3.5 h-3.5" />} label="Comments" value={c.commentsAdded} />
      </div>

      {/* Heatmap */}
      <div className="rounded-xl border border-border/50 bg-card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-500" />
            Contribution activity
          </h3>
          <span className="text-[11px] text-muted-foreground">Last {HEATMAP_DAYS} days</span>
        </div>
        <ContributionHeatmap counts={counts} />
        {c.heatmap.length === 0 && (
          <p className="text-xs text-muted-foreground mt-3">
            No contributions yet — this developer is just getting started.
          </p>
        )}
      </div>
    </div>
  );
}
