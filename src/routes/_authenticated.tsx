import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { LogOut, Network } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getLocalUser, signOutLocal } from "@/lib/local-workspace";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: () => {
    // The workspace session lives in browser storage. During SSR we render a
    // lightweight hydration state; the browser guard runs immediately after.
    if (typeof window === "undefined") return { user: null };
    const user = getLocalUser();
    if (!user) throw redirect({ to: "/login" });
    return { user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  if (!user)
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Opening your workspace...
      </div>
    );
  const handleLogout = () => {
    signOutLocal();
    navigate({ to: "/login" });
  };
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/90 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-primary p-2 text-primary-foreground">
              <Network className="h-5 w-5" />
            </span>
            <div>
              <h1 className="font-semibold tracking-tight">ListFlow</h1>
              <p className="text-xs text-muted-foreground">Lead allocation workspace</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <p className="hidden text-xs text-muted-foreground sm:block">{user.email}</p>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-7 sm:py-9">
        <Outlet />
      </main>
    </div>
  );
}
