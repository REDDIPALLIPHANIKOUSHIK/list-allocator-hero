import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { LogOut, Network } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getLocalUser, signOutLocal } from "@/lib/local-workspace";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    // Supabase stores the browser session in localStorage, which is unavailable
    // during SSR. Defer the check until hydration so direct dashboard reloads do
    // not incorrectly redirect authenticated admins back to the login page.
    if (typeof window === "undefined") return { user: null };
    const localUser = getLocalUser();
    if (localUser) return { user: localUser, local: true };
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
    return { user: data.user, local: false };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const routeContext = Route.useRouteContext();
  const navigate = useNavigate();
  const [user, setUser] = useState(routeContext.user);
  const [local, setLocal] = useState(Boolean(routeContext.local));
  const [verified, setVerified] = useState(Boolean(routeContext.user));

  useEffect(() => {
    let active = true;
    const localUser = getLocalUser();
    if (localUser) {
      setUser(localUser);
      setLocal(true);
      setVerified(true);
      return () => {
        active = false;
      };
    }
    supabase.auth.getUser().then(({ data, error }) => {
      if (!active) return;
      if (error || !data.user) {
        navigate({ to: "/login", replace: true });
        return;
      }
      setUser(data.user);
      setVerified(true);
    });
    return () => {
      active = false;
    };
  }, [navigate]);

  const handleLogout = async () => {
    if (local) signOutLocal();
    else await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  if (!verified || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Verifying your session...
      </div>
    );
  }

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
            <p className="hidden text-xs text-muted-foreground sm:block">
              {user.email}
              {local ? " · local workspace" : ""}
            </p>
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
