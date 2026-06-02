import { createFileRoute, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { HardDrive, Network, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getLocalUser, signInLocal, signUpLocal } from "@/lib/local-workspace";

export const Route = createFileRoute("/login")({
  beforeLoad: () => {
    if (typeof window !== "undefined" && getLocalUser()) throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "Login | ListFlow" },
      { name: "description", content: "Sign in to manage agents and distribute lists." },
    ],
  }),
  component: LoginPage,
});

const schema = z.object({
  email: z.string().trim().email("Enter a valid email address").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
});

function LoginPage() {
  const navigate = useNavigate();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        await signUpLocal(parsed.data.email, parsed.data.password);
        toast.success("Admin account created. Welcome to ListFlow!");
      } else {
        await signInLocal(parsed.data.email, parsed.data.password);
        toast.success("Welcome back!");
      }
      await router.invalidate();
      await navigate({ to: "/dashboard" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Authentication failed");
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
              {mode === "signup" ? "Create Admin Account" : "Admin Login"}
            </h1>
          </CardTitle>
          <CardDescription>
            {mode === "signup"
              ? "Create your workspace and start distributing lists."
              : "Sign in to continue managing your team."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={mode}
            onValueChange={(value) => setMode(value as "login" | "signup")}
            className="mb-5"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signup">Create account</TabsTrigger>
              <TabsTrigger value="login">Sign in</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="mb-4 flex items-start gap-3 rounded-xl border bg-muted/40 p-3 text-xs leading-5 text-muted-foreground">
            <HardDrive className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p>
              Your workspace is saved in this browser, so it works immediately without external
              setup.
            </p>
          </div>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
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
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? "Please wait..."
                : mode === "signup"
                  ? "Create account & open dashboard"
                  : "Sign in to dashboard"}
            </Button>
          </form>
          <div className="mt-5 flex items-center justify-center gap-2 border-t pt-4 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4" />
            Private browser workspace
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
