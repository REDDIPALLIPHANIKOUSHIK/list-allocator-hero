import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const itemSchema = z.object({
  firstName: z.string().trim().min(1).max(255),
  phone: z.string().trim().min(1).max(50),
  notes: z.string().trim().max(1000).optional().default(""),
});

const distributeSchema = z.object({
  items: z.array(itemSchema).min(1).max(10000),
});

export const distributeItems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => distributeSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: agents, error: agentsErr } = await supabase
      .from("agents")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(5);
    if (agentsErr) throw new Error(agentsErr.message);
    if (!agents || agents.length === 0) {
      throw new Error("You need to create at least 1 agent before distributing.");
    }

    const batch_id = crypto.randomUUID();
    const n = agents.length;
    const rows = data.items.map((it, idx) => ({
      owner_id: userId,
      agent_id: agents[idx % n].id,
      batch_id,
      first_name: it.firstName,
      phone: it.phone,
      notes: it.notes || null,
    }));

    const { error: insErr } = await supabase.from("list_items").insert(rows);
    if (insErr) throw new Error(insErr.message);

    return { batch_id, count: rows.length, agentCount: n };
  });

export const listDistributedItems = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data: agents, error: aErr } = await supabase
      .from("agents")
      .select("id, name, email, country_code, mobile")
      .order("created_at", { ascending: true });
    if (aErr) throw new Error(aErr.message);

    const { data: items, error: iErr } = await supabase
      .from("list_items")
      .select("id, agent_id, first_name, phone, notes, batch_id, created_at")
      .order("created_at", { ascending: false });
    if (iErr) throw new Error(iErr.message);

    return { agents: agents ?? [], items: items ?? [] };
  });