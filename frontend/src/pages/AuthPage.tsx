import { useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { PasswordStrength } from "@/components/PasswordStrength";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

type AuthMode = "login" | "register" | "forgot";

// ─── Animated transition variants ───────────────────────────────────────────
const pageVariants: Variants = {
  initial: { opacity: 0, y: 20, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, y: -15, scale: 0.98, transition: { duration: 0.25, ease: "easeIn" } },
};

const staggerVariants: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: i * 0.06 },
  }),
};

// ─── OAuth Provider button config ───────────────────────────────────────────
const oauthProviders = [
  {
    id: "google" as const,
    name: "Google",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
      </svg>
    ),
  },
  {
    id: "github" as const,
    name: "GitHub",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
      </svg>
    ),
  },
];

// ─── Feature list for the decorative side ───────────────────────────────────
const authFeatures = [
  { icon: "🚀", text: "Blazing fast CI/CD pipelines" },
  { icon: "🤖", text: "AI-powered code reviews" },
  { icon: "🔒", text: "Enterprise-grade security" },
  { icon: "🌐", text: "Real-time collaboration" },
];

// ─── Floating shapes for background ─────────────────────────────────────────
function FloatingShapes() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />
      <div className="auth-grid-bg absolute inset-0 opacity-30 dark:opacity-20" />
    </div>
  );
}

// ─── Social proof avatars ───────────────────────────────────────────────────
function SocialProof() {
  const avatars = [
    "https://api.dicebear.com/7.x/initials/svg?seed=JD&backgroundColor=c7d2fe",
    "https://api.dicebear.com/7.x/initials/svg?seed=SK&backgroundColor=a5b4fc",
    "https://api.dicebear.com/7.x/initials/svg?seed=AL&backgroundColor=818cf8",
    "https://api.dicebear.com/7.x/initials/svg?seed=MR&backgroundColor=6366f1",
    "https://api.dicebear.com/7.x/initials/svg?seed=TW&backgroundColor=4f46e5",
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.5 }}
      className="flex items-center gap-3 mt-6"
    >
      <div className="flex -space-x-2">
        {avatars.map((src, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 + i * 0.08, duration: 0.3 }}
            className="w-8 h-8 rounded-full border-2 border-[var(--bg-primary)] overflow-hidden"
          >
            <img src={src} alt="" className="w-full h-full object-cover" />
          </motion.div>
        ))}
      </div>
      <p className="text-xs text-[var(--text-tertiary)]">
        <span className="text-brand-400 font-semibold">12,000+</span> developers trust DevSync
      </p>
    </motion.div>
  );
}

// ─── Form field wrapper with staggered animation ───────────────────────────
function AnimatedField({ children, index = 0 }: { children: React.ReactNode; index?: number }) {
  return (
    <motion.div
      custom={index}
      variants={staggerVariants}
      initial="initial"
      animate="animate"
    >
      {children}
    </motion.div>
  );
}

// ─── Login Form ─────────────────────────────────────────────────────────────
function LoginForm({ onToggleMode }: { onToggleMode: (mode: AuthMode) => void }) {
  const { login, isLoading, error, clearError } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const displayError = localError || error;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!email.trim()) { setLocalError("Email is required"); return; }
    if (!password) { setLocalError("Password is required"); return; }

    try { await login(email, password); } catch { /* handled in context */ }
  };

  return (
    <motion.form
      key="login"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      onSubmit={handleSubmit}
      className="space-y-5"
    >
      <AnimatedField index={0}>
        <label className="block text-sm font-medium mb-1.5 text-foreground/80">Email</label>
        <Input
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => { setEmail(e.target.value); clearError(); setLocalError(null); }}
          icon={
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          }
          autoComplete="email"
          required
        />
      </AnimatedField>

      <AnimatedField index={1}>
        <label className="block text-sm font-medium mb-1.5 text-foreground/80">Password</label>
        <Input
          type={showPassword ? "text" : "password"}
          placeholder="Enter your password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); clearError(); setLocalError(null); }}
          icon={
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          }
          rightIcon={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors p-1"
              tabIndex={-1}
            >
              {showPassword ? (
                <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              ) : (
                <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>
          }
          autoComplete="current-password"
          required
        />
      </AnimatedField>

      <AnimatedField index={2}>
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked === true)}
            />
            <span className="text-sm text-foreground/80">Remember me</span>
          </label>
          <button
            type="button"
            onClick={() => onToggleMode("forgot")}
            className="text-xs font-medium text-brand-400 hover:text-brand-300 transition-colors"
          >
            Forgot password?
          </button>
        </div>
      </AnimatedField>

      {displayError && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-500"
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          {displayError}
        </motion.div>
      )}

      <AnimatedField index={3}>
        <Button type="submit" size="lg" className="w-full" loading={isLoading}>
          Sign in
        </Button>
      </AnimatedField>
    </motion.form>
  );
}

