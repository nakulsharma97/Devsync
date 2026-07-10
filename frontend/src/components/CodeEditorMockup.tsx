import { Play, FileType, Braces, GitPullRequest, GitBranch, Bug, PaintBucket } from "lucide-react";

const lines = [
  { content: 'import { DevSync } from "devsync";', highlight: false },
  { content: 'import { AI, Collaboration } from "devsync/features";', highlight: false },
  { content: "", highlight: false },
  { content: "const app = new DevSync({", highlight: false },
  { content: '  project: "my-app",', highlight: false },
  { content: '  team: "engineering",', highlight: false },
  { content: "  ai: AI.enabled,", highlight: false },
  { content: "  collab: Collaboration.realtime,", highlight: false },
  { content: "});", highlight: false },
  { content: "", highlight: false },
  { content: "// Deploy with one click", highlight: true },
  { content: "await app.deploy({", highlight: false },
  { content: '  env: "production",', highlight: false },
  { content: "  preview: true,", highlight: false },
  { content: '  rollback: "instant",', highlight: false },
  { content: "});", highlight: false },
];

export default function CodeEditorMockup() {
  return (
    <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm shadow-2xl overflow-hidden group hover:border-indigo-500/30 hover:shadow-indigo-500/10 transition-all duration-500">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/30 bg-muted/20">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
        </div>
        <div className="flex items-center gap-1.5 ml-3 text-[10px] text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-md">
          <FileType className="w-3 h-3" />
          <span>app.ts</span>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <GitPullRequest className="w-3 h-3" />
          <span>main</span>
        </div>
      </div>
      <div className="p-4 md:p-5 font-mono text-[11px] md:text-xs leading-relaxed">
        <div className="flex">
          <div className="text-muted-foreground/30 text-right pr-3 select-none space-y-[2px]">
            {lines.map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
          <div className="space-y-[2px]">
            {lines.map((line, i) => (
              <div key={i} className={`flex items-center gap-2 ${line.highlight ? "bg-indigo-500/10 -mx-3 px-3 rounded py-[1px] border-l-2 border-indigo-400" : ""}`}>
                {line.content ? (
                  <span className="text-foreground/80">{line.content}</span>
                ) : (
                  <span className="text-muted-foreground/20">&nbsp;</span>
                )}
                {line.highlight && (
                  <span className="inline-flex items-center gap-1 text-[9px] text-indigo-400 bg-indigo-500/15 px-1.5 py-0.5 rounded-full animate-pulse">
                    <Play className="w-2 h-2 fill-current" />
                    Deploying
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between px-4 py-1.5 border-t border-border/30 bg-muted/20 text-[9px] text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1"><Braces className="w-2.5 h-2.5" /> TypeScript</span>
          <span className="flex items-center gap-1"><Bug className="w-2.5 h-2.5" /> 0 errors</span>
          <span className="flex items-center gap-1"><GitBranch className="w-2.5 h-2.5" /> main</span>
        </div>
        <span className="flex items-center gap-1"><PaintBucket className="w-2.5 h-2.5" /> Prettier</span>
      </div>
    </div>
  );
}
