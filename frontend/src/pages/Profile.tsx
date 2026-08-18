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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, FileText, Users, UserPlus } from "lucide-react";
import { toast } from "sonner";

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const { data: profile, loading } = useApi(() => userService.getMe());
  const { data: social } = useApi<SocialProfileDto>(() =>
    user?.username ? socialService.getProfile(user.username) : Promise.reject(new Error("no username"))
  );
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    username: "",
    bio: "",
    jobTitle: "",
    company: "",
    location: "",
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await userService.updateMe(form);
      await refreshUser();
      toast("Profile updated!");
    } catch (err) {
      toast(getErrorMessage(err, "Failed to update"));
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
    });
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your developer profile</p>
        </div>
        <Button
          size="sm"
          onClick={() => navigate("/profile/posts")}
          className="shrink-0 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs hover:from-indigo-600 hover:to-purple-700"
        >
          <FileText className="w-3.5 h-3.5 mr-1.5" />
          My Posts
        </Button>
      </div>

      {/* Social stats */}
      {social && (
        <div className="grid grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => navigate("/profile/posts")}
            className="rounded-xl border border-border/40 bg-card p-4 text-left hover:border-accent/30 transition-colors"
          >
            <p className="text-2xl font-bold">{social.posts.toLocaleString()}</p>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Posts
            </p>
          </button>
          <button
            type="button"
            onClick={() => navigate(`/profile/${user?.username}`)}
            className="rounded-xl border border-border/40 bg-card p-4 text-left hover:border-accent/30 transition-colors"
            aria-label={`View followers (${social.followerCount})`}
          >
            <p className="text-2xl font-bold">{social.followerCount.toLocaleString()}</p>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Followers
            </p>
          </button>
          <button
            type="button"
            onClick={() => navigate(`/profile/${user?.username}`)}
            className="rounded-xl border border-border/40 bg-card p-4 text-left hover:border-accent/30 transition-colors"
            aria-label={`View following (${social.followingCount})`}
          >
            <p className="text-2xl font-bold">{social.followingCount.toLocaleString()}</p>
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Following
            </p>
          </button>
        </div>
      )}

      <Card className="border-border/40">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Personal Information</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-indigo-500" /></div>
          ) : (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xl font-bold text-white">
                  {user?.fullName?.charAt(0) || "U"}
                </div>
                <div>
                  <p className="font-semibold">{user?.fullName}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="fullName" className="text-xs">Full Name</Label>
                  <Input id="fullName" placeholder="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="username" className="text-xs">Username</Label>
                  <Input id="username" placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="jobTitle" className="text-xs">Job Title</Label>
                  <Input id="jobTitle" placeholder="Job title" value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="company" className="text-xs">Company</Label>
                  <Input id="company" placeholder="Company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="location" className="text-xs">Location</Label>
                  <Input id="location" placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="bio" className="text-xs">Bio</Label>
                  <Input id="bio" placeholder="Bio" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
                </div>
              </div>
              <Button type="submit" disabled={saving} className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save Changes
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