// ─── Register Form ──────────────────────────────────────────────────────────
function RegisterForm(_props: { onToggleMode: (mode: AuthMode) => void }) {
  const { register, isLoading, error, clearError } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const displayError = localError || error;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!name.trim()) { setLocalError("Name is required"); return; }
    if (!email.trim()) { setLocalError("Email is required"); return; }
    if (password.length < 8) { setLocalError("Password must be at least 8 characters"); return; }
    if (password !== confirmPassword) { setLocalError("Passwords don't match"); return; }
    if (!agreedToTerms) { setLocalError("You must agree to the terms to continue"); return; }

    try { await register(name, email, password); } catch { /* handled in context */ }
  };

  return (
    <motion.form
      key="register"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      onSubmit={handleSubmit}
      className="space-y-4"
    >
      <AnimatedField index={0}>
        <label className="block text-sm font-medium mb-1.5 text-foreground/80">Full name</label>
        <Input
          type="text"
          placeholder="John Doe"
          value={name}
          onChange={(e) => { setName(e.target.value); clearError(); setLocalError(null); }}
          icon={
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          }
          autoComplete="name"
          required
        />
      </AnimatedField>

      <AnimatedField index={1}>
        <label className="block text-sm font-medium mb-1.5 text-foreground/80">Email</label>
        <Input
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => { setEmail(e.target.value); clearError(); setLocalError(null); }}
          icon={
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          }
          autoComplete="email"
          required
        />
      </AnimatedField>

      <AnimatedField index={2}>
        <label className="block text-sm font-medium mb-1.5 text-foreground/80">Password</label>
        <Input
          type={showPassword ? "text" : "password"}
          placeholder="Create a strong password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          icon={
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          }
          rightIcon={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors p-1"
              tabIndex={-1}
            >
              {showPassword ? (
                <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              ) : (
                <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>
          }
          autoComplete="new-password"
          required
        />
        <PasswordStrength password={password} />
      </AnimatedField>

      <AnimatedField index={3}>
        <label className="block text-sm font-medium mb-1.5 text-foreground/80">Confirm password</label>
        <Input
          type="password"
          placeholder="Re-enter your password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          icon={
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          }
          autoComplete="new-password"
          required
        />
        {confirmPassword && password !== confirmPassword && (
          <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            Passwords don't match
          </p>
        )}
      </AnimatedField>

      <AnimatedField index={4}>
        <label className="flex items-start gap-2 cursor-pointer">
          <Checkbox
            checked={agreedToTerms}
            onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
            className="mt-0.5"
          />
          <span className="text-sm text-foreground/80">I agree to the Terms of Service and Privacy Policy</span>
        </label>
      </AnimatedField>

      {displayError && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-500"
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          {displayError}
        </motion.div>
      )}

      <AnimatedField index={5}>
        <Button type="submit" size="lg" className="w-full" loading={isLoading}>
          Create account
        </Button>
      </AnimatedField>
    </motion.form>
  );
}

