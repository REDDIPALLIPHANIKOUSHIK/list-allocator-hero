import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { agentSchema, hashAgentPassword } from "@/lib/agent-credentials";

export const createAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => agentSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const passwordHash = await hashAgentPassword(data.password);
    const { data: row, error } = await supabase
      .from("agents")
      .insert({
        owner_id: userId,
        name: data.name,
        email: data.email.toLowerCase(),
        country_code: data.countryCode,
        mobile: data.mobile,
        password_hash: passwordHash,
      })
      .select("id, name, email, country_code, mobile, created_at")
      .single();

    if (error?.code === "23505") throw new Error("An agent with this email already exists.");
    if (error) throw new Error(error.message);
    return row;
  });

export const listAgents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("agents")
      .select("id, name, email, country_code, mobile, created_at")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const deleteAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("agents").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
