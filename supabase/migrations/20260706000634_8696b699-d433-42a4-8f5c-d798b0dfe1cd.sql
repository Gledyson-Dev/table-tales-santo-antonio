
-- Roles
create type public.app_role as enum ('admin','kitchen','waiter','cashier');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "user_roles_select_own" on public.user_roles
for select to authenticated
using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create policy "user_roles_admin_all" on public.user_roles
for all to authenticated
using (public.has_role(auth.uid(),'admin'))
with check (public.has_role(auth.uid(),'admin'));

-- Give existing authed user (admin@santoantonio.local) admin role
insert into public.user_roles (user_id, role)
select id, 'admin'::public.app_role from auth.users
where email = 'admin@santoantonio.local'
on conflict do nothing;

-- Background fit/zoom
alter table public.settings
  add column if not exists bg_fit text not null default 'cover',
  add column if not exists bg_zoom numeric not null default 100,
  add column if not exists bg_pos_x numeric not null default 50,
  add column if not exists bg_pos_y numeric not null default 50;

alter table public.settings
  add constraint settings_bg_fit_check check (bg_fit in ('cover','contain'));

-- Storage policies for menu-images bucket (public read, authed write)
create policy "menu_images_read" on storage.objects
for select using (bucket_id = 'menu-images');

create policy "menu_images_write" on storage.objects
for insert to authenticated with check (bucket_id = 'menu-images');

create policy "menu_images_update" on storage.objects
for update to authenticated using (bucket_id = 'menu-images');

create policy "menu_images_delete" on storage.objects
for delete to authenticated using (bucket_id = 'menu-images');
