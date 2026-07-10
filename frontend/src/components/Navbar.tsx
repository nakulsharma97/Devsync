import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { HighContrastToggle } from "@/components/HighContrastToggle";
import { Code2, ArrowRight, Menu, X } from "lucide-react";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How it Works", href: "#docs" },
  { label: "Enterprise", href: "#enterprise" },
  { label: "Pricing", href: "#pricing" },
];

export default function Navbar() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled
        ? "bg-background/85 backdrop-blur-xl border-b border-border shadow-sm"
        : "bg-background/40 backdrop-blur-sm border-b border-border/10"
    }`}>
      <div className={`mx-auto max-w-7xl px-4 sm:px-6 flex items-center justify-between transition-all duration-300 ${
        scrolled ? "py-2" : "py-3"
      }`}>
        <button onClick={() => navigate("/")} className="flex items-center gap-2.5 group">
          <div className={`rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 transition-all duration-300 group-hover:scale-105 group-hover:shadow-indigo-500/30 ${
            scrolled ? "w-6 h-6" : "w-8 h-8"
          }`}>
            <Code2 className={`text-white transition-all duration-300 ${
              scrolled ? "w-3 h-3" : "w-4 h-4"
            }`} />
          </div>
          <span className={`font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text transition-all duration-300 ${
            scrolled ? "text-sm" : "text-base"
          }`}>DevSync</span>
        </button>

        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={`text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-accent/5 ${
                scrolled ? "px-2 py-1.5 text-xs" : "px-3 py-2 text-sm"
              }`}
            >
              {item.label}
            </a>
          ))}
          <div className="w-px h-5 bg-border/50 mx-2" />
          <HighContrastToggle />
          <ThemeToggle />
          <Button variant="ghost" onClick={() => navigate("/auth")} className={`transition-all duration-300 font-medium ${
            scrolled ? "text-xs h-7 px-2.5" : "text-sm h-9 px-4"
          }`}>Sign in</Button>
          <Button onClick={() => navigate("/auth")} className={`transition-all duration-300 bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 shadow-lg hover:shadow-xl font-medium ${
            scrolled ? "text-xs h-7 px-3" : "text-sm h-9 px-4"
          }`}>
            Start Free<ArrowRight className={`ml-1.5 transition-all duration-300 ${scrolled ? "w-3 h-3" : "w-3.5 h-3.5"}`} />
          </Button>
        </nav>

        <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden p-2 rounded-lg hover:bg-accent/5 transition-colors">
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      <div className={`md:hidden overflow-hidden transition-all duration-300 ${mobileOpen ? "max-h-96 border-b border-border/30 bg-background/95 backdrop-blur-xl" : "max-h-0"}`}>
        <div className="px-4 py-4 space-y-2">
          {navLinks.map((item) => (
            <a key={item.label} href={item.href} onClick={() => setMobileOpen(false)} className="block px-3 py-2.5 text-sm text-foreground rounded-lg hover:bg-accent/5 transition-colors">
              {item.label}
            </a>
          ))}
          <div className="pt-2 space-y-2">
            <Button variant="outline" className="w-full" onClick={() => navigate("/auth")}>Sign in</Button>
            <Button className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white" onClick={() => navigate("/auth")}>Start Free</Button>
          </div>
        </div>
      </div>
    </header>
  );
}
