import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowRight,
  Check,
  Github,
  Globe,
  KanbanSquare,
  LayoutDashboard,
  ListChecks,
  Loader2,
  Mail,
  Settings,
  Shield,
  Users,
  Zap,
} from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { cn } from "@/lib/utils";

// This page pins its own light surface (`.auth-light` in index.css) so the
// credential panel stays white while the marketing panel stays dark. The hex
// values below are therefore written literally rather than through theme
// tokens: #C9551E for interactive text and fills (hover #B94E1B), #E8792F for
// the brand mark and hero accent.
const ACCENT_TEXT = "text-[#C9551E] hover:text-[#B94E1B]";
const ACCENT_FILL = "bg-[#C9551E] hover:bg-[#B94E1B]";
const ACCENT_SPAN = "text-[#C9551E]";

// ── OTP input ─────────────────────────────────────────────

function OtpInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [focused, setFocused] = useState(true);
  const keyframesStyle = `
    @keyframes otp-blink {
      0%, 50% { border-color: #C9551E; }
      51%, 100% { border-color: transparent; }
    }
  `;
  return (
    <>
      <style>{keyframesStyle}</style>
      <div className="flex justify-center gap-2">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="relative">
            <input
              type="text"
              maxLength={1}
              value={value[i] || ""}
              onChange={(e) => {
                const v = e.target.value;
                if (v && /^\d$/.test(v)) {
                  const next = value.substring(0, i) + v + value.substring(i + 1);
                  onChange(next.substring(0, 6));
                }
              }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              className="h-12 w-11 rounded-[13px] border border-[#DDE2E7] bg-white text-center font-mono text-lg text-[#1F2937] outline-none transition-all focus:border-[#E8792F] focus:ring-[3px] focus:ring-[#E8792F]/10"
              style={i === value.length && focused ? { animation: "otp-blink 1s infinite" } : {}}
            />
          </div>
        ))}
      </div>
    </>
  );
}

// ── Left panel pieces ─────────────────────────────────────

function FeatureBadge({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="inline-flex h-11 items-center gap-[9px] rounded-full border border-[#30363D] bg-[#171C21] px-4 text-[13px] font-medium text-[#D6DCE3] transition-colors hover:border-[#3A434D] hover:bg-[#1D242B]">
      <Icon className="h-[18px] w-[18px] shrink-0 text-[#E8792F]" strokeWidth={1.8} />
      {label}
    </div>
  );
}

const BOARD_COLUMNS = [
  { title: "To Do", count: 4, color: "#A7B0BB", task: "Design landing page", tag: "frontend" },
  { title: "In Progress", count: 2, color: "#E8792F", task: "Build authentication", tag: "backend" },
  { title: "Done", count: 3, color: "#20D391", task: "Project setup", tag: "infra", done: true },
];

const TAG_STYLES: Record<string, { bg: string; fg: string }> = {
  frontend: { bg: "rgba(95,168,255,0.12)", fg: "#6AAEFF" },
  backend: { bg: "rgba(232,121,47,0.12)", fg: "#E8792F" },
  infra: { bg: "rgba(32,211,145,0.12)", fg: "#20D391" },
};

const BOARD_NAV = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Tasks", icon: ListChecks },
  { label: "Kanban", icon: KanbanSquare },
  { label: "Settings", icon: Settings },
];

