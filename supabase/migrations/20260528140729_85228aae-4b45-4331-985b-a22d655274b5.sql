
-- Allow anyone to update tables (so guests can mark occupied/free)
create policy "tables_update_anon" on public.tables
  for update to anon using (true) with check (true);

-- Settings singleton
create table public.settings (
  id int primary key default 1,
  bg_image_url text,
  updated_at timestamptz not null default now(),
  constraint settings_singleton check (id = 1)
);

grant select on public.settings to anon, authenticated;
grant insert, update on public.settings to authenticated;
grant all on public.settings to service_role;

alter table public.settings enable row level security;
create policy "settings_select_all" on public.settings for select using (true);
create policy "settings_write_auth" on public.settings for all to authenticated using (true) with check (true);

insert into public.settings (id) values (1) on conflict do nothing;

alter publication supabase_realtime add table public.settings;

-- Storage bucket for background image
insert into storage.buckets (id, name, public) values ('floor-bg', 'floor-bg', true)
  on conflict (id) do update set public = true;

create policy "floor_bg_read" on storage.objects for select using (bucket_id = 'floor-bg');
create policy "floor_bg_write_auth" on storage.objects for insert to authenticated
  with check (bucket_id = 'floor-bg');
create policy "floor_bg_update_auth" on storage.objects for update to authenticated
  using (bucket_id = 'floor-bg');
create policy "floor_bg_delete_auth" on storage.objects for delete to authenticated
  using (bucket_id = 'floor-bg');
