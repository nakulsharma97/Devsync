import { useDevSyncAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { User } from "lucide-react";
import { userService, type UserProfileRequest } from "@/services/userService";

export default function Profile() {
  const { user, isLoading } = useDevSyncAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<UserProfileRequest>({
    fullName: "",
    username: "",
    bio: "",
    location: "",
    githubUsername: "",
    linkedinLink: "",
    portfolioWebsite: "",
  });

  useEffect(() => {
    if (user) {
      setForm({
        fullName: user.fullName || "",
        username: user.username || "",
        bio: user.bio || "",
        location: user.location || "",
        githubUsername: user.githubUsername || "",
        linkedinLink: user.linkedinLink || "",
        portfolioWebsite: user.portfolioWebsite || "",
      });
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await userService.updateProfile(form);
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to update profile:", err);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse text-sm text-muted-foreground">Loading profile...</div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your developer profile</p>
        </div>
        <Button
          variant={isEditing ? "default" : "outline"}
          size="sm"
          onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
          disabled={saving}
          className="text-sm"
        >
          {saving ? "Saving..." : isEditing ? "Save changes" : "Edit profile"}
        </Button>
      </div>

      {/* Avatar & Name */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="w-14 h-14 rounded-full object-cover" />
          ) : (
            <User className="w-6 h-6 text-muted-foreground" />
          )}
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground">{user?.fullName || "Developer"}</h2>
          <p className="text-sm text-muted-foreground">@{user?.username || "username"}</p>
        </div>
      </div>

      {/* Profile Form */}
      <div className="max-w-xl space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Full Name</label>
            <Input
              value={form.fullName || ""}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              disabled={!isEditing}
              className="text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Username</label>
            <Input
              value={form.username || ""}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              disabled={!isEditing}
              className="text-sm"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Bio</label>
          <Textarea
            value={form.bio || ""}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            disabled={!isEditing}
            rows={3}
            className="text-sm resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Location</label>
          <Input
            value={form.location || ""}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            disabled={!isEditing}
            className="text-sm"
          />
        </div>

        <div className="border-t border-border pt-5">
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-4">Links</h3>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">GitHub Username</label>
              <Input
                value={form.githubUsername || ""}
                onChange={(e) => setForm({ ...form, githubUsername: e.target.value })}
                disabled={!isEditing}
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">LinkedIn</label>
              <Input
                value={form.linkedinLink || ""}
                onChange={(e) => setForm({ ...form, linkedinLink: e.target.value })}
                disabled={!isEditing}
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Portfolio</label>
              <Input
                value={form.portfolioWebsite || ""}
                onChange={(e) => setForm({ ...form, portfolioWebsite: e.target.value })}
                disabled={!isEditing}
                className="text-sm"
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
