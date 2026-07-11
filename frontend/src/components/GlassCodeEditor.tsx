import { motion } from "framer-motion";
import { useEffect, useState, useRef } from "react";

const codeLines = [
  'import { DevSync } from "devsync";',
  'import { AI, Collaboration } from "devsync/features";',
  "",
  "const app = new DevSync({",
  '  project: "my-app",',
  '  team: "engineering",',
  "  ai: AI.enabled,",
  "  collab: Collaboration.realtime,",
  "});",
  "",
  "// Deploy with one click",
  "await app.deploy({",
  '  env: "production",',
  "  preview: true,",
  '  rollback: "instant",',
  "});",
  "",
  "// AI suggests optimizations",
  "const optimized = await AI.optimize(app, {",
  '  target: "performance",',
  "  aggressive: true,",
  "});",
  "",
  "console.log(optimized);",
];

export default function GlassCodeEditor() {
  const [visibleLines, setVisibleLines] = useState(0);
  const [currentLine, setCurrentLine] = useState(0);
  const [currentChar, setCurrentChar] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    const typeNext = () => {
      if (currentLine >= codeLines.length) return;

      const line = codeLines[currentLine];

      if (currentChar < line.length) {
        setCurrentChar((c) => c + 1);
        timeout = setTimeout(typeNext, 20 + Math.random() * 30);
      } else {
        setCurrentChar(0);
        setCurrentLine((l) => l + 1);
        setVisibleLines((v) => Math.min(v + 1, codeLines.length));
        timeout = setTimeout(typeNext, 200 + Math.random() * 150);
      }
    };

    // Start typing after a brief delay
    const startTimeout = setTimeout(typeNext, 500);

    return () => {
      clearTimeout(timeout);
      clearTimeout(startTimeout);
    };
  }, [currentLine, currentChar]);

  // Auto-scroll to keep typed lines visible
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [visibleLines]);

  const getLineContent = (index: number): string => {
    if (index < currentLine) return codeLines[index];
    if (index === currentLine) return codeLines[index].slice(0, currentChar);
    return "";
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 40, rotateY: 5 }}
      animate={{ opacity: 1, x: 0, rotateY: 0 }}
      transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
      className="relative group"
    >
      {/* Glow behind editor */}
      <div
        className="absolute -inset-4 rounded-2xl opacity-40 group-hover:opacity-60 transition-opacity duration-700"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(99,102,241,0.15) 0%, transparent 70%)",
          filter: "blur(20px)",
        }}
      />

      {/* Glass editor */}
      <div
        className="relative rounded-2xl border overflow-hidden shadow-2xl backdrop-blur-xl"
        style={{
          borderColor: "rgba(99, 102, 241, 0.25)",
          background:
            "linear-gradient(135deg, rgba(15, 15, 35, 0.85) 0%, rgba(10, 10, 30, 0.9) 100%)",
          boxShadow: "0 0 40px rgba(99, 102, 241, 0.08), inset 0 1px 0 rgba(255,255,255,0.05)",
        }}
      >
        {/* Neon edge glow */}
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none opacity-50"
          style={{
            boxShadow: "inset 0 0 30px rgba(99, 102, 241, 0.08)",
          }}
        />

        {/* Title bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: "rgba(99, 102, 241, 0.12)" }}>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
          </div>
          <div
            className="flex items-center gap-1.5 ml-3 text-[10px] px-2.5 py-1 rounded-md font-mono"
            style={{
              color: "rgba(165, 180, 252, 0.6)",
              background: "rgba(99, 102, 241, 0.08)",
            }}
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
              <polyline points="14,2 14,8 20,8" />
            </svg>
            <span>app.ts</span>
          </div>
          <div className="flex-1" />
          <div
            className="flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded-full"
            style={{ color: "rgba(52, 211, 153, 0.7)", background: "rgba(52, 211, 153, 0.08)" }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Ready</span>
          </div>
        </div>

        {/* Code area */}
        <div
          ref={containerRef}
          className="p-4 md:p-5 font-mono text-[11px] md:text-xs leading-relaxed max-h-[320px] overflow-y-auto scrollbar-thin"
          style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(99,102,241,0.2) transparent" }}
        >
          <div className="flex">
            {/* Line numbers */}
            <div
              className="text-right pr-3 select-none space-y-[2px] font-mono"
              style={{ color: "rgba(99, 102, 241, 0.25)", minWidth: "28px" }}
            >
              {codeLines.map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>

            {/* Code content */}
            <div className="space-y-[2px] flex-1">
              {codeLines.map((_, i) => {
                const content = getLineContent(i);
                const isActive = i === currentLine;
                const isTyped = i < currentLine;

                return (
                  <div
                    key={i}
                    className="flex items-center gap-2 relative"
                    style={{
                      background: isActive ? "rgba(99, 102, 241, 0.06)" : "transparent",
                      borderRadius: isActive ? "4px" : "0",
                      paddingLeft: isActive ? "8px" : "0",
                      marginLeft: isActive ? "-8px" : "0",
                    }}
                  >
                    <span
                      className="transition-colors duration-300"
                      style={{
                        color: isTyped
                          ? "rgba(200, 210, 250, 0.8)"
                          : isActive
                          ? "rgba(200, 210, 250, 0.5)"
                          : "rgba(200, 210, 250, 0.15)",
                      }}
                    >
                      {/* Simple syntax coloring */}
                      {content.split(/(\b(?:import|from|const|let|var|new|await|function|return|if|else|true|false)\b|"[^"]*"|'[^']*')/).map((part, j) => {
                        if (part.startsWith('"') || part.startsWith("'"))
                          return (
                            <span key={j} style={{ color: "rgba(52, 211, 153, 0.8)" }}>
                              {part}
                            </span>
                          );
                        if (
                          [
                            "import",
                            "from",
                            "const",
                            "let",
                            "var",
                            "new",
                            "await",
                            "function",
                            "return",
                            "if",
                            "else",
                            "true",
                            "false",
                          ].includes(part)
                        )
                          return (
                            <span key={j} style={{ color: "rgba(129, 140, 248, 0.8)" }}>
                              {part}
                            </span>
                          );
                        if (part.startsWith("//"))
                          return (
                            <span key={j} style={{ color: "rgba(52, 211, 153, 0.4)" }}>
                              {part}
                            </span>
                          );
                        return <span key={j}>{part}</span>;
                      })}
                    </span>

                    {/* Blinking cursor */}
                    {isActive && (
                      <motion.span
                        animate={{ opacity: [1, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, repeatType: "reverse" }}
                        className="inline-block w-[2px] h-[14px]"
                        style={{ background: "rgba(129, 140, 248, 0.9)" }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom status bar */}
        <div
          className="flex items-center justify-between px-4 py-1.5 border-t text-[9px] font-mono"
          style={{
            borderColor: "rgba(99, 102, 241, 0.1)",
            background: "rgba(99, 102, 241, 0.03)",
            color: "rgba(165, 180, 252, 0.5)",
          }}
        >
          <div className="flex items-center gap-3">
            <span>TypeScript</span>
            <span style={{ color: "rgba(52, 211, 153, 0.6)" }}>● 0 errors</span>
            <span>UTF-8</span>
          </div>
          <div className="flex items-center gap-2">
            <span>Ln {Math.min(currentLine + 1, codeLines.length)}</span>
            <span>Col {currentChar + 1}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
