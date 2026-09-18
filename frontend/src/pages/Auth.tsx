import { useEffect, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Github, Mail, ArrowRight, Loader2, Sparkles, Shield, Users, Zap, Globe } from "lucide-react";
import { LogoMark } from "@/components/Logo";

function OtpInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [focused, setFocused] = useState(true);
  const keyframesStyle = `
    @keyframes otp-blink {
      0%, 50% { border-color: #A6532D; }
      51%, 100% { border-color: transparent; }
    }
  `;
  return (
    <>
      <style>{keyframesStyle}</style>
      <div className="flex gap-2 justify-center">
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
              className="w-10 h-12 text-center text-lg font-mono bg-white border border-gray-200 rounded-lg focus:border-[#A6532D] focus:ring-2 focus:ring-[#A6532D]/20 outline-none transition-all"
              style={i === value.length && focused ? { animation: "otp-blink 1s infinite" } : {}}
            />
          </div>
        ))}
      </div>
    </>
  );
}

function FeatureBadge({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
      <Icon className="w-4 h-4 text-[#F59A45]" />
      <span className="text-xs font-medium text-white/80">{label}</span>
    </div>
  );
}

export default function Auth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, register, isLoading, isAuthenticated, isAdmin, forgotPassword, verifyOtp, resendOtp, refreshUser } = useAuth();

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
    } catch {}
  }, [email, resendOtp]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLocalLoading(true);
    try {
      if (useOtp || (mode === "register" && registrationStep === "verify")) {
        await verifyOtp(email, otpCode);
        await refreshUser();
        navigate(isAdmin ? "/admin/dashboard" : "/dashboard");
        return;
      }
      if (mode === "login") {
        await login(email, password, rememberMe);
      } else {
        if (registrationStep === "form") {
          setRegistrationStep("verify");
          await resendOtp(email);
          setResendCooldown(60);
          return;
        }
        await register(email, password, fullName, username, otpCode);
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

  return (
    <div className="auth-light min-h-screen flex bg-white">
      <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up { animation: fade-in-up 0.5s ease-out both; }
      `}</style>

      {/* ═══ LEFT: Product Showcase ═══ */}
      <div
        className="hidden lg:flex lg:w-[55%] flex-col justify-between p-10 xl:p-14 relative overflow-hidden text-white"
        style={{ background: "linear-gradient(180deg, #080B10 0%, #0D1117 100%)" }}
      >
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]">
          <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)", backgroundSize: "32px 32px" }} />
        </div>

        {/* Copper glow */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#A6532D]/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#F59A45]/5 rounded-full blur-[100px] pointer-events-none" />

        {/* DevSync logo */}
        <div className="relative z-10">
          <button onClick={() => navigate("/")} className="flex items-center gap-2.5 group">
            <LogoMark size={36} />
            <span className="font-display text-lg font-semibold tracking-tight">DevSync</span>
          </button>
        </div>

        {/* Main content */}
        <div className="relative z-10 space-y-8 max-w-xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-white/70">
            <span className="w-1.5 h-1.5 rounded-full bg-[#35C982] animate-pulse" />
            {`5+ developers already building`}
          </div>

          {/* Headline */}
          <h1 className="text-4xl xl:text-5xl font-extrabold font-display leading-[1.1] tracking-tight">
            Build, Collaborate<br />
            and <span className="bg-gradient-to-r from-[#A6532D] to-[#F59A45] bg-clip-text text-transparent">Ship Faster.</span>
          </h1>

          {/* Description */}
          <p className="text-base text-white/60 leading-relaxed max-w-md">
            DevSync brings your code, tasks, team chat, file sharing and GitHub integration together — so your team can turn ideas into reality.
          </p>

          {/* Feature badges */}
          <div className="flex flex-wrap gap-3">
            <FeatureBadge icon={Zap} label="Real-time Collaboration" />
            <FeatureBadge icon={Shield} label="Kanban Boards" />
            <FeatureBadge icon={Users} label="Team Chat" />
            <FeatureBadge icon={Globe} label="GitHub Integration" />
          </div>
        </div>

        {/* Kanban preview card */}
        <div className="relative z-10 mt-auto">
          <div className="rounded-2xl border border-white/10 bg-[#151B24]/80 backdrop-blur-sm overflow-hidden shadow-2xl">
            {/* Mini sidebar */}
            <div className="flex h-[280px]">
              <div className="w-44 border-r border-white/5 bg-[#0D1117]/60 p-3 flex flex-col gap-1">
                <div className="flex items-center gap-2 px-2 py-1.5 mb-2">
                  <LogoMark size={20} />
                  <span className="text-[10px] font-semibold text-white/80">DevSync</span>
                </div>
                {["Dashboard", "Tasks", "Kanban", "Team Chat", "Files", "GitHub", "Settings"].map((item, i) => (
                  <div key={item} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-[10px] ${i === 2 ? "bg-[#F59A45]/10 text-[#F59A45]" : "text-white/40"}`}>
                    <div className="w-3 h-3 rounded bg-current/20" />
                    {item}
                  </div>
                ))}
              </div>

              {/* Kanban board */}
              <div className="flex-1 p-4">
                <div className="mb-3">
                  <h3 className="text-sm font-semibold text-white/90">Project Board</h3>
                  <p className="text-[10px] text-white/40">Organize, track and ship your ideas.</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {/* To Do */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-medium text-white/60">To Do</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/5 text-white/40">4</span>
                    </div>
                    <div className="space-y-2">
                      {["Design landing page", "Setup database"].map((task) => (
                        <div key={task} className="p-2.5 rounded-lg bg-[#1A2030] border border-white/5">
                          <p className="text-[10px] text-white/80 mb-1">{task}</p>
                          <span className="text-[8px] px-1.5 py-0.5 rounded bg-[#5B9CF6]/10 text-[#5B9CF6]">frontend</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* In Progress */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-medium text-[#F59A45]">In Progress</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#F59A45]/10 text-[#F59A45]">2</span>
                    </div>
                    <div className="space-y-2">
                      {["Build authentication", "Real-time chat"].map((task) => (
                        <div key={task} className="p-2.5 rounded-lg bg-[#1A2030] border border-white/5">
                          <p className="text-[10px] text-white/80 mb-1">{task}</p>
                          <span className="text-[8px] px-1.5 py-0.5 rounded bg-[#A6532D]/10 text-[#F59A45]">backend</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Done */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-medium text-[#35C982]">Done</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#35C982]/10 text-[#35C982]">3</span>
                    </div>
                    <div className="space-y-2">
                      {["Project setup", "UI components", "Deploy to production"].map((task) => (
                        <div key={task} className="p-2.5 rounded-lg bg-[#1A2030] border border-white/5">
                          <p className="text-[10px] text-white/80 mb-1">{task}</p>
                          <div className="flex items-center gap-1">
                            <span className="text-[8px] px-1.5 py-0.5 rounded bg-[#35C982]/10 text-[#35C982]">{task === "Project setup" ? "infra" : task === "UI components" ? "frontend" : "release"}</span>
                            <span className="text-[8px] text-[#35C982]">✓</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer text */}
        <div className="relative z-10 mt-4">
          <p className="text-[10px] text-white/30 italic font-display">Good Developers Build Together</p>
        </div>
      </div>

      {/* ═══ RIGHT: Auth Form ═══ */}
      <div className="auth-light w-full lg:w-[45%] flex flex-col relative bg-white">
        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4 lg:px-8">
          <div className="lg:hidden flex items-center gap-2">
            <button onClick={() => navigate("/")} className="flex items-center gap-2">
              <LogoMark size={32} />
            </button>
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <span className="text-sm text-gray-500">New here?</span>
            <button
              onClick={() => setMode(mode === "register" ? "login" : "register")}
              className="text-sm font-medium text-[#A6532D] hover:text-[#8B4526] transition-colors"
            >
              {mode === "register" ? "Sign in" : "Create account"}
            </button>
          </div>
        </div>

        {/* Form area */}
        <div className="flex-1 flex items-center justify-center p-6 sm:p-8 lg:p-12">
          <div className="w-full max-w-md animate-fade-in-up">
            {/* Header icon */}
            <div className="flex justify-center mb-6">
              <LogoMark size={56} />
            </div>

            {/* Heading */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900 font-display">
                {useOtp
                  ? "Check your email"
                  : mode === "register" && registrationStep === "verify"
                    ? "Verify your email"
                    : mode === "login"
                      ? <>Welcome back to <span className="text-[#A6532D]">DevSync</span></>
                      : <>Join <span className="text-[#A6532D]">DevSync</span></>}
              </h1>
              <p className="text-sm text-gray-500 mt-2">
                {useOtp
                  ? "We sent a code to your email"
                  : mode === "register" && registrationStep === "verify"
                    ? "Enter the 6-digit code sent to your email"
                    : mode === "login"
                      ? "Sign in to continue to your workspace"
                      : "Create your developer account"}
              </p>
            </div>

            {/* OAuth buttons */}
            <div className="flex gap-3 mb-6">
              <a
                href={`${import.meta.env.VITE_API_URL || "/api"}/../oauth2/authorization/github`}
                className="flex-1 flex items-center justify-center gap-2 h-12 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all text-sm font-medium text-gray-700"
              >
                <Github className="w-4 h-4" />
                <span>Continue with GitHub</span>
              </a>
              <a
                href={`${import.meta.env.VITE_API_URL || "/api"}/../oauth2/authorization/google`}
                className="flex-1 flex items-center justify-center gap-2 h-12 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all text-sm font-medium text-gray-700"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span>Continue with Google</span>
              </a>
            </div>

            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-gray-400 uppercase tracking-wider font-medium">OR</span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Register fields */}
              {mode === "register" && registrationStep === "form" && !useOtp && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Full name</label>
                    <Input
                      type="text"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="h-12 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-[#A6532D] focus:ring-[#A6532D]/20 rounded-xl"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Username</label>
                    <Input
                      type="text"
                      placeholder="johndoe"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="h-12 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-[#A6532D] focus:ring-[#A6532D]/20 rounded-xl"
                    />
                  </div>
                </>
              )}

              {useOtp || (mode === "register" && registrationStep === "verify") ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Enter verification code</label>
                  <OtpInput value={otpCode} onChange={setOtpCode} />
                  <p className="text-xs text-gray-400 mt-3 text-center">
                    Sent to <span className="text-[#A6532D] font-medium">{email || "your email"}</span>
                  </p>
                  <div className="mt-3 text-center">
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={resendCooldown > 0 || localLoading}
                      className="text-xs text-[#A6532D] hover:text-[#8B4526] font-medium transition-colors disabled:opacity-50"
                    >
                      {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      {mode === "login" ? "Email or username" : "Email address"}
                    </label>
                    <Input
                      type={mode === "login" ? "text" : "email"}
                      placeholder={mode === "login" ? "you@example.com or username" : "you@example.com"}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-[#A6532D] focus:ring-[#A6532D]/20 rounded-xl"
                      required
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-sm font-medium text-gray-700">Password</label>
                      {mode === "login" && (
                        <button
                          type="button"
                          onClick={() => navigate("/forgot-password")}
                          className="text-xs font-medium text-[#A6532D] hover:text-[#8B4526] transition-colors"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder={mode === "register" ? "Min 8 characters" : "Enter your password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-400 focus:border-[#A6532D] focus:ring-[#A6532D]/20 rounded-xl"
                      required
                      minLength={mode === "register" ? 8 : 1}
                    />
                    {mode === "login" && (
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-xs text-gray-400 hover:text-gray-600 mt-1.5 transition-colors"
                      >
                        {showPassword ? "Hide" : "Show"} password
                      </button>
                    )}
                  </div>
                </>
              )}

              {/* Remember me */}
              {mode === "login" && !useOtp && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-[#A6532D] focus:ring-[#A6532D]/20 accent-[#A6532D]"
                  />
                  <span className="text-sm text-gray-600">Remember me</span>
                </label>
              )}

              {/* Error */}
              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
                  {error}
                </div>
              )}

              {/* Submit */}
              <Button
                type="submit"
                className="w-full h-12 text-sm font-semibold rounded-xl bg-gradient-to-r from-[#A6532D] to-[#8B4526] hover:from-[#8B4526] hover:to-[#703A1F] text-white shadow-lg shadow-[#A6532D]/20 transition-all disabled:opacity-50 mt-2"
                disabled={localLoading || !isValid}
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
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>

              {/* Back button for verification step */}
              {mode === "register" && registrationStep === "verify" && (
                <button
                  type="button"
                  onClick={handleBackToForm}
                  className="w-full text-sm text-gray-500 hover:text-[#A6532D] transition-colors"
                >
                  Back to registration form
                </button>
              )}
            </form>

            {/* OTP toggle */}
            {mode === "login" && !useOtp && (
              <button
                type="button"
                onClick={() => setUseOtp(true)}
                className="w-full mt-4 text-sm text-gray-400 hover:text-[#A6532D] transition-colors flex items-center justify-center gap-1.5"
              >
                <Mail className="w-3.5 h-3.5" />
                Sign in with a magic code instead
              </button>
            )}

            {useOtp && (
              <button
                type="button"
                onClick={() => setUseOtp(false)}
                className="w-full mt-4 text-sm text-gray-400 hover:text-[#A6532D] transition-colors"
              >
                Back to password sign in
              </button>
            )}

            {/* Divider */}
            <div className="relative mt-8 mb-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
            </div>

            {/* Mode toggle */}
            <div className="text-center">
              <p className="text-sm text-gray-500">
                {mode === "login" ? (
                  <>Don&apos;t have an account?{" "}
                    <button onClick={() => setMode("register")} className="font-semibold text-[#A6532D] hover:text-[#8B4526] transition-colors">
                      Create one
                    </button>
                  </>
                ) : (
                  <>Already have an account?{" "}
                    <button onClick={() => setMode("login")} className="font-semibold text-[#A6532D] hover:text-[#8B4526] transition-colors">
                      Sign in
                    </button>
                  </>
                )}
              </p>
            </div>

            {/* Terms */}
            <p className="text-[11px] text-gray-400 text-center mt-6 leading-relaxed">
              By signing in, you agree to our{" "}
              <button className="underline hover:text-gray-600">Terms of Service</button>
              {" "}and{" "}
              <button className="underline hover:text-gray-600">Privacy Policy</button>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
