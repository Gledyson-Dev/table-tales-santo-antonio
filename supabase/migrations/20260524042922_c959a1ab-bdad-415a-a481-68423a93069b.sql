
create table public.tables (
  id uuid primary key default gen_random_uuid(),
  number int not null,
  x numeric not null,
  y numeric not null,
  w numeric not null default 7,
  h numeric not null default 5,
  shape text not null default 'square' check (shape in ('square','circle')),
  seats int not null default 4,
  label text,
  occupied boolean not null default false,
  occupied_name text,
  occupied_since timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.text_labels (
  id uuid primary key default gen_random_uuid(),
  x numeric not null,
  y numeric not null,
  text text not null,
  font_size numeric not null default 14,
  created_at timestamptz not null default now()
);

alter table public.tables enable row level security;
alter table public.text_labels enable row level security;

create policy "tables_select_all" on public.tables for select using (true);
create policy "tables_insert_auth" on public.tables for insert to authenticated with check (true);
create policy "tables_update_auth" on public.tables for update to authenticated using (true) with check (true);
create policy "tables_delete_auth" on public.tables for delete to authenticated using (true);

create policy "labels_select_all" on public.text_labels for select using (true);
create policy "labels_all_auth" on public.text_labels for all to authenticated using (true) with check (true);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger tables_touch before update on public.tables
  for each row execute function public.touch_updated_at();

alter publication supabase_realtime add table public.tables;
alter publication supabase_realtime add table public.text_labels;

-- Seed initial tables matching default Santo Antônio layout
insert into public.tables (number, x, y, w, h, shape, seats) values
  (30, 19.5, 4.2, 6, 4.2, 'circle', 2),
  (40, 31.7, 4.7, 6, 4.2, 'square', 2),
  (20, 45.3, 4.2, 6, 4.2, 'circle', 2),
  (31, 19.5, 10.7, 7, 5, 'square', 4),
  (29, 32.8, 10.7, 7, 5, 'square', 4),
  (24, 40.2, 10.7, 7, 5, 'square', 4),
  (21, 47.2, 10.7, 7, 5, 'square', 4),
  (32, 19.5, 16.1, 7, 5, 'square', 4),
  (28, 32.8, 16.1, 7, 5, 'square', 4),
  (25, 40.2, 16.1, 7, 5, 'square', 4),
  (23, 47.2, 16.1, 7, 5, 'square', 4),
  (33, 19.5, 21.9, 7, 5, 'square', 4),
  (46, 32.8, 21.9, 7, 5, 'square', 4),
  (36, 39.8, 21.9, 7, 5, 'square', 4),
  (26, 46.8, 21.9, 7, 5, 'square', 4),
  (34, 19.5, 28.4, 7, 5, 'square', 4),
  (27, 29.1, 28.4, 7, 5, 'square', 4),
  (76, 74.4, 28.4, 7, 5, 'square', 4),
  (78, 82.2, 28.4, 7, 5, 'square', 4),
  (77, 74.4, 31.5, 7, 5, 'square', 4),
  (79, 82.2, 31.5, 7, 5, 'square', 4),
  (14, 47.5, 31.5, 7, 5, 'square', 4),
  (75, 55.6, 31.5, 7, 5, 'square', 4),
  (12, 47.5, 37.8, 7, 5, 'square', 4),
  (73, 55.6, 37.8, 7, 5, 'square', 4),
  (74, 63.4, 37.8, 7, 5, 'square', 4),
  (80, 76.6, 39.8, 7, 5, 'square', 4),
  (81, 84.4, 39.8, 7, 5, 'square', 4),
  (11, 47.5, 43.2, 7, 5, 'square', 4),
  (71, 55.6, 43.2, 7, 5, 'square', 4),
  (72, 63.4, 43.2, 7, 5, 'square', 4),
  (82, 84.4, 43.0, 7, 5, 'square', 4),
  (16, 37.6, 45.8, 7, 5, 'square', 2),
  (10, 47.5, 49.0, 7, 5, 'square', 4),
  (69, 55.6, 49.0, 7, 5, 'square', 4),
  (70, 63.4, 49.0, 7, 5, 'square', 4),
  (15, 37.6, 50.8, 7, 5, 'square', 2),
  (9, 47.5, 54.7, 7, 5, 'square', 4),
  (67, 55.6, 54.7, 7, 5, 'square', 4),
  (68, 63.4, 54.7, 7, 5, 'square', 4),
  (8, 47.5, 60.4, 7, 5, 'square', 4),
  (51, 56.0, 61.5, 7, 5, 'square', 4),
  (52, 63.7, 61.5, 7, 5, 'square', 4),
  (53, 79.2, 64.1, 7, 5, 'square', 4),
  (7, 38.7, 65.6, 7, 5, 'square', 2),
  (54, 79.2, 68.8, 7, 5, 'square', 4),
  (6, 38.7, 70.8, 7, 5, 'square', 2),
  (5, 47.5, 74.5, 7, 5, 'square', 4),
  (63, 60.1, 74.5, 7, 5, 'square', 4),
  (64, 70.7, 74.5, 7, 5, 'square', 4),
  (55, 81.8, 74.5, 7, 5, 'square', 4),
  (4, 47.5, 80.2, 7, 5, 'square', 4),
  (62, 60.1, 80.2, 7, 5, 'square', 4),
  (65, 70.7, 80.2, 7, 5, 'square', 4),
  (56, 81.8, 80.2, 7, 5, 'square', 4),
  (3, 47.5, 85.4, 7, 5, 'square', 4),
  (61, 60.4, 86.5, 7, 5, 'square', 4),
  (66, 70.7, 85.4, 7, 5, 'square', 4),
  (57, 81.8, 85.4, 7, 5, 'square', 4),
  (2, 47.5, 91.1, 7, 5, 'square', 4),
  (60, 64.8, 92.2, 6, 4.2, 'circle', 2),
  (58, 81.8, 91.4, 7, 5, 'square', 4),
  (1, 47.5, 96.6, 7, 5, 'square', 4),
  (59, 81.8, 96.6, 7, 5, 'square', 4);

insert into public.text_labels (x, y, text, font_size) values
  (33, 2, 'Adega', 16),
  (78, 15, 'Brinquedoteca', 18);
