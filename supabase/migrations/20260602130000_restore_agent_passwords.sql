-- New agent credentials are stored as one-way scrypt hashes. Existing agents
-- cannot be backfilled because their original plaintext passwords were never
-- stored, so this column intentionally remains nullable for legacy rows.
-- The application always supplies a hash when creating a new agent and never
-- returns this column to the browser.
ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS password_hash TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_agents_owner_email ON public.agents(owner_id, lower(email));
