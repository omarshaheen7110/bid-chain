-- ============================================================
-- BID-CHAIN DATABASE SCHEMA
-- Run this once in Supabase: Project -> SQL Editor -> New query
-- ============================================================

-- ------------------------------------------------------------
-- 1. PROFILES TABLE
-- Extends Supabase's built-in auth.users with the extra fields
-- your registration form collects (name, phone, company).
-- Supabase Auth already stores email + hashed password securely
-- in auth.users, so this table only holds the rest.
-- ------------------------------------------------------------
create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text not null,
  email text not null,
  phone text not null,
  company_name text not null,
  created_at timestamptz default now()
);

alter table profiles enable row level security;

-- Users can only read/edit their own profile
create policy "Users can view their own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = id);

-- Profile rows are created automatically by a trigger the instant
-- a new user signs up (see the function below) — not by the client —
-- so this works correctly whether or not email confirmation is on.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, phone, company_name)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email,
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'company_name'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ------------------------------------------------------------
-- 2. QUOTE REQUESTS TABLE
-- One row per submitted quote request.
-- file_paths stores the storage paths of uploaded CAD/photo files.
-- ------------------------------------------------------------
create table quote_requests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  material text not null,
  quantity int not null check (quantity > 0),
  deadline date,
  message text,
  file_paths text[] not null default '{}',
  status text not null default 'submitted',
  created_at timestamptz default now()
);

alter table quote_requests enable row level security;

-- Users can only see and create their own quote requests
create policy "Users can view their own quote requests"
  on quote_requests for select
  using (auth.uid() = user_id);

create policy "Users can create their own quote requests"
  on quote_requests for insert
  with check (auth.uid() = user_id);


-- ------------------------------------------------------------
-- 3. STORAGE BUCKET FOR UPLOADED FILES
-- Run this, then also create the bucket via the Dashboard:
-- Storage -> New bucket -> name: "quote-files" -> Private
-- (the insert below registers it if it doesn't exist yet)
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('quote-files', 'quote-files', false)
on conflict (id) do nothing;

-- Users can only upload into a folder named after their own user id
create policy "Users can upload their own quote files"
  on storage.objects for insert
  with check (
    bucket_id = 'quote-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can only read their own uploaded files
create policy "Users can view their own quote files"
  on storage.objects for select
  using (
    bucket_id = 'quote-files'
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- ------------------------------------------------------------
-- NOTE ON ADMIN ACCESS
-- As written, only the customer who submitted a quote can see it.
-- Whoever runs BID-CHAIN internally (staff reviewing quotes) will
-- need a way to see ALL requests. The simplest approach: add an
-- "is_staff" boolean to profiles, then add policies like:
--
--   create policy "Staff can view all quote requests"
--     on quote_requests for select
--     using (exists (
--       select 1 from profiles where id = auth.uid() and is_staff = true
--     ));
--
-- Ask me to add this once you know who needs staff access.
-- ------------------------------------------------------------
