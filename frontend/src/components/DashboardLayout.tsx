import { Outlet, useLocation } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";

export function DashboardLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Navbar />
      <main className="pl-56 pt-14 min-h-screen">
        <div className="p-6 max-w-6xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
