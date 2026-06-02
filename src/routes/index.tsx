import { createFileRoute } from "@tanstack/react-router";
import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { getLocalUser } from "@/lib/local-workspace";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    if (typeof window !== "undefined" && getLocalUser()) throw redirect({ to: "/dashboard" });
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/dashboard" });
    throw redirect({ to: "/login" });
  },
  head: () => ({
    meta: [
      { title: "Agent Manager" },
      {
        name: "description",
        content: "Admin dashboard for managing agents and distributing CSV lists.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return null;
}
