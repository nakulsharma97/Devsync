import { useState, useEffect } from "react";
import { X, Sparkles, Smile, Keyboard, Share2, Rss, Palette } from "lucide-react";

const APP_VERSION = "1.1.0";
const STORAGE_KEY = "devsync_changelog_seen";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ICON_MAP: Record<string, any> = {
  Smile, Keyboard, Share2, Rss, Palette,
};

interface ChangelogEntry {
  version: string;
  title: string;
  items: { iconKey: string; text: string }[];
}

const changelog: ChangelogEntry[] = [
  {
    version: "1.1.0",
    title: "Emoji Reactions, Command Palette & More!",
    items: [
      { iconKey: "Smile", text: "React with emojis (👍🎉❤️🚀👀) on any post" },
      { iconKey: "Keyboard", text: "Press Ctrl+K to open the command palette for quick navigation" },
      { iconKey: "Share2", text: "Share buttons on posts — one-click copy link to clipboard" },
      { iconKey: "Rss", text: "Reading time estimates on every post" },
      { iconKey: "Palette", text: "Shimmer skeleton loaders for a smoother loading experience" },
    ],
  },
];

export function ChangelogModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(STORAGE_KEY);
    if (seen !== APP_VERSION) {
      setOpen(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, APP_VERSION);
    setOpen(false);
  };

  if (!open) return null;

  const latest = changelog[0];

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
        onClick={handleDismiss}
      />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50 animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-popover border border-border rounded-2xl shadow-2xl overflow-hidden">
          <div className="relative px-6 pt-6 pb-4 border-b border-border/50">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center ring-1 ring-accent/20">
                <Sparkles className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">What's New</h2>
                <p className="text-xs text-muted-foreground">
                  Version {latest.version}
                </p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/5 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="px-6 py-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">
              {latest.title}
            </h3>
            <ul className="space-y-2.5">
              {latest.items.map((item, i) => {
                const IconComp = ICON_MAP[item.iconKey];
                return (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                      {IconComp && <IconComp className="w-3 h-3 text-accent" />}
                    </div>
                    <span className="text-sm text-foreground leading-relaxed">
                      {item.text}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="px-6 py-4 border-t border-border/50 flex justify-end">
            <button
              onClick={handleDismiss}
              className="px-4 py-2 text-sm font-medium bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors"
            >
              Got it!
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
