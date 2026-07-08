import { useDevSyncAuth } from "@/contexts/AuthContext";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { User, AtSign, Github, Linkedin, Globe, MapPin, Pencil, Save, Sparkles, Loader2, Camera, BarChart3 } from "lucide-react";
import { ContributionGraph } from "@/components/ContributionGraph";
import { userService } from "@/services/userService";
import { postService } from "@/services/postService";

export default function Profile() {
  const { user, isLoading } = useDevSyncAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
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

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
        <p className="text-sm text-muted-foreground">Loading profile...</p>
      </div>
    </div>
  );

  return (
    <div className="relative">
      {/* Subtle background decoration */}
      <div className="absolute -top-20 -right-20 w-72 h-72 bg-gradient-to-bl from-accent/[0.03] to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-gradient-to-tr from-purple-500/[0.02] to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-8 relative">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-5 h-5 rounded-md bg-accent/10 flex items-center justify-center">
              <User className="w-3 h-3 text-accent" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Profile</h1>
          </div>
          <p className="ml-7 text-sm text-muted-foreground">Manage your developer profile</p>
        </div>
        <Button
          variant={isEditing ? "default" : "outline"}
          size="sm"
          onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
          disabled={saving}
          className="text-sm shadow-sm hover:shadow-md transition-all duration-200"
        >
          {saving ? (
            <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1.5" /> Saving...</>
          ) : isEditing ? (
            <><Save className="w-3.5 h-3.5 mr-1.5" /> Save changes</>
          ) : (
            <><Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit profile</>
          )}
        </Button>
      </div>

      {/* Avatar & Name - Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
        className="mb-8"
      >
        <div className="bg-card border border-border/50 rounded-xl p-6 relative overflow-hidden group hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          <div className="flex items-center gap-5 relative">
            <div className="relative group/avatar">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center ring-1 ring-accent/20 group-hover:ring-accent/30 transition-all duration-300 shadow-sm overflow-hidden">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-8 h-8 text-accent" />
                )}
                {/* Avatar upload overlay */}
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-200 flex items-center justify-center rounded-2xl"
                >
                  {uploadingAvatar ? (
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  ) : (
                    <Camera className="w-5 h-5 text-white" />
                  )}
                </button>
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setUploadingAvatar(true);
                  try {
                    const result = await postService.uploadFile(file);
                    await userService.updateProfile({ avatarUrl: result.url });
                    window.location.reload();
                  } catch (err) {
                    console.error("Failed to upload avatar:", err);
                  } finally {
                    setUploadingAvatar(false);
                  }
                }}
              />
              {user && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 border-2 border-card shadow-sm" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-foreground truncate">{user?.fullName || "Developer"}</h2>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                <AtSign className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{user?.username || "username"}</span>
              </p>
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                {form.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {form.location}
                  </span>
                )}
                {form.githubUsername && (
                  <a href={`https://github.com/${form.githubUsername}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-foreground transition-colors">
                    <Github className="w-3 h-3" />
                    {form.githubUsername}
                  </a>
                )}
              </div>
            </div>

          </div>
        </div>
      </motion.div>

      {/* Activity Graph */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="mb-8"
      >
        <ContributionGraph />
      </motion.div>

      {/* Form - Two Column Layout */}
      <div className="max-w-2xl">
        <div className="bg-card border border-border/50 rounded-xl p-6 space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-border/50">
            <div className="w-5 h-5 rounded-md bg-accent/10 flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-accent" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Profile Details</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <User className="w-3 h-3" /> Full Name
              </label>
              <Input value={form.fullName || ""} onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                disabled={!isEditing}
                className={`text-sm transition-all duration-200 ${isEditing ? 'bg-background focus:ring-2 focus:ring-accent/30' : 'bg-muted/30'}`} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <AtSign className="w-3 h-3" /> Username
              </label>
              <Input value={form.username || ""} onChange={(e) => setForm({ ...form, username: e.target.value })}
                disabled={!isEditing}
                className={`text-sm transition-all duration-200 ${isEditing ? 'bg-background focus:ring-2 focus:ring-accent/30' : 'bg-muted/30'}`} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-accent/30 flex items-center justify-center text-[6px]">“</span>
              Bio
            </label>
            <Textarea value={form.bio || ""} onChange={(e) => setForm({ ...form, bio: e.target.value })}
              disabled={!isEditing} rows={3}
              className={`text-sm resize-none transition-all duration-200 ${isEditing ? 'bg-background focus:ring-2 focus:ring-accent/30' : 'bg-muted/30'}`}
              placeholder="Tell the world about yourself..." />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Location
            </label>
            <Input value={form.location || ""} onChange={(e) => setForm({ ...form, location: e.target.value })}
              disabled={!isEditing}
              className={`text-sm transition-all duration-200 ${isEditing ? 'bg-background focus:ring-2 focus:ring-accent/30' : 'bg-muted/30'}`}
              placeholder="City, Country" />
          </div>

          <div className="pt-4 border-t border-border/50">
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5 mb-4">
              <span className="w-1 h-4 rounded-full bg-accent" />
              Links
            </h3>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Github className="w-3 h-3" /> GitHub
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">github.com/</span>
                  <Input value={form.githubUsername || ""} onChange={(e) => setForm({ ...form, githubUsername: e.target.value })}
                    disabled={!isEditing} placeholder="username"
                    className={`text-sm pl-[68px] transition-all duration-200 ${isEditing ? 'bg-background focus:ring-2 focus:ring-accent/30' : 'bg-muted/30'}`} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Linkedin className="w-3 h-3" /> LinkedIn
                </label>
                <Input value={form.linkedinLink || ""} onChange={(e) => setForm({ ...form, linkedinLink: e.target.value })}
                  disabled={!isEditing} placeholder="https://linkedin.com/in/..."
                  className={`text-sm transition-all duration-200 ${isEditing ? 'bg-background focus:ring-2 focus:ring-accent/30' : 'bg-muted/30'}`} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Globe className="w-3 h-3" /> Portfolio
                </label>
                <Input value={form.portfolioWebsite || ""} onChange={(e) => setForm({ ...form, portfolioWebsite: e.target.value })}
                  disabled={!isEditing} placeholder="https://..."
                  className={`text-sm transition-all duration-200 ${isEditing ? 'bg-background focus:ring-2 focus:ring-accent/30' : 'bg-muted/30'}`} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
