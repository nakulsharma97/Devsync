export default function AnimatedBackground() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-indigo-950/20 to-background" />

      {/* Animated blob 1 — large, slow, indigo */}
      <div
        className="absolute -top-48 -left-48 w-[600px] h-[600px] opacity-30 animate-blob"
        style={{
          background:
            "radial-gradient(circle at center, rgba(99,102,241,0.3) 0%, rgba(99,102,241,0.1) 40%, transparent 70%)",
          filter: "blur(60px)",
          animationDuration: "18s",
        }}
      />

      {/* Animated blob 2 — medium, offset, purple */}
      <div
        className="absolute -top-32 -right-32 w-[500px] h-[500px] opacity-25 animate-blob"
        style={{
          background:
            "radial-gradient(circle at center, rgba(168,85,247,0.25) 0%, rgba(168,85,247,0.08) 40%, transparent 70%)",
          filter: "blur(50px)",
          animationDuration: "22s",
          animationDelay: "-4s",
        }}
      />

      {/* Animated blob 3 — center, pink */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] opacity-20 animate-blob"
        style={{
          background:
            "radial-gradient(circle at center, rgba(236,72,153,0.2) 0%, rgba(236,72,153,0.06) 40%, transparent 70%)",
          filter: "blur(70px)",
          animationDuration: "25s",
          animationDelay: "-8s",
        }}
      />

      {/* Animated blob 4 — small, fast, cyan */}
      <div
        className="absolute bottom-1/3 left-1/4 w-[350px] h-[350px] opacity-20 animate-blob-reverse"
        style={{
          background:
            "radial-gradient(circle at center, rgba(6,182,212,0.2) 0%, rgba(6,182,212,0.06) 40%, transparent 70%)",
          filter: "blur(40px)",
          animationDuration: "15s",
          animationDelay: "-2s",
        }}
      />

      {/* Animated blob 5 — bottom right, emerald */}
      <div
        className="absolute -bottom-40 -right-32 w-[550px] h-[550px] opacity-20 animate-blob"
        style={{
          background:
            "radial-gradient(circle at center, rgba(16,185,129,0.15) 0%, rgba(16,185,129,0.05) 40%, transparent 70%)",
          filter: "blur(55px)",
          animationDuration: "20s",
          animationDelay: "-6s",
        }}
      />

      {/* Extra subtle noise/grain overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")",
          backgroundRepeat: "repeat",
          backgroundSize: "128px 128px",
        }}
      />
    </div>
  );
}
