import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDevSyncAuth } from "@/contexts/AuthContext";
import { LogOut, User } from "lucide-react";

export default function Settings() {
  const { user, logout } = useDevSyncAuth();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your account preferences</p>
      </div>

      <div className="max-w-xl space-y-8">
        {/* Account Info */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Account Information
          </h2>
          <div className="border border-border rounded-lg p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <User className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{user?.fullName || "Developer"}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Email</label>
                <p className="text-sm text-foreground">{user?.email || "—"}</p>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Role</label>
                <p className="text-sm text-foreground">{user?.role || "DEVELOPER"}</p>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Member since</label>
              <p className="text-sm text-foreground">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}
              </p>
            </div>
          </div>
        </section>

        {/* Appearance */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Appearance
          </h2>
          <div className="border border-border rounded-lg p-5">
            <p className="text-sm text-muted-foreground mb-3">
              Theme preferences are managed by your system settings.
            </p>
            <div className="flex gap-2">
              <div className="flex-1 border border-border rounded-lg p-4 text-center bg-background">
                <p className="text-xs text-foreground">Light</p>
              </div>
              <div className="flex-1 border border-border rounded-lg p-4 text-center bg-foreground">
                <p className="text-xs text-background">Dark</p>
              </div>
            </div>
          </div>
        </section>

        {/* Danger Zone */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Danger Zone
          </h2>
          <div className="border border-border rounded-lg p-5">
            <p className="text-sm text-muted-foreground mb-4">
              Sign out of your account on this device.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="text-sm text-destructive border-destructive/30 hover:bg-destructive/10"
            >
              <LogOut className="w-4 h-4 mr-1.5" />
              Sign Out
            </Button>
          </div>
        </section>
      </div>
    </motion.div>
  );
}
