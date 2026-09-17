import { useEffect, useState, useRef } from "react";

const codeLines = [
  'import { createWorkspace } from "./devsync";',
  "",
  'const ws = await createWorkspace({ name: "DevSync" });',
  "",
  'const task = await ws.tasks.create({',
  '  title: "Ship features",',
  '  status: "active",',
  '});',
  "",
  'await ws.deploy({ env: "production" });',
  "",
  'console.log("Deployed ✓", task.id);',
];

// Theme-aware syntax colors
function getSyntaxColors(isDark: boolean) {
  return {
    keyword: isDark ? "#F59A45" : "#A6532D",
    function: isDark ? "#7DD3FC" : "#0369A1",
    string: isDark ? "#86EFAC" : "#047857",
    variable: isDark ? "#F8FAFC" : "#111827",
    comment: isDark ? "#737B87" : "#6B7280",
    number: isDark ? "#C4B5FD" : "#7C3AED",
    punctuation: isDark ? "#CBD5E1" : "#475569",
  };
}

const keywords = ["import", "from", "const", "let", "var", "new", "await", "function", "return", "if", "else", "true", "false"];

function highlightCode(code: string, isTyped: boolean, isActive: boolean, isDark: boolean) {
  if (!isTyped && !isActive) return null;
  if (!code) return <span>{code}</span>;
  const colors = getSyntaxColors(isDark);
  const parts = code.split(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|\b\w+\b)/);
  return parts.map((part, j) => {
    if (!part) return null;
    if (part.startsWith('"') || part.startsWith("'") || part.startsWith("`")) {
      return <span key={j} style={{ color: colors.string }}>{part}</span>;
    }
    if (keywords.includes(part)) {
      return <span key={j} style={{ color: colors.keyword }}>{part}</span>;
    }
    if (part.startsWith("//")) {
      return <span key={j} style={{ color: colors.comment }}>{part}</span>;
    }
    if (/^\d+$/.test(part)) {
      return <span key={j} style={{ color: colors.number }}>{part}</span>;
    }
    if (part === "." || part === "," || part === "(" || part === ")" || part === "{" || part === "}" || part === ";" || part === ":") {
      return <span key={j} style={{ color: colors.punctuation }}>{part}</span>;
    }
    if (/^[A-Z]/.test(part)) {
      return <span key={j} style={{ color: colors.function }}>{part}</span>;
    }
    return <span key={j} style={{ color: colors.variable }}>{part}</span>;
  });
}

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
        timeout = setTimeout(typeNext, 18 + Math.random() * 25);
      } else {
        setCurrentChar(0);
        setCurrentLine((l) => l + 1);
        timeout = setTimeout(typeNext, 180 + Math.random() * 120);
      }
    };
    const startTimeout = setTimeout(typeNext, 400);
    return () => {
      clearTimeout(timeout);
      clearTimeout(startTimeout);
    };
  }, [currentLine, currentChar]);

  const getLineContent = (index: number): string => {
    if (index < currentLine) return codeLines[index];
    if (index === currentLine) return codeLines[index].slice(0, currentChar);
    return "";
  };

  const dark = isDark;

  // Charcoal-black editor background
  const editorBg = dark
    ? "linear-gradient(145deg, #0B0D0F 0%, #111315 100%)"
    : "linear-gradient(145deg, #F8FAFC 0%, #F1F5F9 100%)";

  const editorBorder = dark
    ? "rgba(249, 115, 22, 0.45)"
    : "rgba(166, 83, 45, 0.18)";

  const editorShadow = dark
    ? "0 0 0 1px rgba(249, 115, 22, 0.15), 0 20px 80px rgba(0, 0, 0, 0.5), 0 0 60px rgba(249, 115, 22, 0.2)"
    : "0 0 0 1px rgba(0, 0, 0, 0.03), 0 20px 80px rgba(0, 0, 0, 0.10), 0 0 45px rgba(166, 83, 45, 0.06)";

  const lineNumColor = dark ? "rgba(166, 123, 74, 0.40)" : "rgba(166, 83, 45, 0.35)";
  const activeLineBg = dark ? "rgba(245, 154, 69, 0.06)" : "rgba(245, 154, 69, 0.04)";
  const statusBarBg = dark ? "rgba(255, 255, 255, 0.02)" : "rgba(0, 0, 0, 0.02)";
  const statusBarBorder = dark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.06)";
  const statusText = dark ? "rgba(167, 176, 190, 0.60)" : "rgba(71, 85, 105, 0.75)";
  const readyColor = dark ? "#35C982" : "#059669";
  const readyBg = dark ? "rgba(53, 201, 130, 0.10)" : "rgba(5, 150, 105, 0.06)";

  return (
    <div className="relative group animate-hero-editor-in">
      {/* Subtle glow behind editor */}
      <div
        className="absolute -inset-6 rounded-3xl opacity-30 group-hover:opacity-50 transition-opacity duration-700 pointer-events-none"
        style={{
          background: dark ? "radial-gradient(ellipse at 50% 40%, rgba(249, 115, 22, 0.2) 0%, transparent 70%)" : "radial-gradient(ellipse at 50% 40%, rgba(166, 83, 45, 0.18) 0%, transparent 70%)",
          filter: "blur(30px)",
        }}
      />

      {/* Editor container */}
      <div
        className="relative rounded-[20px] border overflow-hidden transition-colors duration-300"
        style={{
          background: editorBg,
          borderColor: editorBorder,
          boxShadow: editorShadow,
        }}
      >
        {/* Title bar */}
        <div
          className="flex items-center gap-2 px-4 py-3 border-b"
          style={{ borderColor: dark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.06)" }}
        >
          {/* Window buttons */}
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#EF6B73]/80 hover:bg-[#EF6B73] transition-colors" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#F4B740]/80 hover:bg-[#F4B740] transition-colors" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#35C982]/80 hover:bg-[#35C982] transition-colors" />
          </div>

          {/* File tab */}
          <div
            className="flex items-center gap-1.5 ml-3 text-[11px] px-3 py-1.5 rounded-lg font-mono transition-colors"
            style={{
              color: dark ? "rgba(245, 154, 69, 0.80)" : "rgba(166, 83, 45, 0.80)",
              background: dark ? "rgba(245, 154, 69, 0.08)" : "rgba(245, 154, 69, 0.05)",
            }}
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
              <polyline points="14,2 14,8 20,8" />
            </svg>
            <span>app.js</span>
          </div>

          <div className="flex-1" />

          {/* Ready badge */}
          <div
            className="flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1 rounded-full"
            style={{ color: readyColor, background: readyBg }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: readyColor }} />
            <span>Ready</span>
          </div>
        </div>

        {/* Code area */}
        <div
          ref={containerRef}
          className="p-5 md:p-7 font-mono text-[13px] md:text-[14px] leading-[1.9] overflow-y-auto"
          style={{ scrollbarWidth: "thin", scrollbarColor: dark ? "rgba(166, 83, 45, 0.15) transparent" : "rgba(166, 83, 45, 0.10) transparent", maxHeight: '340px' }}
        >
          <div className="flex">
            {/* Line numbers */}
            <div
              className="text-right pr-5 select-none space-y-[5px] font-mono text-[12px] md:text-[13px]"
              style={{ color: lineNumColor, minWidth: "32px" }}
            >
              {codeLines.map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>

            {/* Code content */}
            <div className="space-y-[5px] flex-1">
              {codeLines.map((_, i) => {
                const content = getLineContent(i);
                const isActive = i === currentLine;
                const isTyped = i < currentLine;

                return (
                  <div
                    key={i}
                    className="flex items-center gap-2 relative"
                    style={{
                      background: isActive ? activeLineBg : "transparent",
                      borderRadius: isActive ? "4px" : "0",
                      paddingLeft: isActive ? "8px" : "0",
                      marginLeft: isActive ? "-8px" : "0",
                    }}
                  >
                    <span
                      className="transition-colors"
                      style={{
                        color: isTyped || isActive
                          ? dark ? "rgba(210, 218, 240, 0.90)" : "rgba(15, 23, 42, 0.90)"
                          : dark ? "rgba(167, 176, 190, 0.15)" : "rgba(148, 163, 184, 0.30)",
                      }}
                    >
                      {highlightCode(content, isTyped, isActive, dark)}
                    </span>

                    {isActive && (
                      <span
                        className="inline-block w-[2px] h-[18px] animate-caret-blink"
                        style={{ background: dark ? "rgba(245, 154, 69, 0.90)" : "rgba(166, 83, 45, 0.85)" }}
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
          className="flex items-center justify-between px-4 py-2 border-t text-[10px] font-mono"
          style={{ borderColor: statusBarBorder, background: statusBarBg, color: statusText }}
        >
          <div className="flex items-center gap-3">
            <span>JavaScript</span>
            <span style={{ color: readyColor }}>● 0 errors</span>
            <span>UTF-8</span>
          </div>
          <div className="flex items-center gap-3">
            <span>Ln {Math.min(currentLine + 1, codeLines.length)}</span>
            <span>Col {currentChar + 1}</span>
            <span>Spaces: 2</span>
          </div>
        </div>
      </div>
    </div>
  );
}
