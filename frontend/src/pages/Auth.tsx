import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowRight, Code2, Loader2, KeyRound, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

export default function AuthPage() {
  const { isAuthenticated, isLoading, login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [localLoading, setLocalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && isAuthenticated) navigate("/dashboard", { replace: true });
  }, [isLoading, isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLocalLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password, fullName, username);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Something went wrong");
    } finally {
      setLocalLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-indigo-950/10 to-purple-950/10" />
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 px-6 py-5">
        <button onClick={() => navigate("/")} className="flex items-center gap-2.5 text-muted-foreground hover:text-foreground transition-colors group">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
            <Code2 className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-semibold tracking-tight">DevSync</span>
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 pb-20 relative z-10">
        <div className="w-full max-w-sm">
          <Card className="border border-border/40 shadow-xl bg-card/95 backdrop-blur-sm">
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-3">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/10 flex items-center justify-center ring-1 ring-indigo-500/20">
                  {mode === "login" ? <KeyRound className="w-7 h-7 text-indigo-400" /> : <Sparkles className="w-7 h-7 text-indigo-400" />}
                </div>
              </div>
              <CardTitle className="text-xl font-bold tracking-tight">
                {mode === "login" ? "Welcome back" : "Join DevSync"}
              </CardTitle>
              <CardDescription className="text-sm">
                {mode === "login" ? "Sign in to your account" : "Create your developer account"}
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleSubmit}>
              <CardContent className="pb-4 space-y-3">
                {mode === "register" && (
                  <>
                    <Input
                      type="text"
                      placeholder="Full name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="h-10 text-sm bg-background/50 focus:bg-background transition-colors"
                      required
                    />
                    <Input
                      type="text"
                      placeholder="Username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="h-10 text-sm bg-background/50 focus:bg-background transition-colors"
                    />
                  </>
                )}
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 text-sm bg-background/50 focus:bg-background transition-colors"
                  required
                />
                <Input
                  type="password"
                  placeholder={mode === "register" ? "Password (min 6 characters)" : "Password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-10 text-sm bg-background/50 focus:bg-background transition-colors"
                  required
                  minLength={6}
                />
                {error && <p className="text-xs text-red-500">{error}</p>}
              </CardContent>

              <CardFooter className="border-t border-border/40 pt-4 flex-col gap-3">
                <Button
                  type="submit"
                  className="w-full h-10 text-sm shadow-md bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700"
                  disabled={localLoading}
                >
                  {localLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>{mode === "login" ? "Sign in" : "Create account"} <ArrowRight className="ml-1.5 h-4 w-4" /></>
                  )}
                </Button>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
                  onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); }}
                >
                  {mode === "login" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                </button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
