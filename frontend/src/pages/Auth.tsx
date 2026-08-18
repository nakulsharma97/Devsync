import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import {
  ArrowRight,
  Code2,
  Loader2,
  Sparkles,
  Github,
  Mail,
  Shield,
  Zap,
  Globe,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { getErrorMessage } from "@/lib/utils";
import { useNavigate } from "react-router";
import { landingService, type PublicStats } from "@/services/landingService";

// ─── Code Editor Mockup (compact, animated) ──────────────────

function CodePreview() {
  return (
    <div className="rounded-xl border border-indigo-500/20 bg-[#0a0a1a]/80 backdrop-blur-sm shadow-2xl overflow-hidden group hover:border-indigo-500/30 transition-all duration-500">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/5 bg-white/[0.02]">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-red-500/70" />
          <div className="w-2 h-2 rounded-full bg-amber-500/70" />
          <div className="w-2 h-2 rounded-full bg-emerald-500/70" />
        </div>
        <div className="flex items-center gap-1 ml-3 text-[9px] text-white/40 bg-white/5 px-2 py-0.5 rounded-md">
          <Code2 className="w-2.5 h-2.5" />
          <span>app.ts</span>
        </div>
      </div>
      <div className="p-4 md:p-5 font-mono text-[10px] md:text-[11px] leading-relaxed">
        <div className="flex">
          <div className="text-white/10 text-right pr-3 select-none space-y-[2px]">
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
          <div className="space-y-[2px]">
            <div className="flex items-center gap-2">
              <span className="text-purple-400">import</span>
              <span className="text-white/80">{'{ DevSync }'}</span>
              <span className="text-purple-400">from</span>
              <span className="text-emerald-400">"devsync"</span>
              <span className="text-white/30">;</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white/20">// Real-time collaboration</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-purple-400">const</span>
              <span className="text-blue-300">app</span>
              <span className="text-white/60">=</span>
              <span className="text-purple-400">new</span>
              <span className="text-yellow-300">DevSync</span>
              <span className="text-white/60">({'{'}</span>
            </div>
            <div className="flex items-center gap-2 pl-4">
              <span className="text-sky-400">project</span>
              <span className="text-white/30">:</span>
              <span className="text-emerald-400">"my-app"</span>
              <span className="text-white/30">,</span>
            </div>
            <div className="flex items-center gap-2 pl-4">
              <span className="text-sky-400">team</span>
              <span className="text-white/30">:</span>
              <span className="text-emerald-400">"engineering"</span>
              <span className="text-white/30">,</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white/60">{'})};'}</span>
            </div>
            <div className="flex items-center gap-2 mt-2 bg-indigo-500/10 -mx-3 px-3 rounded py-1 border-l-2 border-indigo-400">
              <span className="text-indigo-300/80">// Move the task to Done</span>
              <span className="inline-flex items-center gap-1 text-[8px] text-indigo-400 bg-indigo-500/20 px-1.5 py-0.5 rounded-full animate-pulse">
                <span className="w-1 h-1 rounded-full bg-indigo-400" />
                Kanban
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-purple-400">await</span>
              <span className="text-blue-300">board</span>
              <span className="text-white/60">.move(task,</span>
              <span className="text-amber-300">"done"</span>
              <span className="text-white/60">);</span>
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between px-4 py-1 border-t border-white/5 bg-white/[0.02] text-[8px] text-white/30">
        <span className="flex items-center gap-1">
          <Zap className="w-2.5 h-2.5 text-indigo-400" />
          Auto-saved
        </span>
        <span className="flex items-center gap-1">
          <Users className="w-2.5 h-2.5 text-emerald-400" />
          Team online
        </span>
      </div>
    </div>
  );
}

// ─── Floating Feature Card ──────────────────────────────────

function FeatureCard({
  icon: Icon,
  title,
  description,
  gradient,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  gradient: string;
}) {
  return (
    <div className="flex items-start gap-3 group">
      <div
        className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0 shadow-lg transition-transform group-hover:scale-110 duration-200`}
      >
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div>
        <p className="text-sm font-medium text-white/90">{title}</p>
        <p className="text-xs text-white/50">{description}</p>
      </div>
    </div>
  );
}

// ─── Animated Stat (real server-computed numbers) ───────────

function AnimatedStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <p className="text-xl md:text-2xl font-bold text-white tabular-nums">
        {value.toLocaleString()}
      </p>
      <p className="text-[10px] text-white/40 mt-0.5">{label}</p>
    </div>
  );
}

// ─── OTP Input (single digit) ───────────────────────────────

function OtpInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      maxLength={6}
      placeholder="000000"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
      className="w-full h-12 text-center text-lg font-mono tracking-[0.5em] bg-background/50 border border-border/50 rounded-xl focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
    />
  );
}

// ─── CSS Keyframes ──────────────────────────────────────────

const keyframesStyle = `
@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
.animate-fade-in-up { animation: fade-in-up 0.6s ease-out both; }
.animate-fade-in { animation: fade-in 0.6s ease-out both; }
.delay-1 { animation-delay: 0.1s; }
.delay-2 { animation-delay: 0.2s; }
.delay-3 { animation-delay: 0.3s; }
.delay-4 { animation-delay: 0.4s; }
.delay-5 { animation-delay: 0.5s; }
`;

// ─── Main Auth Page ─────────────────────────────────────────

export default function AuthPage() {
  const { isAuthenticated, isLoading, login, register } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<PublicStats | null>(null);

  // Real platform aggregates for the showcase panel — never hardcoded.
  useEffect(() => {
    let cancelled = false;
    landingService
      .getStats()
      .then((s) => !cancelled && setStats(s))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [localLoading, setLocalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useOtp, setUseOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [attempted, setAttempted] = useState(false);

  // ── OAuth Callback Handler ───────────────────────────────────
  // Parse the access token from the URL fragment (#access_token=...). The refresh
  // token was set as an HttpOnly cookie by the backend during the OAuth redirect,
  // so it is NOT present in (and must never be read from) the URL.
  useEffect(() => {
    if (isLoading) return;
    const hash = window.location.hash;
    if (hash && hash.includes("access_token=")) {
      const params = new URLSearchParams(hash.replace("#", ""));
      const accessToken = params.get("access_token");
      if (accessToken) {
        localStorage.setItem("accessToken", accessToken);
        // Clear the hash so the token isn't visible in the URL bar
        window.location.hash = "";
        window.location.href = "/dashboard";
      }
    }
  }, [isLoading]);

  useEffect(() => {
    if (!isLoading && isAuthenticated) navigate("/dashboard", { replace: true });
  }, [isLoading, isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setAttempted(true);
    setLocalLoading(true);
    try {
      if (useOtp) {
        if (!email) {
          setError("Enter your email first");
          setLocalLoading(false);
          setAttempted(false);
          return;
        }
        if (otpCode.length === 6) {
          const { authService } = await import("@/services/authService");
          const response = await authService.verifyOtp(email, otpCode);
          authService.saveSession(response);
          window.location.href = "/dashboard";
        } else {
          // No code yet — send OTP
          const { authService } = await import("@/services/authService");
          await authService.sendOtp(email);
        }
      } else if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password, fullName, username);
      }
    } catch (err) {
      setError(getErrorMessage(err, "Something went wrong"));
    } finally {
      setLocalLoading(false);
    }
  };

  if (!attempted && isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#07071a]">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const isValid = useOtp
    ? otpCode.length === 6
    : mode === "login"
      ? email && password.length >= 8
      : email && password.length >= 8 && fullName;

  return (
    <div className="min-h-screen bg-[#07071a] text-white overflow-hidden">
      <style>{keyframesStyle}</style>

      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/30 via-[#07071a] to-purple-950/20" />
        <div className="absolute top-1/3 -left-48 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 -right-48 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/3 w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      {/* ─── SPLIT LAYOUT ─── */}
      <div className="relative z-10 min-h-screen flex">
        {/* ─── LEFT: Product Showcase ─── */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-start p-8 xl:p-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/40 via-transparent to-purple-950/20 pointer-events-none" />

          {/* Back to home */}
          <div className="relative z-10">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 text-white/50 hover:text-white transition-colors group"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center transition-transform group-hover:scale-105">
                <Code2 className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-semibold">DevSync</span>
            </button>
          </div>

          <div className="relative z-10 space-y-8 mt-10">
            {/* Hero text */}
            <div className="animate-fade-in-up delay-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/15 text-indigo-300 text-[10px] font-medium border border-indigo-500/25 mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                {stats && stats.users > 0
                  ? `${stats.users.toLocaleString()} developer${stats.users === 1 ? "" : "s"} registered`
                  : "Now in Public Beta"}
              </span>
              <h2 className="text-3xl xl:text-4xl font-bold tracking-tight leading-tight mt-3">
                The developer platform
                <br />
                <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  built for collaboration.
                </span>
              </h2>
              <p className="text-sm text-white/50 mt-3 max-w-md leading-relaxed">
                Projects, Kanban boards, real-time team chat, file sharing and
                GitHub integration — one workspace for your whole team.
              </p>
            </div>

            {/* Code preview */}
            <div className="animate-fade-in-up delay-2 max-w-lg">
              <CodePreview />
            </div>

            {/* Features */}
            <div className="grid grid-cols-2 gap-4 animate-fade-in-up delay-3 max-w-lg">
              <FeatureCard
                icon={Zap}
                title="Project Workspaces"
                description="Public or private projects"
                gradient="from-indigo-500 to-purple-600"
              />
              <FeatureCard
                icon={Users}
                title="Team Chat"
                description="Real-time messaging"
                gradient="from-emerald-500 to-teal-600"
              />
              <FeatureCard
                icon={Shield}
                title="Kanban Boards"
                description="Tasks, labels and due dates"
                gradient="from-amber-500 to-orange-600"
              />
              <FeatureCard
                icon={Globe}
                title="GitHub Integration"
                description="Link repositories to projects"
                gradient="from-cyan-500 to-blue-600"
              />
            </div>

            {/* Stats — real server-computed aggregates */}
            {stats && (
              <div className="grid grid-cols-3 gap-6 pt-4 border-t border-white/10 animate-fade-in-up delay-4 max-w-lg">
                <AnimatedStat value={stats.users} label="Developers" />
                <AnimatedStat value={stats.projects} label="Projects" />
                <AnimatedStat value={stats.tasksCompleted} label="Tasks Done" />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="relative z-10 mt-auto pt-8 text-xs text-white/30">
            &copy; {new Date().getFullYear()} DevSync. All rights reserved.
          </div>
        </div>

        {/* ─── RIGHT: Auth Form ─── */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 relative">
          {/* Mobile back button */}
          <button
            onClick={() => navigate("/")}
            className="lg:hidden absolute top-4 left-4 flex items-center gap-2 text-white/50 hover:text-white transition-colors"
          >
            <Code2 className="w-5 h-5" />
            <span className="text-xs font-semibold">DevSync</span>
          </button>

          <div className="w-full max-w-sm mt-12 lg:mt-0 animate-fade-in-up">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/10 flex items-center justify-center ring-1 ring-indigo-500/25">
                  {useOtp ? (
                    <Mail className="w-8 h-8 text-indigo-400" />
                  ) : mode === "login" ? (
                    <Code2 className="w-8 h-8 text-indigo-400" />
                  ) : (
                    <Sparkles className="w-8 h-8 text-indigo-400" />
                  )}
                </div>
              </div>
              <h1 className="text-2xl font-bold tracking-tight">
                {useOtp
                  ? "Check your email"
                  : mode === "login"
                    ? "Welcome back"
                    : "Join DevSync"}
              </h1>
              <p className="text-sm text-white/50 mt-1">
                {useOtp
                  ? "We sent a code to your email"
                  : mode === "login"
                    ? "Sign in to your account"
                    : "Create your developer account"}
              </p>
            </div>

            {/* Social logins */}
            <div className="flex gap-3 mb-6">
              <a
                href={`${
                  import.meta.env.VITE_API_URL || "/api"
                }/../oauth2/authorization/github`}
                className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all text-sm text-white/70 hover:text-white"
              >
                <Github className="w-4 h-4" />
                <span className="hidden sm:inline">GitHub</span>
              </a>
              <a
                href={`${
                  import.meta.env.VITE_API_URL || "/api"
                }/../oauth2/authorization/google`}
                className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all text-sm text-white/70 hover:text-white"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span className="hidden sm:inline">Google</span>
              </a>
            </div>

            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-[#07071a] px-3 text-white/30">
                  or continue with email
                </span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Register fields */}
              {mode === "register" && !useOtp && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-white/60 mb-1.5">
                      Full name
                    </label>
                    <Input
                      type="text"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="h-11 text-sm bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/60 mb-1.5">
                      Username
                    </label>
                    <Input
                      type="text"
                      placeholder="johndoe"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="h-11 text-sm bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    />
                  </div>
                </>
              )}

              {useOtp ? (
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5">
                    Enter verification code
                  </label>
                  <OtpInput value={otpCode} onChange={setOtpCode} />
                  <p className="text-xs text-white/40 mt-2 text-center">
                    Sent to{" "}
                    <span className="text-indigo-400">{email || "your email"}</span>
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-medium text-white/60 mb-1.5">
                      {mode === "login" ? "Email or username" : "Email address"}
                    </label>
                    <Input
                      type={mode === "login" ? "text" : "email"}
                      placeholder={
                        mode === "login" ? "you@example.com or username" : "you@example.com"
                      }
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-11 text-sm bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/60 mb-1.5">
                      Password
                    </label>
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder={
                        mode === "register"
                          ? "Min 8 characters"
                          : "Your password"
                      }
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 text-sm bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                      required
                      minLength={mode === "register" ? 8 : 1}
                    />
                    <div className="flex items-center justify-between mt-2">
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-xs text-white/40 hover:text-white/60 transition-colors"
                      >
                        {showPassword ? "Hide" : "Show"} password
                      </button>
                      {mode === "login" && (
                        <button
                          type="button"
                          onClick={() => navigate("/forgot-password")}
                          className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Remember me (login only) */}
              {mode === "login" && !useOtp && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-white/20 bg-white/5 checked:bg-indigo-500 checked:border-indigo-500 focus:ring-indigo-500/20 focus:ring-2 accent-indigo-500"
                  />
                  <span className="text-xs text-white/50">Remember me</span>
                </label>
              )}

              {/* Error */}
              {error && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              {/* Submit */}
              <Button
                type="submit"
                className="w-full h-11 text-sm font-semibold shadow-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50"
                disabled={localLoading || !isValid}
              >
                {localLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : useOtp ? (
                  "Verify code"
                ) : (
                  <>
                    {mode === "login" ? "Sign in" : "Create account"}
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            {/* OTP toggle */}
            {mode === "login" && !useOtp && (
              <button
                type="button"
                onClick={() => setUseOtp(true)}
                className="w-full mt-3 text-xs text-white/40 hover:text-indigo-400 transition-colors flex items-center justify-center gap-1"
              >
                <Mail className="w-3 h-3" />
                Sign in with a magic code instead
              </button>
            )}
            {useOtp && (
              <button
                type="button"
                onClick={() => setUseOtp(false)}
                className="w-full mt-3 text-xs text-white/40 hover:text-indigo-400 transition-colors"
              >
                Back to password sign in
              </button>
            )}

            {/* Divider */}
            <div className="relative mt-6 mb-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
            </div>

            {/* Mode toggle */}
            <div className="text-center">
              <button
                type="button"
                className="text-sm text-white/50 hover:text-white transition-colors"
                onClick={() => {
                  setMode(mode === "login" ? "register" : "login");
                  setError(null);
                  setUseOtp(false);
                }}
              >
                {mode === "login" ? (
                  <>
                    Don&apos;t have an account?{" "}
                    <span className="text-indigo-400 hover:text-indigo-300 font-medium">
                      Sign up
                    </span>
                  </>
                ) : (
                  <>
                    Already have an account?{" "}
                    <span className="text-indigo-400 hover:text-indigo-300 font-medium">
                      Sign in
                    </span>
                  </>
                )}
              </button>
            </div>

            {/* Footer links */}
            <div className="flex items-center justify-center gap-4 mt-8 text-xs text-white/30">
              <button className="hover:text-white/50 transition-colors">Privacy</button>
              <button className="hover:text-white/50 transition-colors">Terms</button>
              <button className="hover:text-white/50 transition-colors">Support</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
