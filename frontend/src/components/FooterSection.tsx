import { Code2, Github, Twitter, MessageCircle } from "lucide-react";
import { footerColumns } from "@/data/landing";

export default function FooterSection() {
  return (
    <footer className="relative border-t border-border/20 bg-background/40 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-14 md:py-20">
        <div className="grid sm:grid-cols-2 md:grid-cols-5 gap-8 md:gap-12">
          <div className="sm:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                <Code2 className="w-4 h-4 text-white" />
              </div>
              <span className="text-base font-bold">DevSync</span>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground leading-relaxed max-w-xs mb-6">
              A developer collaboration platform built by engineers, for engineers. Ship better software, together.
            </p>
            <div className="flex items-center gap-2">
              {[
                { icon: Github, href: "https://github.com/devsync", label: "GitHub" },
                { icon: Twitter, href: "https://twitter.com/devsync", label: "Twitter" },
                { icon: MessageCircle, href: "https://discord.gg/devsync", label: "Discord" },
              ].map(({ icon: Icon, href, label }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="w-9 h-9 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-200">
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {footerColumns.map((col) => (
            <div key={col.title}>
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-4">{col.title}</h4>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.name}>
                    <a href={link.href} className="text-xs md:text-sm text-muted-foreground hover:text-foreground transition-colors hover:underline underline-offset-2">{link.name}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-border/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} DevSync. All rights reserved.</p>
          <div className="flex items-center gap-6">
            {[{ name: "Twitter", href: "https://twitter.com/devsync" }, { name: "GitHub", href: "https://github.com/devsync" }, { name: "Discord", href: "https://discord.gg/devsync" }].map((social) => (
              <a key={social.name} href={social.href} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground transition-colors">{social.name}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
