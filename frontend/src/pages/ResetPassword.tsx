import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, CheckCircle2, Loader2, Lock } from "lucide-react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const isValid =
    password.length >= 8 && password === confirm && password.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { authService } = await import("@/services/authService");
      await authService.resetPassword(token, password);
      setDone(true);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "This reset link is invalid or has expired. Request a new one."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07071a] text-white flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/30 via-[#07071a] to-purple-950/20 pointer-events-none" />
      <div className="relative w-full max-w-sm animate-fade-in-up">
        {!token ? (
          <>
            <div className="text-center mb-6">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 ring-1 ring-amber-500/25 flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-amber-400" />
                </div>
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Invalid link</h1>
              <p className="text-sm text-white/50 mt-1">
                This password reset link is missing its token. Request a new one
                below.
              </p>
            </div>
            <div className="text-center">
              <Link
                to="/forgot-password"
                className="text-sm text-indigo-400 hover:text-indigo-300 font-medium"
              >
                Request a new reset link
              </Link>
            </div>
          </>
        ) : done ? (
          <>
            <div className="text-center mb-6">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-500/25 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
              </div>
              <h1 className="text-2xl font-bold tracking-tight">
                Password updated
              </h1>
              <p className="text-sm text-white/50 mt-1">
                Your password has been changed and all other sessions were
                signed out. Sign in with your new password.
              </p>
            </div>
            <div className="text-center">
              <Link
                to="/auth"
                className="text-sm text-indigo-400 hover:text-indigo-300 font-medium"
              >
                Sign in with your new password
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/10 flex items-center justify-center ring-1 ring-indigo-500/25">
                  <Lock className="w-8 h-8 text-indigo-400" />
                </div>
              </div>
              <h1 className="text-2xl font-bold tracking-tight">
                Choose a new password
              </h1>
              <p className="text-sm text-white/50 mt-1">
                Minimum 8 characters. This link works once and expires in 15
                minutes.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">
                  New password
                </label>
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Min 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 text-sm bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  required
                  minLength={8}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-white/60 mb-1.5">
                  Confirm new password
                </label>
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Repeat the password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="h-11 text-sm bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  required
                  minLength={8}
                />
                <div className="flex items-center justify-between mt-2">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-xs text-white/40 hover:text-white/60 transition-colors"
                  >
                    {showPassword ? "Hide" : "Show"} passwords
                  </button>
                  {password && confirm && password !== confirm && (
                    <span className="text-xs text-red-400">Passwords don&apos;t match</span>
                  )}
                </div>
              </div>

              {error && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                className="w-full h-11 text-sm font-semibold shadow-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50"
                disabled={loading || !isValid}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Update password"
                )}
              </Button>
            </form>
          </>
        )}
      </div>
      <style>{`@keyframes fade-in-up { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } } .animate-fade-in-up { animation: fade-in-up 0.5s ease-out both; }`}</style>
    </div>
  );
}
