import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, Loader2, MailCheck, MailWarning } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [status, setStatus] = useState<"checking" | "verified" | "failed">(
    "checking"
  );
  const [resendEmail, setResendEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [resendDone, setResendDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const verify = async () => {
      if (!token) {
        if (!cancelled) setStatus("failed");
        return;
      }
      try {
        const { authService } = await import("@/services/authService");
        await authService.verifyEmail(token);
        if (!cancelled) setStatus("verified");
      } catch {
        if (!cancelled) setStatus("failed");
      }
    };
    verify();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    setResending(true);
    try {
      const { authService } = await import("@/services/authService");
      // Generic response — silently skipped for unknown/already-verified emails.
      await authService.requestEmailVerification(resendEmail);
      setResendDone(true);
    } catch {
      // keep the form visible; the generic behavior applies
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07071a] text-white flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/30 via-[#07071a] to-purple-950/20 pointer-events-none" />
      <div className="relative w-full max-w-sm animate-fade-in-up">
        {status === "checking" && (
          <div className="text-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mx-auto" />
            <p className="text-sm text-white/50 mt-4">Verifying your email…</p>
          </div>
        )}

        {status === "verified" && (
          <>
            <div className="text-center mb-6">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-500/25 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
              </div>
              <h1 className="text-2xl font-bold tracking-tight">
                Email verified
              </h1>
              <p className="text-sm text-white/50 mt-1">
                Your email address is now verified. You&apos;re all set.
              </p>
            </div>
            <div className="text-center">
              <Link
                to="/auth"
                className="text-sm text-indigo-400 hover:text-indigo-300 font-medium"
              >
                Continue to sign in
              </Link>
            </div>
          </>
        )}

        {status === "failed" && (
          <>
            <div className="text-center mb-6">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 ring-1 ring-amber-500/25 flex items-center justify-center">
                  <MailWarning className="w-8 h-8 text-amber-400" />
                </div>
              </div>
              <h1 className="text-2xl font-bold tracking-tight">
                Verification link invalid
              </h1>
              <p className="text-sm text-white/50 mt-1">
                This link is invalid, expired, or already used. Request a new
                verification email below.
              </p>
            </div>

            {resendDone ? (
              <div className="text-center space-y-4">
                <div className="flex flex-col items-center gap-2 text-sm text-white/60 bg-white/5 border border-white/10 rounded-xl px-4 py-5">
                  <MailCheck className="w-6 h-6 text-emerald-400" />
                  <span>
                    If your account exists and is unverified, a new link is on
                    its way.
                  </span>
                </div>
                <Link
                  to="/auth"
                  className="inline-block text-sm text-white/50 hover:text-white transition-colors"
                >
                  Back to sign in
                </Link>
              </div>
            ) : (
              <form onSubmit={handleResend} className="space-y-4" noValidate>
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5">
                    Email address
                  </label>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={resendEmail}
                    onChange={(e) => setResendEmail(e.target.value)}
                    className="h-11 text-sm bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full h-11 text-sm font-semibold shadow-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50"
                  disabled={resending || !resendEmail}
                >
                  {resending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Resend verification link"
                  )}
                </Button>
                <div className="text-center">
                  <Link
                    to="/auth"
                    className="text-sm text-white/50 hover:text-white transition-colors"
                  >
                    Back to sign in
                  </Link>
                </div>
              </form>
            )}
          </>
        )}
      </div>
      <style>{`@keyframes fade-in-up { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } } .animate-fade-in-up { animation: fade-in-up 0.5s ease-out both; }`}</style>
    </div>
  );
}
