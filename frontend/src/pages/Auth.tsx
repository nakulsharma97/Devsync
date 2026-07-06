import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

import { useAuth } from "@/hooks/use-auth";
import { useDevSyncAuth } from "@/contexts/AuthContext";
import { authService } from "@/services/authService";
import { ArrowRight, Code2, Loader2, Mail, UserX, KeyRound, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Suspense, useEffect, useState } from "react";
import { useNavigate } from "react-router";

interface AuthProps {
  redirectAfterAuth?: string;
}

type AuthMode = "convex-email" | "convex-otp" | "devsync-login" | "devsync-register";

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const { isLoading: authLoading, isAuthenticated, signIn } = useAuth();
  const { isLoading: devSyncLoading, isAuthenticated: devSyncAuthenticated, login: devSyncLogin, register: devSyncRegister } = useDevSyncAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>("convex-email");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (!authLoading && isAuthenticated) navigate(redirectAfterAuth || "/dashboard");
  }, [authLoading, isAuthenticated, navigate, redirectAfterAuth]);

  useEffect(() => {
    if (!devSyncLoading && devSyncAuthenticated) navigate(redirectAfterAuth || "/dashboard");
  }, [devSyncLoading, devSyncAuthenticated, navigate, redirectAfterAuth]);

  // Resend cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Start cooldown when entering OTP mode
  useEffect(() => {
    if (mode === "convex-otp") setResendCooldown(30);
  }, [mode]);

  // ── Auto-create DevSync account after Convex Auth sign-in ──
  // The app has two auth systems:
  // 1. Convex Auth (email OTP, anonymous) - handles sessions
  // 2. DevSync Auth (email+password) - uses devsync_accounts table + JWT tokens
  //
  // Posts and Projects features authenticate via DevSync Auth (getAuthToken from localStorage).
  // When a user signs in via Convex Auth, we auto-create a DevSync account so these features work.

  const AUTO_PASSWORD_KEY = "devsync_auto_password";

  /** Generate a deterministic password for auto-created DevSync accounts */
  function getOrCreateAutoPassword(): string {
    let pwd = localStorage.getItem(AUTO_PASSWORD_KEY);
    if (!pwd) {
      pwd = "auto_" + crypto.randomUUID().slice(0, 16);
      localStorage.setItem(AUTO_PASSWORD_KEY, pwd);
    }
    return pwd;
  }

  /**
   * After a Convex Auth login (OTP or anonymous), set up a corresponding
   * DevSync account so posts, projects, and other DevSync-auth features work.
   */
  async function setupDevSyncAccount(opts: {
    email: string;
    fullName?: string;
    username?: string;
  }): Promise<void> {
    const pwd = getOrCreateAutoPassword();
    const name = opts.fullName || opts.email.split("@")[0].replace(/[^a-zA-Z0-9]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).trim() || "User";
    const uname = opts.username || opts.email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase() || "user";

    try {
      // Try logging in first (account may already exist from a previous session)
      await authService.login({ email: opts.email, password: pwd });
      console.log("✅ DevSync auto-login succeeded for", opts.email);
    } catch {
      // Account doesn't exist — register one
      try {
        await authService.register({
          email: opts.email,
          password: pwd,
          fullName: name,
          username: uname + "_" + Math.random().toString(36).slice(2, 6),
        });
        console.log("✅ DevSync auto-registration succeeded for", opts.email);
      } catch (regErr: any) {
        // Registration may fail if username is taken — try with more random suffix
        try {
          await authService.register({
            email: opts.email,
            password: pwd,
            fullName: name,
            username: uname + "_" + Date.now().toString(36),
          });
          console.log("✅ DevSync auto-registration (retry) succeeded for", opts.email);
        } catch (err2: any) {
          console.warn("⚠️ Could not auto-create DevSync account:", err2.message);
        }
      }
    }
  }

  const handleEmailSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setIsLoading(true); setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      const submittedEmail = formData.get("email") as string;
      setEmail(submittedEmail);
      await signIn("email-otp", formData);
      setMode("convex-otp");
      setIsLoading(false);
    }
    catch (error) { setError(error instanceof Error ? error.message : "Failed to send verification code."); setIsLoading(false); }
  };

  const handleOtpSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setIsLoading(true); setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      await signIn("email-otp", formData);
      // Auto-create DevSync account so posts/projects work
      await setupDevSyncAccount({ email });
      navigate(redirectAfterAuth || "/dashboard");
    }
    catch (e) {
      console.error("OTP Submit - Error:", e);
      setError(e instanceof Error ? e.message : "The verification code you entered is incorrect.");
      setOtp("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setIsLoading(true); setError(null);
    try {
      await signIn("anonymous");
      const guestId = "guest_" + Date.now().toString(36);
      await setupDevSyncAccount({
        email: guestId + "@devsync.app",
        fullName: "Guest " + Math.random().toString(36).slice(2, 6),
        username: guestId,
      });
      navigate(redirectAfterAuth || "/dashboard");
    }
    catch (error) {
      console.error("Guest login - Error:", error);
      setError(`Failed to sign in as guest: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDevSyncLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setIsLoading(true); setError(null);
    try {
      console.log("DevSync Login - email:", email);
      await devSyncLogin(email, password);
    }
    catch (err: any) {
      console.error("DevSync Login - Error:", err);
      setError(err.message || "Login failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDevSyncRegister = async (e: React.FormEvent) => {
    e.preventDefault(); setIsLoading(true); setError(null);
    try {
      console.log("DevSync Register - email:", email, "username:", username, "fullName:", fullName);
      await devSyncRegister(email, password, fullName, username);
    }
    catch (err: any) {
      console.error("DevSync Register - Error:", err);
      setError(err.message || "Registration failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.05] via-background to-purple-500/[0.05]" />
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '10s' }} />
      </div>

      <div className="relative z-10 px-6 py-5">
        <button onClick={() => navigate("/")} className="flex items-center gap-2.5 text-muted-foreground hover:text-foreground transition-colors group">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
            <Code2 className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-semibold tracking-tight">DevSync</span>
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 pb-20 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-sm"
        >                  <Card className="border border-border/40 shadow-xl shadow-accent/5 backdrop-blur-sm bg-card/95">
              <motion.div
                key={mode}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              >
                {mode === "convex-email" && (
                  <>
                    <CardHeader className="text-center pb-4">
                      <div className="flex justify-center mb-3">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center ring-1 ring-accent/20 shadow-sm">
                          <Code2 className="w-7 h-7 text-accent" />
                        </div>
                      </div>
                      <CardTitle className="text-xl font-bold tracking-tight">Get Started</CardTitle>
                      <CardDescription className="text-sm">Enter your email to log in or sign up</CardDescription>
                    </CardHeader>
                    <form onSubmit={handleEmailSubmit}>
                      <CardContent className="pb-4">
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input name="email" placeholder="name@example.com" type="email" className="pl-9 h-10 text-sm bg-background/50 focus:bg-background transition-colors" disabled={isLoading} required />
                        </div>
                        {error && <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-2 text-xs text-destructive">{error}</motion.p>}
                        <div className="relative my-5">
                          <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border/40" /></div>
                          <div className="relative flex justify-center text-xs"><span className="bg-card px-3 text-muted-foreground">or</span></div>
                        </div>
                        <Button type="button" variant="outline" className="w-full h-10 text-sm font-normal border-border/50 hover:bg-accent/5" onClick={handleGuestLogin} disabled={isLoading}>
                          <UserX className="mr-2 h-4 w-4" /> Continue as guest
                        </Button>
                      </CardContent>
                      <CardFooter className="border-t border-border/40 pt-4 flex-col gap-3">
                        <Button type="submit" className="w-full h-10 text-sm shadow-md bg-gradient-to-r from-accent to-accent/90 text-white hover:from-accent/90 hover:to-accent transition-all duration-200" disabled={isLoading}>
                          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Continue with email <ArrowRight className="ml-1.5 h-4 w-4" /></>}
                        </Button>
                        <Button type="button" variant="ghost" className="w-full h-9 text-xs font-normal text-muted-foreground hover:text-foreground" onClick={() => { setError(null); setMode("devsync-login"); }}>
                          <KeyRound className="mr-1.5 h-3.5 w-3.5" /> Sign in with DevSync account
                        </Button>
                      </CardFooter>
                    </form>
                  </>
                )}

                {mode === "convex-otp" && (
                  <>
                    <CardHeader className="text-center pb-4">
                      <div className="flex justify-center mb-3">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center ring-1 ring-accent/20 shadow-sm">
                          <Mail className="w-7 h-7 text-accent" />
                        </div>
                      </div>
                      <CardTitle className="text-xl font-bold tracking-tight">Check your email</CardTitle>
                      <CardDescription className="text-sm">We've sent a code to your email</CardDescription>
                    </CardHeader>
                    <form onSubmit={handleOtpSubmit}>
                      <CardContent className="pb-4">
                        <div className="flex justify-center">
                          <input type="hidden" name="email" value={email} />
                          <InputOTP name="code" value={otp} onChange={setOtp} maxLength={6} disabled={isLoading} onKeyDown={(e) => { if (e.key === "Enter" && otp.length === 6 && !isLoading) (e.target as HTMLElement).closest("form")?.requestSubmit(); }}>
                            <InputOTPGroup>
                              {Array.from({ length: 6 }).map((_, i) => (<InputOTPSlot key={i} index={i} />))}
                            </InputOTPGroup>
                          </InputOTP>
                        </div>
                        {error && <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-3 text-xs text-destructive text-center">{error}</motion.p>}
                        <p className="text-xs text-muted-foreground text-center mt-4">
                          Didn't receive a code?{" "}
                          <Button
                            variant="link"
                            className={`p-0 h-auto text-xs ${resendCooldown > 0 ? "text-muted-foreground cursor-not-allowed" : "text-accent"}`}
                            disabled={resendCooldown > 0}
                            onClick={() => { setMode("convex-email"); setError(null); }}
                          >
                            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Try again"}
                          </Button>
                        </p>
                      </CardContent>
                      <CardFooter className="border-t border-border/40 pt-4 flex-col gap-2">
                        <Button type="submit" className="w-full h-10 text-sm shadow-md bg-gradient-to-r from-accent to-accent/90 text-white" disabled={isLoading || otp.length !== 6}>
                          {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</> : <>Verify code <ArrowRight className="ml-1.5 h-4 w-4" /></>}
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => setMode("convex-email")} disabled={isLoading} className="w-full h-9 text-xs font-normal text-muted-foreground hover:text-foreground">
                          Use a different email
                        </Button>
                      </CardFooter>
                    </form>
                  </>
                )}

                {mode === "devsync-login" && (
                  <>
                    <CardHeader className="text-center pb-4">
                      <div className="flex justify-center mb-3">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center ring-1 ring-accent/20 shadow-sm">
                          <KeyRound className="w-7 h-7 text-accent" />
                        </div>
                      </div>
                      <CardTitle className="text-xl font-bold tracking-tight">Welcome back</CardTitle>
                      <CardDescription className="text-sm">Sign in with your DevSync account</CardDescription>
                    </CardHeader>
                    <form onSubmit={handleDevSyncLogin}>
                      <CardContent className="pb-4 space-y-3">
                        <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-10 text-sm bg-background/50 focus:bg-background transition-colors" required />
                        <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-10 text-sm bg-background/50 focus:bg-background transition-colors" required />
                        {error && <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-destructive">{error}</motion.p>}
                      </CardContent>
                      <CardFooter className="border-t border-border/40 pt-4 flex-col gap-3">
                        <Button type="submit" className="w-full h-10 text-sm shadow-md bg-gradient-to-r from-accent to-accent/90 text-white hover:from-accent/90 hover:to-accent" disabled={isLoading}>
                          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Sign in <ArrowRight className="ml-1.5 h-4 w-4" /></>}
                        </Button>
                        <div className="flex gap-3 text-xs">
                          <button type="button" className="text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2" onClick={() => { setError(null); setMode("devsync-register"); }}>Create account</button>
                          <span className="text-muted-foreground">·</span>
                          <button type="button" className="text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2" onClick={() => { setError(null); setMode("convex-email"); }}>Back to email login</button>
                        </div>
                      </CardFooter>
                    </form>
                  </>
                )}

                {mode === "devsync-register" && (
                  <>
                    <CardHeader className="text-center pb-4">
                      <div className="flex justify-center mb-3">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center ring-1 ring-accent/20 shadow-sm">
                          <Sparkles className="w-7 h-7 text-accent" />
                        </div>
                      </div>
                      <CardTitle className="text-xl font-bold tracking-tight">Join DevSync</CardTitle>
                      <CardDescription className="text-sm">Create your developer account</CardDescription>
                    </CardHeader>
                    <form onSubmit={handleDevSyncRegister}>
                      <CardContent className="pb-4 space-y-3">
                        <Input type="text" placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-10 text-sm bg-background/50 focus:bg-background transition-colors" required />
                        <Input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} className="h-10 text-sm bg-background/50 focus:bg-background transition-colors" required />
                        <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-10 text-sm bg-background/50 focus:bg-background transition-colors" required />
                        <Input type="password" placeholder="Password (min 6 characters)" value={password} onChange={(e) => setPassword(e.target.value)} className="h-10 text-sm bg-background/50 focus:bg-background transition-colors" required minLength={6} />
                        {error && <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-xs text-destructive">{error}</motion.p>}
                      </CardContent>
                      <CardFooter className="border-t border-border/40 pt-4 flex-col gap-3">
                        <Button type="submit" className="w-full h-10 text-sm shadow-md bg-gradient-to-r from-accent to-accent/90 text-white hover:from-accent/90 hover:to-accent" disabled={isLoading}>
                          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Create account <ArrowRight className="ml-1.5 h-4 w-4" /></>}
                        </Button>
                        <button type="button" className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2" onClick={() => { setError(null); setMode("devsync-login"); }}>
                          Already have an account? Sign in
                        </button>
                      </CardFooter>
                    </form>
                  </>
                )}
              </motion.div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

export default function AuthPage(props: AuthProps) {
  return <Suspense><Auth {...props} /></Suspense>;
}
