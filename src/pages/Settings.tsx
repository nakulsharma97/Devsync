import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useDevSyncAuth } from "@/contexts/AuthContext";
import { LogOut, User, Mail, Shield, Calendar } from "lucide-react";

export default function Settings() {
  const { user, logout } = useDevSyncAuth();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your account preferences</p>
      </div>

      <div className="max-w-xl space-y-6">
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Account Information</h2>
          <div className="border border-border/50 rounded-xl p-5 bg-card space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center ring-1 ring-accent/20">
                {user?.avatarUrl ? <img src={user.avatarUrl} alt="" className="w-12 h-12 rounded-2xl object-cover" /> : <User className="w-6 h-6 text-accent" />}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{user?.fullName || "Developer"}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/50">
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Email</p>
                  <p className="text-sm text-foreground">{user?.email || "—"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Role</p>
                  <p className="text-sm text-foreground">{user?.role || "DEVELOPER"}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-border/50">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Member since</p>
                <p className="text-sm text-foreground">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—"}</p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Appearance</h2>
          <div className="border border-border/50 rounded-xl p-5 bg-card">
            <p className="text-sm text-muted-foreground mb-4">Theme preferences are managed by your system settings.</p>
            <div className="flex gap-3">
              <div className="flex-1 border border-border/50 rounded-xl p-4 text-center bg-background"><p className="text-xs text-foreground font-medium">Light</p></div>
              <div className="flex-1 border border-border/50 rounded-xl p-4 text-center bg-foreground"><p className="text-xs text-background font-medium">Dark</p></div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Danger Zone</h2>
          <div className="border border-destructive/20 rounded-xl p-5 bg-card">
            <p className="text-sm text-muted-foreground mb-4">Sign out of your account on this device. You can sign back in anytime.</p>
            <Button variant="outline" size="sm" onClick={logout} className="text-sm text-destructive border-destructive/30 hover:bg-destructive/10 shadow-sm">
              <LogOut className="w-4 h-4 mr-1.5" /> Sign Out
            </Button>
          </div>
        </section>
      </div>
    </motion.div>
  );
}
