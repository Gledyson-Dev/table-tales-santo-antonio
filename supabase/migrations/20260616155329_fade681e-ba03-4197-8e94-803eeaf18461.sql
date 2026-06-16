
ALTER TABLE public.tables ADD COLUMN IF NOT EXISTS party_size integer;

CREATE TABLE IF NOT EXISTS public.table_visits (
  id uuid primary key default gen_random_uuid(),
  table_id uuid references public.tables(id) on delete set null,
  table_number integer not null,
  occupied_name text,
  party_size integer,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.table_visits TO anon, authenticated;
GRANT ALL ON public.table_visits TO service_role;

ALTER TABLE public.table_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "visits_select_all" ON public.table_visits FOR SELECT TO public USING (true);
CREATE POLICY "visits_insert_all" ON public.table_visits FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "visits_update_all" ON public.table_visits FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS table_visits_started_idx ON public.table_visits (started_at DESC);
