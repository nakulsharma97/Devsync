import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, MailCheck, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { getErrorMessage } from "@/lib/utils";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { authService } = await import("@/services/authService");
      // Generic response — whether or not the account exists, the UI shows the
      // same message so the endpoint cannot be used to enumerate accounts.
      await authService.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(getErrorMessage(err, "Something went wrong"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07071a] text-white flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/30 via-[#07071a] to-purple-950/20 pointer-events-none" />
      <div className="relative w-full max-w-sm animate-fade-in-up">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/10 flex items-center justify-center ring-1 ring-indigo-500/25">
              <ShieldCheck className="w-8 h-8 text-indigo-400" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            {sent ? "Check your inbox" : "Reset your password"}
          </h1>
          <p className="text-sm text-white/50 mt-1">
            {sent
              ? "If an account exists for that email, we've sent a reset link. It expires in 15 minutes."
              : "Enter your email and we'll send you a secure reset link"}
          </p>
        </div>

        {sent ? (
          <div className="text-center space-y-5">
            <div className="flex flex-col items-center gap-2 text-sm text-white/60 bg-white/5 border border-white/10 rounded-xl px-4 py-5">
              <MailCheck className="w-6 h-6 text-emerald-400" />
              <span>
                Didn&apos;t get the email? Check your spam folder, or{" "}
                <button
                  type="button"
                  onClick={() => setSent(false)}
                  className="text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  try again
                </button>
                .
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
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5">
                Email address
              </label>
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 text-sm bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                required
                autoFocus
              />
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full h-11 text-sm font-semibold shadow-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50"
              disabled={loading || !email}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send reset link"}
            </Button>

            <div className="text-center">
              <Link
                to="/auth"
                className="text-sm text-white/50 hover:text-white transition-colors"
              >
                Remembered your password?{" "}
                <span className="text-indigo-400 hover:text-indigo-300 font-medium">
                  Sign in
                </span>
              </Link>
            </div>
          </form>
        )}
      </div>
      <style>{`@keyframes fade-in-up { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } } .animate-fade-in-up { animation: fade-in-up 0.5s ease-out both; }`}</style>
    </div>
  );
}
