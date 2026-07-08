import { Outlet, useLocation } from "react-router";
import { motion } from "framer-motion";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";
import { ToastNotificationProvider } from "@/components/ToastNotificationProvider";
import { CommandPalette } from "@/components/CommandPalette";
import { ChangelogModal } from "@/components/ChangelogModal";

export function DashboardLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <ToastNotificationProvider />
      <CommandPalette />
      <ChangelogModal />
      <Sidebar />
      <Navbar />
      <main className="pl-56 pt-14 min-h-screen">
        <div className="p-6 max-w-6xl mx-auto">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <Outlet />
          </motion.div>
        </div>
      </main>
    </div>
  );
}
