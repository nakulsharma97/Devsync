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
import { ArrowRight, Code2, Loader2, Mail, UserX, KeyRound } from "lucide-react";
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

  useEffect(() => {
    if (!authLoading && isAuthenticated) navigate(redirectAfterAuth || "/dashboard");
  }, [authLoading, isAuthenticated, navigate, redirectAfterAuth]);

  useEffect(() => {
    if (!devSyncLoading && devSyncAuthenticated) navigate(redirectAfterAuth || "/dashboard");
  }, [devSyncLoading, devSyncAuthenticated, navigate, redirectAfterAuth]);

  const handleEmailSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setIsLoading(true); setError(null);
    try { const formData = new FormData(event.currentTarget); await signIn("email-otp", formData); setMode("convex-otp"); setIsLoading(false); }
    catch (error) { setError(error instanceof Error ? error.message : "Failed to send verification code."); setIsLoading(false); }
  };

  const handleOtpSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setIsLoading(true); setError(null);
    try { const formData = new FormData(event.currentTarget); await signIn("email-otp", formData); navigate(redirectAfterAuth || "/dashboard"); }
    catch { setError("The verification code you entered is incorrect."); setIsLoading(false); setOtp(""); }
  };

  const handleGuestLogin = async () => {
    setIsLoading(true); setError(null);
    try { await signIn("anonymous"); navigate(redirectAfterAuth || "/dashboard"); }
    catch (error) { setError(`Failed to sign in as guest: ${error instanceof Error ? error.message : "Unknown error"}`); setIsLoading(false); }
  };

  const handleDevSyncLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setIsLoading(true); setError(null);
    try { await devSyncLogin(email, password); }
    catch (err: any) { setError(err.message || "Login failed."); setIsLoading(false); }
  };

  const handleDevSyncRegister = async (e: React.FormEvent) => {
    e.preventDefault(); setIsLoading(true); setError(null);
    try { await devSyncRegister(email, password, fullName, username); }
    catch (err: any) { setError(err.message || "Registration failed."); setIsLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="px-6 py-5">
        <button onClick={() => navigate("/")} className="flex items-center gap-2.5 text-muted-foreground hover:text-foreground transition-colors">
          <div className="w-7 h-7 rounded-lg bg-foreground flex items-center justify-center"><Code2 className="w-4 h-4 text-background" /></div>
          <span className="text-sm font-semibold tracking-tight">DevSync</span>
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center px-4 pb-20">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }} className="w-full max-w-sm">
          <Card className="border border-border/50 shadow-sm">
            {mode === "convex-email" && (
              <>
                <CardHeader className="text-center pb-4">
                  <div className="flex justify-center mb-3"><div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center ring-1 ring-accent/20"><Code2 className="w-6 h-6 text-accent" /></div></div>
                  <CardTitle className="text-lg font-semibold tracking-tight">Get Started</CardTitle>
                  <CardDescription className="text-sm">Enter your email to log in or sign up</CardDescription>
                </CardHeader>
                <form onSubmit={handleEmailSubmit}>
                  <CardContent className="pb-4">
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input name="email" placeholder="name@example.com" type="email" className="pl-9 h-10 text-sm bg-background" disabled={isLoading} required />
                    </div>
                    {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
                    <div className="relative my-5"><div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border/50" /></div><div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">or</span></div></div>
                    <Button type="button" variant="outline" className="w-full h-10 text-sm font-normal" onClick={handleGuestLogin} disabled={isLoading}><UserX className="mr-2 h-4 w-4" /> Continue as guest</Button>
                  </CardContent>
                  <CardFooter className="border-t border-border/50 pt-4 flex-col gap-3">
                    <Button type="submit" className="w-full h-10 text-sm shadow-sm" disabled={isLoading}>{isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Continue with email <ArrowRight className="ml-1.5 h-4 w-4" /></>}</Button>
                    <Button type="button" variant="ghost" className="w-full h-9 text-xs font-normal text-muted-foreground" onClick={() => { setError(null); setMode("devsync-login"); }}><KeyRound className="mr-1.5 h-3.5 w-3.5" /> Sign in with DevSync account</Button>
                  </CardFooter>
                </form>
              </>
            )}
            {mode === "convex-otp" && (
              <>
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-lg font-semibold tracking-tight">Check your email</CardTitle>
                  <CardDescription className="text-sm">We've sent a code to your email</CardDescription>
                </CardHeader>
                <form onSubmit={handleOtpSubmit}>
                  <CardContent className="pb-4">
                    <div className="flex justify-center"><InputOTP value={otp} onChange={setOtp} maxLength={6} disabled={isLoading} onKeyDown={(e) => { if (e.key === "Enter" && otp.length === 6 && !isLoading) (e.target as HTMLElement).closest("form")?.requestSubmit(); }}><InputOTPGroup>{Array.from({ length: 6 }).map((_, i) => (<InputOTPSlot key={i} index={i} />))}</InputOTPGroup></InputOTP></div>
                    {error && <p className="mt-3 text-xs text-destructive text-center">{error}</p>}
                    <p className="text-xs text-muted-foreground text-center mt-4">Didn't receive a code? <Button variant="link" className="p-0 h-auto text-xs" onClick={() => setMode("convex-email")}>Try again</Button></p>
                  </CardContent>
                  <CardFooter className="border-t border-border/50 pt-4 flex-col gap-2">
                    <Button type="submit" className="w-full h-10 text-sm shadow-sm" disabled={isLoading || otp.length !== 6}>{isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</> : <>Verify code <ArrowRight className="ml-1.5 h-4 w-4" /></>}</Button>
                    <Button type="button" variant="ghost" onClick={() => setMode("convex-email")} disabled={isLoading} className="w-full h-9 text-xs font-normal text-muted-foreground">Use a different email</Button>
                  </CardFooter>
                </form>
              </>
            )}
            {mode === "devsync-login" && (
              <>
                <CardHeader className="text-center pb-4">
                  <div className="flex justify-center mb-3"><div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center ring-1 ring-accent/20"><KeyRound className="w-6 h-6 text-accent" /></div></div>
                  <CardTitle className="text-lg font-semibold tracking-tight">Sign in</CardTitle>
                  <CardDescription className="text-sm">Sign in with your DevSync account</CardDescription>
                </CardHeader>
                <form onSubmit={handleDevSyncLogin}>
                  <CardContent className="pb-4 space-y-3">
                    <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-10 text-sm bg-background" required />
                    <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-10 text-sm bg-background" required />
                    {error && <p className="text-xs text-destructive">{error}</p>}
                  </CardContent>
                  <CardFooter className="border-t border-border/50 pt-4 flex-col gap-3">
                    <Button type="submit" className="w-full h-10 text-sm shadow-sm" disabled={isLoading}>{isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Sign in <ArrowRight className="ml-1.5 h-4 w-4" /></>}</Button>
                    <div className="flex gap-3 text-xs">
                      <button type="button" className="text-muted-foreground hover:text-foreground transition-colors" onClick={() => { setError(null); setMode("devsync-register"); }}>Create account</button>
                      <span className="text-muted-foreground">·</span>
                      <button type="button" className="text-muted-foreground hover:text-foreground transition-colors" onClick={() => { setError(null); setMode("convex-email"); }}>Back to email login</button>
                    </div>
                  </CardFooter>
                </form>
              </>
            )}
            {mode === "devsync-register" && (
              <>
                <CardHeader className="text-center pb-4">
                  <div className="flex justify-center mb-3"><div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center ring-1 ring-accent/20"><KeyRound className="w-6 h-6 text-accent" /></div></div>
                  <CardTitle className="text-lg font-semibold tracking-tight">Create account</CardTitle>
                  <CardDescription className="text-sm">Join the developer community</CardDescription>
                </CardHeader>
                <form onSubmit={handleDevSyncRegister}>
                  <CardContent className="pb-4 space-y-3">
                    <Input type="text" placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-10 text-sm bg-background" required />
                    <Input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} className="h-10 text-sm bg-background" required />
                    <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-10 text-sm bg-background" required />
                    <Input type="password" placeholder="Password (min 6 characters)" value={password} onChange={(e) => setPassword(e.target.value)} className="h-10 text-sm bg-background" required minLength={6} />
                    {error && <p className="text-xs text-destructive">{error}</p>}
                  </CardContent>
                  <CardFooter className="border-t border-border/50 pt-4 flex-col gap-3">
                    <Button type="submit" className="w-full h-10 text-sm shadow-sm" disabled={isLoading}>{isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Create account <ArrowRight className="ml-1.5 h-4 w-4" /></>}</Button>
                    <button type="button" className="text-xs text-muted-foreground hover:text-foreground transition-colors" onClick={() => { setError(null); setMode("devsync-login"); }}>Already have an account? Sign in</button>
                  </CardFooter>
                </form>
              </>
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
export default function AuthPage(props: AuthProps) {
  return <Suspense><Auth {...props} /></Suspense>;
}