// ─── Forgot Password Form ───────────────────────────────────────────────────
function ForgotPasswordForm({ onToggleMode: goBack }: { onToggleMode: (mode: AuthMode) => void }) {
  const { forgotPassword, isLoading, error, clearError } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const displayError = localError || error;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!email.trim()) { setLocalError("Email is required"); return; }

    try {
      await forgotPassword(email);
      setSent(true);
    } catch { /* handled in context */ }
  };

  if (sent) {
    return (
      <motion.div
        key="forgot-sent"
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="text-center space-y-4 py-4"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="w-16 h-16 mx-auto rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center"
        >
          <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
        </motion.div>
        <h3 className="text-lg font-semibold">Check your inbox</h3>
        <p className="text-sm text-[var(--text-secondary)]">
          We've sent a password reset link to <strong className="text-[var(--text-primary)]">{email}</strong>
        </p>
        <button
          type="button"
          onClick={() => goBack("login")}
          className="text-sm font-medium text-brand-400 hover:text-brand-300 transition-colors"
        >
          Back to sign in
        </button>
      </motion.div>
    );
  }

  return (
    <motion.form
      key="forgot"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      onSubmit={handleSubmit}
      className="space-y-5"
    >
      <div className="text-center space-y-2">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
          className="w-12 h-12 mx-auto rounded-full bg-brand-500/10 border border-brand-500/20 flex items-center justify-center"
        >
          <svg className="w-6 h-6 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
          </svg>
        </motion.div>
        <p className="text-sm text-[var(--text-secondary)]">
          Enter your email and we'll send you a link to reset your password.
        </p>
      </div>

      <Input
        type="email"
        placeholder="you@company.com"
        value={email}
        onChange={(e) => { setEmail(e.target.value); clearError(); setLocalError(null); }}
        icon={
          <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
        }
        autoComplete="email"
        required
      />

      {displayError && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-500"
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          {displayError}
        </motion.div>
      )}

      <Button type="submit" size="lg" className="w-full" loading={isLoading}>
        Send reset link
      </Button>

      <button
        type="button"
        onClick={() => goBack("login")}
        className="w-full text-sm font-medium text-[var(--text-secondary)] hover:text-brand-400 transition-colors"
      >
        ← Back to sign in
      </button>
    </motion.form>
  );
}