/** Static product mockup — decorative, so it never mirrors live data. */
function BoardPreview() {
  return (
    <div
      aria-hidden
      className="mt-3 flex h-[240px] w-full max-w-[820px] overflow-hidden rounded-2xl border border-[#29313A] bg-[#111820] shadow-[0_12px_30px_rgba(0,0,0,0.25)]"
    >
      {/* Mini sidebar */}
      <div className="w-[205px] shrink-0 border-r border-[#29313A] bg-[#10151B] p-4">
        <div className="mb-4 flex items-center gap-2">
          <LogoMark size={22} />
          <span className="text-[11px] font-semibold text-[#F5F7FA]">DevSync</span>
        </div>
        <div className="space-y-0.5">
          {BOARD_NAV.map((item) => {
            const active = item.label === "Kanban";
            return (
              <div
                key={item.label}
                className={cn(
                  "flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-[12px]",
                  active ? "bg-[#3A2419] font-medium text-[#E8792F]" : "text-[#87919D]"
                )}
              >
                <item.icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} />
                {item.label}
              </div>
            );
          })}
        </div>
      </div>

      {/* Board */}
      <div className="min-w-0 flex-1 p-5">
        <h3 className="text-[18px] font-bold text-[#F5F7FA]">Project Board</h3>
        <p className="mt-1 text-[12px] text-[#87919D]">Organize, track and ship your ideas.</p>

        <div className="mt-4 grid grid-cols-3 gap-4">
          {BOARD_COLUMNS.map((column) => {
            const tag = TAG_STYLES[column.tag];
            return (
              <div key={column.title}>
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-medium" style={{ color: column.color }}>
                    {column.title}
                  </span>
                  <span
                    className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                    style={{ backgroundColor: `${column.color}1f`, color: column.color }}
                  >
                    {column.count}
                  </span>
                </div>

                <div className="mt-2.5 rounded-[10px] border border-[#29313A] bg-[#18202A] p-3">
                  <p className="text-[13px] text-[#E9EDF2]">{column.task}</p>
                  <div className="mt-2 flex items-center gap-1.5">
                    <span
                      className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                      style={{ backgroundColor: tag.bg, color: tag.fg }}
                    >
                      {column.tag}
                    </span>
                    {column.done && <Check className="h-3 w-3 text-[#20D391]" strokeWidth={3} />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────

export default function Auth() {
  const navigate = useNavigate();
  const { login, register, isLoading, isAuthenticated, isAdmin, verifyOtp, resendOtp, refreshUser } =
    useAuth();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localLoading, setLocalLoading] = useState(false);
  const [useOtp, setUseOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [registrationStep, setRegistrationStep] = useState<"form" | "verify">("form");

  useEffect(() => {
    if (isLoading) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("oauth") === "success") {
      window.history.replaceState({}, "", "/auth");
      window.location.href = "/dashboard";
    }
    const modeParam = params.get("mode");
    if (modeParam === "register") {
      setMode("register");
      window.history.replaceState({}, "", "/auth");
    }
    const hash = window.location.hash;
    if (hash && hash.includes("access_token=")) {
      window.location.hash = "";
      window.location.href = "/dashboard";
    }
  }, [isLoading]);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate(isAdmin ? "/admin/dashboard" : "/dashboard", { replace: true });
    }
  }, [isLoading, isAuthenticated, isAdmin, navigate]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const handleResendOtp = useCallback(async () => {
    if (!email) return;
    try {
      await resendOtp(email);
      setResendCooldown(60);
    } catch {
      // The provider already exposes the message via `error` — nothing to add here.
    }
  }, [email, resendOtp]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLocalLoading(true);
    try {
      if (useOtp || (mode === "register" && registrationStep === "verify")) {
        // A registration code must be confirmed by /auth/register/verify, a login
        // code by /auth/otp/verify — the flow we are in decides which.
        const purpose =
          mode === "register" && registrationStep === "verify" ? "registration" : "login";
        await verifyOtp(email, otpCode, purpose);
        await refreshUser();
        navigate(isAdmin ? "/admin/dashboard" : "/dashboard");
        return;
      }
      if (mode === "login") {
        await login(email, password, rememberMe);
      } else {
        // Registering creates the pending registration and sends the code; the code
        // itself is confirmed on the next step by the OTP branch above.
        await register(email, password, fullName, username);
        setRegistrationStep("verify");
        setResendCooldown(60);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Something went wrong");
    } finally {
      setLocalLoading(false);
    }
  };

  const handleBackToForm = () => {
    setRegistrationStep("form");
    setOtpCode("");
  };

  const isValid = useOtp || (mode === "register" && registrationStep === "verify")
    ? otpCode.length === 6
    : mode === "login"
      ? email && password.length >= 8
      : mode === "register" && registrationStep === "form"
        ? email && password.length >= 8 && fullName
        : true;

  // Shared field styling: 48px tall, 13px radius, warm focus ring.
  const fieldClass =
    "h-12 rounded-[13px] border-[#DDE2E7] bg-white px-3.5 text-[14px] text-[#1F2937] placeholder:text-[#9AA3AE] shadow-none focus-visible:border-[#E8792F] focus-visible:ring-[3px] focus-visible:ring-[#E8792F]/10";
  const labelClass = "mb-2 block text-[14px] font-medium text-[#344054]";

  return (
    <div className="auth-light flex min-h-screen bg-white">
      <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up { animation: fade-in-up 0.5s ease-out both; }
      `}</style>

      {/* ═══ LEFT: marketing panel (56%) ═══ */}
      <aside
        className="relative hidden w-[56%] shrink-0 overflow-hidden lg:flex"
        style={{
          // Extremely subtle warm drift toward the seam — no glow, no blobs.
          background: "linear-gradient(115deg, #090C0F 0%, #090C0F 52%, #120D0D 100%)",
        }}
      >
        <div className="flex h-full w-full flex-col px-8 pb-10 pt-10 sm:px-12 xl:px-[60px] xl:pt-14 2xl:px-[84px] 2xl:pr-[55px] 2xl:pt-[70px]">
          {/* Brand + community badge: a vertical stack in normal flow, never overlapping */}
          <button
            onClick={() => navigate("/")}
            className="flex w-fit shrink-0 items-center gap-3"
            aria-label="DevSync home"
          >
            <LogoMark size={50} />
            <span className="text-[20px] font-bold tracking-tight text-[#F5F7FA]">DevSync</span>
          </button>

          <div className="mt-2.5 inline-flex h-8 w-fit shrink-0 items-center gap-[7px] rounded-full border border-[#30363D] bg-[#171C21] px-3 text-[12px] font-medium text-[#A8B0BA]">
            <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#20D391]" />
            5+ developers already building
          </div>

          <h1 className="mt-10 max-w-[820px] text-[44px] font-bold leading-[1.02] tracking-[-1.5px] text-[#F5F7FA] xl:text-[54px] xl:tracking-[-2px] 2xl:text-[62px]">
            Build, Collaborate
            <br />
            and <span className="text-[#E8792F]">Ship Faster.</span>
          </h1>

          <p className="mt-7 max-w-[600px] text-[17px] leading-[1.55] text-[#9BA4AE]">
            DevSync brings your code, tasks, team chat, file sharing and GitHub integration
            together — so your team can turn ideas into reality.
          </p>

          <div className="mt-[34px] flex max-w-[820px] flex-wrap gap-3">
            <FeatureBadge icon={Zap} label="Real-time Collaboration" />
            <FeatureBadge icon={Shield} label="Kanban Boards" />
            <FeatureBadge icon={Users} label="Team Chat" />
            <FeatureBadge icon={Globe} label="GitHub Integration" />
          </div>

          <BoardPreview />

          <p className="mt-auto pt-6 text-[11px] italic text-[#5A6472]">
            Good Developers Build Together
          </p>
        </div>
      </aside>

      {/* ═══ RIGHT: credential panel (44%) ═══ */}
      {/* The panel fills the viewport (`min-h-screen`) and grows in normal flow if a
          taller mode (registration / OTP) needs more room. At the target 856px
          desktop height the whole form fits, so the page never grows a scrollbar;
          nothing is ever clipped the way `overflow-hidden` would clip it. */}
      <section className="auth-light flex w-full flex-col bg-white lg:min-h-screen lg:w-[44%]">
        <div className="flex shrink-0 items-center justify-end gap-3 px-6 pt-7 sm:px-8 lg:px-10">
          <span className="text-[14px] text-[#6B7280]">New here?</span>
          <button
            type="button"
            onClick={() => setMode(mode === "register" ? "login" : "register")}
            className={cn("text-[14px] font-medium transition-colors", ACCENT_TEXT)}
          >
            {mode === "register" ? "Sign in" : "Create account"}
          </button>
        </div>

        <div className="mx-auto w-full max-w-[560px] px-6 pb-8 pt-8 sm:px-8 lg:px-0 lg:pt-[70px]">
          <div className="animate-fade-in-up">
            {/* Brand mark */}
            <div className="flex justify-center">
              <LogoMark size={68} />
            </div>

            <div className="mt-6 text-center">
              <h1 className="text-[28px] font-bold leading-[1.2] text-[#172033]">
                {useOtp ? (
                  "Check your email"
                ) : mode === "register" && registrationStep === "verify" ? (
                  "Verify your email"
                ) : mode === "login" ? (
                  <>
                    Welcome back to <span className={ACCENT_SPAN}>DevSync</span>
                  </>
                ) : (
                  <>
                    Join <span className={ACCENT_SPAN}>DevSync</span>
                  </>
                )}
              </h1>
              <p className="mt-2 text-[15px] text-[#737B88]">
                {useOtp
                  ? "We sent a code to your email"
                  : mode === "register" && registrationStep === "verify"
                    ? "Enter the 6-digit code sent to your email"
                    : mode === "login"
                      ? "Sign in to continue to your workspace"
                      : "Create your developer account"}
              </p>
            </div>

            {/* Social sign-in */}
            <div className="mt-7 grid grid-cols-2 gap-3">
              <a
                href={`${import.meta.env.VITE_API_URL || "/api"}/../oauth2/authorization/github`}
                className="flex h-12 items-center justify-center gap-2.5 rounded-[12px] border border-[#DCE1E7] bg-white text-[14px] font-medium text-[#344054] transition-colors hover:border-[#C9D0D8] hover:bg-[#F8FAFC]"
              >
                <Github className="h-5 w-5 shrink-0 text-[#111827]" />
                <span>Continue with GitHub</span>
              </a>
              <a
                href={`${import.meta.env.VITE_API_URL || "/api"}/../oauth2/authorization/google`}
                className="flex h-12 items-center justify-center gap-2.5 rounded-[12px] border border-[#DCE1E7] bg-white text-[14px] font-medium text-[#344054] transition-colors hover:border-[#C9D0D8] hover:bg-[#F8FAFC]"
              >
                <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span>Continue with Google</span>
              </a>
            </div>

            {/* OR divider */}
            <div className="my-6 flex items-center gap-3">
              <span className="h-px flex-1 bg-[#DDE2E7]" />
              <span className="text-[13px] font-medium text-[#7A8490]">OR</span>
              <span className="h-px flex-1 bg-[#DDE2E7]" />
            </div>

            <form onSubmit={handleSubmit} noValidate>
              {/* Registration-only fields */}
              {mode === "register" && registrationStep === "form" && !useOtp && (
                <div className="space-y-5">
                  <div>
                    <label htmlFor="fullName" className={labelClass}>
                      Full name
                    </label>
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className={fieldClass}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="username" className={labelClass}>
                      Username
                    </label>
                    <Input
                      id="username"
                      type="text"
                      placeholder="johndoe"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className={fieldClass}
                    />
                  </div>
                </div>
              )}

              {useOtp || (mode === "register" && registrationStep === "verify") ? (
                <div>
                  <label className={cn(labelClass, "text-center")}>Enter verification code</label>
                  <OtpInput value={otpCode} onChange={setOtpCode} />
                  <p className="mt-3 text-center text-[13px] text-[#7A8490]">
                    Sent to <span className="font-medium text-[#344054]">{email || "your email"}</span>
                  </p>
                  <div className="mt-3 text-center">
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={resendCooldown > 0 || localLoading}
                      className={cn("text-[13px] font-medium transition-colors disabled:opacity-50", ACCENT_TEXT)}
                    >
                      {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div>
                    <label htmlFor="email" className={labelClass}>
                      {mode === "login" ? "Email or username" : "Email address"}
                    </label>
                    <Input
                      id="email"
                      type={mode === "login" ? "text" : "email"}
                      placeholder={mode === "login" ? "you@example.com or username" : "you@example.com"}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={fieldClass}
                      required
                    />
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label htmlFor="password" className="text-[13px] font-medium text-[#344054]">
                        Password
                      </label>
                      {mode === "login" && (
                        <button
                          type="button"
                          onClick={() => navigate("/forgot-password")}
                          className={cn("text-[13px] font-medium transition-colors", ACCENT_TEXT)}
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder={mode === "register" ? "Min 8 characters" : "Enter your password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={fieldClass}
                      required
                      minLength={mode === "register" ? 8 : 1}
                    />
                    {mode === "login" && (
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="mt-1.5 text-[13px] text-[#7A8490] transition-colors hover:text-[#344054]"
                      >
                        {showPassword ? "Hide" : "Show"} password
                      </button>
                    )}
                  </div>
                </div>
              )}

              {mode === "login" && !useOtp && (
                <label className="mt-3 flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-[18px] w-[18px] shrink-0 rounded-[4px] border-[#C9D0D8] accent-[#C9551E]"
                  />
                  <span className="text-[14px] text-[#4B5563]">Remember me</span>
                </label>
              )}

              {error && (
                <div className="mt-5 rounded-[12px] border border-[#F3C9C9] bg-[#FDF3F3] px-3.5 py-3 text-[13px] text-[#B02525]">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={localLoading || !isValid}
                className={cn(
                  "mt-5 h-[52px] w-full rounded-[13px] text-[15px] font-semibold text-white shadow-[0_4px_12px_rgba(201,85,30,0.15)] transition-colors hover:text-white",
                  ACCENT_FILL
                )}
              >
                {localLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : useOtp ? (
                  "Verify code"
                ) : mode === "register" && registrationStep === "verify" ? (
                  "Verify & Create account"
                ) : (
                  <>
                    {mode === "login" ? "Sign in" : "Create account"}
                    <ArrowRight className="ml-2 h-[18px] w-[18px]" />
                  </>
                )}
              </Button>

              {mode === "register" && registrationStep === "verify" && (
                <button
                  type="button"
                  onClick={handleBackToForm}
                  className="mt-4 w-full text-[13px] text-[#7A8490] transition-colors hover:text-[#344054]"
                >
                  Back to registration form
                </button>
              )}
            </form>

            {/* Passwordless sign-in keeps its own path through the OTP endpoints */}
            {mode === "login" && !useOtp && (
              <button
                type="button"
                onClick={() => setUseOtp(true)}
                className="mt-4 flex w-full items-center justify-center gap-1.5 text-[13px] text-[#7A8490] transition-colors hover:text-[#344054]"
              >
                <Mail className="h-3.5 w-3.5" />
                Sign in with a magic code instead
              </button>
            )}

            {useOtp && (
              <button
                type="button"
                onClick={() => setUseOtp(false)}
                className="mt-4 w-full text-[13px] text-[#7A8490] transition-colors hover:text-[#344054]"
              >
                Back to password sign in
              </button>
            )}

            <p className="mt-4 text-center text-[11px] leading-snug text-[#98A2AE]">
              By signing in, you agree to our{" "}
              <button type="button" className="underline transition-colors hover:text-[#344054]">
                Terms of Service
              </button>{" "}
              and{" "}
              <button type="button" className="underline transition-colors hover:text-[#344054]">
                Privacy Policy
              </button>
              .
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
