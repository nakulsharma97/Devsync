import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useDevSyncAuth } from "@/contexts/AuthContext";
import { LogOut, User, Mail, Shield, Calendar, Settings2, Moon, Sun, Eye, AlertTriangle } from "lucide-react";
import { useHighContrast } from "@/hooks/useHighContrast";

export default function Settings() {
  const { user, logout } = useDevSyncAuth();
  const { enabled: highContrast, setEnabled: setHighContrast } = useHighContrast();

  return (
    <div className="relative">
      {/* Subtle background decoration */}
      <div className="absolute -top-20 -right-20 w-72 h-72 bg-gradient-to-bl from-accent/[0.03] to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-gradient-to-tr from-purple-500/[0.02] to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="mb-8 relative">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-5 h-5 rounded-md bg-accent/10 flex items-center justify-center">
            <Settings2 className="w-3 h-3 text-accent" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings</h1>
        </div>
        <p className="ml-7 text-sm text-muted-foreground">Manage your account preferences</p>
      </div>

      <div className="max-w-xl space-y-8">
        {/* Account Information */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1 h-4 rounded-full bg-accent" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Account Information</h2>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="bg-card border border-border/50 rounded-xl overflow-hidden group hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5 transition-all duration-300"
          >
            <div className="p-5 space-y-4 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              <div className="flex items-center gap-4 relative">
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center ring-1 ring-accent/20 group-hover:ring-accent/30 transition-all duration-300 shadow-sm">
                    {user?.avatarUrl ? <img src={user.avatarUrl} alt="" className="w-14 h-14 rounded-2xl object-cover" /> : <User className="w-7 h-7 text-accent" />}
                  </div>
                  {user && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-card shadow-sm" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors duration-200">{user?.fullName || "Developer"}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/50 relative">
                <div className="flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-accent/5 transition-colors duration-200">
                  <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                    <Mail className="w-3.5 h-3.5 text-accent" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Email</p>
                    <p className="text-sm text-foreground truncate">{user?.email || "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-accent/5 transition-colors duration-200">
                  <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                    <Shield className="w-3.5 h-3.5 text-accent" />
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Role</p>
                    <p className="text-sm text-foreground">{user?.role || "DEVELOPER"}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-accent/5 transition-colors duration-200 pt-1 border-t border-border/50 relative">
                <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                  <Calendar className="w-3.5 h-3.5 text-accent" />
                </div>
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Member since</p>
                  <p className="text-sm text-foreground">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "—"}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Appearance */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1 h-4 rounded-full bg-accent" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Appearance</h2>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="bg-card border border-border/50 rounded-xl p-5 group hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5 transition-all duration-300"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center">
                <Moon className="w-3.5 h-3.5 text-accent" />
              </div>
              <p className="text-sm text-muted-foreground">Theme preferences are managed by your system settings.</p>
            </div>
            <div className="flex gap-3">
              <div className="group/theme flex-1 border-2 border-accent/30 rounded-xl p-4 text-center bg-background shadow-sm hover:shadow-md transition-all duration-200 relative overflow-hidden cursor-default">
                <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.03] to-transparent" />
                <Sun className="w-5 h-5 mx-auto mb-1.5 text-accent relative" />
                <p className="text-xs text-foreground font-medium relative">Light</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 relative">Default</p>
              </div>
              <div className="group/theme flex-1 border-2 border-border/50 rounded-xl p-4 text-center bg-foreground shadow-sm hover:shadow-md hover:border-accent/30 transition-all duration-200 relative overflow-hidden cursor-default">
                <Moon className="w-5 h-5 mx-auto mb-1.5 text-background relative" />
                <p className="text-xs text-background font-medium relative">Dark</p>
                <p className="text-[10px] text-muted-foreground/70 mt-0.5 relative">System</p>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Accessibility / High Contrast */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1 h-4 rounded-full bg-accent" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Accessibility</h2>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.12 }}
            className="bg-card border border-border/50 rounded-xl p-5 group hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5 transition-all duration-300"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center">
                <Eye className="w-3.5 h-3.5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-foreground font-medium">High Contrast Mode</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Increases color contrast for better readability. Applies to both light and dark modes.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setHighContrast(true)}
                className={`flex-1 rounded-xl p-4 text-center border-2 transition-all duration-200 ${
                  highContrast
                    ? "border-accent bg-accent/10 shadow-sm"
                    : "border-border/50 hover:border-accent/30 hover:shadow-sm"
                }`}
              >
                <Eye className="w-5 h-5 mx-auto mb-1.5 text-foreground" />
                <p className={`text-xs font-medium ${highContrast ? "text-accent" : "text-foreground"}`}>
                  On
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  WCAG AAA (7:1+)
                </p>
              </button>
              <button
                onClick={() => setHighContrast(false)}
                className={`flex-1 rounded-xl p-4 text-center border-2 transition-all duration-200 ${
                  !highContrast
                    ? "border-border/50 bg-card shadow-sm"
                    : "border-border/20 hover:border-accent/30"
                }`}
              >
                <Eye className="w-5 h-5 mx-auto mb-1.5 text-muted-foreground" />
                <p className="text-xs font-medium text-foreground">
                  Off
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  WCAG AA (4.5:1+)
                </p>
              </button>
            </div>
          </motion.div>
        </section>

        {/* Danger Zone */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1 h-4 rounded-full bg-destructive/60" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-destructive/70">Danger Zone</h2>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="border border-destructive/20 rounded-xl overflow-hidden group hover:border-destructive/40 hover:shadow-lg hover:shadow-destructive/5 transition-all duration-300"
          >
            <div className="p-5 bg-card relative">
              <div className="absolute inset-0 bg-gradient-to-br from-destructive/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              <div className="flex items-start gap-3 relative">
                <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground mb-1">Sign Out</p>
                  <p className="text-xs text-muted-foreground mb-4">Sign out of your account on this device. You can sign back in anytime.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={logout}
                    className="text-sm text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    <LogOut className="w-4 h-4 mr-1.5" /> Sign Out
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </section>
      </div>
    </div>
  );
}
