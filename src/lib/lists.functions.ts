import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { allocateAgentIds, REQUIRED_AGENT_COUNT } from "@/lib/allocation";

const itemSchema = z.object({
  firstName: z.string().trim().min(1).max(255),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d ()-]{6,25}$/, "Enter a valid phone number"),
  notes: z.string().trim().max(1000).optional().default(""),
});

const distributeSchema = z.object({ items: z.array(itemSchema).min(1).max(10000) });

export const distributeItems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => distributeSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: agents, error: agentsErr } = await supabase
      .from("agents")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(REQUIRED_AGENT_COUNT);
    if (agentsErr) throw new Error(agentsErr.message);
    if (!agents || agents.length < REQUIRED_AGENT_COUNT) {
      throw new Error(`Create ${REQUIRED_AGENT_COUNT} agents before distributing a list.`);
    }

    const batchId = crypto.randomUUID();
    const agentIds = allocateAgentIds(
      agents.map((agent) => agent.id),
      data.items.length,
    );
    const rows = data.items.map((item, index) => ({
      owner_id: userId,
      agent_id: agentIds[index],
      batch_id: batchId,
      first_name: item.firstName,
      phone: item.phone,
      notes: item.notes || null,
    }));

    const { error: insertError } = await supabase.from("list_items").insert(rows);
    if (insertError) throw new Error(insertError.message);
    return { batchId, count: rows.length, agentCount: REQUIRED_AGENT_COUNT };
  });

export const listDistributedItems = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data: agents, error: agentsError } = await supabase
      .from("agents")
      .select("id, name, email, country_code, mobile")
      .order("created_at", { ascending: true });
    if (agentsError) throw new Error(agentsError.message);

    const { data: items, error: itemsError } = await supabase
      .from("list_items")
      .select("id, agent_id, first_name, phone, notes, batch_id, created_at")
      .order("created_at", { ascending: false });
    if (itemsError) throw new Error(itemsError.message);

    return { agents: agents ?? [], items: items ?? [] };
  });
