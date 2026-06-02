
CREATE TABLE public.agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  country_code TEXT NOT NULL,
  mobile TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL,
  first_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agents_owner ON public.agents(owner_id);
CREATE INDEX idx_list_items_owner ON public.list_items(owner_id);
CREATE INDEX idx_list_items_agent ON public.list_items(agent_id);
CREATE INDEX idx_list_items_batch ON public.list_items(batch_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agents TO authenticated;
GRANT ALL ON public.agents TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.list_items TO authenticated;
GRANT ALL ON public.list_items TO service_role;

ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.list_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agents_owner_all" ON public.agents
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "list_items_owner_all" ON public.list_items
  FOR ALL TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());
