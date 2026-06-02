import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const agentSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  countryCode: z.string().trim().regex(/^\+\d{1,4}$/, "Country code must be like +91"),
  mobile: z.string().trim().regex(/^\d{6,15}$/, "Mobile must be 6-15 digits"),
  password: z.string().min(6).max(72),
});

export const createAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => agentSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Simple hash: in production use bcrypt; we store a salted hash via pgcrypto-style approach
    // For this assignment, store password (non-reversible) using Web Crypto SHA-256 + salt
    const salt = crypto.randomUUID();
    const enc = new TextEncoder().encode(salt + data.password);
    const digest = await crypto.subtle.digest("SHA-256", enc);
    const hashHex = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const password_hash = `${salt}:${hashHex}`;

    const { data: row, error } = await supabase
      .from("agents")
      .insert({
        owner_id: userId,
        name: data.name,
        email: data.email,
        country_code: data.countryCode,
        mobile: data.mobile,
        password_hash,
      })
      .select("id, name, email, country_code, mobile, created_at")
      .single();

    if (error) throw new Error(error.message);
    return row;
  });

export const listAgents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
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