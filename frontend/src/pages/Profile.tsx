import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/hooks/useApi";
import { userService } from "@/services/userService";
import { socialService, type SocialProfileDto } from "@/services/socialService";
import { getErrorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  User,
  Save,
  FileText,
  MapPin,
  Briefcase,
  Building2,
  Pencil,
  Loader2,
  Globe,
  Twitter,
  ExternalLink,
  CalendarDays,
} from "lucide-react";
import { toast } from "sonner";

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const { data: profile, loading } = useApi(() => userService.getMe());
  const { data: social } = useApi<SocialProfileDto>(() =>
    user?.username
      ? socialService.getProfile(user.username)
      : Promise.reject(new Error("no username"))
  );
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    username: "",
    bio: "",
    jobTitle: "",
    company: "",
    location: "",
    githubUrl: "",
    twitterUrl: "",
    websiteUrl: "",
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await userService.updateMe(form);
      await refreshUser();
      toast.success("Profile updated successfully");
    } catch (err) {
      toast.error(getErrorMessage(err, "Failed to update profile"));
    } finally {
      setSaving(false);
    }
  };

  // Populate form when profile loads
  if (profile && !form.fullName && !saving) {
    setForm({
      fullName: profile.fullName || "",
      username: profile.username || "",
      bio: profile.bio || "",
      jobTitle: profile.jobTitle || "",
      company: profile.company || "",
      location: profile.location || "",
      githubUrl: profile.githubUrl || "",
      twitterUrl: profile.twitterUrl || "",
      websiteUrl: profile.websiteUrl || "",
    });
  }

  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString(undefined, {
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div className="max-w-[1060px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your developer profile
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate(`/profile/${user?.username}`)}
          className="shrink-0 gap-1.5"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          View Public Profile
        </Button>
      </div>

      {/* Profile Header Card */}
      <div className="bg-card border border-border/50 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/[0.03] to-purple-500/[0.02] pointer-events-none" />
        <div className="relative flex items-start gap-5">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/10 flex items-center justify-center ring-2 ring-indigo-500/20 shrink-0 overflow-hidden shadow-md shadow-indigo-500/10">
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-8 h-8 text-indigo-500" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-foreground">
              {user?.fullName || "Your Name"}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              @{user?.username || "username"}
            </p>

            <div className="flex items-center gap-3 mt-3 flex-wrap">
              {profile?.jobTitle && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-medium flex items-center gap-1">
                  <Briefcase className="w-2.5 h-2.5" /> {profile.jobTitle}
                </span>
              )}
              {profile?.company && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground border border-border/30 flex items-center gap-1">
                  <Building2 className="w-2.5 h-2.5" /> {profile.company}
                </span>
              )}
              {profile?.location && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground border border-border/30 flex items-center gap-1">
                  <MapPin className="w-2.5 h-2.5" /> {profile.location}
                </span>
              )}
              {memberSince && (
                <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <CalendarDays className="w-2.5 h-2.5" /> Member since{" "}
                  {memberSince}
                </span>
              )}
            </div>

            {profile?.bio && (
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                {profile.bio}
              </p>
            )}
          </div>

          {/* Quick actions */}
          <div className="flex flex-col gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => document.getElementById("profile-form")?.scrollIntoView({ behavior: "smooth" })}
              className="gap-1.5"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => navigate("/profile/posts")}
              className="gap-1.5 text-muted-foreground"
            >
              <FileText className="w-3.5 h-3.5" />
              Posts
            </Button>
          </div>
        </div>

        {/* Social Stats */}
        {social && (
          <div className="grid grid-cols-3 gap-3 mt-6 relative">
            <button
              type="button"
              onClick={() => navigate("/profile/posts")}
              className="rounded-xl border border-border/40 bg-muted/20 p-4 text-left hover:border-indigo-500/20 hover:bg-indigo-500/5 transition-all"
            >
              <p className="text-2xl font-bold text-foreground">
                {social.posts.toLocaleString()}
              </p>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Posts
              </p>
            </button>
            <button
              type="button"
              onClick={() => navigate(`/profile/${user?.username}`)}
              className="rounded-xl border border-border/40 bg-muted/20 p-4 text-left hover:border-indigo-500/20 hover:bg-indigo-500/5 transition-all"
            >
              <p className="text-2xl font-bold text-foreground">
                {social.followerCount.toLocaleString()}
              </p>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Followers
              </p>
            </button>
            <button
              type="button"
              onClick={() => navigate(`/profile/${user?.username}`)}
              className="rounded-xl border border-border/40 bg-muted/20 p-4 text-left hover:border-indigo-500/20 hover:bg-indigo-500/5 transition-all"
            >
              <p className="text-2xl font-bold text-foreground">
                {social.followingCount.toLocaleString()}
              </p>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Following
              </p>
            </button>
          </div>
        )}
      </div>

      {/* Edit Form */}
      <div id="profile-form" className="bg-card border border-border/50 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border/40">
          <h3 className="text-sm font-semibold text-foreground">
            Personal Information
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Update your profile details visible to other developers
          </p>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="fullName" className="text-xs font-medium">
                    Full Name
                  </Label>
                  <Input
                    id="fullName"
                    placeholder="Your full name"
                    value={form.fullName}
                    onChange={(e) =>
                      setForm({ ...form, fullName: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="username" className="text-xs font-medium">
                    Username
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      @
                    </span>
                    <Input
                      id="username"
                      placeholder="username"
                      value={form.username}
                      onChange={(e) =>
                        setForm({ ...form, username: e.target.value })
                      }
                      className="pl-7"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="jobTitle" className="text-xs font-medium">
                    Job Title
                  </Label>
                  <Input
                    id="jobTitle"
                    placeholder="e.g. Frontend Developer"
                    value={form.jobTitle}
                    onChange={(e) =>
                      setForm({ ...form, jobTitle: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="company" className="text-xs font-medium">
                    Company
                  </Label>
                  <Input
                    id="company"
                    placeholder="e.g. DevSync Inc."
                    value={form.company}
                    onChange={(e) =>
                      setForm({ ...form, company: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="location" className="text-xs font-medium">
                    Location
                  </Label>
                  <Input
                    id="location"
                    placeholder="e.g. San Francisco, CA"
                    value={form.location}
                    onChange={(e) =>
                      setForm({ ...form, location: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="bio" className="text-xs font-medium">
                    Bio
                  </Label>
                  <Input
                    id="bio"
                    placeholder="Tell other developers about yourself"
                    value={form.bio}
                    onChange={(e) =>
                      setForm({ ...form, bio: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* Social Links */}
              <div className="pt-3 border-t border-border/40">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                  Social Links
                </h4>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="githubUrl" className="text-xs font-medium flex items-center gap-1.5">
                      <Globe className="w-3 h-3" /> Website
                    </Label>
                    <Input
                      id="githubUrl"
                      placeholder="https://..."
                      value={form.websiteUrl}
                      onChange={(e) =>
                        setForm({ ...form, websiteUrl: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="twitterUrl" className="text-xs font-medium flex items-center gap-1.5">
                      <Twitter className="w-3 h-3" /> Twitter
                    </Label>
                    <Input
                      id="twitterUrl"
                      placeholder="https://twitter.com/..."
                      value={form.twitterUrl}
                      onChange={(e) =>
                        setForm({ ...form, twitterUrl: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="githubLink" className="text-xs font-medium flex items-center gap-1.5">
                      <Globe className="w-3 h-3" /> GitHub
                    </Label>
                    <Input
                      id="githubLink"
                      placeholder="https://github.com/..."
                      value={form.githubUrl}
                      onChange={(e) =>
                        setForm({ ...form, githubUrl: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Changes
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/profile/posts")}
                  className="text-muted-foreground"
                >
                  <FileText className="w-3.5 h-3.5 mr-1.5" />
                  View My Posts
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
