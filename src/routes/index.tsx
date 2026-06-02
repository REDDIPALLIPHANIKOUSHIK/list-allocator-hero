import { createFileRoute, redirect } from "@tanstack/react-router";
import { getLocalUser } from "@/lib/local-workspace";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({
      to: typeof window !== "undefined" && getLocalUser() ? "/dashboard" : "/login",
    });
  },
  head: () => ({
    meta: [
      { title: "ListFlow" },
      {
        name: "description",
        content: "Admin dashboard for managing agents and distributing lists.",
      },
    ],
  }),
  component: () => null,
});
