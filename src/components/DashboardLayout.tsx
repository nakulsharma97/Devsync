import { Outlet } from "react-router";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/Navbar";
import { AnimatedPage } from "@/components/AnimatedPage";

export function DashboardLayout() {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Navbar />
      <main className="pl-56 pt-14 min-h-screen">
        <div className="p-6 max-w-6xl mx-auto">
          <AnimatedPage>
            <Outlet />
          </AnimatedPage>
        </div>
      </main>
    </div>
  );
}
