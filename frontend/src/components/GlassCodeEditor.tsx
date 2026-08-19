import { motion } from "framer-motion";
import { useEffect, useState, useRef } from "react";

const codeLines = [
  'import { createApp } from "./app";',
  "",
  "const app = createApp();",
  "",
  "app.start();",
  "",
  'console.log("DevSync ready");',
  "",
  "export default app;",
];

export default function GlassCodeEditor() {
  const [currentLine, setCurrentLine] = useState(0);
  const [currentChar, setCurrentChar] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDark, setIsDark] = useState(
    typeof document !== "undefined" && document.documentElement.classList.contains("dark")
  );

  // Listen for theme changes
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

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
        timeout = setTimeout(typeNext, 200 + Math.random() * 150);
      }
    };
    const startTimeout = setTimeout(typeNext, 500);
    return () => {
      clearTimeout(timeout);
      clearTimeout(startTimeout);
    };
  }, [currentLine, currentChar]);

  // NOTE: the editor must always open showing line 1. There is intentionally
  // NO auto-scroll here — the snippet is short enough to fit the container, so
  // the initial scroll position stays at scrollTop = 0 and never jumps away
  // from the first line unless the user scrolls manually.
  const getLineContent = (index: number): string => {
    if (index < currentLine) return codeLines[index];
    if (index === currentLine) return codeLines[index].slice(0, currentChar);
    return "";
  };

  // Theme-aware colors
  const dark = isDark;

  const bgColor = dark
    ? "linear-gradient(135deg, rgba(15, 15, 35, 0.85) 0%, rgba(10, 10, 30, 0.9) 100%)"
    : "linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 249, 252, 0.98) 100%)";

  const borderColor = dark ? "rgba(99, 102, 241, 0.25)" : "rgba(99, 102, 241, 0.15)";
  const textColor = dark ? "rgba(214, 222, 255, 0.92)" : "rgba(15, 23, 42, 0.95)";
  const textDim = dark ? "rgba(200, 210, 250, 0.62)" : "rgba(71, 85, 105, 0.75)";
  const textMuted = dark ? "rgba(200, 210, 250, 0.18)" : "rgba(148, 163, 184, 0.45)";
  const lineNumColor = dark ? "rgba(129, 140, 248, 0.6)" : "rgba(99, 102, 241, 0.45)";
  const activeBg = dark ? "rgba(99, 102, 241, 0.08)" : "rgba(99, 102, 241, 0.05)";
  const statusColor = dark ? "rgba(165, 180, 252, 0.65)" : "rgba(71, 85, 105, 0.75)";
  const statusBorder = dark ? "rgba(99, 102, 241, 0.1)" : "rgba(99, 102, 241, 0.08)";
  const keywordColor = dark ? "rgba(147, 197, 253, 0.95)" : "rgba(99, 102, 241, 0.9)";
  const stringColor = dark ? "rgba(52, 211, 153, 0.9)" : "rgba(4, 120, 87, 0.9)";
  const commentColor = dark ? "rgba(52, 211, 153, 0.55)" : "rgba(4, 120, 87, 0.55)";

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

      {/* Editor */}
      <div
        className="relative rounded-2xl border overflow-hidden shadow-2xl backdrop-blur-xl transition-colors duration-300"
        style={{
          borderColor,
          background: bgColor,
          boxShadow: dark
            ? "0 0 40px rgba(99, 102, 241, 0.08), inset 0 1px 0 rgba(255,255,255,0.05)"
            : "0 0 40px rgba(99, 102, 241, 0.06), inset 0 1px 0 rgba(255,255,255,0.8)",
        }}
      >
        {/* Neon edge glow */}
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none opacity-50"
          style={{
            boxShadow: dark
              ? "inset 0 0 30px rgba(99, 102, 241, 0.08)"
              : "inset 0 0 30px rgba(99, 102, 241, 0.04)",
          }}
        />

        {/* Title bar */}
        <div
          className="flex items-center gap-2 px-4 py-3.5 border-b transition-colors duration-300"
          style={{ borderColor: dark ? "rgba(99, 102, 241, 0.12)" : "rgba(99, 102, 241, 0.1)" }}
        >
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
          </div>
          <div
            className="flex items-center gap-1.5 ml-3 text-[10px] px-2.5 py-1 rounded-md font-mono transition-colors duration-300"
            style={{
              color: dark ? "rgba(165, 180, 252, 0.6)" : "rgba(99, 102, 241, 0.7)",
              background: dark ? "rgba(99, 102, 241, 0.08)" : "rgba(99, 102, 241, 0.06)",
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
            className="flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded-full transition-colors duration-300"
            style={{
              color: dark ? "rgba(52, 211, 153, 0.7)" : "rgba(5, 150, 105, 0.8)",
              background: dark ? "rgba(52, 211, 153, 0.08)" : "rgba(5, 150, 105, 0.06)",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Ready</span>
          </div>
        </div>

        {/* Code area */}
        <div
          ref={containerRef}
          className="p-6 md:p-8 font-mono text-[13px] md:text-[14px] leading-[1.8] overflow-y-auto scrollbar-thin transition-colors duration-300"
          style={{
            scrollbarWidth: "thin",
            scrollbarColor: dark ? "rgba(99,102,241,0.2) transparent" : "rgba(99,102,241,0.15) transparent",
          }}
        >
          <div className="flex">
            <div
              className="text-right pr-5 select-none space-y-[5px] font-mono text-[13px] md:text-[15px]"
              style={{ color: lineNumColor, minWidth: "36px" }}
            >
              {codeLines.map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>

            <div className="space-y-[5px] flex-1">
              {codeLines.map((_, i) => {
                const content = getLineContent(i);
                const isActive = i === currentLine;
                const isTyped = i < currentLine;

                return (
                  <div
                    key={i}
                    className="flex items-center gap-2 relative transition-colors duration-300"
                    style={{
                      background: isActive ? activeBg : "transparent",
                      borderRadius: isActive ? "4px" : "0",
                      paddingLeft: isActive ? "8px" : "0",
                      marginLeft: isActive ? "-8px" : "0",
                    }}
                  >
                    <span
                      className="transition-colors duration-300"
                      style={{
                        color: isTyped ? textColor : isActive ? textDim : textMuted,
                      }}
                    >
                      {content.split(/(\b(?:import|from|const|let|var|new|await|function|return|if|else|true|false)\b|"[^"]*"|'[^']*')/).map((part, j) => {
                        if (part.startsWith('"') || part.startsWith("'"))
                          return <span key={j} style={{ color: stringColor }}>{part}</span>;
                        if (["import","from","const","let","var","new","await","function","return","if","else","true","false"].includes(part))
                          return <span key={j} style={{ color: keywordColor }}>{part}</span>;
                        if (part.startsWith("//"))
                          return <span key={j} style={{ color: commentColor }}>{part}</span>;
                        return <span key={j}>{part}</span>;
                      })}
                    </span>

                    {isActive && (
                      <motion.span
                        animate={{ opacity: [1, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, repeatType: "reverse" }}
                        className="inline-block w-[2px] h-[18px]"
                        style={{ background: dark ? "rgba(129, 140, 248, 0.9)" : "rgba(99, 102, 241, 0.8)" }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Status bar */}
        <div
          className="flex items-center justify-between px-4 py-2 border-t text-[10px] font-mono transition-colors duration-300"
          style={{
            borderColor: statusBorder,
            background: dark ? "rgba(99, 102, 241, 0.03)" : "rgba(99, 102, 241, 0.02)",
            color: statusColor,
          }}
        >
          <div className="flex items-center gap-3">
            <span>TypeScript</span>
            <span style={{ color: dark ? "rgba(52, 211, 153, 0.6)" : "rgba(5, 150, 105, 0.7)" }}>
              ● 0 errors
            </span>
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
