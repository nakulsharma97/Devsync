import { useDevSyncAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { User, AtSign } from "lucide-react";
import { userService } from "@/services/userService";

export default function Profile() {
  const { user, isLoading } = useDevSyncAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fullName: "", username: "", bio: "", location: "",
    githubUsername: "", linkedinLink: "", portfolioWebsite: "",
  });

  useEffect(() => {
    if (user) setForm({
      fullName: user.fullName || "", username: user.username || "",
      bio: user.bio || "", location: user.location || "",
      githubUsername: user.githubUsername || "", linkedinLink: user.linkedinLink || "",
      portfolioWebsite: user.portfolioWebsite || "",
    });
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

  if (isLoading) return <div className="animate-pulse text-sm text-muted-foreground py-12 text-center">Loading profile...</div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your developer profile</p>
        </div>
        <Button variant={isEditing ? "default" : "outline"} size="sm"
          onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
          disabled={saving} className="text-sm shadow-sm">
          {saving ? "Saving..." : isEditing ? "Save changes" : "Edit profile"}
        </Button>
      </div>

      {/* Avatar & Name */}
      <div className="flex items-center gap-5 mb-10">
        <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center ring-1 ring-accent/20">
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="w-16 h-16 rounded-2xl object-cover" />
          ) : (
            <User className="w-7 h-7 text-accent" />
          )}
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">{user?.fullName || "Developer"}</h2>
          <p className="text-sm text-muted-foreground flex items-center gap-1"><AtSign className="w-3.5 h-3.5" />{user?.username || "username"}</p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-xl space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Full Name</label>
            <Input value={form.fullName || ""} onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              disabled={!isEditing} className="text-sm bg-background" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Username</label>
            <Input value={form.username || ""} onChange={(e) => setForm({ ...form, username: e.target.value })}
              disabled={!isEditing} className="text-sm bg-background" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Bio</label>
          <Textarea value={form.bio || ""} onChange={(e) => setForm({ ...form, bio: e.target.value })}
            disabled={!isEditing} rows={3} className="text-sm resize-none bg-background" />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Location</label>
          <Input value={form.location || ""} onChange={(e) => setForm({ ...form, location: e.target.value })}
            disabled={!isEditing} className="text-sm bg-background" />
        </div>

        <div className="border-t border-border/50 pt-6">
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-4">Links</h3>
          <div className="space-y-4">
            {[
              { label: "GitHub", value: form.githubUsername, key: "githubUsername", placeholder: "username" },
              { label: "LinkedIn", value: form.linkedinLink, key: "linkedinLink", placeholder: "https://linkedin.com/in/..." },
              { label: "Portfolio", value: form.portfolioWebsite, key: "portfolioWebsite", placeholder: "https://..." },
            ].map((field) => (
              <div key={field.key} className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">{field.label}</label>
                <Input value={field.value || ""} onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                  disabled={!isEditing} className="text-sm bg-background" placeholder={field.placeholder} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