// ─── OAuth Section ──────────────────────────────────────────────────────────
function OAuthSection({ isLoading }: { isLoading: boolean }) {
  const { loginWithOAuth } = useAuth();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.3, duration: 0.4 }}
      className="space-y-3"
    >
      <div className="relative my-6">
        <Separator />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="bg-card px-2 text-xs text-muted-foreground">Or continue with</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {oauthProviders.map((provider) => (
          <button
            key={provider.id}
            type="button"
            disabled={isLoading}
            onClick={() => loginWithOAuth(provider.id)}
            className={cn(
              "oauth-btn flex items-center justify-center gap-2.5 h-11 px-4 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] text-sm font-medium text-[var(--text-primary)] transition-all duration-200",
              "hover:bg-[var(--bg-tertiary)] hover:border-brand-500/30 hover:shadow-sm",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {provider.icon}
            <span>{provider.name}</span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Main Auth Page ─────────────────────────────────────────────────────────
export function AuthPage() {
  const [mode, setMode] = useState<AuthMode>("login");

  const toggleMode = (newMode: AuthMode) => setMode(newMode);

  const isLogin = mode === "login";
  const isRegister = mode === "register";

  return (
    <div className="min-h-screen flex relative overflow-hidden bg-[var(--bg-primary)]">
      <FloatingShapes />

      {/* Left decorative panel — hidden on mobile */}
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="hidden lg:flex lg:w-[45%] xl:w-[50%] relative flex-col justify-between p-12"
      >
        {/* Brand */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/30">
              <svg className="w-5.5 h-5.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
              </svg>
            </div>
            <span className="text-xl font-bold text-[var(--text-primary)]">
              Dev<span className="text-brand-400">Sync</span>
            </span>
          </div>
        </div>

        {/* Center content */}
        <div className="relative z-10 space-y-6">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-3xl xl:text-4xl font-bold leading-tight"
          >
            Build, ship, and{" "}
            <span className="text-gradient">collaborate</span>
            <br />
            at the speed of thought.
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-[var(--text-secondary)] text-base leading-relaxed max-w-md"
          >
            DevSync brings your entire development workflow together — from code to deployment — in one seamless platform.
          </motion.p>

          <motion.ul
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="space-y-3"
          >
            {authFeatures.map((feature, idx) => (
              <motion.li
                key={idx}
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + idx * 0.1, duration: 0.4 }}
                className="flex items-center gap-3 text-sm"
              >
                <span className="text-lg">{feature.icon}</span>
                <span className="text-[var(--text-primary)]">{feature.text}</span>
              </motion.li>
            ))}
          </motion.ul>

          <SocialProof />
        </div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="relative z-10 text-xs text-[var(--text-tertiary)]"
        >
          © 2026 DevSync. All rights reserved.
        </motion.p>
      </motion.div>

      {/* Right panel — auth forms */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-12 relative">
        {/* Theme toggle & back link */}
        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-2 z-20">
          {isLogin || isRegister ? (
            <a
              href="/"
              className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] hover:text-brand-400 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to home
            </a>
          ) : null}
          <ThemeToggle />
        </div>

        {/* Mobile brand */}
        <div className="lg:hidden absolute top-4 left-4 sm:top-6 sm:left-6 z-20">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/30">
              <svg className="w-4.5 h-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
              </svg>
            </div>
            <span className="text-lg font-bold text-[var(--text-primary)]">
              Dev<span className="text-brand-400">Sync</span>
            </span>
          </div>
        </div>

        {/* Auth card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[420px]"
        >
          <div className="auth-card-glow glass rounded-2xl p-6 sm:p-8 relative z-10">
            {/* Header */}
            <div className="text-center mb-6 sm:mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/30 mb-4"
              >
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                </svg>
              </motion.div>

              {/* Mode tabs */}
              <div className="flex items-center justify-center gap-1 p-1 rounded-lg bg-[var(--bg-tertiary)] mb-4 mx-auto max-w-[220px]">
                {(["login", "register"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => toggleMode(tab)}
                    className={cn(
                      "relative px-4 py-2 text-sm font-medium rounded-md transition-all duration-200",
                      mode === tab
                        ? "text-[var(--text-primary)]"
                        : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                    )}
                  >
                    {mode === tab && (
                      <motion.div
                        layoutId="auth-tab-bg"
                        className="absolute inset-0 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-md shadow-sm"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10">
                      {tab === "login" ? "Sign in" : "Sign up"}
                    </span>
                  </button>
                ))}
              </div>

              {isLogin && (
                <p className="text-sm text-[var(--text-secondary)]">
                  Welcome back! Sign in to your account.
                </p>
              )}
              {isRegister && (
                <p className="text-sm text-[var(--text-secondary)]">
                  Create your account and start building.
                </p>
              )}
            </div>

            {/* Animated forms */}
            <AnimatePresence mode="wait">
              {mode === "login" && <LoginForm onToggleMode={toggleMode} />}
              {mode === "register" && <RegisterForm onToggleMode={toggleMode} />}
              {mode === "forgot" && <ForgotPasswordForm onToggleMode={toggleMode} />}
            </AnimatePresence>

            {/* OAuth — only show on login/register */}
            {(isLogin || isRegister) && <OAuthSection isLoading={false} />}

            {/* Footer toggle */}
            {isLogin && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-center text-sm text-[var(--text-secondary)] mt-6"
              >
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => toggleMode("register")}
                  className="font-semibold text-brand-400 hover:text-brand-300 transition-colors"
                >
                  Sign up free
                </button>
              </motion.p>
            )}
            {isRegister && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-center text-sm text-[var(--text-secondary)] mt-6"
              >
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => toggleMode("login")}
                  className="font-semibold text-brand-400 hover:text-brand-300 transition-colors"
                >
                  Sign in
                </button>
              </motion.p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
