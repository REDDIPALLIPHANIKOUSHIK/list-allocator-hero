import { createFileRoute, Link, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Cloud, HardDrive, Network, ShieldCheck } from "lucide-react";
import { getLocalUser, signInLocal, signUpLocal } from "@/lib/local-workspace";

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    if (typeof window !== "undefined" && getLocalUser()) throw redirect({ to: "/dashboard" });
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "Login | Agent Manager" },
      { name: "description", content: "Sign in to manage agents and distribute lists." },
    ],
  }),
  component: LoginPage,
});

const schema = z.object({
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
});

function LoginPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState<"local" | "supabase">("local");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    try {
      if (provider === "local") {
        if (mode === "signup") {
          await signUpLocal(parsed.data.email, parsed.data.password);
          toast.success("Local admin account created. Welcome to ListFlow!");
        } else {
          await signInLocal(parsed.data.email, parsed.data.password);
          toast.success("Welcome back to your local workspace!");
        }
        await router.invalidate();
        await navigate({ to: "/dashboard" });
        return;
      }
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard` },
        });
        if (error) throw error;
        if (data.session) {
          toast.success("Account created. Welcome to ListFlow!");
          await router.invalidate();
          await navigate({ to: "/dashboard" });
          return;
        }
        toast.success("Account created. Check your email to confirm your account, then sign in.", {
          duration: 8000,
        });
        setMode("login");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) throw error;
        toast.success("Welcome back!");
        await router.invalidate();
        await navigate({ to: "/dashboard" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,oklch(0.92_0.06_255),transparent_45%)] p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <div className="mb-3 flex items-center gap-3">
            <span className="rounded-xl bg-primary p-2 text-primary-foreground">
              <Network className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold">ListFlow</p>
              <p className="text-xs text-muted-foreground">Lead allocation workspace</p>
            </div>
          </div>
          <CardTitle>
            <h1 className="text-2xl font-semibold">
              {mode === "login" ? "Admin Login" : "Create Admin Account"}
            </h1>
          </CardTitle>
          <CardDescription>
            {mode === "login"
              ? "Sign in to manage agents and distribute lists."
              : "Sign up to start managing your agents."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
            <Button
              type="button"
              size="sm"
              variant={provider === "local" ? "default" : "ghost"}
              onClick={() => setProvider("local")}
            >
              <HardDrive className="mr-2 h-4 w-4" />
              Local workspace
            </Button>
            <Button
              type="button"
              size="sm"
              variant={provider === "supabase" ? "default" : "ghost"}
              onClick={() => setProvider("supabase")}
            >
              <Cloud className="mr-2 h-4 w-4" />
              Supabase
            </Button>
          </div>
          <p className="mb-4 text-xs leading-5 text-muted-foreground">
            {provider === "local"
              ? "Local workspace works immediately in this browser and is ideal for testing every feature."
              : "Supabase mode uses your connected hosted project and JWT authentication."}
          </p>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
            </Button>
            <button
              type="button"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {mode === "login"
                ? "Need an admin account? Sign up"
                : "Already have an account? Sign in"}
            </button>
          </form>
          <Button asChild variant="outline" className="mt-4 w-full">
            <Link to="/demo">Preview dashboard without signing in</Link>
          </Button>
          <div className="mt-5 flex items-center justify-center gap-2 border-t pt-4 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4" />
            {provider === "local"
              ? "Browser-local evaluation workspace"
              : "JWT-secured Supabase access"}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
